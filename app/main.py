from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from app.db import (
    authenticate_user,
    create_audit_event,
    create_consultation,
    create_document,
    create_notification,
    create_conversation,
    create_message,
    create_payment,
    create_session_for_user,
    create_user,
    create_complaint,
    get_consultation,
    get_conversation,
    get_document,
    get_document_file_path,
    get_latest_kyc_status,
    get_lawyer,
    get_payment,
    get_payment_by_reference,
    get_user_by_access_token,
    get_lawyer_user_ids,
    init_db,
    list_audit_events,
    list_complaints_for_lawyer,
    list_consultation_participant_user_ids,
    list_documents_for_consultation,
    list_lawyers,
    list_messages,
    list_notifications_for_user,
    list_conversation_participant_user_ids,
    mark_notification_read,
    refresh_session,
    revoke_session,
    resolve_complaint,
    seed_lawyers_if_empty,
    seed_users_if_empty,
    upsert_kyc_status,
    update_payment_status,
    user_can_access_consultation,
    user_can_access_conversation,
    user_can_access_document,
    verify_paystack_payment,
)
from app.models import (
    AuditEventResponse,
    AuthResponse,
    ComplaintActionRequest,
    ComplaintCreateRequest,
    ComplaintResponse,
    ConsultationCreateRequest,
    ConsultationResponse,
    ConversationCreateRequest,
    ConversationResponse,
    DocumentResponse,
    IntakeRequest,
    KycStatusResponse,
    KycVerifyRequest,
    LawyerProfileResponse,
    LoginRequest,
    LogoutRequest,
    MatchResponse,
    MessageCreateRequest,
    MessageResponse,
    NotificationResponse,
    PaymentActionRequest,
    PaymentCreateRequest,
    PaymentResponse,
    PaystackVerifyRequest,
    RefreshTokenRequest,
    SignUpRequest,
    UserProfileResponse,
)
from app.ranking import DISCLAIMER, expertise_tier, rank_lawyers


MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024


def _env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        parsed = int(raw_value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


AUTH_RATE_LIMIT_WINDOW_SECONDS = _env_int("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60)
LOGIN_FAILURE_LIMIT = _env_int("LOGIN_FAILURE_LIMIT", 5)
REFRESH_FAILURE_LIMIT = _env_int("REFRESH_FAILURE_LIMIT", 8)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
SLOW_REQUEST_MS = _env_int("SLOW_REQUEST_MS", 800)
ENABLE_REQUEST_LOGGING = _env_bool("ENABLE_REQUEST_LOGGING", True)

logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO), format="%(message)s")
logger = logging.getLogger("legal_mvp")

_failed_login_attempts: dict[str, list[float]] = {}
_failed_refresh_attempts: dict[str, list[float]] = {}
_auth_rate_lock = Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed_lawyers_if_empty()
    seed_users_if_empty()
    yield


app = FastAPI(title="Nigeria Legal Marketplace MVP", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def request_observability_middleware(request: Request, call_next):
    if not ENABLE_REQUEST_LOGGING:
        return await call_next(request)

    request_id = request.headers.get("X-Request-Id") or uuid4().hex[:12]
    started_at = monotonic()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((monotonic() - started_at) * 1000, 2)
        logger.exception(
            json.dumps(
                {
                    "event": "request_error",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                }
            )
        )
        raise

    duration_ms = round((monotonic() - started_at) * 1000, 2)
    log_level = logging.WARNING if duration_ms >= SLOW_REQUEST_MS else logging.INFO
    logger.log(
        log_level,
        json.dumps(
            {
                "event": "request_complete",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        ),
    )
    response.headers["X-Request-Id"] = request_id
    return response


def log_event(actor_user_id: int | None, action: str, resource_type: str, resource_id: str | None, detail: str) -> None:
    create_audit_event(actor_user_id, action, resource_type, resource_id, detail)


def notify_users(
    user_ids: list[int],
    *,
    kind: str,
    title: str,
    body: str,
    resource_type: str,
    resource_id: str | None,
    exclude_user_id: int | None = None,
) -> None:
    for user_id in sorted(set(user_ids)):
        if exclude_user_id is not None and user_id == exclude_user_id:
            continue
        create_notification(user_id, kind, title, body, resource_type, resource_id)


def _rate_limit_key(raw_value: str) -> str:
    return raw_value.strip().lower()


def _is_rate_limited(store: dict[str, list[float]], key: str, limit: int) -> bool:
    now = monotonic()
    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        store[key] = attempts
        return len(attempts) >= limit


def _record_failed_attempt(store: dict[str, list[float]], key: str) -> None:
    now = monotonic()
    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        attempts.append(now)
        store[key] = attempts


def _clear_failed_attempts(store: dict[str, list[float]], key: str) -> None:
    with _auth_rate_lock:
        store.pop(key, None)


def reset_auth_rate_limits_for_tests() -> None:
    with _auth_rate_lock:
        _failed_login_attempts.clear()
        _failed_refresh_attempts.clear()


def to_payment_response(payment: dict) -> PaymentResponse:
    return PaymentResponse(
        payment_id=payment["id"],
        consultation_id=payment["consultation_id"],
        reference=payment["reference"],
        provider=payment["provider"],
        amount_ngn=payment["amount_ngn"],
        status=payment["status"],
        created_on=payment["created_on"],
        access_code=payment.get("access_code"),
        authorization_url=payment.get("authorization_url"),
        gateway_status=payment.get("gateway_status"),
        paid_on=payment.get("paid_on"),
        released_on=payment.get("released_on"),
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


def require_user(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    user = get_user_by_access_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return user


def require_admin(token: str | None) -> dict:
    user = require_user(token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def require_client(token: str | None) -> dict:
    user = require_user(token)
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Client role required")
    return user


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(payload: SignUpRequest) -> AuthResponse:
    created = create_user(payload.email, payload.password, payload.full_name, payload.role.value, payload.lawyer_id)
    if created is None:
        raise HTTPException(status_code=409, detail="User already exists or invalid lawyer_id")

    token_bundle = create_session_for_user(created["id"])
    log_event(created["id"], "auth.signup", "user", str(created["id"]), f"User signed up as {created['role']}")
    return AuthResponse(
        user_id=created["id"],
        email=created["email"],
        full_name=created["full_name"],
        role=created["role"],
        access_token=token_bundle["access_token"],
        refresh_token=token_bundle["refresh_token"],
        access_expires_at=token_bundle["access_expires_at"],
        refresh_expires_at=token_bundle["refresh_expires_at"],
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    email_key = _rate_limit_key(payload.email)
    if _is_rate_limited(_failed_login_attempts, email_key, LOGIN_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again shortly.")

    user = authenticate_user(payload.email, payload.password)
    if user is None:
        _record_failed_attempt(_failed_login_attempts, email_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _clear_failed_attempts(_failed_login_attempts, email_key)

    log_event(user["id"], "auth.login", "user", str(user["id"]), "User authenticated successfully")

    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        access_token=user["access_token"],
        refresh_token=user["refresh_token"],
        access_expires_at=user["access_expires_at"],
        refresh_expires_at=user["refresh_expires_at"],
    )


@app.post("/api/auth/refresh", response_model=AuthResponse)
def refresh_token(payload: RefreshTokenRequest) -> AuthResponse:
    refresh_key = payload.refresh_token.strip()
    if _is_rate_limited(_failed_refresh_attempts, refresh_key, REFRESH_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed refresh attempts. Please try again shortly.")

    user = refresh_session(payload.refresh_token)
    if user is None:
        _record_failed_attempt(_failed_refresh_attempts, refresh_key)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    _clear_failed_attempts(_failed_refresh_attempts, refresh_key)

    log_event(user["id"], "auth.refresh", "user", str(user["id"]), "Refresh token rotated successfully")

    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        access_token=user["access_token"],
        refresh_token=user["refresh_token"],
        access_expires_at=user["access_expires_at"],
        refresh_expires_at=user["refresh_expires_at"],
    )


@app.post("/api/auth/logout")
def logout(
    payload: LogoutRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    current_user = get_user_by_access_token(x_auth_token) if x_auth_token else None
    revoked = revoke_session(access_token=x_auth_token, refresh_token=payload.refresh_token)
    if not revoked:
        raise HTTPException(status_code=400, detail="No active session found")
    if current_user is not None:
        log_event(current_user["id"], "auth.logout", "user", str(current_user["id"]), "Session revoked")
    return {"status": "logged_out"}


@app.get("/api/auth/me", response_model=UserProfileResponse)
def me(x_auth_token: str | None = Header(default=None, alias="X-Auth-Token")) -> UserProfileResponse:
    user = require_user(x_auth_token)
    return UserProfileResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
    )


@app.post("/api/intake/match", response_model=MatchResponse)
def intake_match(payload: IntakeRequest) -> MatchResponse:
    category, exposure_band, matches = rank_lawyers(payload, list_lawyers(), top_n=10)
    return MatchResponse(
        intake_category=category,
        exposure_band_percent=exposure_band,
        disclaimer=DISCLAIMER,
        matches=matches,
    )


@app.get("/api/lawyers/{lawyer_id}", response_model=LawyerProfileResponse)
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


@app.post("/api/complaints", response_model=ComplaintResponse)
def file_complaint(
    payload: ComplaintCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.get("/api/complaints/{lawyer_id}", response_model=list[ComplaintResponse])
def list_complaints(
    lawyer_id: str,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.post("/api/complaints/{complaint_id}/resolve", response_model=ComplaintResponse)
def resolve_complaint_endpoint(
    complaint_id: int,
    payload: ComplaintActionRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.post("/api/kyc/verify", response_model=KycStatusResponse)
def verify_kyc(
    payload: KycVerifyRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.get("/api/kyc/{lawyer_id}", response_model=KycStatusResponse)
def get_kyc(lawyer_id: str, x_auth_token: str | None = Header(default=None, alias="X-Auth-Token")) -> KycStatusResponse:
    require_user(x_auth_token)
    status = get_latest_kyc_status(lawyer_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return KycStatusResponse(**status)


@app.get("/api/tracker")
def get_tracker(x_auth_token: str | None = Header(default=None, alias="X-Auth-Token")) -> dict:
    require_user(x_auth_token)
    tracker_path = Path(__file__).resolve().parent.parent / "implementation_tracker.json"
    with tracker_path.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/api/audit-events", response_model=list[AuditEventResponse])
def get_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> list[AuditEventResponse]:
    require_admin(x_auth_token)
    return [to_audit_event_response(item) for item in list_audit_events(limit)]


@app.get("/api/notifications", response_model=list[NotificationResponse])
def get_notifications(x_auth_token: str | None = Header(default=None, alias="X-Auth-Token")) -> list[NotificationResponse]:
    user = require_user(x_auth_token)
    return [to_notification_response(item) for item in list_notifications_for_user(user["id"])]


@app.post("/api/notifications/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> NotificationResponse:
    user = require_user(x_auth_token)
    notification = mark_notification_read(notification_id, user["id"])
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    log_event(user["id"], "notification.read", "notification", str(notification_id), "Notification marked as read")
    return to_notification_response(notification)

@app.post("/api/conversations", response_model=ConversationResponse)
def open_conversation(
    payload: ConversationCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> ConversationResponse:
    user = require_client(x_auth_token)
    created = create_conversation(user["id"], payload.lawyer_id, payload.initial_message)
    if created is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    conversation, _ = created
    log_event(user["id"], "conversation.created", "conversation", str(conversation["id"]), "Client opened a conversation")
    notify_users(
        list_conversation_participant_user_ids(conversation["id"]),
        kind="message_received",
        title="New conversation started",
        body=payload.initial_message[:140],
        resource_type="conversation",
        resource_id=str(conversation["id"]),
        exclude_user_id=user["id"],
    )
    return ConversationResponse(
        conversation_id=conversation["id"],
        client_user_id=conversation["client_user_id"],
        lawyer_id=conversation["lawyer_id"],
        status=conversation["status"],
        created_on=conversation["created_on"],
    )

@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation_endpoint(
    conversation_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> ConversationResponse:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(
        conversation_id=conversation["id"],
        client_user_id=conversation["client_user_id"],
        lawyer_id=conversation["lawyer_id"],
        status=conversation["status"],
        created_on=conversation["created_on"],
    )

@app.post("/api/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> MessageResponse:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    message = create_message(conversation_id, user["id"], payload.body)
    if message is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    log_event(user["id"], "message.sent", "message", str(message["id"]), f"Message sent in conversation {conversation_id}")
    notify_users(
        list_conversation_participant_user_ids(conversation_id),
        kind="message_received",
        title="New message received",
        body=payload.body[:140],
        resource_type="conversation",
        resource_id=str(conversation_id),
        exclude_user_id=user["id"],
    )
    return MessageResponse(
        message_id=message["id"],
        conversation_id=message["conversation_id"],
        sender_user_id=message["sender_user_id"],
        body=message["body"],
        created_on=message["created_on"],
    )

@app.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(
    conversation_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> list[MessageResponse]:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    return [MessageResponse(message_id=item["id"], conversation_id=item["conversation_id"], sender_user_id=item["sender_user_id"], body=item["body"], created_on=item["created_on"]) for item in list_messages(conversation_id)]

@app.post("/api/consultations", response_model=ConsultationResponse)
def book_consultation(
    payload: ConsultationCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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

@app.get("/api/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation_endpoint(
    consultation_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.post("/api/consultations/{consultation_id}/documents", response_model=DocumentResponse)
async def upload_consultation_document(
    consultation_id: int,
    document_label: str = Form(default="supporting_document"),
    file: UploadFile = File(...),
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.get("/api/consultations/{consultation_id}/documents", response_model=list[DocumentResponse])
def list_consultation_documents(
    consultation_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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


@app.get("/api/documents/{document_id}/download")
def download_document(
    document_id: int,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
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

@app.post("/api/payments/paystack/initialize", response_model=PaymentResponse)
def initialize_paystack_payment(
    payload: PaymentCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, payload.consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    payment = create_payment(payload.consultation_id, payload.provider)
    if payment is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    log_event(user["id"], "payment.initialized", "payment", str(payment["id"]), f"Paystack simulation initialized with reference {payment['reference']}")
    notify_users(
        list_consultation_participant_user_ids(payload.consultation_id),
        kind="payment_updated",
        title="Payment initialized",
        body=f"Payment {payment['reference']} is awaiting verification.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )
    return to_payment_response(payment)

@app.post("/api/payments/simulate", response_model=PaymentResponse)
def simulate_payment_create(
    payload: PaymentCreateRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    return initialize_paystack_payment(payload, x_auth_token)


@app.post("/api/payments/paystack/{reference}/verify", response_model=PaymentResponse)
def verify_paystack_reference(
    reference: str,
    payload: PaystackVerifyRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    payment = get_payment_by_reference(reference)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Payment access denied")
    updated = verify_paystack_payment(reference, payload.outcome)
    log_event(user["id"], "payment.verified", "payment", str(payment["id"]), f"Paystack verification outcome: {payload.outcome}")
    notify_users(
        list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment verification updated",
        body=f"Payment {reference} verification outcome: {payload.outcome}.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )
    return to_payment_response(updated)


@app.post("/api/payments/{payment_id}/simulate", response_model=PaymentResponse)
def simulate_payment_action(
    payment_id: int,
    payload: PaymentActionRequest,
    x_auth_token: str | None = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    payment = get_payment(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Payment access denied")
    updated = update_payment_status(payment_id, payload.action)
    log_event(user["id"], f"payment.{payload.action}", "payment", str(payment_id), f"Payment action {payload.action} applied")
    notify_users(
        list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment status changed",
        body=f"Payment {updated['reference']} is now {updated['status']}.",
        resource_type="payment",
        resource_id=str(payment_id),
    )
    return to_payment_response(updated)
