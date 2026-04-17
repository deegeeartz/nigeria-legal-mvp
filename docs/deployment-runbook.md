# Deployment Runbook (Pilot)

This runbook defines repeatable deployment steps for pilot environments.

## Prerequisites

- Python environment ready (`pip install -r requirements.txt`)
- Environment variables configured (see `.env.example`)
- Backup completed for DB/uploads before deploy

## Pre-deploy Checklist

1. Pull latest code.
2. Install dependencies from `requirements.txt`.
3. Run test suite.
4. Run backup script:
   - `scripts/backup_pilot.ps1`
5. Confirm `.env` values for pilot.

## Deploy Steps

1. Stop current API process.
2. Activate environment.
3. Start API:
   - `python run.py`
4. Validate startup logs.
5. Run smoke tests:
   - `scripts/smoke_test.ps1`

## Post-deploy Checks

- `GET /health` returns `{"status":"ok"}`
- Admin login works
- Tracker endpoint works with admin token
- Audit feed endpoint works with admin token
- Request logs show healthy response times

## Failure Handling

If smoke checks fail, follow `docs/rollback-checklist.md`.
