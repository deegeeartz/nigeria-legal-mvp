from fastapi import APIRouter, Header, HTTPException, File, Form, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, RedirectResponse
from typing import Optional
import os
from datetime import UTC, datetime

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
    require_admin,
)
from app.db import (
    get_lawyer,
    save_lawyer,
    get_latest_kyc_status,
    list_pending_kyc_submissions,
    upsert_kyc_status,
    get_lawyer_user_ids,
    create_kyc_document,
    get_kyc_document,
    get_kyc_document_url,
    get_user_by_id,
    get_user_by_nin,
    save_user,
    hash_pii,
    encrypt_pii,
)
from app.models import (
    KycStatusResponse,
    KycVerifyRequest,
)
from app.services.email_service import send_kyc_status_email
from app.security import scan_upload_for_malware, MalwareDetectedError, MalwareScanError

MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

router = APIRouter(prefix="/api/kyc", tags=["kyc"])

def _simulate_nin_lookup(nin: str) -> dict[str, str] | None:
    """Mock-simulates the NIMC API response for a successful NIN lookup."""
    if not nin or len(nin.strip()) != 11 or not nin.strip().isdigit():
        return None
        
    # In a real app, this would hit NIMC via a provider like Smile ID or Appruve
    # We'll mock it here. For simulation, the last 4 digits "0027" will return "Adamu Musa"
    if nin.endswith("0027"):
        return {"full_name": "Adamu Musa", "nin": nin}
    if nin.endswith("1234"):
        return {"full_name": "Chinelu Okafor", "nin": nin}
    
    # Generic valid but unknown response
    return {"full_name": "Verified Citizen", "nin": nin}

def _simulate_nin_verification(nin: str, full_name: str) -> bool:
    res = _simulate_nin_lookup(nin)
    return res is not None

@router.post("/submit", response_model=KycStatusResponse)
async def submit_kyc(
    enrollment_number: str = Form(...),
    certificate_file: UploadFile = File(...),
    nin: Optional[str] = Form(default=None),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    user = await require_user(x_auth_token)
    if user["role"] != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer role required")
    
    lawyer_id = user.get("lawyer_id")
    if not lawyer_id:
        raise HTTPException(status_code=400, detail="User is not linked to a lawyer profile")
        
    lawyer = await get_lawyer(lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")

    allowed_types = {"application/pdf", "image/jpeg", "image/png"}
    if certificate_file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, and PNG are allowed.")

    file_bytes = await certificate_file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Certificate file is empty")
    if len(file_bytes) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Certificate exceeds 10MB limit")

    try:
        scan_upload_for_malware(file_bytes)
    except MalwareDetectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except MalwareScanError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
        
    uploaded = await create_kyc_document(
        lawyer_id=lawyer_id,
        uploaded_by_user_id=user["id"],
        original_filename=certificate_file.filename or "certificate",
        content_type=certificate_file.content_type or "application/octet-stream",
        file_bytes=file_bytes,
    )
        
    lawyer.enrollment_number = enrollment_number
    lawyer.verification_document_id = uploaded["id"]
    lawyer.kyc_submission_status = "pending"
    
    if nin:
        lawyer.nin = nin

    # Ensure a KYC event is logged so status lookups succeed
    await upsert_kyc_status(
        lawyer_id=lawyer_id,
        nin_verified=None, # Keep existing NIN status from submit logic if any
        nba_verified=False, # Reset/Pending until reviewed
        bvn_verified=None, # Keep existing
        note=f"KYC document submitted: {uploaded['original_filename']} (Enrollment: {enrollment_number})"
    )

    await save_lawyer(lawyer)
    
    updated = await get_latest_kyc_status(lawyer_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Status not found")

    await log_event(user["id"], "kyc.submitted", "lawyer", lawyer_id, "Lawyer submitted KYC and Call to Bar certificate for admin review")
    await notify_users(
        await get_lawyer_user_ids(lawyer_id),
        kind="kyc_updated",
        title="KYC Submission Received",
        body="Your Call to Bar certificate has been received and is pending admin review.",
        resource_type="lawyer",
        resource_id=lawyer_id,
    )

    return KycStatusResponse(**updated)


@router.post("/nin/verify", response_model=KycStatusResponse)
async def verify_nin(
    nin: str = Form(...),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    user = await require_user(x_auth_token)
    db_user = await get_user_by_id(user["id"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 1. Global Collision Check
    nin_hash = hash_pii(nin)
    existing_user = await get_user_by_nin(nin_hash)
    if existing_user and existing_user["id"] != user["id"]:
        raise HTTPException(
            status_code=409, 
            detail="This NIN is already registered to another account. Duplicate identities are not permitted."
        )

    # 2. NIN Lookup & Identity Auto-Population
    lookup = _simulate_nin_lookup(nin)
    if not lookup:
        raise HTTPException(status_code=400, detail="Invalid NIN format or could not be verified with NIMC")

    official_name = lookup["full_name"]
    is_valid = True

    # 3. Save to User Profile (The "Lock")
    await save_user(
        user_id=user["id"],
        full_name=official_name, # Auto-populate!
        phone_number=db_user.get("phone_number"),
        profile_picture_url=db_user.get("profile_picture_url"),
        nin_verified=True,
        nin_encrypted=encrypt_pii(nin),
        nin_hash=nin_hash
    )

    # 4. If Lawyer, sync to Lawyer profile too
    if user["role"] == "lawyer" and user.get("lawyer_id"):
        lawyer_id = user["lawyer_id"]
        lawyer = await get_lawyer(lawyer_id)
        if lawyer:
            lawyer.full_name = official_name
            lawyer.nin = nin
            lawyer.nin_verified = True
            await save_lawyer(lawyer)
            
            # Upsert the specific KYC event
            await upsert_kyc_status(
                lawyer_id=lawyer_id,
                nin_verified=True,
                nba_verified=None,
                bvn_verified=None,
                note="NIN verified and profile auto-populated from official record."
            )
            
            await log_event(user["id"], "kyc.nin_verified", "lawyer", lawyer_id, f"NIN verified for lawyer: {official_name}")
            
    await log_event(user["id"], "user.nin_verified", "user", str(user["id"]), f"NIN verified for user: {official_name}")

    if user["role"] == "lawyer" and user.get("lawyer_id"):
        updated = await get_latest_kyc_status(user["lawyer_id"])
        return KycStatusResponse(**updated)
    
    # For clients, return a generic success status in KycStatusResponse format
    return KycStatusResponse(
        lawyer_id="client",
        nin_verified=True,
        nba_verified=False,
        bvn_verified=False,
        updated_on=datetime.now(UTC),
        kyc_submission_status="verified",
        note="Client NIN verified and profile auto-populated from official record."
    )


@router.get("/pending")
async def list_pending_kyc(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[dict]:
    await require_admin(x_auth_token)
    return await list_pending_kyc_submissions()


@router.post("/verify", response_model=KycStatusResponse)
async def verify_kyc(
    payload: KycVerifyRequest,
    background_tasks: BackgroundTasks,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    admin_user = await require_admin(x_auth_token)
    updated = await upsert_kyc_status(
        payload.lawyer_id,
        payload.nin_verified,
        payload.nba_verified,
        payload.bvn_verified,
        payload.note,
    )
    if updated is None or "error" in updated:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    await log_event(admin_user["id"], "kyc.updated", "lawyer", payload.lawyer_id, "Lawyer KYC verification updated")
    await notify_users(
        await get_lawyer_user_ids(payload.lawyer_id),
        kind="kyc_updated",
        title="KYC profile updated",
        body=f"Verification status for lawyer {payload.lawyer_id} was updated.",
        resource_type="lawyer",
        resource_id=payload.lawyer_id,
    )
    
    lawyer_user_ids = await get_lawyer_user_ids(payload.lawyer_id)
    if lawyer_user_ids:
        lawyer_user = await get_user_by_id(lawyer_user_ids[0])
        if lawyer_user:
            # Determine general status
            status_text = "Verified" if (payload.nba_verified and payload.nin_verified) else "Pending / Partially Verified"
            if payload.nba_verified is False and payload.nin_verified is False:
                status_text = "Rejected"
            background_tasks.add_task(send_kyc_status_email, lawyer_user["email"], lawyer_user["full_name"], status_text, payload.note)

    return KycStatusResponse(**updated)


@router.get("/{lawyer_id}", response_model=KycStatusResponse)
async def get_kyc(lawyer_id: str, x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> KycStatusResponse:
    await require_user(x_auth_token)
    status = await get_latest_kyc_status(lawyer_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return KycStatusResponse(**status)


@router.get("/{lawyer_id}/certificate/download")
async def download_kyc_certificate(
    lawyer_id: str,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> FileResponse:
    user = await require_user(x_auth_token)
    if user["role"] != "admin" and not (user["role"] == "lawyer" and user.get("lawyer_id") == lawyer_id):
        raise HTTPException(status_code=403, detail="KYC certificate access denied")

    lawyer = await get_lawyer(lawyer_id)
    if lawyer is None or lawyer.verification_document_id is None:
        raise HTTPException(status_code=404, detail="KYC certificate not found")

    document = await get_kyc_document(lawyer.verification_document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="KYC certificate not found")

    url = await get_kyc_document_url(document)
    if url.startswith("http"):
        return RedirectResponse(url=url)
        
    # Local fallback
    if url.startswith("/api/kyc/documents/"):
        # For local files, storage_key is the filename
        from app.repos.connection import UPLOADS_DIR
        file_path = UPLOADS_DIR / document["storage_key"]
        
        if not file_path.exists():
             raise HTTPException(status_code=404, detail="Local file missing")
             
        return FileResponse(
            path=str(file_path),
            media_type=document["content_type"],
            filename=document["original_filename"],
        )
    
    raise HTTPException(status_code=404, detail="Document could not be retrieved")
