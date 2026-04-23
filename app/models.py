from __future__ import annotations
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import re
from typing import List, Optional

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


class CourtType(str, Enum):
    federal_high_court = "federal_high_court"
    state_high_court = "state_high_court"
    magistrate = "magistrate"
    customary = "customary"
    sharia = "sharia"
    national_industrial = "national_industrial"
    court_of_appeal = "court_of_appeal"
    supreme_court = "supreme_court"


class LegalSystem(str, Enum):
    common_law = "common_law"
    sharia = "sharia"
    customary = "customary"


class PaymentMethod(str, Enum):
    card = "card"
    virtual_account = "virtual_account"
    bank_transfer = "bank_transfer"
    offline_teller = "offline_teller"


@dataclass
class Lawyer:
    id: str
    full_name: str
    state: str
    practice_areas: List[str]
    years_called: int
    nin_verified: bool
    nba_verified: bool
    profile_completeness: int
    completed_matters: int
    rating: float
    response_rate: int
    avg_response_hours: float
    repeat_client_rate: int
    base_consult_fee_ngn: int
    active_complaints: int
    bvn_verified: bool = False
    severe_flag: bool = False
    enrollment_number: str | None = None
    verification_document_id: int | None = None
    kyc_submission_status: str = "none"  # none | pending | approved | rejected
    nin: str | None = None
    latest_seal_year: int | None = None
    latest_seal_expires_at: datetime | None = None
    seal_badge_visible: bool = False
    is_san: bool = False
    court_admissions: List[str] | None = None  # List of CourtType values
    legal_system: str = "common_law"  # common_law | sharia | customary
    bvn: str | None = None
    bar_chapter: str | None = None  # e.g. "Ikeja", "Lagos Island", "Port Harcourt"
    pro_bono_practice_areas: List[str] | None = None  # Targeted categories for free service
    profile_picture_url: str | None = None

    @property
    def price_display(self) -> str:
        """Standard Nigerian Naira formatting: ₦XX,XXX"""
        return f"₦{self.base_consult_fee_ngn:,}"


class IntakeRequest(BaseModel):
    summary: str = Field(min_length=10, max_length=1200)
    state: str = Field(min_length=2, max_length=50)
    urgency: Urgency
    budget_max_ngn: int = Field(ge=0)
    legal_terms_mode: bool = False
    court_type: str | None = Field(default=None, description="Filter by court type (e.g. 'sharia', 'federal_high_court')")
    legal_system: str | None = Field(default=None, description="Filter by legal system: common_law, sharia, customary")
    pro_bono_only: bool = False


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
    price_display: str
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
    bar_chapter: str | None = None
    practice_areas: List[str]
    pro_bono_practice_areas: List[str] | None = None
    verification: dict
    stats: dict
    profile_picture_url: str | None = None
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
    created_on: datetime
    resolved_on: datetime | None = None
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
    phone_number: str = Field(min_length=10, max_length=20, pattern=r"^\+?[0-9\-\s]+$")
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
    access_expires_at: datetime
    refresh_expires_at: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=12, max_length=200)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class UserProfileResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: UserRole
    phone_number: str | None = None
    profile_picture_url: str | None = None
    nin_verified: bool = False
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
    updated_on: datetime
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
    created_on: datetime


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    message_id: int
    conversation_id: int
    sender_user_id: int
    body: str
    created_on: datetime


class ConsultationCreateRequest(BaseModel):
    lawyer_id: str = Field(min_length=3, max_length=40)
    scheduled_for: str = Field(min_length=10, max_length=80)
    summary: str = Field(min_length=10, max_length=2000)
    opposing_party_name: Optional[str] = Field(default=None, max_length=100)
    opposing_party_nin: Optional[str] = Field(default=None, max_length=11, description="NIN of opposing party for stronger conflict detection")
    opposing_party_rc_number: Optional[str] = Field(default=None, max_length=20, description="CAC RC number if opposing party is a company")
    is_contingency: bool = False
    contingency_percentage: Optional[float] = Field(default=None, ge=0, le=100)


class ConsultationStatusUpdateRequest(BaseModel):
    status: ConsultationStatus


class SuccessFeeRequest(BaseModel):
    recovered_amount_ngn: int = Field(ge=0)
    proof_document_id: Optional[int] = None


class ConsultationResponse(BaseModel):
    consultation_id: int
    client_user_id: int
    lawyer_id: str
    scheduled_for: str
    summary: str
    status: ConsultationStatus
    created_on: datetime
    opposing_party_name: Optional[str] = None
    opposing_party_nin: Optional[str] = None
    opposing_party_rc_number: Optional[str] = None
    is_contingency: bool = False
    contingency_percentage: Optional[float] = None


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
    vat_amount_ngn: int = 0
    total_plus_vat_ngn: int = 0
    status: PaymentStatus
    payment_method: PaymentMethod = PaymentMethod.card
    created_on: datetime
    access_code: str | None = None
    authorization_url: str | None = None
    gateway_status: str | None = None
    paid_on: datetime | None = None
    released_on: datetime | None = None


class PaystackVerifyRequest(BaseModel):
    outcome: str = Field(pattern="^(success|failed)$")


class AuditEventResponse(BaseModel):
    audit_event_id: int
    actor_user_id: int | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    detail: str
    created_on: datetime


class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    kind: NotificationKind
    title: str
    body: str
    resource_type: str
    resource_id: str | None = None
    is_read: bool
    created_on: datetime
    read_on: datetime | None = None


class DocumentResponse(BaseModel):
    document_id: int
    consultation_id: int
    uploaded_by_user_id: int
    document_label: str
    original_filename: str
    content_type: str
    size_bytes: int
    created_on: datetime

class MilestoneCreateRequest(BaseModel):
    event_name: str = Field(min_length=2, max_length=100)
    status_label: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=500)

class MilestoneResponse(BaseModel):
    id: int
    consultation_id: int
    event_name: str
    status_label: str | None = None
    description: str | None = None
    created_on: datetime

class ConsultationNoteCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    is_private: bool = False

class ConsultationNoteResponse(BaseModel):
    id: int
    consultation_id: int
    author_user_id: int
    body: str
    is_private: bool
    created_on: datetime


class ConsentEventCreateRequest(BaseModel):
    purpose: str = Field(min_length=3, max_length=120)
    lawful_basis: str = Field(min_length=3, max_length=120)
    consented: bool
    policy_version: str = Field(min_length=1, max_length=40)
    metadata: dict | None = None


class ConsentEventResponse(BaseModel):
    consent_event_id: int
    user_id: int
    purpose: str
    lawful_basis: str
    consented: bool
    policy_version: str
    metadata_json: str | None = None
    created_on: datetime


class DsrRequestCreateRequest(BaseModel):
    request_type: str = Field(pattern="^(access|correction|deletion|portability|restriction)$")
    detail: str = Field(min_length=5, max_length=2000)


class DsrRequestStatusUpdateRequest(BaseModel):
    status: str = Field(pattern="^(in_review|completed|rejected)$")
    resolution_note: str = Field(min_length=3, max_length=500)


class DsrRequestResponse(BaseModel):
    dsr_request_id: int
    user_id: int
    request_type: str
    status: str
    detail: str
    created_on: datetime
    updated_on: datetime
    resolved_on: datetime | None = None
    resolution_note: str | None = None
    resolved_by_user_id: int | None = None


class DsrDeletionExecuteRequest(BaseModel):
    resolution_note: str = Field(min_length=3, max_length=500)


class DsrDeletionExecuteResponse(BaseModel):
    dsr_request_id: int
    user_id: int
    status: str
    anonymized_email: str
    redacted_messages: int
    redacted_notes: int
    deleted_notifications: int
    revoked_sessions: int
    executed_on: datetime


class DsrExportResponse(BaseModel):
    dsr_request: dict
    user_profile: dict
    consent_events: list[dict]
    dsr_history: list[dict]
    data_summary: dict
    generated_on: datetime


class DsrCorrectionCreateRequest(BaseModel):
    field_name: str = Field(pattern="^(full_name|email)$")
    requested_value: str = Field(min_length=2, max_length=200)
    justification: str = Field(min_length=5, max_length=2000)
    evidence: str | None = Field(default=None, max_length=2000)


class DsrCorrectionReviewRequest(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    review_note: str = Field(min_length=3, max_length=500)


class DsrCorrectionResponse(BaseModel):
    correction_id: int
    dsr_request_id: int
    user_id: int
    field_name: str
    current_value: str | None = None
    requested_value: str
    justification: str
    evidence: str | None = None
    status: str
    review_note: str | None = None
    reviewed_by_user_id: int | None = None
    reviewed_on: datetime | None = None
    created_on: datetime
    updated_on: datetime


class BreachIncidentCreateRequest(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    severity: str = Field(pattern="^(low|medium|high|critical)$")
    description: str = Field(min_length=10, max_length=4000)
    impact_summary: str | None = Field(default=None, max_length=2000)
    affected_data_types: str | None = Field(default=None, max_length=1000)
    affected_records: int | None = Field(default=None, ge=0)
    occurred_on: datetime | None = Field(default=None)
    detected_on: datetime = Field(...)


class BreachIncidentUpdateRequest(BaseModel):
    status: str = Field(pattern="^(open|investigating|contained|resolved)$")
    impact_summary: str | None = Field(default=None, max_length=2000)
    affected_records: int | None = Field(default=None, ge=0)
    reported_to_ndpc: bool | None = None
    ndpc_reported_on: datetime | None = Field(default=None)
    contained_on: datetime | None = Field(default=None)
    resolved_on: datetime | None = Field(default=None)
    resolution_note: str | None = Field(default=None, max_length=1000)


class BreachIncidentResponse(BaseModel):
    breach_incident_id: int
    title: str
    severity: str
    status: str
    description: str
    impact_summary: str | None = None
    affected_data_types: str | None = None
    affected_records: int | None = None
    occurred_on: datetime | None = None
    detected_on: datetime
    reported_to_ndpc: bool
    ndpc_reported_on: datetime | None = None
    contained_on: datetime | None = None
    resolved_on: datetime | None = None
    resolution_note: str | None = None
    notification_deadline: datetime | None = None
    escalation_triggered: bool
    escalation_triggered_at: datetime | None = None
    sla_status: str | None = None
    days_until_deadline: int | None = None
    created_by_user_id: int
    updated_by_user_id: int
    created_on: datetime
    updated_on: datetime


class RetentionRunRequest(BaseModel):
    retention_days: int = Field(ge=1, le=3650, default=180)
    dry_run: bool = True




class RetentionRunResponse(BaseModel):
    retention_days: int
    dry_run: bool
    deleted_notifications: int
    deleted_audit_events: int
    deleted_expired_sessions: int
    executed_on: datetime


class BreachSlaStatusResponse(BaseModel):
    """Status of breach SLA compliance (NDPA 72-hour notification deadline)."""
    breach_incident_id: int
    title: str
    severity: str
    status: str
    detected_on: datetime
    notification_deadline: datetime | None
    days_until_deadline: int | None
    sla_status: str  # "on-track", "at-risk" (< 24h), "overdue", "notified"
    escalation_triggered: bool
    reported_to_ndpc: bool


class PracticeSealUploadRequest(BaseModel):
    """Upload NBA-mandated digital practice seal for annual renewal."""
    practice_year: int = Field(ge=2025, le=2030)
    bpf_paid: bool = Field(default=True, description="BPF annual practising list payment confirmed")
    bpf_paid_date: str | None = Field(default=None, description="ISO date of BPF payment (YYYY-MM-DD)")
    cpd_points: int = Field(ge=0, le=100, default=0, description="Accumulated CPD points for year")
    verification_notes: str = Field(max_length=500, default="", description="Admin notes on seal verification")


class PracticeSealResponse(BaseModel):
    """Digital practice seal verification and compliance status."""
    lawyer_id: str
    practice_year: int
    bpf_paid: bool
    cpd_points: int
    cpd_compliant: bool  # True if bpf_paid AND cpd_points >= 5
    aplineligible: bool  # True if bpf_paid (Annual Practising List eligible)
    seal_uploaded_at: datetime | None
    seal_expires_at: datetime | None
    verified_on: datetime | None
    verified_by_user_id: int | None
    source: str  # "manual", "nba_api", "csv_import", "admin_override"
    created_on: datetime
    updated_on: datetime


class PracticeSealCheckResponse(BaseModel):
    """Quick check of lawyer's current seal status."""
    lawyer_id: str
    has_valid_seal: bool  # seal_expires_at > now
    seal_year: int | None
    cpd_compliant: bool
    apl_eligible: bool
    seal_badge_visible: bool  # show badge on profile


