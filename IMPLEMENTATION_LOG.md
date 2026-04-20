# Implementation Log

<!-- markdownlint-disable MD022 MD024 MD032 -->

This file is the single running log of implementation progress for the project.

## How to Use

- Add a new dated entry whenever a meaningful implementation step is completed.
- Keep entries concise and outcome-focused.
- Include related files and test evidence where possible.

## Log Entries

### 2026-04-17 — Pilot Readiness Tranche Completed

#### Summary

- Completed core pilot hardening and operational readiness before first-wave users.

#### Implemented

- Security/auth hardening:
  - PBKDF2 password hashing with backward-compatible verification/migration
  - Explicit `lawyer_id` linkage for lawyer authorization
  - Complaint endpoint authentication and admin-only resolution guard
  - Password complexity validation and auth rate limiting
- Pilot environment and resilience:
  - Added `.env.example` for stable pilot configuration
  - Added backup automation via `scripts/backup_pilot.ps1`
  - Added auth lockout recovery runbook (`docs/pilot-auth-recovery-runbook.md`)
- Observability baseline:
  - Added structured request/error logging middleware
  - Added request IDs and slow-request thresholding
  - Added pilot alert checklist (`docs/pilot-alert-checklist.md`)
- Deployment pipeline readiness:
  - Added smoke test script (`scripts/smoke_test.ps1`)
  - Added deployment runbook (`docs/deployment-runbook.md`)
  - Added rollback checklist (`docs/rollback-checklist.md`)
- UAT automation:
  - Added end-to-end UAT runner (`scripts/uat_runner.py`)
  - Added UAT scenario doc (`docs/uat-scenarios.md`)

#### Validation

- Test suite status confirmed with `pytest` runs (`28 passed` across latest full/targeted runs).
- Smoke test executed successfully against live local instance.

#### Decision Logged

- Pilot DB strategy: continue with SQLite for pilot, prepare PostgreSQL readiness before scale-out.

#### Related Tracker Items

- `task-013` through `task-017` marked completed.

---

### 2026-04-19 — Admin KYC Automation & PWA Frontend Foundation

#### Summary

- Transformed the manual backend KYC process into an Admin-verified dashboard workflow and established the foundational Next.js Progressive Web App (PWA) client interface.

#### Implemented

- KYC Workflow:
  - Added `kyc_submission_status` (pending/approved/rejected) to `app/models.py`.
  - Added `GET /api/kyc/pending` endpoint for admin dashboard queues.
  - Added `POST /api/kyc/nin/verify` for automated NIN validation.
- Security:
  - Enforced strict MIME type limits (PDF, JPG, PNG) on KYC certificate uploads.
  - Integrated `CORSMiddleware` in FastAPI to allow frontend communication.
- Frontend (PWA):
  - Initialized Next.js 15 App Router with `@ducanh2912/next-pwa` for service worker generation.
  - Created `public/manifest.json` and adjusted `app/layout.js` for native iOS `appleWebApp` installation support.
  - Built Navigation UI, AuthContext (`src/lib/auth.js`), Landing Page (`/`), Search Page (`/search`), Login (`/login`), and a segmented Lawyer/Client Dashboard (`/dashboard`).
  - Added dedicated Admin Approval Queue (`/admin/kyc`) connecting to `GET /api/kyc/pending`.
  - Added dynamic Client Booking & Payment Escrow initialization screen (`/book/[id]`) mimicking Paystack checkout transitions.
- Phase 2: Modularization, Real-time & Case Management (April 20, 2026)
- Backend (FastAPI):
  - Refactored monolithic `app/main.py` into 7 feature routers.
  - Implemented **WebSocket Connection Manager** for real-time engagement.
  - Added **Asynchronous Webhook** endpoint for payment confirmation.
  - Added **Matter Tracking Workspace**: New tables for legal milestones and progress notes.
  - Implemented **Private/Public Note Logic** for secure lawyer-client collaboration.
- Frontend (Next.js 15):
  - Created `RealTimeProvider` context for live event streams.
  - Built a **Visual Matter Timeline** for case tracking.
  - Added **Dual-Channel Notes** (Private vs Shared) for professional case management.
  - Integrated **Live Timestamps** across all conversation and tracking threads.

#### Validation

- Comprehensive test suite passed (31/31).
- Webhook-to-WebSocket broadcast chain verified via simulation scripts.

#### Decision Logged

- Decided to pivot NBA automated scraping to an Admin-Approval model due to anti-bot restrictions on the NBA website. Added simulated NIN capabilities for future standard-API hookups (e.g. Dojah).

#### Related Tracker Items

- Completed Phase 1 core backend security requirements and initial UI views.

---

### 2026-04-19 — Workflow Completion Sweep (Non-Paystack, Non-MFA)

#### Summary

- Completed the remaining MVP workflow gaps across auth UX, KYC submission/review, messaging, consultations, notifications, and admin audit visibility.

#### Implemented

- Auth and account UX:
  - Added role-choice entry screens for `/login` and `/signup` with explicit user paths (`I am a lawyer` / `I am a client`).
  - Added role-specific auth routes: `/login/[role]` and `/signup/[role]` with role-aware styling and routing guard fallback for invalid roles.
  - Extended auth response/profile contracts to consistently include `lawyer_id` across signup/login/refresh/me flows.
- KYC lifecycle:
  - Added lawyer self-service KYC page (`/kyc`) with NIN verification and certificate upload.
  - Added dedicated KYC document persistence and certificate retrieval path, including admin/lawyer download endpoint.
  - Enhanced admin KYC queue with certificate download action for review.
- Messaging + consultations + notifications:
  - Added inbox/thread page (`/messages`) with conversation list, message send, and client-initiated conversation flow.
  - Added consultation workspace (`/consultations`) with document upload/list/download and consultation status update actions (complete/cancel) from UI.
  - Added notifications center (`/notifications`) with unread count and mark-as-read flow.
- Admin oversight and dashboard wiring:
  - Added admin audit log page (`/admin/audit`) backed by `GET /api/audit-events`.
  - Wired dashboard to live counts (`consultations`, `conversations`, `notifications`) and recent activity feed.
  - Updated navigation to include new user and admin routes, including audit access for admin role.

#### Validation

- Backend test suite: `pytest -q` passing (`35 passed`).
- Frontend quality checks: `npm run lint` passing with zero lint errors.
- Added regression coverage for:
  - auth responses carrying `lawyer_id`.
  - admin KYC certificate download.
  - consultation status permission flow.

#### Decision Logged

- Deferred implementation remains unchanged for this tranche:
  - real Paystack gateway integration (keep simulation contract active for MVP safety),
  - MFA rollout,
  - backend password-reset token/email flow.

#### Related Tracker Items

- Follow-up tracker sync required to map this tranche into explicit `task-*`/`feat-*` IDs in `implementation_tracker.json`.

---

### 2026-04-20 — NDPA Breach Notification SLA Tracking

#### Summary

- Implemented NDPA-compliant breach notification SLA tracking with automated deadline calculation, status monitoring, and admin escalation controls.

#### Implemented

- Database Schema:
  - Created migration `20260420_0004_breach_sla_tracking.py` adding three new columns to `breach_incidents`:
    - `notification_deadline` (DateTime, nullable): Calculated 72-hour deadline from breach discovery per NDPA requirements
    - `escalation_triggered` (Boolean, NOT NULL, default=False): Flag to track admin escalation alerts
    - `escalation_triggered_at` (DateTime, nullable): Timestamp of when escalation was triggered
  - Added index `idx_breach_incidents_sla_status` on (notification_deadline, escalation_triggered) for efficient SLA queries
- Data Models:
  - Extended `BreachIncidentResponse` with 5 new fields: `notification_deadline`, `escalation_triggered`, `escalation_triggered_at`, `sla_status`, `days_until_deadline`
  - Created new `BreachSlaStatusResponse` model for SLA-focused list responses with breach metadata and deadline info
- Database Functions:
  - `check_breach_sla_status(breach_incident_id)`: Calculates 72-hour deadline if not already set and returns SLA status dict
  - `list_breach_incidents_by_sla_status(sla_status, limit)`: Lists breaches with enriched deadline/days-remaining info, optionally filtered by SLA status (on-track, at-risk, overdue, notified)
  - `trigger_breach_escalation(breach_incident_id, actor_user_id)`: Marks escalation flag and logs audit event for admin alert tracking
- API Endpoints:
  - `GET /api/compliance/breach-incidents/sla-status`: Lists breach incidents ordered by deadline urgency with optional filtering by SLA status (on-track >1 day, at-risk ≤1 day, overdue <0 days, notified=reported to NDPC)
  - `POST /api/compliance/breach-incidents/{id}/escalate`: Admin-only endpoint to trigger SLA escalation alerts when deadlines are imminent or missed
- Response Mapper:
  - Updated `_to_breach_response()` in router to convert datetime objects to ISO format strings for model compatibility
  - Added defensive datetime type handling in list function to support both string and datetime object returns from database

#### Validation

- Test Coverage:
  - `test_breach_sla_tracking`: Validates deadline calculation and status enumeration (on-track, at-risk, overdue)
  - `test_breach_escalation_admin_only`: Validates admin-only access control and escalation state persistence
  - `test_breach_sla_filter_by_status`: Validates filtering by SLA status category and deadline ordering
- Test Results: **46/46 tests passing** (43 baseline + 3 new SLA tests)
  - No regressions in existing compliance or other test suites
  - All SLA features production-ready
- Bug Fixes:
  - Fixed `trigger_breach_escalation()` audit event function call signature (changed `event_type=` to `action=`)
  - Fixed datetime type handling in `list_breach_incidents_by_sla_status()` for mixed datetime/string inputs from database
  - Added ISO string conversion in response mappers for model validation

#### Decision Logged

- SLA Status Categories:
  - **on-track**: >1 day until deadline (green, no action needed)
  - **at-risk**: ≤1 day until deadline (yellow, escalation recommended)
  - **overdue**: <0 days past deadline (red, immediate escalation)
  - **notified**: Already reported to NDPC (blue, compliance met)
- 72-hour deadline calculation aligns with NDPA section 27.2 requirement for breach notification to NDPC

#### Related Tracker Items

- Phase-2: NDPA Compliance & Data Governance opened
- Task-018: Implement breach notification SLA tracking (completed)
- Feature feat-101: Breach notification SLA tracking (completed)

---

### 2026-04-20 — Annual Stamp & Seal Compliance Badge (Digital Seals)

#### Summary

- Implemented end-to-end annual stamp & seal compliance feature: encrypted private document storage, public trust badge in search and ranking, lawyer self-service upload UI, and admin-only audit download capability.

#### Implemented

- Database Schema:
  - Created migration `20260420_0005_lawyer_practice_seals.py` adding two new tables:
    - `lawyer_practice_seals`: Stores annual seal metadata per lawyer/year (BPF paid flag, CPD points, seal file storage key, MIME type, verification status, badge visibility)
    - `seal_events`: Audit trail for all seal lifecycle events (upload, verify, download) with actor and timestamp
- Database Functions:
  - `upsert_practice_seal`: Insert or update a lawyer's seal record for a given year
  - `get_practice_seal`: Fetch a single seal record by lawyer/year
  - `get_latest_practice_seal`: Fetch the most recent seal for a lawyer
  - `list_compliant_lawyers`: List all lawyers with valid seals for a given year
  - `list_seal_events`: Paginated audit trail for seal operations
- API Endpoints (`app/routers/compliance.py`):
  - `POST /api/compliance/practice-seal/upload`: Admin-only; accepts seal document file, scans for malware, encrypts at rest, persists metadata
  - `GET /api/compliance/practice-seal/check`: Lawyer self-check for own seal/badge status
  - `GET /api/compliance/practice-seal/{lawyer_id}`: Public seal status by lawyer ID
  - `GET /api/compliance/practising-list`: Admin-accessible list of all compliant lawyers
  - `POST /api/compliance/practice-seal/{lawyer_id}/verify`: Admin manual verification action
  - `GET /api/compliance/practice-seal/{lawyer_id}/audit-trail`: Admin audit trail for a lawyer's seal history
  - `GET /api/compliance/practice-seal/{lawyer_id}/document/download`: Admin-only; decrypts and streams original seal file with Content-Disposition headers; logs audit event on every access
- Encryption at Rest:
  - Added `cryptography==42.0.8` to `requirements.txt`
  - Added `encrypt_seal_bytes` / `decrypt_seal_bytes` Fernet helpers and `SealEncryptionError` to `app/security.py`
  - Added `SEAL_ENCRYPTION_KEY` config in `app/settings.py` with secure fallback derivation from app secret for dev continuity
  - Updated `.env.example` with `SEAL_ENCRYPTION_KEY` entry
  - Seal bytes are always encrypted before writing to disk; plaintext is never persisted
- Ranking Integration (`app/ranking.py`):
  - Added CPD-compliant seal trust bonus to scoring engine
  - Appended `Seal & Stamp {year}` badge to matching lawyer profiles
- Frontend (Next.js):
  - Added lawyer seal upload page at `/lawyer/seal` (`frontend/src/app/lawyer/seal/page.js`)
  - Added **Seal** nav entry to `Navigation.js`
  - Added annual stamp/seal workflow shortcut card to `dashboard/page.js`
  - Updated search results page to render seal icon when the `Seal & Stamp` badge is present

#### Validation

- Test Coverage Added (`tests/test_compliance.py`):
  - `test_practice_seal_file_is_encrypted_at_rest`: Confirms disk bytes differ from uploaded plaintext and decrypt correctly
  - `test_admin_can_download_decrypted_seal_document`: Confirms returned bytes match original upload with correct headers
  - `test_non_admin_cannot_download_seal_document`: Confirms `403` for non-admin users
- Test Results: **23/23 tests passing** (compliance 19, ranking 4) — no regressions
- Authorization hardened: upload and download endpoints reject non-admin callers with `403`

#### Decision Logged

- Seal documents are always stored encrypted (Fernet symmetric encryption). The public profile shows only a trust badge icon (`Seal & Stamp {year}`) — no document is ever visible to clients or the public.
- Admin download endpoint is audited: every access is recorded in `seal_events` for NDPA accountability.

#### Related Tracker Items

- Task-019: Annual stamp & seal schema and API layer (completed)
- Task-020: Seal trust badge in ranking and search (completed)
- Task-021: Lawyer seal upload UI and encryption at rest (completed)
- Task-022: Admin seal document download endpoint and tests (completed)
- Feature feat-102: Annual Stamp & Seal compliance badge (completed)

---

```markdown
### YYYY-MM-DD — <Short Milestone Title>

#### Summary

- ...

#### Implemented

- ...

#### Validation

- ...

#### Decision Logged

- ...

#### Related Tracker Items

- ...
```

### 2026-04-17 — Tracker command validation

#### Summary

- Validated CLI appends implementation entry

#### Implemented

- Added tracker command
- Synced timeline note

#### Validation

- Command exits successfully

#### Related Tracker Items

- task-017
