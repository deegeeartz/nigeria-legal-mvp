# Nigeria Legal Marketplace MVP

A FastAPI MVP implementing the agreed Nigeria-first legal matching strategy:
- Problem-first intake (Option B)
- Balanced ranking model
- Adaptive new-lawyer exposure bands (`25/20/15/10`)
- Verification guardrails (`NIN`, `NBA`; `BVN` optional for payouts)
- Explainable match reasons and legal disclaimer

## Features

- `POST /api/auth/signup`:
  - Registers a user and returns a session token
- `POST /api/auth/login`:
  - Authenticates user and returns `access_token` + `refresh_token`
- `POST /api/auth/refresh`:
  - Rotates refresh token and issues new access/refresh token pair
- `POST /api/auth/logout`:
  - Revokes active session using access and/or refresh token
- `GET /api/auth/me`:
  - Returns current user profile (`X-Auth-Token` access token required)
- `POST /api/intake/match`:
  - Classifies intake text to legal category
  - Matches lawyers with weighted balanced scoring:
    - expertise fit: 30%
    - trust verification: 20%
    - quality outcomes: 20%
    - responsiveness: 15%
    - price-fit: 10%
    - availability: 5%
  - Applies quota-based new-lawyer rotation using adaptive exposure band
  - Returns top reasons (`why_recommended`) for transparency
- `GET /api/lawyers/{lawyer_id}`:
  - Returns contextual profile stats and verification state
- `POST /api/complaints`:
  - Files a complaint and applies hybrid trigger logic (`minor|major|severe`)
- `GET /api/complaints/{lawyer_id}`:
  - Lists complaints for a lawyer
- `POST /api/complaints/{complaint_id}/resolve`:
  - Resolves a complaint (`uphold|reject`) and recalculates trust flags
- `POST /api/kyc/verify`:
  - Admin-only endpoint to update lawyer verification status
- `GET /api/kyc/{lawyer_id}`:
  - Returns latest lawyer KYC status (`X-Auth-Token` required)
- `GET /api/tracker`:
  - Returns implementation tracker JSON (`X-Auth-Token` required)
- `GET /api/audit-events`:
  - Admin-only audit trail feed for sensitive actions (`limit` query supported)
- `GET /api/notifications`:
  - Lists in-app notifications for the authenticated user
- `POST /api/notifications/{notification_id}/read`:
  - Marks a notification as read for the authenticated user
- `POST /api/conversations`:
  - Client starts a chat with a lawyer using an initial message
- `GET /api/conversations/{conversation_id}`:
  - Returns conversation metadata for authorized participants
- `POST /api/conversations/{conversation_id}/messages`:
  - Sends a message in an authorized conversation
- `GET /api/conversations/{conversation_id}/messages`:
  - Lists conversation messages in order
- `POST /api/consultations`:
  - Client books a consultation with a lawyer
- `GET /api/consultations/{consultation_id}`:
  - Returns consultation details for authorized participants
- `POST /api/consultations/{consultation_id}/documents`:
  - Uploads a supporting document for an authorized consultation participant
- `GET /api/consultations/{consultation_id}/documents`:
  - Lists consultation documents for an authorized participant
- `GET /api/documents/{document_id}/download`:
  - Downloads a stored document for an authorized consultation participant
- `POST /api/payments/paystack/initialize`:
  - Initializes a Paystack-style simulated payment (reference, access code, checkout URL)
- `POST /api/payments/paystack/{reference}/verify`:
  - Simulates Paystack verification result (`success|failed`) for a payment reference
- `POST /api/payments/simulate`:
  - Backward-compatible alias to initialize Paystack-style simulation
- `POST /api/payments/{payment_id}/simulate`:
  - Simulates internal transitions (`complete|fail|release`) for workflow testing
- `GET /health`

## Project structure

- `app/main.py` - API routes
- `app/models.py` - request/response/domain models
- `app/data.py` - in-memory seed lawyer data
- `app/ranking.py` - matching, scoring, tiers, and fairness logic
- `app/db.py` - sqlite persistence, seeding, complaint storage
- `app/complaints.py` - complaint severity and trigger rules
- `tests/test_api.py` - endpoint tests
- `tests/test_ranking.py` - ranking and policy tests
- `tests/test_complaints.py` - complaint trigger and DB tests
- `tests/test_auth_kyc_tracker.py` - auth, role guards, KYC, tracker API tests
- `tests/test_workflows.py` - chat, consultation, payment simulation, and document access tests  
- `tests/test_audit_notifications.py` - audit feed, notification flow, and Paystack simulation tests
- `storage/uploads` - local document storage used by the MVP
- `run.py` - local dev runner

## Setup

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
python run.py
```

## Test

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
pytest -q
```

## Quick auth example

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp

# login as seeded admin
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@legalmvp.local","password":"AdminPass123!"}'
$access = $login.access_token
$refresh = $login.refresh_token

# read tracker with auth
Invoke-RestMethod -Method Get -Uri http://127.0.0.1:8000/api/tracker -Headers @{"X-Auth-Token"=$access}

# rotate tokens
$rotated = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/auth/refresh -ContentType "application/json" -Body (@{refresh_token=$refresh} | ConvertTo-Json)

# logout and revoke
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/auth/logout -Headers @{"X-Auth-Token"=$rotated.access_token} -ContentType "application/json" -Body (@{refresh_token=$rotated.refresh_token} | ConvertTo-Json)
```

## Notes

- This MVP now uses SQLite (`legal_mvp.db`) with startup seeding from `app/data.py`.
- The badge/tier guardrail is enforced in responses:
  - "Ranking reflects platform performance and verification signals. It is not an official NBA or government ranking."
- Consultation documents are stored in `storage/uploads` and are limited to 10MB per file.
- Consultation document access is restricted to the owning client, assigned lawyer, or admin.
- Sensitive actions are captured in audit events and accessible through `GET /api/audit-events` (admin-only).
- Payment flow now uses a Paystack-style simulation contract (`initialize` + `verify`) while keeping simulation safety for MVP.

## Implementation Tracker

The project now includes a live tracker in `implementation_tracker.json` and a utility script in `tracker.py`.

### List tracker status

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py list
```

### Update a feature/task status

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py update task-005 in-progress --note "Started trigger thresholds"
```

### Add a new task to a phase

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py add-task phase-1 "Implement persistence repository" --owner copilot
```

### Log a decision (for future context)

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py log-decision "Exposure policy" "Keep adaptive 25/20/15/10" --context "Need fairness for new lawyers" --impact "Better discovery without quality drop" --owner product
```

### Log session notes (timeline)

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py log-note "Implemented complaint trigger matrix draft" --refs task-005 feat-005
```

### Set project context (persistent handoff summary)

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py set-context "Nigeria-first legal marketplace focused on trust, explainable ranking, and payment safety"
```

### Print handoff view (best for continuity)

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe tracker.py handoff
```

### Recommended cadence

- Start each session with `tracker.py handoff`
- After each meaningful change, run `tracker.py log-note ...`
- When direction changes, run `tracker.py log-decision ...`
- Keep one active task as `in-progress` and close it with `tracker.py update ...`
