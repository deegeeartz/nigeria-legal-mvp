from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query, UploadFile, File
from fastapi.responses import Response

from app.dependencies import log_event, require_dpo_or_admin, require_user
from app.db import (
    build_dsr_export_bundle,
    create_consent_event,
    create_breach_incident,
    create_dsr_correction_request,
    create_dsr_request,
    execute_dsr_deletion,
    get_breach_incident,
    get_user_by_id,
    list_breach_incidents,
    list_breach_incidents_by_sla_status,
    check_breach_sla_status,
    trigger_breach_escalation,
    list_consent_events_for_user,
    list_dsr_corrections,
    list_dsr_corrections_for_user,
    list_dsr_requests,
    list_dsr_requests_for_user,
    review_dsr_correction,
    run_retention_job,
    update_breach_incident,
    update_dsr_request_status,
    get_lawyer,
    upsert_practice_seal,
    get_latest_practice_seal,
    list_compliant_lawyers,
    list_seal_events,
    UPLOADS_DIR,
)
from app.repos.compliance import get_practice_seal
from app.models import (
    BreachIncidentCreateRequest,
    BreachIncidentResponse,
    BreachIncidentUpdateRequest,
    BreachSlaStatusResponse,
    ConsentEventCreateRequest,
    ConsentEventResponse,
    DsrCorrectionCreateRequest,
    DsrCorrectionResponse,
    DsrCorrectionReviewRequest,
    DsrRequestCreateRequest,
    DsrDeletionExecuteRequest,
    DsrDeletionExecuteResponse,
    DsrExportResponse,
    DsrRequestResponse,
    DsrRequestStatusUpdateRequest,
    RetentionRunRequest,
    RetentionRunResponse,
    PracticeSealUploadRequest,
    PracticeSealResponse,
    PracticeSealCheckResponse,
)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


def _to_consent_response(item: dict) -> ConsentEventResponse:
    return ConsentEventResponse(
        consent_event_id=item["id"],
        user_id=item["user_id"],
        purpose=item["purpose"],
        lawful_basis=item["lawful_basis"],
        consented=bool(item["consented"]),
        policy_version=item["policy_version"],
        metadata_json=item.get("metadata_json"),
        created_on=item["created_on"],
    )


def _to_dsr_response(item: dict) -> DsrRequestResponse:
    return DsrRequestResponse(
        dsr_request_id=item["id"],
        user_id=item["user_id"],
        request_type=item["request_type"],
        status=item["status"],
        detail=item["detail"],
        created_on=item["created_on"],
        updated_on=item["updated_on"],
        resolved_on=item.get("resolved_on"),
        resolution_note=item.get("resolution_note"),
        resolved_by_user_id=item.get("resolved_by_user_id"),
    )


def _to_correction_response(item: dict) -> DsrCorrectionResponse:
    return DsrCorrectionResponse(
        correction_id=item["id"],
        dsr_request_id=item["dsr_request_id"],
        user_id=item["user_id"],
        field_name=item["field_name"],
        current_value=item.get("current_value"),
        requested_value=item["requested_value"],
        justification=item["justification"],
        evidence=item.get("evidence"),
        status=item["status"],
        review_note=item.get("review_note"),
        reviewed_by_user_id=item.get("reviewed_by_user_id"),
        reviewed_on=item.get("reviewed_on"),
        created_on=item["created_on"],
        updated_on=item["updated_on"],
    )


def _to_breach_response(item: dict) -> BreachIncidentResponse:
    from datetime import datetime
    
    # Helper to convert datetime objects to ISO format strings
    def to_iso_str(val):
        if isinstance(val, datetime):
            return val.isoformat()
        return val
    
    return BreachIncidentResponse(
        breach_incident_id=item["id"],
        title=item["title"],
        severity=item["severity"],
        status=item["status"],
        description=item["description"],
        impact_summary=item.get("impact_summary"),
        affected_data_types=item.get("affected_data_types"),
        affected_records=item.get("affected_records"),
        occurred_on=item.get("occurred_on"),
        detected_on=item["detected_on"],
        reported_to_ndpc=bool(item["reported_to_ndpc"]),
        ndpc_reported_on=item.get("ndpc_reported_on"),
        contained_on=item.get("contained_on"),
        resolved_on=item.get("resolved_on"),
        resolution_note=item.get("resolution_note"),
        notification_deadline=to_iso_str(item.get("notification_deadline")),
        escalation_triggered=bool(item.get("escalation_triggered", False)),
        escalation_triggered_at=to_iso_str(item.get("escalation_triggered_at")),
        sla_status=item.get("sla_status"),
        days_until_deadline=item.get("days_until_deadline"),
        created_by_user_id=item["created_by_user_id"],
        updated_by_user_id=item["updated_by_user_id"],
        created_on=item["created_on"],
        updated_on=item["updated_on"],
    )


@router.post("/consents", response_model=ConsentEventResponse)
async def create_consent(
    payload: ConsentEventCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsentEventResponse:
    user = await require_user(x_auth_token)
    metadata_json = json.dumps(payload.metadata, ensure_ascii=False) if payload.metadata is not None else None
    created = await create_consent_event(
        user_id=user["id"],
        purpose=payload.purpose,
        lawful_basis=payload.lawful_basis,
        consented=payload.consented,
        policy_version=payload.policy_version,
        metadata_json=metadata_json,
    )
    await log_event(user["id"], "compliance.consent_recorded", "consent_event", str(created["id"]), "Consent event recorded")
    return _to_consent_response(created)


@router.get("/consents/me", response_model=list[ConsentEventResponse])
async def list_my_consents(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConsentEventResponse]:
    user = await require_user(x_auth_token)
    rows = await list_consent_events_for_user(user["id"], limit)
    return [_to_consent_response(item) for item in rows]


@router.post("/dsr-requests", response_model=DsrRequestResponse)
async def create_dsr(
    payload: DsrRequestCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrRequestResponse:
    user = await require_user(x_auth_token)
    created = await create_dsr_request(user["id"], payload.request_type, payload.detail)
    await log_event(user["id"], "compliance.dsr_created", "dsr_request", str(created["id"]), "Data subject request submitted")
    return _to_dsr_response(created)


@router.get("/dsr-requests/me", response_model=list[DsrRequestResponse])
async def list_my_dsr_requests(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrRequestResponse]:
    user = await require_user(x_auth_token)
    rows = await list_dsr_requests_for_user(user["id"], limit)
    return [_to_dsr_response(item) for item in rows]


@router.get("/dsr-requests", response_model=list[DsrRequestResponse])
async def list_all_dsr_requests(
    status: str | None = Query(default=None, pattern="^(submitted|in_review|completed|rejected)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrRequestResponse]:
    await require_dpo_or_admin(x_auth_token)
    rows = await list_dsr_requests(status, limit)
    return [_to_dsr_response(item) for item in rows]


@router.patch("/dsr-requests/{dsr_request_id}", response_model=DsrRequestResponse)
async def update_dsr_request(
    dsr_request_id: int,
    payload: DsrRequestStatusUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrRequestResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    updated = await update_dsr_request_status(dsr_request_id, payload.status, payload.resolution_note, admin_user["id"])
    if updated is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    await log_event(admin_user["id"], "compliance.dsr_updated", "dsr_request", str(dsr_request_id), f"DSR updated to {payload.status}")
    return _to_dsr_response(updated)


@router.post("/retention/run", response_model=RetentionRunResponse)
async def run_retention(
    payload: RetentionRunRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> RetentionRunResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    result = await run_retention_job(payload.retention_days, payload.dry_run)
    await log_event(
        admin_user["id"],
        "compliance.retention_run",
        "retention_job",
        None,
        f"Retention run executed: days={payload.retention_days}, dry_run={payload.dry_run}",
    )
    return RetentionRunResponse(**result)


@router.get("/dsr-requests/{dsr_request_id}/export", response_model=DsrExportResponse)
async def export_dsr_request_data(
    dsr_request_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrExportResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    bundle = await build_dsr_export_bundle(dsr_request_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    await log_event(admin_user["id"], "compliance.dsr_exported", "dsr_request", str(dsr_request_id), "DSR export generated")
    return DsrExportResponse(**bundle)


@router.post("/dsr-requests/{dsr_request_id}/execute-deletion", response_model=DsrDeletionExecuteResponse)
async def execute_dsr_deletion_request(
    dsr_request_id: int,
    payload: DsrDeletionExecuteRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrDeletionExecuteResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    try:
        result = await execute_dsr_deletion(dsr_request_id, admin_user["id"], payload.resolution_note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if result is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    await log_event(admin_user["id"], "compliance.dsr_deletion_executed", "dsr_request", str(dsr_request_id), "DSR deletion executed")
    return DsrDeletionExecuteResponse(**result)


@router.post("/dsr-corrections", response_model=DsrCorrectionResponse)
async def create_dsr_correction(
    payload: DsrCorrectionCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrCorrectionResponse:
    user = await require_user(x_auth_token)
    created = await create_dsr_correction_request(
        user_id=user["id"],
        field_name=payload.field_name,
        requested_value=payload.requested_value,
        justification=payload.justification,
        evidence=payload.evidence,
    )
    await log_event(user["id"], "compliance.dsr_correction_created", "dsr_correction", str(created["id"]), "DSR correction request submitted")
    return _to_correction_response(created)


@router.get("/dsr-corrections/me", response_model=list[DsrCorrectionResponse])
async def list_my_dsr_corrections(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrCorrectionResponse]:
    user = await require_user(x_auth_token)
    rows = await list_dsr_corrections_for_user(user["id"], limit)
    return [_to_correction_response(item) for item in rows]


@router.get("/dsr-corrections", response_model=list[DsrCorrectionResponse])
async def list_all_dsr_corrections(
    status: str | None = Query(default=None, pattern="^(submitted|approved|rejected)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrCorrectionResponse]:
    await require_dpo_or_admin(x_auth_token)
    rows = await list_dsr_corrections(status, limit)
    return [_to_correction_response(item) for item in rows]


@router.patch("/dsr-corrections/{correction_id}", response_model=DsrCorrectionResponse)
async def review_correction_request(
    correction_id: int,
    payload: DsrCorrectionReviewRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrCorrectionResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    try:
        updated = await review_dsr_correction(correction_id, payload.status, payload.review_note, admin_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if updated is None:
        raise HTTPException(status_code=404, detail="DSR correction request not found")
    await log_event(admin_user["id"], "compliance.dsr_correction_reviewed", "dsr_correction", str(correction_id), f"Correction request reviewed: {payload.status}")
    return _to_correction_response(updated)


@router.post("/breach-incidents", response_model=BreachIncidentResponse)
async def create_breach_incident_endpoint(
    payload: BreachIncidentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> BreachIncidentResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    created = await create_breach_incident(
        title=payload.title,
        severity=payload.severity,
        description=payload.description,
        impact_summary=payload.impact_summary,
        affected_data_types=payload.affected_data_types,
        affected_records=payload.affected_records,
        occurred_on=payload.occurred_on,
        detected_on=payload.detected_on,
        actor_user_id=admin_user["id"],
    )
    await log_event(admin_user["id"], "compliance.breach_created", "breach_incident", str(created["id"]), "Breach incident created")
    return _to_breach_response(created)


@router.get("/breach-incidents", response_model=list[BreachIncidentResponse])
async def list_breach_incidents_endpoint(
    status: str | None = Query(default=None, pattern="^(open|investigating|contained|resolved)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[BreachIncidentResponse]:
    await require_dpo_or_admin(x_auth_token)
    rows = await list_breach_incidents(status, limit)
    return [_to_breach_response(item) for item in rows]


@router.patch("/breach-incidents/{breach_incident_id}", response_model=BreachIncidentResponse)
async def update_breach_incident_endpoint(
    breach_incident_id: int,
    payload: BreachIncidentUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> BreachIncidentResponse:
    admin_user = await require_dpo_or_admin(x_auth_token)
    updated = await update_breach_incident(
        breach_incident_id=breach_incident_id,
        actor_user_id=admin_user["id"],
        status=payload.status,
        impact_summary=payload.impact_summary,
        affected_records=payload.affected_records,
        reported_to_ndpc=payload.reported_to_ndpc,
        ndpc_reported_on=payload.ndpc_reported_on,
        contained_on=payload.contained_on,
        resolved_on=payload.resolved_on,
        resolution_note=payload.resolution_note,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Breach incident not found")
    await log_event(admin_user["id"], "compliance.breach_updated", "breach_incident", str(breach_incident_id), f"Breach incident status set to {payload.status}")
    return _to_breach_response(updated)


@router.get("/breach-incidents/sla-status", response_model=list[BreachSlaStatusResponse])
async def list_breach_incidents_sla_status(
    sla_status: Optional[str] = Query(default=None, pattern="^(on-track|at-risk|overdue|notified)$"),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[BreachSlaStatusResponse]:
    """List breach incidents ordered by SLA notification deadline.
    
    Optionally filter by sla_status: on-track, at-risk (<24h), overdue, or notified.
    NDPA requires notification to NDPC within 72 hours of breach discovery.
    """
    from datetime import datetime
    
    def to_iso_str(val):
        if isinstance(val, datetime):
            return val.isoformat()
        return val
    
    await require_dpo_or_admin(x_auth_token)
    breaches = await list_breach_incidents_by_sla_status(sla_status=sla_status)
    return [
        BreachSlaStatusResponse(
            breach_incident_id=b["id"],
            title=b["title"],
            severity=b["severity"],
            status=b["status"],
            detected_on=b["detected_on"],
            notification_deadline=to_iso_str(b.get("notification_deadline")),
            days_until_deadline=b.get("days_until_deadline"),
            sla_status=b.get("sla_status", "on-track"),
            escalation_triggered=b["escalation_triggered"],
            reported_to_ndpc=b["reported_to_ndpc"],
        )
        for b in breaches
    ]


@router.post("/breach-incidents/{breach_incident_id}/escalate", response_model=dict)
async def escalate_breach_incident_sla(
    breach_incident_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    """Trigger escalation alert for a breach incident approaching or past SLA deadline.
    
    Admin-only operation. Sets escalation_triggered flag and logs audit event.
    Recommended when days_until_deadline <= 1 or sla_status == 'overdue'.
    """
    admin_user = await require_dpo_or_admin(x_auth_token)
    
    breach = await get_breach_incident(breach_incident_id)
    if breach is None:
        raise HTTPException(status_code=404, detail="Breach incident not found")
    
    escalated = await trigger_breach_escalation(breach_incident_id, admin_user["id"])
    if escalated is None:
        raise HTTPException(status_code=500, detail="Failed to trigger escalation")
    
    await log_event(
        admin_user["id"],
        "compliance.breach_escalated",
        "breach_incident",
        str(breach_incident_id),
        f"Breach SLA escalation triggered (detected: {breach['detected_on']}, "
        f"deadline: {escalated.get('notification_deadline')})",
    )
    
    return {
        "breach_incident_id": breach_incident_id,
        "escalation_triggered": True,
        "escalation_triggered_at": escalated.get("escalation_triggered_at"),
        "message": "Escalation alert triggered for compliance team",
    }


# ===== PRACTICE SEAL & APL/CPD COMPLIANCE =====

@router.post("/practice-seal/upload", response_model=PracticeSealResponse)
async def upload_practice_seal(
    lawyer_id: str = Query(..., min_length=3, max_length=40),
    practice_year: int = Query(..., ge=2025, le=2030),
    bpf_paid: bool = Query(True),
    cpd_points: int = Query(0, ge=0, le=100),
    seal_document: Optional[UploadFile] = File(None),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    """
    Upload lawyer's annual practice seal (digital stamp & seal document).
    
    This endpoint records NBA-mandated practice compliance for given year:
    - BPF (annual practising list) payment status
    - CPD (continuing professional development) points accumulation
    - Digital seal document (encrypted, not visible to public)
    
    Seal becomes visible on lawyer's public profile once CPD-compliant (bpf_paid AND cpd_points >= 5).
    """
    from app.security import scan_upload_for_malware, encrypt_seal_bytes
    from secrets import token_hex
    
    # Require user (lawyer can upload own seal, admin can upload for any lawyer)
    user = await require_user(x_auth_token)
    
    # Verify lawyer exists
    lawyer = await get_lawyer(lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    # Check authorization: lawyer uploading own seal, admin can upload for any lawyer, clients blocked
    if user["role"] == "lawyer" and user.get("lawyer_id") != lawyer_id:
        raise HTTPException(status_code=403, detail="Cannot upload seal for another lawyer")
    if user["role"] == "client":
        raise HTTPException(status_code=403, detail="Only administrators or the lawyer can upload seals")
    
    # Process seal document if provided
    seal_file_key = None
    seal_mime_type = None
    
    if seal_document:
        from app.db import UPLOADS_DIR
        
        # Read and scan document
        file_bytes = await seal_document.read()
        
        try:
            scan_upload_for_malware(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Malware scan failed or file rejected: {str(e)}")
        
        # Validate MIME type
        allowed_mimes = {"application/pdf", "image/png", "image/jpeg"}
        seal_mime_type = seal_document.content_type or "application/octet-stream"
        if seal_mime_type not in allowed_mimes:
            raise HTTPException(status_code=400, detail=f"Seal document must be PDF, PNG, or JPEG. Got: {seal_mime_type}")
        
        # Validate size (10MB max)
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Seal document must be under 10MB")
        
        # Encrypt and store file with random key
        encrypted_file_bytes = encrypt_seal_bytes(file_bytes)
        seal_file_key = f"seal_{lawyer_id}_{practice_year}_{token_hex(16)}"
        file_path = UPLOADS_DIR / seal_file_key
        file_path.write_bytes(encrypted_file_bytes)
    
    # Upsert seal record
    seal_record = await upsert_practice_seal(
        lawyer_id=lawyer_id,
        practice_year=practice_year,
        bpf_paid=bpf_paid,
        cpd_points=cpd_points,
        seal_file_key=seal_file_key,
        seal_mime_type=seal_mime_type,
        source="manual",
        verified_by_user_id=user["id"] if user["role"] == "admin" else None,
    )
    
    # Log event
    await log_event(
        user["id"],
        "compliance.seal_uploaded",
        "lawyer_practice_seal",
        lawyer_id,
        f"Seal uploaded for {practice_year}: BPF paid={bpf_paid}, CPD points={cpd_points}",
    )
    
    # Convert datetime to ISO string if needed
    def _iso_str(val):
        return val.isoformat() if hasattr(val, 'isoformat') else val
    
    return PracticeSealResponse(
        lawyer_id=seal_record["lawyer_id"],
        practice_year=seal_record["practice_year"],
        bpf_paid=seal_record["bpf_paid"],
        cpd_points=seal_record["cpd_points"],
        cpd_compliant=seal_record["cpd_compliant"],
        aplineligible=seal_record["aplineligible"],
        seal_uploaded_at=_iso_str(seal_record.get("seal_uploaded_at")),
        seal_expires_at=_iso_str(seal_record.get("seal_expires_at")),
        verified_on=_iso_str(seal_record.get("verified_on")) if seal_record.get("verified_on") else None,
        verified_by_user_id=seal_record.get("verified_by_user_id"),
        source=seal_record["source"],
        created_on=_iso_str(seal_record["created_on"]),
        updated_on=_iso_str(seal_record["updated_on"]),
    )


@router.get("/practice-seal/check", response_model=PracticeSealCheckResponse)
async def check_practice_seal(
    lawyer_id: str = Query(..., min_length=3, max_length=40),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    """Check current seal compliance status for lawyer.
    
    Returns whether lawyer has valid seal (not expired) and is CPD-compliant.
    Accessible to public (no auth required) - seal is intended as public trust signal.
    """
    from datetime import datetime, UTC
    
    lawyer = await get_lawyer(lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    seal = await get_latest_practice_seal(lawyer_id)
    
    now = datetime.now(UTC).date().isoformat()
    has_valid_seal = False
    seal_year = None
    cpd_compliant = False
    apl_eligible = False
    
    if seal:
        seal_year = seal.get("practice_year")
        cpd_compliant = seal.get("cpd_compliant", False)
        apl_eligible = seal.get("aplineligible", False)
        
        # Check if seal hasn't expired (expires 31 Dec of practice year)
        expires_at = seal.get("seal_expires_at")
        # Convert expires_at to ISO string for comparison
        if expires_at:
            expires_str = expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at)
            has_valid_seal = expires_str >= now and cpd_compliant
        else:
            has_valid_seal = False
    
    return PracticeSealCheckResponse(
        lawyer_id=lawyer_id,
        has_valid_seal=has_valid_seal,
        seal_year=seal_year,
        cpd_compliant=cpd_compliant,
        apl_eligible=apl_eligible,
        seal_badge_visible=bool(lawyer.latest_seal_year) if lawyer else False,
    )


@router.get("/practice-seal/{lawyer_id}", response_model=PracticeSealResponse | None)
async def get_lawyer_practice_seal(
    lawyer_id: str,
    practice_year: int = Query(..., ge=2025, le=2030),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict | None:
    """Retrieve practice seal record for lawyer in specific year.
    
    Public endpoint (no auth required) - seal compliance info is public trust signal.
    Does NOT return encrypted seal document (file_key is not included).
    """
    seal = await get_practice_seal(lawyer_id, practice_year)
    if seal is None:
        return None
    
    # Convert datetime to ISO string if needed
    def _iso_str(val):
        return val.isoformat() if hasattr(val, 'isoformat') else val
    
    return PracticeSealResponse(
        lawyer_id=seal["lawyer_id"],
        practice_year=seal["practice_year"],
        bpf_paid=seal["bpf_paid"],
        cpd_points=seal["cpd_points"],
        cpd_compliant=seal["cpd_compliant"],
        aplineligible=seal["aplineligible"],
        seal_uploaded_at=_iso_str(seal.get("seal_uploaded_at")),
        seal_expires_at=_iso_str(seal.get("seal_expires_at")),
        verified_on=_iso_str(seal.get("verified_on")) if seal.get("verified_on") else None,
        verified_by_user_id=seal.get("verified_by_user_id"),
        source=seal["source"],
        created_on=_iso_str(seal["created_on"]),
        updated_on=_iso_str(seal["updated_on"]),
    )


@router.get("/practising-list", response_model=list[dict])
async def list_apl_compliant_lawyers(
    practice_year: int = Query(2026),
    limit: int = Query(500, ge=10, le=5000),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[dict]:
    """
    Get list of CPD-compliant lawyers (Annual Practising List equivalent).
    
    Returns lawyers with valid seals for given year:
    - BPF paid (annual practising list eligible)
    - CPD points >= 5 (compliant)
    - Seal not expired
    
    Public endpoint - APL compliance is public record in Nigeria.
    """
    compliant_lawyers = await list_compliant_lawyers(practice_year, limit)
    
    return [
        {
            "lawyer_id": row["lawyer_id"],
            "full_name": row["full_name"],
            "state": row["state"],
            "rating": row["rating"],
            "cpd_points": row["cpd_points"],
            "seal_expires_at": row["seal_expires_at"],
        }
        for row in compliant_lawyers
    ]


@router.post("/practice-seal/{lawyer_id}/verify", response_model=dict)
async def admin_verify_practice_seal(
    lawyer_id: str,
    practice_year: int = Query(..., ge=2025, le=2030),
    bpf_paid: bool = Query(...),
    cpd_points: int = Query(..., ge=0, le=100),
    verification_notes: str = Query("", max_length=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    """
    Admin endpoint: Verify and approve lawyer's practice seal compliance.
    
    Admin-only operation. Used to confirm BPF payment and CPD points from
    external NBA sources or manual audit. Sets verified_on and verified_by_user_id.
    """
    admin_user = await require_dpo_or_admin(x_auth_token)
    
    lawyer = await get_lawyer(lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    # Upsert seal with admin verification
    seal_record = await upsert_practice_seal(
        lawyer_id=lawyer_id,
        practice_year=practice_year,
        bpf_paid=bpf_paid,
        cpd_points=cpd_points,
        source="admin_override",
        verified_by_user_id=admin_user["id"],
        verification_notes=verification_notes,
    )
    
    await log_event(
        admin_user["id"],
        "compliance.seal_verified",
        "lawyer_practice_seal",
        lawyer_id,
        f"Admin verified seal for {practice_year}: BPF={bpf_paid}, CPD={cpd_points}",
    )
    
    return {
        "lawyer_id": seal_record["lawyer_id"],
        "practice_year": seal_record["practice_year"],
        "cpd_compliant": seal_record["cpd_compliant"],
        "verified_on": seal_record.get("verified_on"),
        "verified_by_user_id": seal_record.get("verified_by_user_id"),
        "message": f"Seal verified for {lawyer.full_name}. Compliance status: {'COMPLIANT' if seal_record['cpd_compliant'] else 'NOT COMPLIANT'}",
    }


@router.get("/practice-seal/{lawyer_id}/audit-trail", response_model=list[dict])
async def get_seal_audit_trail(
    lawyer_id: str,
    practice_year: int = Query(None),
    limit: int = Query(100, ge=10, le=1000),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[dict]:
    """Get audit trail of seal operations (uploads, verifications, updates).
    
    Admin-only endpoint for compliance auditing. Shows all actions taken on
    lawyer's seals with timestamps and actor information.
    """
    admin_user = await require_dpo_or_admin(x_auth_token)
    
    seal_events = await list_seal_events(lawyer_id, practice_year, limit)
    
    return [
        {
            "action": event["action"],
            "actor_user_id": event["actor_user_id"],
            "detail": event["detail"],
            "created_on": event["created_on"],
        }
        for event in seal_events
    ]


@router.get("/practice-seal/{lawyer_id}/document/download")
async def admin_download_seal_document(
    lawyer_id: str,
    practice_year: int = Query(..., ge=2025, le=2030),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> Response:
    """Admin-only endpoint to download and decrypt stored stamp/seal document."""
    from app.security import decrypt_seal_bytes, SealEncryptionError

    admin_user = await require_admin(x_auth_token)

    seal = await get_practice_seal(lawyer_id, practice_year)
    if seal is None:
        raise HTTPException(status_code=404, detail="Seal record not found")

    storage_key = seal.get("seal_file_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="Seal document file not found")

    encrypted_path = UPLOADS_DIR / storage_key
    if not encrypted_path.exists():
        raise HTTPException(status_code=404, detail="Stored seal document not found")

    encrypted_bytes = encrypted_path.read_bytes()
    try:
        decrypted_bytes = decrypt_seal_bytes(encrypted_bytes)
    except SealEncryptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    content_type = seal.get("seal_mime_type") or "application/octet-stream"
    extension = "pdf"
    if content_type == "image/png":
        extension = "png"
    elif content_type == "image/jpeg":
        extension = "jpg"

    download_filename = f"stamp_seal_{lawyer_id}_{practice_year}.{extension}"

    await log_event(
        admin_user["id"],
        "compliance.seal_document_downloaded",
        "lawyer_practice_seal",
        f"{lawyer_id}:{practice_year}",
        f"Admin downloaded decrypted seal document for {lawyer_id} ({practice_year})",
    )

    return Response(
        content=decrypted_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{download_filename}"'},
    )

