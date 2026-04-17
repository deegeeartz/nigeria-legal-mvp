# Rollback Checklist (Pilot)

Use this when deployment introduces errors or smoke checks fail.

## Immediate Actions

1. Stop the new API process.
2. Restore last known-good app version.
3. Re-apply previous environment settings.

## Data Safety

1. Confirm latest backup exists from `scripts/backup_pilot.ps1`.
2. If data integrity is impacted, restore:
   - DB file backup
   - uploads directory backup

## Service Recovery

1. Start previous app version.
2. Run `scripts/smoke_test.ps1`.
3. Verify `/health`, auth login, tracker, and audit endpoints.

## Incident Notes

Capture:

- Deployment timestamp
- Failure symptoms
- Error logs / request IDs
- Rollback completion timestamp
- Follow-up fix owner
