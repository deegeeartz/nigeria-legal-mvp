# NDPA Controls (Phase Foundation)

This document captures implemented controls and near-term tasks for Nigeria Data Protection Act (NDPA) alignment.

## Implemented foundation

- Consent ledger endpoints:
  - `POST /api/compliance/consents`
  - `GET /api/compliance/consents/me`
- Data subject request (DSR) endpoints:
  - `POST /api/compliance/dsr-requests`
  - `GET /api/compliance/dsr-requests/me`
  - `GET /api/compliance/dsr-requests` (admin)
  - `PATCH /api/compliance/dsr-requests/{id}` (admin)
- Retention job endpoint:
  - `POST /api/compliance/retention/run` (admin)
- Persistence tables:
  - `consent_events`
  - `dsr_requests`

## Required operational practices

- Maintain a legal basis matrix (`purpose -> lawful basis`).
- Set DSR SLA targets and escalation policy.
- Review retention settings quarterly.
- Keep audit logs and DSR resolution notes for accountability.

## Next controls to implement

1. Data processing inventory export endpoint.
2. Breach incident workflow and regulator notification timer tracking.
3. DSR evidence attachments and redaction approval flow.
4. Dedicated NDPA compliance dashboard for DPO/admin roles.
