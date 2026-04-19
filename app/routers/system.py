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

@router.get("/api/tracker")
def get_tracker(x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> dict:
    require_user(x_auth_token)
    tracker_path = Path(__file__).resolve().parent.parent.parent / "implementation_tracker.json"
    if tracker_path.exists():
        with tracker_path.open("r", encoding="utf-8") as file:
            return json.load(file)
    return {}


@router.get("/api/audit-events", response_model=list[AuditEventResponse])
def get_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[AuditEventResponse]:
    require_admin(x_auth_token)
    return [to_audit_event_response(item) for item in list_audit_events(limit)]


@router.get("/api/notifications", response_model=list[NotificationResponse])
def get_notifications(x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> list[NotificationResponse]:
    user = require_user(x_auth_token)
    return [to_notification_response(item) for item in list_notifications_for_user(user["id"])]


@router.post("/api/notifications/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> NotificationResponse:
    user = require_user(x_auth_token)
    notification = mark_notification_read(notification_id, user["id"])
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    log_event(user["id"], "notification.read", "notification", str(notification_id), "Notification marked as read")
    return to_notification_response(notification)
