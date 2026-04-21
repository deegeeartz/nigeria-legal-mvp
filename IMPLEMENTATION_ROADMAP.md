# Implementation Roadmap: Nigeria Legal Marketplace

This roadmap sequences the recommended improvements to move from the current MVP state to a production-ready pilot, prioritizing security, reliability, and Nigerian legal compliance.

---

## Phase 1: Security Hardening & Data Integrity

**Goal:** Fix critical vulnerabilities and ensure date-based operations are reliable.

1. **Secure Session Management**
   - Move `access_token` and `refresh_token` from `localStorage` to **HTTP-only, Secure, SameSite=Strict cookies**.
   - Update frontend `auth.js` to rely on cookie-based auth.
2. **Database Column Type Correction**
   - Migration to change `sa.Text()` date columns (e.g., `created_on`) to `sa.DateTime(timezone=True)`.
   - Update `db.py` to handle `datetime` objects instead of strings.
3. **HTTPS & Security Headers**
   - Configure FastAPI to enforce HTTPS (via middleware or reverse proxy docs).
   - Add security headers (HSTS, Content-Security-Policy, X-Frame-Options).
4. **CORS Hardening**
   - Restrict `allow_origins`, `allow_methods`, and `allow_headers` to specific production values.

---

## Phase 2: Architecture & Scalability

**Goal:** Modularize the codebase and enable high-concurrency operations.

1. **Split `db.py` Monolith**
   - Extract logic into domain repositories: `repos/auth.py`, `repos/lawyers.py`, `repos/consultations.py`, etc.
   - Refactor `db.py` to only contain shared connection/setup code.
2. **Introduce Async DB Operations**
   - Switch from synchronous SQLAlchemy calls to **Async SQLAlchemy** or `asyncpg`.
   - Update FastAPI routes to utilize `await` for all DB queries to prevent event-loop blocking.
3. **Pagination on List Endpoints**
   - Add cursor-based or offset-based pagination to `/api/lawyers`, `/api/complaints`, and `/api/audit-events`.

---

## Phase 3: Nigerian Legal Specifics (Market Readiness)

**Goal:** Align the platform with the practical realities and regulations of the Nigerian legal landscape.

1. **Manual KYC Verification Workflow**
   - Replace seed-data verification with a flow where lawyers upload documents (NIN, NBA Call to Bar certificate).
   - Admin dashboard for manual review and approval of these documents.
2. **Court & Jurisdiction Mapping**
   - Update intake to capture the court type (Federal High Court, State High Court, etc.).
   - Enable matching based on lawyer admission to specific courts.
3. **Sharia & Customary Law Systems**
   - Add "Legal System" (Common Law, Sharia, Customary) as a filter and profile attribute.
   - Essential for Hausa-majority northern states and southern customary disputes.
4. **SAN Designation & Seniority**
   - Add Senior Advocate of Nigeria (SAN) badge and weighting in ranking.
   - Cross-reference years-of-call with Supreme Court roll data (manual upload or admin entry).

---

## Phase 4: Advanced Features & Global Standards

**Goal:** Premium user experience and full regulatory compliance.

1. **Real Paystack Webhook Verification**
   - Implement `POST /api/payments/paystack/webhook`.
   - Verify HMAC signatures to prevent spoofed payment signals.
2. **Engagement Letter Generation**
   - Automatically generate a PDF engagement letter based on consultation terms.
   - Required by NBA Rules of Professional Conduct (RPC).
3. **Conflict-of-Interest Engine**
   - Basic check to ensure a lawyer hasn't already consulted with the opposing party on the same matter.
4. **End-to-End Encrypted (E2EE) Messaging**
   - Secure client-lawyer communications (Standard requirement for privileged information).
5. **CI/CD & Automated Testing**
   - Set up GitHub Actions for backend/frontend testing.
   - Implement E2E frontend tests (Playwright/Cypress).
6. **Pidgin/Vernacular Localization**
   - Add language support to improve accessibility for indigent or non-English speaking clients.
