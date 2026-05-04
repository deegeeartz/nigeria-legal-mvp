import json
from pathlib import Path
from fastapi import APIRouter, Header, Query, HTTPException
from typing import Optional

from app.dependencies import (
    log_event,
    require_user,
    require_admin,
)
from app.db import (
    list_audit_events,
    list_notifications_for_user,
    mark_notification_read,
)
from app.models import (
    AuditEventResponse,
    NotificationResponse,
)
from app.services.admin_service import import_nba_disciplinary_csv

# Move to_audit_event_response and to_notification_response here or use directly
def to_audit_event_response(event: dict) -> AuditEventResponse:
    return AuditEventResponse(
        audit_event_id=event["id"],
        actor_user_id=event.get("actor_user_id"),
        action=event["action"],
        resource_type=event["resource_type"],
        resource_id=event.get("resource_id"),
        detail=event["detail"],
        created_on=event["created_on"],
    )

def to_notification_response(notification: dict) -> NotificationResponse:
    return NotificationResponse(
        notification_id=notification["id"],
        user_id=notification["user_id"],
        kind=notification["kind"],
        title=notification["title"],
        body=notification["body"],
        resource_type=notification["resource_type"],
        resource_id=notification.get("resource_id"),
        is_read=bool(notification["is_read"]),
        created_on=notification["created_on"],
        read_on=notification.get("read_on"),
    )


router = APIRouter(tags=["system"])

@router.post("/api/admin/sync/nba-disciplinary")
async def sync_nba_disciplinary(
    csv_data: str,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
):
    """
    Batch update lawyer disciplinary status from a CSV stream.
    Requires Admin privileges.
    """
    await require_admin(x_auth_token)
    results = await import_nba_disciplinary_csv(csv_data)
    await log_event(None, "system.nba_sync", "lawyer", None, f"NBA Sync processed: {results['updated']} updated, {len(results['errors'])} errors")
    return results

@router.get("/legal/privacy-policy")
async def get_privacy_policy():
    """Returns the platform's NDPA-compliant privacy notice."""
    return {
        "title": "Nigeria Legal Marketplace Privacy Policy",
        "last_updated": "2026-04-21",
        "content": "This policy details how we handle NIN, BVN, and legal data in compliance with the NDPA 2023...",
        "lawful_basis": ["Consent", "Contract", "Legal Obligation"]
    }

@router.get("/legal/cookie-consent")
async def get_cookie_info():
    """Returns technical policy info regarding storage and payments."""
    return {
        "use_of_cookies": "We use JWT-based local storage for session management. No third-party tracking cookies are used without explicit consent.",
        "pci_compliance": "Credit card data is handled exclusively by Paystack (PCI-DSS Level 1 Provider)."
    }

@router.get("/api/tracker")
async def get_tracker(x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> dict:
    await require_user(x_auth_token)
    tracker_path = Path(__file__).resolve().parent.parent.parent / "implementation_tracker.json"
    if tracker_path.exists():
        with tracker_path.open("r", encoding="utf-8") as file:
            return json.load(file)
    return {}


@router.get("/api/audit-events", response_model=list[AuditEventResponse])
async def get_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[AuditEventResponse]:
    await require_admin(x_auth_token)
    return [to_audit_event_response(item) for item in await list_audit_events(limit, offset)]


@router.get("/api/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")
) -> list[NotificationResponse]:
    user = await require_user(x_auth_token)
    return [to_notification_response(item) for item in await list_notifications_for_user(user["id"], limit=limit, offset=offset)]


@router.post("/api/notifications/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> NotificationResponse:
    user = await require_user(x_auth_token)
    notification = await mark_notification_read(notification_id, user["id"])
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    await log_event(user["id"], "notification.read", "notification", str(notification_id), "Notification marked as read")
    return to_notification_response(notification)
