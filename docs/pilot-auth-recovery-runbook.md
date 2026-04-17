# Pilot Auth Recovery Runbook

Use this runbook when users report repeated `401` or `429` issues in pilot.

## Symptoms

- `POST /api/auth/login` returns `429`
- `POST /api/auth/refresh` returns `429`
- Users are locked out after many failed attempts

## Quick checks

1. Confirm environment settings:
   - `AUTH_RATE_LIMIT_WINDOW_SECONDS`
   - `LOGIN_FAILURE_LIMIT`
   - `REFRESH_FAILURE_LIMIT`
2. Check if lockout is expected (too many failed attempts within window).
3. Confirm token TTL settings are reasonable:
   - `ACCESS_TOKEN_TTL_MINUTES`
   - `REFRESH_TOKEN_TTL_DAYS`

## Operator guidance

- First response: ask user to wait for one full rate-limit window.
- If issue persists, restart the API process to clear in-memory rate-limit state.
- After restart, test with admin login and a fresh client account.

## Post-incident notes

Record:
- Timestamp
- Affected email(s)
- Returned status code(s)
- Current auth env settings
- Remediation action taken

## Hardening follow-up

If lockouts happen frequently:
- Increase `LOGIN_FAILURE_LIMIT` and/or `REFRESH_FAILURE_LIMIT` slightly.
- Keep `AUTH_RATE_LIMIT_WINDOW_SECONDS` short (e.g., 60-120s) for pilot.
- Plan persistent/distributed rate limiting before multi-instance deployment.
