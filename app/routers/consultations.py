from fastapi import APIRouter, Header, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse
from typing import Optional

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
    require_client,
)
from app.db import (
    create_consultation,
    get_consultation,
    update_consultation_status,
    list_consultations_for_user,
    user_can_access_consultation,
    list_consultation_participant_user_ids,
    create_document,
    get_document,
    user_can_access_document,
    list_documents_for_consultation,
    get_document_file_path,
)
from app.models import (
    ConsultationCreateRequest,
    ConsultationStatusUpdateRequest,
    ConsultationResponse,
    DocumentResponse,
)

MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

router = APIRouter(tags=["consultations"])


@router.get("/api/consultations", response_model=list[ConsultationResponse])
def list_consultations_endpoint(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConsultationResponse]:
    user = require_user(x_auth_token)
    return [
        ConsultationResponse(
            consultation_id=item["id"],
            client_user_id=item["client_user_id"],
            lawyer_id=item["lawyer_id"],
            scheduled_for=item["scheduled_for"],
            summary=item["summary"],
            status=item["status"],
            created_on=item["created_on"],
        )
        for item in list_consultations_for_user(user)
    ]


@router.post("/api/consultations", response_model=ConsultationResponse)
def book_consultation(
    payload: ConsultationCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = require_client(x_auth_token)
    consultation = create_consultation(user["id"], payload.lawyer_id, payload.scheduled_for, payload.summary)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    log_event(user["id"], "consultation.booked", "consultation", str(consultation["id"]), "Consultation booked")
    notify_users(
        list_consultation_participant_user_ids(consultation["id"]),
        kind="consultation_booked",
        title="Consultation booked",
        body=f"Consultation scheduled for {payload.scheduled_for}",
        resource_type="consultation",
        resource_id=str(consultation["id"]),
    )
    return ConsultationResponse(
        consultation_id=consultation["id"],
        client_user_id=consultation["client_user_id"],
        lawyer_id=consultation["lawyer_id"],
        scheduled_for=consultation["scheduled_for"],
        summary=consultation["summary"],
        status=consultation["status"],
        created_on=consultation["created_on"],
    )


@router.get("/api/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation_endpoint(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    consultation = get_consultation(consultation_id)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return ConsultationResponse(
        consultation_id=consultation["id"],
        client_user_id=consultation["client_user_id"],
        lawyer_id=consultation["lawyer_id"],
        scheduled_for=consultation["scheduled_for"],
        summary=consultation["summary"],
        status=consultation["status"],
        created_on=consultation["created_on"],
    )


@router.patch("/api/consultations/{consultation_id}/status", response_model=ConsultationResponse)
def update_consultation_status_endpoint(
    consultation_id: int,
    payload: ConsultationStatusUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    consultation = get_consultation(consultation_id)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    # Only lawyers and admins may mark completed; clients may only cancel
    allowed: dict[str, list[str]] = {
        "admin": ["pending", "booked", "completed", "cancelled"],
        "lawyer": ["completed", "cancelled"],
        "client": ["cancelled"],
    }
    if payload.status.value not in allowed.get(user["role"], []):
        raise HTTPException(status_code=403, detail="Status transition not allowed for your role")
    updated = update_consultation_status(consultation_id, payload.status.value)
    if updated is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    log_event(
        user["id"],
        "consultation.status_updated",
        "consultation",
        str(consultation_id),
        f"Status changed to {payload.status.value}",
    )
    notify_users(
        list_consultation_participant_user_ids(consultation_id),
        kind="consultation_booked",
        title="Consultation status updated",
        body=f"Consultation #{consultation_id} is now {payload.status.value}.",
        resource_type="consultation",
        resource_id=str(consultation_id),
        exclude_user_id=user["id"],
    )
    return ConsultationResponse(
        consultation_id=updated["id"],
        client_user_id=updated["client_user_id"],
        lawyer_id=updated["lawyer_id"],
        scheduled_for=updated["scheduled_for"],
        summary=updated["summary"],
        status=updated["status"],
        created_on=updated["created_on"],
    )


@router.post("/api/consultations/{consultation_id}/documents", response_model=DocumentResponse)
async def upload_consultation_document(
    consultation_id: int,
    document_label: str = Form(default="supporting_document"),
    file: UploadFile = File(...),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DocumentResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Document file is empty")
    if len(file_bytes) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Document exceeds 10MB limit")

    document = create_document(
        consultation_id=consultation_id,
        uploaded_by_user_id=user["id"],
        document_label=document_label,
        original_filename=file.filename or "document",
        content_type=file.content_type or "application/octet-stream",
        file_bytes=file_bytes,
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    log_event(user["id"], "document.uploaded", "document", str(document["id"]), f"Uploaded {document['original_filename']}")
    notify_users(
        list_consultation_participant_user_ids(consultation_id),
        kind="document_uploaded",
        title="New consultation document",
        body=f"{document['original_filename']} was uploaded to the consultation.",
        resource_type="document",
        resource_id=str(document["id"]),
        exclude_user_id=user["id"],
    )

    return DocumentResponse(
        document_id=document["id"],
        consultation_id=document["consultation_id"],
        uploaded_by_user_id=document["uploaded_by_user_id"],
        document_label=document["document_label"],
        original_filename=document["original_filename"],
        content_type=document["content_type"],
        size_bytes=document["size_bytes"],
        created_on=document["created_on"],
    )


@router.get("/api/consultations/{consultation_id}/documents", response_model=list[DocumentResponse])
def list_consultation_documents(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DocumentResponse]:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    return [
        DocumentResponse(
            document_id=item["id"],
            consultation_id=item["consultation_id"],
            uploaded_by_user_id=item["uploaded_by_user_id"],
            document_label=item["document_label"],
            original_filename=item["original_filename"],
            content_type=item["content_type"],
            size_bytes=item["size_bytes"],
            created_on=item["created_on"],
        )
        for item in list_documents_for_consultation(consultation_id)
    ]


@router.get("/api/documents/{document_id}/download")
def download_document(
    document_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> FileResponse:
    user = require_user(x_auth_token)
    if not user_can_access_document(user, document_id):
        raise HTTPException(status_code=403, detail="Document access denied")
    document = get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    file_path = get_document_file_path(document)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored document not found")
    log_event(user["id"], "document.downloaded", "document", str(document_id), f"Downloaded {document['original_filename']}")
    return FileResponse(
        path=file_path,
        media_type=document["content_type"],
        filename=document["original_filename"],
    )
