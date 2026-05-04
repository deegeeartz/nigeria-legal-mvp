# Nigeria Legal Marketplace - Full Implementation Plan

This plan details the step-by-step execution of the prioritized recommendations from the codebase audit, covering all 10 priority items. It also establishes a tracking mechanism to monitor progress in real-time.

## User Review Required

> [!IMPORTANT]
> **Token Security Migration:** Moving from `localStorage` to `httpOnly` cookies for JWTs will require updates on both the Next.js frontend and the FastAPI backend. This will fundamentally change how the frontend authenticates.
> **Database Migrations:** Several new features (RBAC, Client Reviews, Video Consultations) will require new database tables and migrations.
> **Third-Party Providers:** Video consultations and real NIN integration will require choosing actual third-party APIs (e.g., Daily.co for video, Smile Identity for NIN). We will build mock adapters structured exactly like the real providers if API keys are not yet available.

## Tracking Mechanism

We will use a dual-tracking system:
1. **Developer Tracking (`task.md`)**: A granular checklist used by the AI to track execution progress.
2. **Platform Tracking (`implementation_tracker.json`)**: We created this JSON file in the project root. The existing `/api/tracker` endpoint in `app/routers/system.py` already looks for this file, allowing the frontend (and admins) to query the exact progress of the implementation in real-time.

---

## Proposed Changes

### Phase 1: Critical Bug Fixes (B1-B6) & AuthResponse Update (B4)
*Estimated Time: 1-2 days*

#### [MODIFY] `app/settings.py`
- Remove hardcoded Paystack test keys (`sk_test_...` and `pk_test_...`). Set defaults to empty strings or safe generic placeholders.

#### [MODIFY] `app/routers/compliance.py`
- Add the missing `require_admin` import at the top of the file to prevent runtime crashes during admin seal downloads.

#### [MODIFY] `app/models.py`
- Update `AuthResponse` model with missing fields: `phone_number: str | None`, `profile_picture_url: str | None`, and `nin_verified: bool`.
- Add maximum length constraints to `opposing_party_name`, `opposing_party_nin`, and `opposing_party_rc_number` in `ConsultationCreateRequest`.

#### [MODIFY] `app/ranking.py`
- Fix the indentation of the `legal_system` filter so it executes independently of the `court_type` filter.

#### [MODIFY] `app/services/document_service.py`
- Parameterize `uploaded_by_user_id` or query admin ID dynamically instead of hardcoding `1`.

---

### Phase 2: Token Security (B8)
*Estimated Time: 1 day*

#### [MODIFY] `frontend/src/lib/auth.js`
#### [MODIFY] `app/main.py`
#### [MODIFY] `app/routers/auth.py`
- Refactor the backend to set `access_token` and `refresh_token` as `httpOnly`, `Secure`, `SameSite=Lax` cookies upon login/refresh.
- Implement a `/api/auth/csrf` endpoint or similar mechanism if needed for CSRF protection.
- Update the frontend `auth.js` to rely on cookies instead of `localStorage`.

---

### Phase 3: Admin Dashboard (Phase 9 / C11)
*Estimated Time: 3-5 days*

#### [NEW] `alembic/versions/YYYYMMDD_XXXX_add_user_permissions.py`
- Add a `permissions` JSONB or Text Array column to the `users` table.

#### [MODIFY] `app/dependencies.py`
- Implement `require_permission(permission: str)` to replace the monolithic `require_admin`.

#### [NEW] `frontend/src/app/admin/layout.js`
#### [NEW] `frontend/src/app/admin/page.js`
- Create a unified Next.js dashboard layout with a persistent sidebar linking to KYC, Audit, and Platform Metrics.

---

### Phase 4: Real NIN Integration (C1)
*Estimated Time: 2-3 days*

#### [MODIFY] `app/routers/kyc.py`
#### [NEW] `app/services/identity_provider.py`
- Replace the mock NIN lookup with a structured adapter pattern that connects to a real provider (e.g., Smile Identity or VerifyMe).
- Implement proper webhook or synchronous API payload handling for NIN resolution.

---

### Phase 5: Pagination (B9)
*Estimated Time: 1 day*

#### [MODIFY] `app/routers/consultations.py`
#### [MODIFY] `app/routers/messaging.py`
#### [MODIFY] `app/routers/system.py`
#### [MODIFY] `app/repos/*.py`
- Introduce standard `offset` and `limit` query parameters for list endpoints (`list_consultations`, `list_conversations`, `list_audit_events`) to prevent unbounded DB queries.

---

### Phase 6: Background Jobs (C12) & Email Notifications (B11)
*Estimated Time: 2-3 days*

#### [NEW] `app/worker.py`
- Implement a lightweight task queue (like `Celery` or `ARQ` using the existing Redis configuration).

#### [NEW] `app/services/email_service.py`
- Scaffold an asynchronous email sending service (architected to plug into SendGrid/Postmark).
- Route consultation booking confirmations, payment receipts, and KYC status updates through the background job queue to send emails.

---

### Phase 7: Client Reviews (C7)
*Estimated Time: 2 days*

#### [NEW] `alembic/versions/YYYYMMDD_XXXX_client_reviews.py`
- Create a `lawyer_reviews` table.

#### [NEW] `app/routers/reviews.py`
- Endpoints to submit a star rating (1-5) and text review post-consultation.
- Endpoints for lawyers to reply to reviews.

#### [MODIFY] `app/ranking.py`
- Update the ranking algorithm to dynamically compute the `rating` instead of relying on a static database column.

---

### Phase 8: Video Consultation (C9)
*Estimated Time: 3-5 days*

#### [NEW] `app/services/video_provider.py`
- Integrate a video conferencing API (e.g., Daily.co or Twilio Video).
- Generate secure, time-bound meeting room links when a consultation is booked and paid for.

#### [MODIFY] `app/routers/consultations.py`
- Expose the video meeting link in the consultation response payload only when the status is `paid` or the consultation is ongoing.

#### [MODIFY] `frontend/src/app/consultations/page.js`
- Build the UI to display the "Join Video Call" button.

---

## Verification Plan

### Automated Tests
- Run the existing test suite: `python -m pytest -v tests/`
- Add tests for `AuthResponse` validation and `ranking.py` filters.
- Add basic integration tests for the new background worker and video room generation.

### Manual Verification
- View the `/api/tracker` JSON output to confirm tracking state.
- Verify session persistence using `httpOnly` cookies in the browser.
- Perform an end-to-end booking to verify the generated video link and email task execution (via logs/worker).
