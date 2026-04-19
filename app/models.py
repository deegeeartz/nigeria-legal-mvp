from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import re
from typing import List

from pydantic import BaseModel, Field, field_validator


class Urgency(str, Enum):
    urgent = "urgent"
    this_week = "this_week"
    researching = "researching"


class ExpertiseTier(str, Enum):
    associate_counsel = "associate_counsel"
    verified_counsel = "verified_counsel"
    senior_counsel = "senior_counsel"
    distinguished_counsel = "distinguished_counsel"


class ComplaintCategory(str, Enum):
    no_show = "no_show"
    billing_issue = "billing_issue"
    misrepresentation = "misrepresentation"
    misconduct = "misconduct"
    fraud = "fraud"


@dataclass
class Lawyer:
    id: str
    full_name: str
    state: str
    practice_areas: List[str]
    years_called: int
    nin_verified: bool
    nba_verified: bool
    bvn_verified: bool
    profile_completeness: int
    completed_matters: int
    rating: float
    response_rate: int
    avg_response_hours: float
    repeat_client_rate: int
    base_consult_fee_ngn: int
    active_complaints: int
    severe_flag: bool = False
    enrollment_number: str | None = None
    verification_document_id: int | None = None
    kyc_submission_status: str = "none"  # none | pending | approved | rejected
    nin: str | None = None


class IntakeRequest(BaseModel):
    summary: str = Field(min_length=10, max_length=1200)
    state: str = Field(min_length=2, max_length=50)
    urgency: Urgency
    budget_max_ngn: int = Field(ge=0)
    legal_terms_mode: bool = False


class MatchReason(BaseModel):
    label: str
    value: str


class MatchCard(BaseModel):
    lawyer_id: str
    full_name: str
    state: str
    tier: ExpertiseTier
    score: float
    price_ngn: int
    why_recommended: List[MatchReason]
    badges: List[str]


class MatchResponse(BaseModel):
    intake_category: str
    exposure_band_percent: int
    disclaimer: str
    matches: List[MatchCard]


class LawyerProfileResponse(BaseModel):
    lawyer_id: str
    full_name: str
    tier: ExpertiseTier
    state: str
    practice_areas: List[str]
    verification: dict
    stats: dict
    disclaimer: str


class ComplaintCreateRequest(BaseModel):
    lawyer_id: str = Field(min_length=3, max_length=40)
    category: ComplaintCategory
    details: str = Field(min_length=10, max_length=2000)


class ComplaintActionRequest(BaseModel):
    action: str = Field(pattern="^(uphold|reject)$")
    resolution_note: str = Field(min_length=5, max_length=500)


class ComplaintResponse(BaseModel):
    complaint_id: int
    lawyer_id: str
    category: ComplaintCategory
    severity: str
    status: str
    details: str
    created_on: str
    resolved_on: str | None = None
    resolution_note: str | None = None


class UserRole(str, Enum):
    client = "client"
    lawyer = "lawyer"
    admin = "admin"


class SignUpRequest(BaseModel):
    email: str = Field(min_length=6, max_length=120)
    password: str = Field(min_length=8, max_length=120)
    full_name: str = Field(min_length=2, max_length=120)
    role: UserRole
    lawyer_id: str | None = Field(default=None, min_length=3, max_length=40)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        has_upper = bool(re.search(r"[A-Z]", value))
        has_lower = bool(re.search(r"[a-z]", value))
        has_digit = bool(re.search(r"\d", value))
        has_special = bool(re.search(r"[^A-Za-z0-9]", value))
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError("Password must include uppercase, lowercase, number, and special character")
        return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=6, max_length=120)
    password: str = Field(min_length=8, max_length=120)


class AuthResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: UserRole
    lawyer_id: str | None = None
    access_token: str
    refresh_token: str
    access_expires_at: str
    refresh_expires_at: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=12, max_length=200)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class UserProfileResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: UserRole
    lawyer_id: str | None = None


class KycVerifyRequest(BaseModel):
    lawyer_id: str = Field(min_length=3, max_length=40)
    nin_verified: bool | None = None
    nba_verified: bool | None = None
    bvn_verified: bool | None = None
    note: str = Field(min_length=3, max_length=300)


class KycStatusResponse(BaseModel):
    lawyer_id: str
    enrollment_number: str | None = None
    kyc_submission_status: str = "none"
    nin_verified: bool
    nba_verified: bool
    bvn_verified: bool
    updated_on: str
    note: str


class ConversationStatus(str, Enum):
    open = "open"
    closed = "closed"


class ConsultationStatus(str, Enum):
    pending = "pending"
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"


class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    released = "released"
    failed = "failed"


class NotificationKind(str, Enum):
    message_received = "message_received"
    consultation_booked = "consultation_booked"
    document_uploaded = "document_uploaded"
    payment_updated = "payment_updated"
    complaint_updated = "complaint_updated"
    kyc_updated = "kyc_updated"


class ConversationCreateRequest(BaseModel):
    lawyer_id: str = Field(min_length=3, max_length=40)
    initial_message: str = Field(min_length=2, max_length=2000)


class ConversationResponse(BaseModel):
    conversation_id: int
    client_user_id: int
    lawyer_id: str
    status: ConversationStatus
    created_on: str


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    message_id: int
    conversation_id: int
    sender_user_id: int
    body: str
    created_on: str


class ConsultationCreateRequest(BaseModel):
    lawyer_id: str = Field(min_length=3, max_length=40)
    scheduled_for: str = Field(min_length=10, max_length=80)
    summary: str = Field(min_length=10, max_length=2000)


class ConsultationStatusUpdateRequest(BaseModel):
    status: ConsultationStatus


class ConsultationResponse(BaseModel):
    consultation_id: int
    client_user_id: int
    lawyer_id: str
    scheduled_for: str
    summary: str
    status: ConsultationStatus
    created_on: str


class PaymentCreateRequest(BaseModel):
    consultation_id: int
    provider: str = Field(default="paystack", min_length=3, max_length=30)


class PaymentActionRequest(BaseModel):
    action: str = Field(pattern="^(complete|fail|release)$")


class PaymentResponse(BaseModel):
    payment_id: int
    consultation_id: int
    reference: str
    provider: str
    amount_ngn: int
    status: PaymentStatus
    created_on: str
    access_code: str | None = None
    authorization_url: str | None = None
    gateway_status: str | None = None
    paid_on: str | None = None
    released_on: str | None = None


class PaystackVerifyRequest(BaseModel):
    outcome: str = Field(pattern="^(success|failed)$")


class AuditEventResponse(BaseModel):
    audit_event_id: int
    actor_user_id: int | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    detail: str
    created_on: str


class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    kind: NotificationKind
    title: str
    body: str
    resource_type: str
    resource_id: str | None = None
    is_read: bool
    created_on: str
    read_on: str | None = None


class DocumentResponse(BaseModel):
    document_id: int
    consultation_id: int
    uploaded_by_user_id: int
    document_label: str
    original_filename: str
    content_type: str
    size_bytes: int
    created_on: str
