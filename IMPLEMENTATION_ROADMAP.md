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

## Phase 5: External API Integrations (Production Readiness)

**Goal:** Replace mock implementations with live third-party services.

1. **Real NIN Verification (KYC)**
   - Integrate Dojah or Smile Identity API for live identity verification.
   - Replace the mock `_simulate_nin_lookup` in `kyc.py`.
2. **High-Value Payments (Monnify)**
   - Connect the simulated Monnify virtual account logic to the live Monnify API.
   - Secure webhooks and handle transfer receipts.
3. **Video Consultations**
   - Integrate a live video provider (e.g., Daily.co or Twilio Video).
   - Wire the generated room tokens in `video_provider.py` to a real frontend video room UI.
4. **UI Localization (Pidgin & Vernacular)**
   - Complete the frontend integration of `i18n.js`.
   - Add a language switcher to the UI and ensure dynamic string replacement.

---

## Phase 6: Privacy & Advanced Standards
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

## Phase 5: External API Integrations (Production Readiness)

**Goal:** Replace mock implementations with live third-party services.

1. **Real NIN Verification (KYC)**
   - Integrate Dojah or Smile Identity API for live identity verification.
   - Replace the mock `_simulate_nin_lookup` in `kyc.py`.
2. **High-Value Payments (Monnify)**
   - Connect the simulated Monnify virtual account logic to the live Monnify API.
   - Secure webhooks and handle transfer receipts.
3. **Video Consultations**
   - Integrate a live video provider (e.g., Daily.co or Twilio Video).
   - Wire the generated room tokens in `video_provider.py` to a real frontend video room UI.
4. **UI Localization (Pidgin & Vernacular)**
   - Complete the frontend integration of `i18n.js`.
   - Add a language switcher to the UI and ensure dynamic string replacement.

---

## Phase 6: Privacy & Advanced Standards

**Goal:** Ensure absolute client-lawyer privilege and data security.

1. **End-to-End Encrypted (E2EE) Messaging**
   - Secure client-lawyer communications.
   - Move from plaintext PostgreSQL storage to a secure E2EE model (Standard requirement for privileged information).
2. **CI/CD & Automated Testing**
   - Set up GitHub Actions for backend/frontend testing.
   - Implement E2E frontend tests (Playwright/Cypress).

---

## Phase 7: Ecosystem Expansion (Current)

**Goal:** Build "Moat" features and expand the product from a matching tool to a full Legal Tech ecosystem.

1. **The Knowledge Hub (Partially Complete)**
   - Allow anonymous users to ask legal questions.
   - Verified lawyers can post answers and educational articles.
   - *Status:* Backend models, DB schema, and scoring logic built. Awaiting database connection test.
2. **Geolocation Ranking (Partially Complete)**
   - Match users to nearby lawyers using Haversine GPS coordinate proximity.
   - *Status:* Ranking engine `BALANCED_WEIGHTS` updated. Awaiting DB connection test.
3. **The Document Hub (DIY Templates) (Partially Complete)**
   - Generate standard Nigerian legal documents (NDA, Tenancy, Employment) instantly as PDFs.
   - *Status:* Router and `fpdf2` logic built. Boilerplate templates need to be drafted by legal expert.
