from fastapi import APIRouter, Header, HTTPException
from typing import Optional

from app.dependencies import (
    log_event,
    require_user,
    require_admin,
)
from app.db import (
    get_lawyer,
    list_lawyers,
    create_complaint,
    list_complaints_for_lawyer,
    resolve_complaint,
)
from app.models import (
    IntakeRequest,
    MatchResponse,
    LawyerProfileResponse,
    ComplaintCreateRequest,
    ComplaintResponse,
    ComplaintActionRequest,
)
from app.ranking import DISCLAIMER, expertise_tier, rank_lawyers

router = APIRouter(tags=["lawyers"])

@router.post("/api/intake/match", response_model=MatchResponse)
def intake_match(payload: IntakeRequest) -> MatchResponse:
    category, exposure_band, matches = rank_lawyers(payload, list_lawyers(), top_n=10)
    return MatchResponse(
        intake_category=category,
        exposure_band_percent=exposure_band,
        disclaimer=DISCLAIMER,
        matches=matches,
    )

@router.get("/api/lawyers/{lawyer_id}", response_model=LawyerProfileResponse)
def lawyer_profile(lawyer_id: str) -> LawyerProfileResponse:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    return LawyerProfileResponse(
        lawyer_id=lawyer.id,
        full_name=lawyer.full_name,
        tier=expertise_tier(lawyer),
        state=lawyer.state,
        practice_areas=lawyer.practice_areas,
        verification={
            "nin_verified": lawyer.nin_verified,
            "nba_verified": lawyer.nba_verified,
            "bvn_verified": lawyer.bvn_verified,
        },
        stats={
            "completed_matters": lawyer.completed_matters,
            "rating": lawyer.rating,
            "response_rate": lawyer.response_rate,
            "repeat_client_rate": lawyer.repeat_client_rate,
            "profile_completeness": lawyer.profile_completeness,
        },
        disclaimer=DISCLAIMER,
    )

@router.post("/api/complaints", response_model=ComplaintResponse)
def file_complaint(
    payload: ComplaintCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ComplaintResponse:
    actor = require_user(x_auth_token)
    created = create_complaint(payload.lawyer_id, payload.category, payload.details)
    if created is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    log_event(actor["id"], "complaint.created", "complaint", str(created["id"]), f"Complaint filed against {created['lawyer_id']}")

    return ComplaintResponse(
        complaint_id=created["id"],
        lawyer_id=created["lawyer_id"],
        category=created["category"],
        severity=created["severity"],
        status=created["status"],
        details=created["details"],
        created_on=created["created_on"],
        resolved_on=created.get("resolved_on"),
        resolution_note=created.get("resolution_note"),
    )

@router.get("/api/complaints/{lawyer_id}", response_model=list[ComplaintResponse])
def list_complaints(
    lawyer_id: str,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ComplaintResponse]:
    require_user(x_auth_token)
    return [
        ComplaintResponse(
            complaint_id=item["id"],
            lawyer_id=item["lawyer_id"],
            category=item["category"],
            severity=item["severity"],
            status=item["status"],
            details=item["details"],
            created_on=item["created_on"],
            resolved_on=item.get("resolved_on"),
            resolution_note=item.get("resolution_note"),
        )
        for item in list_complaints_for_lawyer(lawyer_id)
    ]

@router.post("/api/complaints/{complaint_id}/resolve", response_model=ComplaintResponse)
def resolve_complaint_endpoint(
    complaint_id: int,
    payload: ComplaintActionRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ComplaintResponse:
    actor = require_admin(x_auth_token)
    resolved = resolve_complaint(complaint_id, payload.action, payload.resolution_note)
    if resolved is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    log_event(actor["id"], "complaint.resolved", "complaint", str(complaint_id), f"Complaint marked {resolved['status']}")

    return ComplaintResponse(
        complaint_id=resolved["id"],
        lawyer_id=resolved["lawyer_id"],
        category=resolved["category"],
        severity=resolved["severity"],
        status=resolved["status"],
        details=resolved["details"],
        created_on=resolved["created_on"],
        resolved_on=resolved.get("resolved_on"),
        resolution_note=resolved.get("resolution_note"),
    )
