from fastapi import APIRouter, Header, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse
from typing import Optional

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
    get_kyc_document_file_path,
)
from app.models import (
    KycStatusResponse,
    KycVerifyRequest,
)

MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

router = APIRouter(prefix="/api/kyc", tags=["kyc"])

def _simulate_nin_verification(nin: str, full_name: str) -> bool:
    if not nin:
        return False
    return len(nin.strip()) == 11 and nin.strip().isdigit()

@router.post("/submit", response_model=KycStatusResponse)
async def submit_kyc(
    enrollment_number: str = Form(...),
    certificate_file: UploadFile = File(...),
    nin: Optional[str] = Form(default=None),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    user = require_user(x_auth_token)
    if user["role"] != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer role required")
    
    lawyer_id = user.get("lawyer_id")
    if not lawyer_id:
        raise HTTPException(status_code=400, detail="User is not linked to a lawyer profile")
        
    lawyer = get_lawyer(lawyer_id)
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
        
    uploaded = create_kyc_document(
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
        lawyer.nin_verified = _simulate_nin_verification(nin, lawyer.full_name)

    save_lawyer(lawyer)
    
    updated = get_latest_kyc_status(lawyer_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Status not found")

    log_event(user["id"], "kyc.submitted", "lawyer", lawyer_id, "Lawyer submitted KYC and Call to Bar certificate for admin review")
    notify_users(
        get_lawyer_user_ids(lawyer_id),
        kind="kyc_updated",
        title="KYC Submission Received",
        body="Your Call to Bar certificate has been received and is pending admin review.",
        resource_type="lawyer",
        resource_id=lawyer_id,
    )

    return KycStatusResponse(**updated)


@router.post("/nin/verify", response_model=KycStatusResponse)
def verify_nin(
    nin: str = Form(...),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    user = require_user(x_auth_token)
    if user["role"] != "lawyer":
        raise HTTPException(status_code=403, detail="Lawyer role required")

    lawyer_id = user.get("lawyer_id")
    if not lawyer_id:
        raise HTTPException(status_code=400, detail="User is not linked to a lawyer profile")

    lawyer = get_lawyer(lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")

    is_valid = _simulate_nin_verification(nin, lawyer.full_name)
    lawyer.nin = nin
    lawyer.nin_verified = is_valid
    save_lawyer(lawyer)

    log_event(user["id"], "kyc.nin_verified", "lawyer", lawyer_id, f"NIN verification result: {is_valid}")

    updated = get_latest_kyc_status(lawyer_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Status not found")
    return KycStatusResponse(**updated)


@router.get("/pending")
def list_pending_kyc(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[dict]:
    require_admin(x_auth_token)
    return list_pending_kyc_submissions()


@router.post("/verify", response_model=KycStatusResponse)
def verify_kyc(
    payload: KycVerifyRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> KycStatusResponse:
    admin_user = require_admin(x_auth_token)
    updated = upsert_kyc_status(
        payload.lawyer_id,
        payload.nin_verified,
        payload.nba_verified,
        payload.bvn_verified,
        payload.note,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    log_event(admin_user["id"], "kyc.updated", "lawyer", payload.lawyer_id, "Lawyer KYC verification updated")
    notify_users(
        get_lawyer_user_ids(payload.lawyer_id),
        kind="kyc_updated",
        title="KYC profile updated",
        body=f"Verification status for lawyer {payload.lawyer_id} was updated.",
        resource_type="lawyer",
        resource_id=payload.lawyer_id,
    )

    return KycStatusResponse(**updated)


@router.get("/{lawyer_id}", response_model=KycStatusResponse)
def get_kyc(lawyer_id: str, x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> KycStatusResponse:
    require_user(x_auth_token)
    status = get_latest_kyc_status(lawyer_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return KycStatusResponse(**status)


@router.get("/{lawyer_id}/certificate/download")
def download_kyc_certificate(
    lawyer_id: str,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> FileResponse:
    user = require_user(x_auth_token)
    if user["role"] != "admin" and not (user["role"] == "lawyer" and user.get("lawyer_id") == lawyer_id):
        raise HTTPException(status_code=403, detail="KYC certificate access denied")

    lawyer = get_lawyer(lawyer_id)
    if lawyer is None or lawyer.verification_document_id is None:
        raise HTTPException(status_code=404, detail="KYC certificate not found")

    document = get_kyc_document(lawyer.verification_document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="KYC certificate not found")

    file_path = get_kyc_document_file_path(document)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored KYC certificate not found")

    return FileResponse(
        path=file_path,
        media_type=document["content_type"],
        filename=document["original_filename"],
    )
