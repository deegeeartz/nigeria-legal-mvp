from fastapi import APIRouter, Header, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional
import os

from app.dependencies import (
    log_event,
    require_user,
)
from app.db import (
    get_user_by_id,
    connect,
)
from app.services.supabase_storage import SupabaseStorageService
from app.models import UserProfileResponse
from app.security import scan_upload_for_malware, MalwareDetectedError, MalwareScanError

router = APIRouter(tags=["users"])

MAX_PICTURE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB limit for profile pics

@router.get("/api/users/me", response_model=UserProfileResponse)
async def get_my_profile(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> UserProfileResponse:
    user = await require_user(x_auth_token)
    # Fetch full user record to get any fields not in the token
    db_user = await get_user_by_id(user["id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        user_id=db_user["id"],
        email=db_user["email"],
        full_name=db_user["full_name"],
        role=db_user["role"],
        phone_number=db_user.get("phone_number"),
        profile_picture_url=db_user.get("profile_picture_url"),
        nin_verified=bool(db_user.get("nin_verified", False)),
        lawyer_id=db_user.get("lawyer_id"),
    )

@router.post("/api/users/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
):
    user = await require_user(x_auth_token)
    
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(file_bytes) > MAX_PICTURE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Picture exceeds 5MB limit")
        
    try:
        scan_upload_for_malware(file_bytes)
    except MalwareDetectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except MalwareScanError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # Determine extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Use JPG, PNG or WebP.")

    # Upload to Supabase
    storage_path = f"profiles/{user['id']}{ext}"
    cloud_url = await SupabaseStorageService.upload_file(
        bucket="profile-pictures",
        path=storage_path,
        content=file_bytes,
        content_type=file.content_type or "image/jpeg"
    )
    
    if cloud_url.startswith(("error://", "exception://")):
        raise HTTPException(status_code=500, detail="Failed to upload to cloud storage")

    # If it's a signed URL or public URL, we save it. 
    # For profile pics, we prefer a permanent URL if public, but for now we'll store the cloud path or signed URL
    # Actually, SupabaseStorageService.upload_file returns either the public URL (if public) or the bucket path
    # We want a URL we can use in <img> tags.
    
    final_url = cloud_url
    if not cloud_url.startswith("http"):
        # If it returned a path, get a signed URL (long-lived for profile pics)
        bucket, path = cloud_url.split("/", 1)
        final_url = await SupabaseStorageService.get_signed_url(bucket, path, expires_in=31536000) # 1 year

    # Update Database
    async with connect() as conn:
        await conn.execute(
            "UPDATE users SET profile_picture_url = ? WHERE id = ?",
            (final_url, user["id"])
        )
        # If it's a lawyer, sync to lawyer profile too for convenience
        if user["role"] == "lawyer" and user.get("lawyer_id"):
             await conn.execute(
                "UPDATE lawyers SET profile_picture_url = ? WHERE id = ?",
                (final_url, user["lawyer_id"])
            )
        await conn.commit()

    await log_event(user["id"], "user.profile_picture_updated", "user", str(user["id"]), "Updated profile picture")
    
    return {"status": "success", "profile_picture_url": final_url}

@router.patch("/api/users/me")
async def update_my_profile(
    full_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
):
    user = await require_user(x_auth_token)
    db_user = await get_user_by_id(user["id"])
    
    # If NIN is verified, full_name cannot be changed anymore
    if db_user.get("nin_verified") and full_name and full_name != db_user["full_name"]:
        raise HTTPException(status_code=400, detail="Name cannot be changed after NIN verification")

    updates = []
    params = []
    if full_name:
        updates.append("full_name = ?")
        params.append(full_name)
    if phone_number:
        updates.append("phone_number = ?")
        params.append(phone_number)
        
    if not updates:
        return {"status": "no_change"}
        
    params.append(user["id"])
    sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    
    try:
        async with connect() as conn:
            await conn.execute(sql, tuple(params))
            if user["role"] == "lawyer" and user.get("lawyer_id") and full_name:
                await conn.execute("UPDATE lawyers SET full_name = ? WHERE id = ?", (full_name, user["lawyer_id"]))
            await conn.commit()
    except Exception as e:
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="Phone number already in use")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

    return {"status": "success"}
