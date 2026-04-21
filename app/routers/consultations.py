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
    create_milestone,
    list_milestones,
    create_consultation_note,
    list_consultation_notes,
)
from app.models import (
    ConsultationCreateRequest,
    ConsultationStatusUpdateRequest,
    ConsultationNoteCreateRequest,
    ConsultationNoteResponse,
)
from app.services.document_service import generate_engagement_letter
from app.security import scan_upload_for_malware, MalwareDetectedError, MalwareScanError


MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

router = APIRouter(tags=["consultations"])


def _scheduled_for_as_str(value: object) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


@router.get("/api/consultations", response_model=list[ConsultationResponse])
async def list_consultations_endpoint(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConsultationResponse]:
    user = await require_user(x_auth_token)
    return [
        ConsultationResponse(
            consultation_id=item["id"],
            client_user_id=item["client_user_id"],
            lawyer_id=item["lawyer_id"],
            scheduled_for=_scheduled_for_as_str(item["scheduled_for"]),
            summary=item["summary"],
            status=item["status"],
            created_on=item["created_on"],
            opposing_party_name=item.get("opposing_party_name"),
        )
        for item in await list_consultations_for_user(user)
    ]


@router.post("/api/consultations", response_model=ConsultationResponse)
async def book_consultation(
    payload: ConsultationCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = await require_client(x_auth_token)
    consultation = await create_consultation(
        user["id"], 
        payload.lawyer_id, 
        payload.scheduled_for, 
        payload.summary,
        opposing_party_name=payload.opposing_party_name
    )
    if consultation is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    # Conflict of Interest Check
    if payload.opposing_party_name:
        conflicts = await check_conflict(payload.lawyer_id, payload.opposing_party_name)
        if conflicts:
            await log_event(
                user["id"], 
                "consultation.conflict_alert", 
                "consultation", 
                str(consultation["id"]), 
                f"POTENTIAL CONFLICT: Lawyer has {len(conflicts)} past consultation(s) involving opposing party '{payload.opposing_party_name}'"
            )

    await log_event(user["id"], "consultation.booked", "consultation", str(consultation["id"]), "Consultation booked")
    await notify_users(
        await list_consultation_participant_user_ids(consultation["id"]),
        kind="consultation_booked",
        title="Consultation booked",
        body=f"Consultation scheduled for {payload.scheduled_for}",
        resource_type="consultation",
        resource_id=str(consultation["id"]),
    )

    # Automatically generate Engagement Letter (NBA Requirement)
    try:
        await generate_engagement_letter(consultation["id"])
        await log_event(user["id"], "document.generated", "consultation", str(consultation["id"]), "Engagement letter auto-generated")
    except Exception as e:
        # Log but don't fail the booking if PDF generation fails
        await log_event(user["id"], "document.generation_failed", "consultation", str(consultation["id"]), f"PDF generation error: {str(e)}")

    return ConsultationResponse(
        consultation_id=consultation["id"],
        client_user_id=consultation["client_user_id"],
        lawyer_id=consultation["lawyer_id"],
        scheduled_for=_scheduled_for_as_str(consultation["scheduled_for"]),
        summary=consultation["summary"],
        status=consultation["status"],
        created_on=consultation["created_on"],
        opposing_party_name=consultation.get("opposing_party_name"),
    )


@router.get("/api/consultations/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation_endpoint(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    consultation = await get_consultation(consultation_id)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return ConsultationResponse(
        consultation_id=consultation["id"],
        client_user_id=consultation["client_user_id"],
        lawyer_id=consultation["lawyer_id"],
        scheduled_for=_scheduled_for_as_str(consultation["scheduled_for"]),
        summary=consultation["summary"],
        status=consultation["status"],
        created_on=consultation["created_on"],
        opposing_party_name=consultation.get("opposing_party_name"),
    )


@router.patch("/api/consultations/{consultation_id}/status", response_model=ConsultationResponse)
async def update_consultation_status_endpoint(
    consultation_id: int,
    payload: ConsultationStatusUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    consultation = await get_consultation(consultation_id)
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
    updated = await update_consultation_status(consultation_id, payload.status.value)
    if updated is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    await log_event(
        user["id"],
        "consultation.status_updated",
        "consultation",
        str(consultation_id),
        f"Status changed to {payload.status.value}",
    )
    await notify_users(
        await list_consultation_participant_user_ids(consultation_id),
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
        scheduled_for=_scheduled_for_as_str(updated["scheduled_for"]),
        summary=updated["summary"],
        status=updated["status"],
        created_on=updated["created_on"],
        opposing_party_name=updated.get("opposing_party_name"),
    )


@router.post("/api/consultations/{consultation_id}/documents", response_model=DocumentResponse)
async def upload_consultation_document(
    consultation_id: int,
    document_label: str = Form(default="supporting_document"),
    file: UploadFile = File(...),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DocumentResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Document file is empty")
    if len(file_bytes) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Document exceeds 10MB limit")

    try:
        scan_upload_for_malware(file_bytes)
    except MalwareDetectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except MalwareScanError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    document = await create_document(
        consultation_id=consultation_id,
        uploaded_by_user_id=user["id"],
        document_label=document_label,
        original_filename=file.filename or "document",
        content_type=file.content_type or "application/octet-stream",
        file_bytes=file_bytes,
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    await log_event(user["id"], "document.uploaded", "document", str(document["id"]), f"Uploaded {document['original_filename']}")
    await notify_users(
        await list_consultation_participant_user_ids(consultation_id),
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
async def list_consultation_documents(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DocumentResponse]:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
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
        for item in await list_documents_for_consultation(consultation_id)
    ]


@router.get("/api/documents/{document_id}/download")
async def download_document(
    document_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> FileResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_document(user, document_id):
        raise HTTPException(status_code=403, detail="Document access denied")
    document = await get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    file_path = get_document_file_path(document)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored document not found")
    await log_event(user["id"], "document.downloaded", "document", str(document_id), f"Downloaded {document['original_filename']}")
    return FileResponse(
        path=file_path,
        media_type=document["content_type"],
        filename=document["original_filename"],
    )


@router.post("/api/consultations/{consultation_id}/milestones", response_model=MilestoneResponse)
async def add_milestone(
    consultation_id: int,
    payload: MilestoneCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> MilestoneResponse:
    user = await require_user(x_auth_token)
    if user["role"] not in ["lawyer", "admin"]:
        raise HTTPException(status_code=403, detail="Only lawyers and admins can add milestones")
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    milestone = await create_milestone(consultation_id, payload.event_name, payload.status_label, payload.description)
    await log_event(user["id"], "consultation.milestone_added", "consultation", str(consultation_id), f"Added milestone: {payload.event_name}")
    await notify_users(
        await list_consultation_participant_user_ids(consultation_id),
        kind="consultation_booked",
        title="New Case Milestone",
        body=f"Milestone added: {payload.event_name}",
        resource_type="consultation",
        resource_id=str(consultation_id),
        exclude_user_id=user["id"],
    )
    return MilestoneResponse(**milestone)


@router.get("/api/consultations/{consultation_id}/milestones", response_model=list[MilestoneResponse])
async def get_milestones_endpoint(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[MilestoneResponse]:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    return [MilestoneResponse(**m) for m in await list_milestones(consultation_id)]


@router.post("/api/consultations/{consultation_id}/notes", response_model=ConsultationNoteResponse)
async def add_note(
    consultation_id: int,
    payload: ConsultationNoteCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsultationNoteResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    if payload.is_private and user["role"] != "lawyer" and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only lawyers and admins can create private notes")

    note = await create_consultation_note(consultation_id, user["id"], payload.body, payload.is_private)
    await log_event(user["id"], "consultation.note_added", "consultation", str(consultation_id), "Added a progress note")
    
    if not payload.is_private:
          await notify_users(
                await list_consultation_participant_user_ids(consultation_id),
            kind="consultation_booked",
            title="New Case Update",
            body="A new progress note has been added to your case.",
            resource_type="consultation",
            resource_id=str(consultation_id),
            exclude_user_id=user["id"],
        )
    return ConsultationNoteResponse(**note)


@router.get("/api/consultations/{consultation_id}/notes", response_model=list[ConsultationNoteResponse])
async def get_notes_endpoint(
    consultation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConsultationNoteResponse]:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    lawyer_id = user["lawyer_id"] if user["role"] == "lawyer" else None
    notes = await list_consultation_notes(consultation_id, user_id=user["id"], lawyer_id=lawyer_id)
    return [ConsultationNoteResponse(**n) for n in notes]

