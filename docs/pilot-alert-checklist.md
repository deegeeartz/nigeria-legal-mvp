# Pilot Alert Checklist

Use this checklist for lightweight pilot monitoring and quick incident response.

## What to watch

- API request errors (`event=request_error`)
- Slow requests (`event=request_complete` with high `duration_ms`)
- Auth lockouts (`429` on `/api/auth/login` and `/api/auth/refresh`)
- Payment simulation failures (`status=failed` in payment flows)

## Suggested thresholds (pilot)

- Error rate > 3% over 15 minutes
- `p95` request latency > 1500ms for 15 minutes
- More than 10 auth `429` responses in 10 minutes
- Any repeated failures in document upload/download or payment verification

## Immediate operator actions

1. Confirm app process health (`/health`).
2. Check recent request logs for:
   - `path`
   - `status_code`
   - `duration_ms`
   - `request_id`
3. If auth lockouts spike, apply runbook in `docs/pilot-auth-recovery-runbook.md`.
4. If storage-related failures occur, verify:
   - PostgreSQL is reachable via `DATABASE_URL`
   - `APP_UPLOADS_DIR` exists and is writable
5. Trigger backup before any manual remediation.

## Daily pilot review

- Review top 5 slowest endpoints.
- Review all `request_error` entries.
- Verify backup completion for DB and uploads.
- Log incidents and fixes in tracker notes.
