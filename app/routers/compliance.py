from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from app.dependencies import log_event, require_admin, require_user
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
)
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
def create_consent(
    payload: ConsentEventCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConsentEventResponse:
    user = require_user(x_auth_token)
    metadata_json = json.dumps(payload.metadata, ensure_ascii=False) if payload.metadata is not None else None
    created = create_consent_event(
        user_id=user["id"],
        purpose=payload.purpose,
        lawful_basis=payload.lawful_basis,
        consented=payload.consented,
        policy_version=payload.policy_version,
        metadata_json=metadata_json,
    )
    log_event(user["id"], "compliance.consent_recorded", "consent_event", str(created["id"]), "Consent event recorded")
    return _to_consent_response(created)


@router.get("/consents/me", response_model=list[ConsentEventResponse])
def list_my_consents(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConsentEventResponse]:
    user = require_user(x_auth_token)
    return [_to_consent_response(item) for item in list_consent_events_for_user(user["id"], limit)]


@router.post("/dsr-requests", response_model=DsrRequestResponse)
def create_dsr(
    payload: DsrRequestCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrRequestResponse:
    user = require_user(x_auth_token)
    created = create_dsr_request(user["id"], payload.request_type, payload.detail)
    log_event(user["id"], "compliance.dsr_created", "dsr_request", str(created["id"]), "Data subject request submitted")
    return _to_dsr_response(created)


@router.get("/dsr-requests/me", response_model=list[DsrRequestResponse])
def list_my_dsr_requests(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrRequestResponse]:
    user = require_user(x_auth_token)
    return [_to_dsr_response(item) for item in list_dsr_requests_for_user(user["id"], limit)]


@router.get("/dsr-requests", response_model=list[DsrRequestResponse])
def list_all_dsr_requests(
    status: str | None = Query(default=None, pattern="^(submitted|in_review|completed|rejected)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrRequestResponse]:
    require_admin(x_auth_token)
    return [_to_dsr_response(item) for item in list_dsr_requests(status, limit)]


@router.patch("/dsr-requests/{dsr_request_id}", response_model=DsrRequestResponse)
def update_dsr_request(
    dsr_request_id: int,
    payload: DsrRequestStatusUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrRequestResponse:
    admin_user = require_admin(x_auth_token)
    updated = update_dsr_request_status(dsr_request_id, payload.status, payload.resolution_note, admin_user["id"])
    if updated is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    log_event(admin_user["id"], "compliance.dsr_updated", "dsr_request", str(dsr_request_id), f"DSR updated to {payload.status}")
    return _to_dsr_response(updated)


@router.post("/retention/run", response_model=RetentionRunResponse)
def run_retention(
    payload: RetentionRunRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> RetentionRunResponse:
    admin_user = require_admin(x_auth_token)
    result = run_retention_job(payload.retention_days, payload.dry_run)
    log_event(
        admin_user["id"],
        "compliance.retention_run",
        "retention_job",
        None,
        f"Retention run executed: days={payload.retention_days}, dry_run={payload.dry_run}",
    )
    return RetentionRunResponse(**result)


@router.get("/dsr-requests/{dsr_request_id}/export", response_model=DsrExportResponse)
def export_dsr_request_data(
    dsr_request_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrExportResponse:
    admin_user = require_admin(x_auth_token)
    bundle = build_dsr_export_bundle(dsr_request_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    log_event(admin_user["id"], "compliance.dsr_exported", "dsr_request", str(dsr_request_id), "DSR export generated")
    return DsrExportResponse(**bundle)


@router.post("/dsr-requests/{dsr_request_id}/execute-deletion", response_model=DsrDeletionExecuteResponse)
def execute_dsr_deletion_request(
    dsr_request_id: int,
    payload: DsrDeletionExecuteRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrDeletionExecuteResponse:
    admin_user = require_admin(x_auth_token)
    try:
        result = execute_dsr_deletion(dsr_request_id, admin_user["id"], payload.resolution_note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if result is None:
        raise HTTPException(status_code=404, detail="DSR request not found")
    log_event(admin_user["id"], "compliance.dsr_deletion_executed", "dsr_request", str(dsr_request_id), "DSR deletion executed")
    return DsrDeletionExecuteResponse(**result)


@router.post("/dsr-corrections", response_model=DsrCorrectionResponse)
def create_dsr_correction(
    payload: DsrCorrectionCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrCorrectionResponse:
    user = require_user(x_auth_token)
    created = create_dsr_correction_request(
        user_id=user["id"],
        field_name=payload.field_name,
        requested_value=payload.requested_value,
        justification=payload.justification,
        evidence=payload.evidence,
    )
    log_event(user["id"], "compliance.dsr_correction_created", "dsr_correction", str(created["id"]), "DSR correction request submitted")
    return _to_correction_response(created)


@router.get("/dsr-corrections/me", response_model=list[DsrCorrectionResponse])
def list_my_dsr_corrections(
    limit: int = Query(default=100, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrCorrectionResponse]:
    user = require_user(x_auth_token)
    return [_to_correction_response(item) for item in list_dsr_corrections_for_user(user["id"], limit)]


@router.get("/dsr-corrections", response_model=list[DsrCorrectionResponse])
def list_all_dsr_corrections(
    status: str | None = Query(default=None, pattern="^(submitted|approved|rejected)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[DsrCorrectionResponse]:
    require_admin(x_auth_token)
    return [_to_correction_response(item) for item in list_dsr_corrections(status, limit)]


@router.patch("/dsr-corrections/{correction_id}", response_model=DsrCorrectionResponse)
def review_correction_request(
    correction_id: int,
    payload: DsrCorrectionReviewRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> DsrCorrectionResponse:
    admin_user = require_admin(x_auth_token)
    try:
        updated = review_dsr_correction(correction_id, payload.status, payload.review_note, admin_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if updated is None:
        raise HTTPException(status_code=404, detail="DSR correction request not found")
    log_event(admin_user["id"], "compliance.dsr_correction_reviewed", "dsr_correction", str(correction_id), f"Correction request reviewed: {payload.status}")
    return _to_correction_response(updated)


@router.post("/breach-incidents", response_model=BreachIncidentResponse)
def create_breach_incident_endpoint(
    payload: BreachIncidentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> BreachIncidentResponse:
    admin_user = require_admin(x_auth_token)
    created = create_breach_incident(
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
    log_event(admin_user["id"], "compliance.breach_created", "breach_incident", str(created["id"]), "Breach incident created")
    return _to_breach_response(created)


@router.get("/breach-incidents", response_model=list[BreachIncidentResponse])
def list_breach_incidents_endpoint(
    status: str | None = Query(default=None, pattern="^(open|investigating|contained|resolved)$"),
    limit: int = Query(default=200, ge=1, le=500),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[BreachIncidentResponse]:
    require_admin(x_auth_token)
    return [_to_breach_response(item) for item in list_breach_incidents(status, limit)]


@router.patch("/breach-incidents/{breach_incident_id}", response_model=BreachIncidentResponse)
def update_breach_incident_endpoint(
    breach_incident_id: int,
    payload: BreachIncidentUpdateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> BreachIncidentResponse:
    admin_user = require_admin(x_auth_token)
    updated = update_breach_incident(
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
    log_event(admin_user["id"], "compliance.breach_updated", "breach_incident", str(breach_incident_id), f"Breach incident status set to {payload.status}")
    return _to_breach_response(updated)


@router.get("/breach-incidents/sla-status", response_model=list[BreachSlaStatusResponse])
def list_breach_incidents_sla_status(
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
    
    require_admin(x_auth_token)
    breaches = list_breach_incidents_by_sla_status(sla_status=sla_status)
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
def escalate_breach_incident_sla(
    breach_incident_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    """Trigger escalation alert for a breach incident approaching or past SLA deadline.
    
    Admin-only operation. Sets escalation_triggered flag and logs audit event.
    Recommended when days_until_deadline <= 1 or sla_status == 'overdue'.
    """
    admin_user = require_admin(x_auth_token)
    
    breach = get_breach_incident(breach_incident_id)
    if breach is None:
        raise HTTPException(status_code=404, detail="Breach incident not found")
    
    escalated = trigger_breach_escalation(breach_incident_id, admin_user["id"])
    if escalated is None:
        raise HTTPException(status_code=500, detail="Failed to trigger escalation")
    
    log_event(
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

