# Review Risk Backlog

This document consolidates the negative/error-case, scalability, and destructive/security findings from the code reviews. It records work to do; it does not claim that any listed control or remediation is implemented.

## Scope and current limitations

The findings concern the Next.js API routes and frontend in `src/`. The routes use mock/in-memory data and include simulated login, KYC, and payment behavior. Treat the application as a demo: do not use it to process real identity documents, payments, or confidential client matters until the release-blocking items below are addressed.

The assessment was static, not a penetration test. The repository scan found no JavaScript test/spec files; the checks below are recommendations, not completed tests. Existing runbooks and UAT documentation may describe a different backend/API setup, so verify their assumptions against the deployed application before relying on them.

## Release-blocking security and integrity work

| Priority | Finding | Evidence and impact | Work to do |
|---|---|---|---|
| P0 | Login does not authenticate credentials | `src/app/api/auth/login/route.js:7-16` ignores the password and falls back to a user when matching fails. An unauthenticated caller can obtain another user's identity. | Require server-verified credentials and reject invalid or missing credentials; remove fallback identity selection. |
| P0 | Google login trusts caller-provided identity | `src/app/api/auth/google/route.js:6-25` accepts an email and profile details without validating a Google-issued identity token. | Verify provider tokens server-side, validate audience/issuer/expiry, and derive account identity from verified claims. |
| P0 | User identity is process-global | `src/lib/mockDb.js:257-258` stores `currentUser` in `globalThis`, which login and signup overwrite. Requests from concurrent users can be attributed to the wrong account. | Replace shared mutable identity with a server-verified per-request session; do not use a global current-user field. |
| P0 | Resource APIs lack authentication and ownership checks | Examples: `src/app/api/conversations/route.js:4-5`, `src/app/api/conversations/[id]/messages/route.js:4-7`, `src/app/api/consultations/route.js:4-6`, and `src/app/api/audit-events/route.js:4-6`. Matter messages, consultations, and audit data can be enumerated or exposed. | Authenticate every protected route and authorize each operation against the resource owner/participants and role. Apply this to every read and write, not only UI entry points. |
| P0 | Payment verification is simulated | `src/app/api/payments/paystack/[ref]/verify/route.js:4-25` returns success for any supplied reference and a fixed amount; initialization uses a locally generated reference in `src/app/api/payments/paystack/initialize/route.js:4-24`. | Verify transaction status, amount, currency, and reference with Paystack server-side; bind references to the intended consultation and make state transitions idempotent. Do not mark an unpaid transaction successful. |
| P0 | KYC status can be forged | `src/app/api/kyc/nin/verify/route.js:3-10` always returns verified flags. `src/app/api/kyc/verify/route.js:4-26` accepts a caller-selected lawyer and verification status without an admin check. | Require an authorized reviewer for manual decisions; use trusted identity/credential verification and retain evidence. Never represent simulated results as real verification. |
| P0 | Lawyer identity can be impersonated in community content | `src/app/api/community/route.js:179-205` accepts caller-supplied counsel name, title, and SAN status for deliberations. Related answer creation at `:137-175` also creates a verified-lawyer identity from request data. | Authenticate authors, derive identity and credentials from server-side records, enforce role/verification requirements, and reject forged attributes. |
| P1 | Consultation status is unrestricted | `src/app/api/consultations/[id]/status/route.js:7-20` assigns any submitted status without validating a transition or actor. | Define allowed states and transitions, enforce who can make each transition, and test invalid/replayed transitions. |
| P1 | Profile and document lookups can return unrelated records | `src/app/api/lawyers/[id]/route.js:4-7` returns the first lawyer for an unknown ID. `src/app/api/documents/[id]/download/route.js:4-14` falls back to the first document. | Return 404 for unknown IDs; authorize document access by consultation participation. Serve actual stored bytes with validated content metadata, not placeholder text labeled as PDF. |

## Negative and error cases to handle

- **Malformed or wrong-type fields:** Several routes assume JSON properties have the expected type. Examples include `text.trim()` in `src/app/api/articles/[id]/route.js:86-88` and `src/app/api/community/route.js:147-150,189-200`, plus article `delta` arithmetic at `:59-70`. Validate request schemas and return consistent 400 responses rather than unexpected 500s or corrupted state.
- **Invalid numeric values and counters:** Bound and type-check interaction deltas, payment amounts, practice years, IDs, fees, and pagination parameters. Prevent `NaN`, negative totals, overflow, and arbitrary counter inflation.
- **Missing, malformed, or unknown IDs:** Validate path IDs before lookup and return consistent 400/404 responses. Do not silently return all records or substitute the first record when an ID is absent.
- **Invalid dates and workflow values:** Validate date format/range and allowed enum values for consultation status, case stage/priority, KYC state, and payment state. Reject impossible dates and disallowed transitions.
- **Duplicate requests and concurrency:** Prevent duplicate signup, payment initialization/verification, consultation booking, and repeated state transitions. Use unique constraints/idempotency keys and transactional updates in the persistent data layer.
- **Partial failures:** Define what happens when audit writes fail, uploads are unavailable, provider verification times out, or an external response is malformed. Avoid reporting success when the authoritative write or verification did not complete.
- **Browser storage failures:** `src/lib/auth.js:30-43,61-69` parses and writes `localStorage`; malformed JSON, blocked storage, or quota errors can disrupt initialization/session updates. Handle these cases without treating cached client data as authenticated identity.

## Growth, scalability, and availability

| Finding | Evidence and impact | Work to do |
|---|---|---|
| Process-local mock data is not durable or shared | Articles and cases initialize `globalThis` state in `src/app/api/articles/route.js:4-7` and `src/app/api/cases/route.js:4-7`; other mock data lives in `src/lib/mockDb.js`. Restarts can lose writes, and multiple instances can disagree. | Move authoritative records to a shared persistent database with transactions, constraints, and migrations before multi-instance operation. |
| Unbounded list responses and in-memory searches | Examples: full article results in `src/app/api/articles/route.js:17-58`, cases in `src/app/api/cases/route.js:17-75`, and consultations/messages in their list routes. Larger collections increase memory, CPU, payload size, and latency. | Add pagination with bounded page sizes, indexed server-side filtering/sorting, and response-field minimization. |
| Unbounded content growth | Community questions/answers, messages, article comments, and audit events append to arrays (e.g. `src/app/api/community/route.js:127,168,205`; `src/app/api/articles/[id]/route.js:107-109`). | Add storage limits where appropriate, retention/archival policies, and operational cleanup that preserves required audit records. |
| No evident per-route rate or payload limits | The reviewed API routes accept mutations and request bodies without visible throttling or content-size limits. Abuse can consume memory/CPU or create excessive records. | Add rate limits by authenticated identity/IP, request-body limits, upload size/type limits, and abuse monitoring. |
| Read and write hot spots need load validation | Search/filter/sort and frequent message/payment writes will become bottlenecks as data and traffic grow. | Measure p50/p95 latency, error rates, memory, and write contention under representative load; add indexes and queueing only where measurements support them. |

## Validation and regression checks

Add automated API tests for these cases before closing the related work:

1. **Authentication:** missing/wrong password, unknown user, invalid/expired Google token, unauthorized role assignment, and concurrent users retain isolated identities.
2. **Authorization/privacy:** unauthenticated reads/writes are rejected; users cannot enumerate or modify another user's conversations, messages, consultations, documents, notifications, or audit events; admin-only operations reject non-admins.
3. **Payment/KYC:** unknown or reused references, mismatched amount/currency/consultation, provider timeout/failure, forged KYC decisions, and unauthorized reviewers never produce verified/paid state.
4. **Validation/sad paths:** malformed JSON, wrong field types, empty/oversized text, invalid dates/enums/numbers, missing IDs, unknown IDs, and missing upload files return documented 4xx responses without mutating state.
5. **Integrity/concurrency:** duplicate requests and simultaneous updates do not create duplicate records, lose updates, or permit invalid state transitions.
6. **Documents:** unauthorized access is denied; unknown IDs return 404; downloads contain the stored file bytes and safe headers; oversized or disallowed files are rejected.
7. **Growth:** pagination has bounded limits and stable ordering; load tests exercise large collections and concurrent read/write traffic while recording latency, errors, and resource use.

Keep the demo-mode boundary explicit in deployment configuration and UI until the P0 items are implemented and independently verified. Do not treat successful mock UAT flows as evidence that authentication, payment settlement, or identity verification is secure.
