# Production Monitoring & Alerts

## Objective

Provide production-grade visibility for API health, security events, payments, and compliance workflows.

## Minimum signals

- API availability (`/health`)
- p95 latency and error rate per route
- Auth lockout spikes (`429` on auth endpoints)
- Webhook signature failures (`401` on `/api/payments/webhook`)
- Upload malware detection events
- DSR backlog and aging (`submitted`, `in_review`)

## Recommended alerts

1. Error rate > 2% for 10 minutes.
2. p95 latency > 1500ms for 10 minutes.
3. 5+ webhook signature failures in 5 minutes.
4. Any malware detection in uploads.
5. DSR request in `submitted` for > 72 hours.

## Dashboard sections

- API Reliability
- Auth/Security
- Payments
- Compliance/DSR
- Storage and upload pipeline

## Logging checklist

- Ensure `X-Request-Id` correlation on all requests.
- Persist structured JSON logs centrally.
- Keep audit and application logs on separate retention schedules.

## On-call runbook links

- `docs/pilot-alert-checklist.md`
- `docs/rollback-checklist.md`
- `docs/postgres-backup-restore-drill.md`
