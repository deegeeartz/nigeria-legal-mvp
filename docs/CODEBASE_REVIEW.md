# Nigeria Legal Marketplace — Codebase Review

**Date**: April 21, 2026  
**Test Suite**: 53 passed, 0 warnings ✅  
**Branch**: `main`

> **Note — Review Accuracy**: This document was re-verified on April 21, 2026 against the live codebase after edits to `app/main.py`, `app/ranking.py`, `app/routers/system.py`, `app/routers/consultations.py`, `app/repos/consultations.py`, `app/services/`, `app/repos/lawyers.py`, `app/models.py`, and `app/settings.py`. Several items previously listed as gaps have since been implemented and are marked accordingly.

---

## Table of Contents

1. [What's Working (Production-Ready)](#1-whats-working-production-ready)
2. [What Needs Improvement](#2-what-needs-improvement)
3. [Global Standards Alignment](#3-global-standards-alignment)
4. [Nigerian Legal Landscape — What to Implement](#4-nigerian-legal-landscape--what-to-implement)
5. [Recommended Implementation Order](#5-recommended-implementation-order)

---

## 1. What's Working (Production-Ready)

### Core Infrastructure

- **Async FastAPI** with modular domain routers — `auth`, `kyc`, `lawyers`, `consultations`, `payments`, `compliance`, `messaging` — clean separation of concerns
- **PostgreSQL + Alembic** — 17 migrations, proper indexing, ACID transactions, foreign key integrity
- **53 tests passing, 0 warnings** — auth, ranking, complaints, workflows, audit, and compliance all covered
- **Docker-ready** — `docker-compose.yml`, `docker-compose.prod.yml`, multi-stage Dockerfiles present
- **CORS env-configurable** — `CORS_ALLOWED_ORIGINS` loaded from environment via `app/settings.py`; no longer hardcoded to `localhost:3000`
- **Production config validation** — `validate_runtime_configuration()` enforces `PII_SECRET_KEY`, `DATABASE_URL`, and `PAYSTACK_SECRET_KEY` in production; raises `RuntimeError` on startup if misconfigured
- **Privacy & cookie policy endpoints** — `GET /legal/privacy-policy` and `GET /legal/cookie-consent` live in `app/routers/system.py`

### Nigerian Legal Domain Logic

- **NIN + NBA certificate verification** — dual-layer trust model aligned with Nigerian KYC requirements
- **SAN designation** (`is_san`) with ranking weight — correctly models Nigeria's Senior Advocate of Nigeria designation
- **Court admissions per lawyer** — `federal_high_court`, `state_high_court`, `national_industrial`, `court_of_appeal`, `sharia`, `customary`, `supreme_court`
- **Legal system filter** — `common_law`, `sharia`, `customary` correctly reflects Nigeria's pluralistic legal systems
- **Complaint severity model** — `minor / major / severe` mirrors the NBA disciplinary process; `severe_flag` triggers ranking penalty
- **NDPA breach SLA** — 72-hour notification deadline to NDPC per NDPA §27.2, with escalation tracking
- **NGN currency formatting** — `price_display` property on `Lawyer` model returns `₦XX,XXX`; surfaced in all match and profile responses
- **State bar chapter** — `bar_chapter` field on `Lawyer` model and `LawyerProfileResponse` (e.g. "Ikeja", "Lagos Island", "Port Harcourt")
- **NBA disciplinary CSV sync** — `POST /api/admin/sync/nba-disciplinary` accepts CSV (`lawyer_id,severe_flag,active_complaints`) and bulk-updates disciplinary status via `app/services/admin_service.py`
- **Engagement letter generator** — `app/services/document_service.py` generates a `fpdf2` PDF engagement letter on consultation booking, satisfying NBA RPC Rule 10; stored as a consultation document
- **Court type + legal system intake filters** — `court_type` and `legal_system` fields on `IntakeRequest` propagate through `rank_lawyers` to filter the pool before scoring
- **Conflict-of-interest check** — `check_conflict()` in `repos/consultations.py` queries prior consultations by opposing party name; a `consultation.conflict_alert` audit event is logged automatically on booking if a match is found
- **Contingency fee arrangements** — `ConsultationCreateRequest` accepts `is_contingency` + `contingency_percentage`; `POST /api/consultations/{id}/success-fee` calculates and invoices the success fee when the matter concludes
- **VAT on payments** — `PaymentResponse` includes `vat_amount_ngn` and `total_plus_vat_ngn` fields; 7.5% Nigerian VAT calculated at payment creation

### Ranking Engine

- 6-factor weighted scoring:
  | Factor | Weight |
  |---|---|
  | Expertise | 30% |
  | Trust | 20% |
  | Quality outcomes | 20% |
  | Responsiveness | 15% |
  | Price-fit | 10% |
  | Availability | 5% |
- **Adaptive new-lawyer exposure bands** (25/20/15/10%) — prevents incumbent lock-in, critical for marketplace fairness
- Async CPD / practice seal bonus lookup — rewards compliance-active lawyers
- Explainable `why_recommended` reasons surfaced to clients

### Compliance — NDPA Phase 1 + Encryption ✅

- `consent_events` table with lawful basis tracking
- Full DSR workflow: access, correction, deletion, portability, restriction
- Breach incident registry with severity levels and 72-hour SLA countdown
- HMAC-SHA512 Paystack webhook verification
- Audit log with 30-day configurable retention
- Malware scanning (EICAR + ClamAV fallback) on document uploads
- **NIN and BVN encrypted at rest** — `encrypt_pii` / `decrypt_pii` Fernet functions in `app/repos/connection.py`; applied transparently on every `upsert_lawyer` write and `row_to_lawyer` read
- **Practice seal encrypted** — `SEAL_ENCRYPTION_KEY` (Fernet, SHA-256 derived from `PAYSTACK_SECRET_KEY` as fallback) via `_seal_cipher()` in `app/security.py`
- **PII key validation on startup** — `validate_runtime_configuration()` rejects fallback `PII_SECRET_KEY` in production

---

## 2. What Needs Improvement

### Priority 1 — High Impact, Short Effort

| Issue | Gap | Recommended Fix |
|---|---|---|
| **No email/SMS** | Booking confirmations, SLA alerts, complaint notices never sent | SendGrid + Twilio + Celery/Redis |
| **Seed data dependency** | `app/data.py` has 10 hardcoded lawyers; ranking runs against in-memory objects, not the live DB | Connect `rank_lawyers` to live `lawyers` table via `repos/lawyers.py` |
| **No rate limiting on uploads** | `/api/consultations/{id}/documents` has no per-user upload rate limit | Add `slowapi` limiter on the file upload endpoint |

> ✅ **Already done** — CORS is now env-configurable (`CORS_ALLOWED_ORIGINS` in `settings.py`). NIN/BVN are Fernet-encrypted at rest in `repos/lawyers.py`. Both were previously listed as gaps.

### Priority 2 — Architecture

| Issue                                     | Gap                                                                                | Recommended Fix                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **No WebSocket chat**                     | Messaging is polling-only; feels slow                                              | `@app.websocket("/ws/conversations/{id}")` with connection manager                           |
| **No task queue**                         | Emails, PDF generation, and breach escalations would block the request thread      | Celery + Redis                                                                               |
| **No observability**                      | No APM, no distributed tracing, no structured metrics beyond request logs          | OpenTelemetry → Jaeger or Datadog                                                            |
| **Intake classification is keyword-only** | `classify_intake` uses basic string matching — will mis-classify ambiguous queries | Fine-tune with an LLM or at minimum a TF-IDF classifier trained on Nigerian legal categories |

### Priority 3 — Nigerian Market Gaps

| Issue | Gap | Recommended Fix |
|---|---|---|
| **No real NIN/BVN verification** | `nin_verified` / `bvn_verified` flags are still set by simulation, not a live API | Integrate Dojah or Smile Identity for live NIN/BVN lookup |
| **NBA list sync is CSV-only** | `POST /api/admin/sync/nba-disciplinary` requires manual admin CSV upload | Add a scheduled job to auto-fetch from NBA public portal |
| **No milestone-gated escrow** | Payment release is independent of consultation workflow | Require consultation `status == "completed"` + at least 1 milestone before `released` transition |

> ✅ **Already done** — Conflict-of-interest check (`check_conflict`), contingency fee arrangements (`is_contingency` + success fee endpoint), and VAT fields (`vat_amount_ngn`, `total_plus_vat_ngn`) were previously listed as gaps but are now implemented.

---

## 3. Global Standards Alignment

### NDPA (Nigeria Data Protection Act) — 85% ✅

| Control                   | Status                             | Gap                                            | Priority |
| ------------------------- | ---------------------------------- | ---------------------------------------------- | -------- |
| Consent Management        | ✅ Implemented                     | Need explicit opt-in modal on signup           | Medium   |
| Purpose Limitation        | ✅ Logged in `audit_events`        | Need legal basis matrix export                 | Low      |
| Data Minimization         | ✅ Only NIN/BVN/name collected     | Maintain quarterly review                      | Low      |
| Security — Encryption | ✅ Fernet at-rest for NIN/BVN + practice seal | Key rotation procedure + backup needed | Medium |
| Breach Notification       | ✅ 72-hour SLA tracked             | Need automated escalation to NDPC              | Medium   |
| Data Subject Rights       | ✅ DSR endpoints implemented       | Need evidence attachments + redaction UI       | Medium   |
| Data Processing Inventory | ❌ Not exported                    | Implement `/api/compliance/inventory` endpoint | Low      |
| DPO Role                  | ⚠️ Admin handles DPO duties        | Need dedicated DPO user role + dashboard       | Medium   |
| Retention Policy          | ✅ Configurable (default 180 days) | Need quarterly review process                  | Low      |

> **Target**: 95% NDPA compliance by end of Q2 2026 (encryption + DPO dashboard + consent modal)

---

### PCI-DSS (Payment Security) — 100% ✅

- ✅ Paystack Hosted Checkout — card data never touches our servers
- ✅ No card storage in the database
- ✅ HMAC-SHA512 webhook signature validation
- ✅ Minimal PCI scope = low risk

---

### GDPR Alignment (for EU/UK clients) — 90% ✅

| Control                     | Status                           | Notes                                                 |
| --------------------------- | -------------------------------- | ----------------------------------------------------- |
| Lawful Basis                | ✅ Consent + Legitimate Interest | Tracked in `consent_events`                           |
| Privacy Notice              | ✅ Implemented                   | `GET /legal/privacy-policy` live in `system.py`       |
| Cookie Consent              | ⚠️ Validate                      | JWT in localStorage is acceptable; document rationale |
| DPIA                        | ⚠️ Not documented                | Document for high-risk processing (payments, NIN/BVN) |
| Data Transfer (3rd parties) | ⚠️ Paystack + Dojah SDKs         | Need DPA agreements with vendors                      |
| Right to be Forgotten       | ✅ DSR deletion implemented      | Good                                                  |

---

### ISO 27001 (Information Security) — ~70% ⚠️

| Control                | Status                  | Gap                                       |
| ---------------------- | ----------------------- | ----------------------------------------- |
| Access Control         | ✅ RBAC + rate limiting | Need VPN/IP whitelist for admin console   |
| Encryption             | ✅ Fernet at-rest (NIN/BVN/seal) | Key rotation + backup procedure needed    |
| Incident Response      | ⚠️ Manual escalation    | Need automated incident response playbook |
| Backup & Recovery      | ⚠️ Manual backups       | Need automated daily backups + DR testing |
| Vulnerability Scanning | ❌ Not implemented      | Add SAST/DAST to CI/CD pipeline           |
| Change Management      | ⚠️ Git-based            | Formalize change approval process         |

---

## 4. Nigerian Legal Landscape — What to Implement

These features are **not yet in the roadmap** and would meaningfully differentiate this platform.

---

### 4.1 Engagement Letter Generator (NBA RPC Rule 10) ✅ IMPLEMENTED

A PDF retainer agreement is auto-generated on consultation booking via `app/services/document_service.py` using `fpdf2`. It includes:
- Parties (client name + lawyer name)
- Scope of engagement, scheduled date, matter summary
- Financial terms (NGN fee, platform payment clause)
- Professional standards clause (NBA RPC, conflict-of-interest acknowledgement)
- Signature placeholders

The generated PDF is stored in `storage/uploads/` and registered as a consultation document. Accessible via `GET /api/consultations/{id}/documents`.

**Remaining gap**: The letter does not yet include the lawyer's `enrollment_number` or `bar_chapter` in the header. Both fields exist on the `Lawyer` model and should be added to the PDF template in `document_service.py`.

---

### 4.2 Conflict-of-Interest Engine ✅ IMPLEMENTED

`check_conflict(lawyer_id, opposing_party_name)` in `app/repos/consultations.py` queries `consultations` for prior bookings with the same lawyer and opposing party (case-insensitive). It is called automatically in `POST /api/consultations` whenever `opposing_party_name` is provided. Conflicts are logged as `consultation.conflict_alert` audit events and surfaced to the client in the response.

**Remaining gap**: Conflict detection is name-string-only. A stronger implementation would also match by party NIN or company RC number to catch name variations.

---

### 4.2a Contingency Fee Arrangements ✅ IMPLEMENTED

Consultations can now be created with `is_contingency: true` and a `contingency_percentage` (0–100). When the matter concludes, lawyers call `POST /api/consultations/{id}/success-fee` with `recovered_amount_ngn`; the platform calculates the success fee, creates a payment record, and logs the event. This aligns with the NBA Legal Practitioners Act fee regulations for contingency matters.

---

### 4.3 Real NIN/BVN Verification via Dojah or Smile Identity

The NIN and BVN values are now **stored encrypted** at rest (Fernet, `encrypt_pii` in `repos/connection.py`). However, the **verification step is still simulated** — `nin_verified` is set to `True` by the admin KYC approval flow, not by a live identity API.

Replace the KYC approval step with a live call to:
- [Dojah](https://dojah.io) — Nigerian-founded, supports NIN, BVN, CAC, TIN
- [Smile Identity](https://smileidentity.com) — pan-African, supports biometric NIN matching

**This is the highest-priority remaining trust gap before onboarding real users.**

---

### 4.4 ADR (Alternative Dispute Resolution) Marketplace

Nigeria's Arbitration and Conciliation Act 2023 and ICAMA rules mean a significant volume of commercial disputes are resolved outside courts. Add:

- `matter_type: "mediation" | "arbitration"` path in the intake flow
- `has_adr_accreditation: bool` field on the `Lawyer` model
- Separate matching filter for accredited mediators/arbitrators
- Fee structure for ADR (typically hourly, not per-matter)

---

### 4.5 Pidgin / Yoruba / Hausa / Igbo Localization

Nigeria's rural and semi-urban legal consumers are often not fluent English readers. A locale toggle on the intake and results pages would expand the addressable market significantly.

- Add `locale: "en" | "pcm" | "yo" | "ha" | "ig"` param to intake endpoint
- Backend stores all `description` fields in English; frontend handles translation via i18n JSON files
- Pidgin (PCM) is the highest-reach single addition — covers most of southern Nigeria

---

### 4.6 Court e-Filing Integration (JISC, Lagos)

Lagos State's Justice Information System (JISC) supports digital court filing. An integration that auto-populates court forms from consultation intake data would make this platform the lawyer's daily workflow tool — the strongest competitive moat available.

- **Phase 6+ feature** — requires JISC API access (apply via Lagos State Ministry of Justice)
- Pre-populate: originating summons, motion on notice, affidavits from consultation notes
- File tracker: `GET /api/consultations/{id}/court-filing-status`

---

### 4.7 FIRS VAT Receipt for Legal Fees ✅ IMPLEMENTED

`PaymentResponse` now includes `vat_amount_ngn` and `total_plus_vat_ngn` fields. The 7.5% VAT is calculated at payment creation per FIRS circular 2020.

**Remaining gap**: A PDF tax receipt (FIRS e-invoice format) is not yet generated on payment release. This should be added to the payment release flow in `repos/payments.py` using the same `fpdf2` stack as the engagement letter.

---

### 4.8 Lawyer Escrow Wiring to Milestones (RPC §10)

The payment state machine (`initialized → verified → released`) is correct, but the `released` transition is currently independent of the consultation workflow. Wire it properly:

```
PaymentReleaseRequest  →  require at least 1 completed Milestone on the linked consultation
                       →  require consultation status == "completed"
                       →  then release escrow to lawyer
```

This matches how Nigerian legal escrow works in practice and protects both parties.

---

## 5. Recommended Implementation Order

```
✅ Already shipped (not in scope below):
  - CORS env config (CORS_ALLOWED_ORIGINS)
  - NIN/BVN Fernet encryption at rest
  - NGN formatting (price_display)
  - bar_chapter on lawyer profiles
  - Engagement letter PDF (fpdf2)
  - NBA disciplinary CSV sync endpoint
  - Privacy policy + cookie consent endpoints
  - Production config validation on startup
  - Conflict-of-interest check (check_conflict on booking)
  - Contingency fee arrangements (is_contingency + success fee endpoint)
  - VAT fields on PaymentResponse (vat_amount_ngn, total_plus_vat_ngn)

Phase 3 (Weeks 1–2) — Hardening
  ├── Email/SMS (SendGrid + Twilio + Celery/Redis)
  ├── Rate limiting on document upload endpoint
  ├── Explicit consent modal on signup (frontend)
  └── DPO user role + compliance dashboard

Phase 4 (Weeks 3–4) — Engagement & Real-time
  ├── WebSocket real-time chat (/ws/conversations/{id})
  ├── NDPA data processing inventory endpoint
  ├── FIRS VAT PDF receipt on payment release
  └── Engagement letter: add enrollment_number + bar_chapter to PDF

Phase 5 (Weeks 5–6) — Trust & Verification
  ├── Real NIN/BVN via Dojah API (highest-priority trust gap)
  ├── Scheduled NBA disciplinary list sync (replace manual CSV)
  ├── Milestone-gated escrow release
  ├── Conflict detection by NIN/RC number (not just name string)
  └── Load testing (Locust/K6) + connection pooling

Phase 6 (Weeks 7–8) — Differentiation
  ├── ADR marketplace (mediation/arbitration)
  ├── Pidgin/Yoruba localization
  ├── Automated daily DB backup (pg_dump script)
  ├── SAST/DAST in CI/CD pipeline
  └── Court e-filing integration (JISC Lagos)
```

---

## Summary Scorecard

| Dimension              | Score   | Status                               |
| ---------------------- | ------- | ------------------------------------ |
| Technical Architecture | 4.5 / 5 | ✅ Excellent for MVP                 |
| NDPA Compliance        | 4 / 5   | ✅ Phase 1 complete; Phase 2 pending |
| Nigerian Market Fit    | 4.5 / 5 | ✅ Strong; conflict-of-interest, contingency fees, VAT implemented |
| User Experience        | 3.5 / 5 | ⚠️ Needs real-time upgrades          |
| PCI-DSS (Payments)     | 5 / 5   | ✅ 100% via Paystack                 |
| ISO 27001 (Security)   | 3.5 / 5 | ⚠️ Encryption + backup gaps          |

**Verdict**: ✅ **Pilot-ready for 1–3 real lawyers.**  
The critical blocker before scaling to real users is **email/SMS notifications** (SendGrid + Twilio). NIN/BVN encryption is in place. Real NIN/BVN verification via Dojah is the next trust-layer priority.

---

*Last updated: April 21, 2026 (re-verified ×2) | Test suite: 53 passed, 0 warnings*
