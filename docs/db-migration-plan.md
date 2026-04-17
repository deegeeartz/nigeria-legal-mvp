# Database Migration Plan: SQLite Pilot -> PostgreSQL

This runbook keeps delivery speed high in pilot while preparing a low-risk transition to PostgreSQL.

## Objective

- Keep current SQLite-based MVP stable for first-wave users.
- Migrate to PostgreSQL without breaking API contracts or losing data.

## Phase 1: Pilot Stabilization (Now)

- Keep `APP_DB_PATH` environment-specific.
- Back up `legal_mvp.db` and `storage/uploads` daily.
- Track key operational metrics:
  - request latency (`p50`, `p95`)
  - error rate
  - write-heavy endpoint performance (`/messages`, `/payments`, `/notifications`)
- Avoid multi-instance writes in production during this phase.

Exit criteria:
- Product workflows validated with real pilot users.
- Initial traffic and write patterns understood.

## Phase 2: Postgres Readiness

- Introduce SQL migration tooling (Alembic recommended).
- Create explicit schema migrations for all tables and indexes.
- Add environment-based DB connection configuration for SQLite and PostgreSQL.
- Add staging environment on PostgreSQL.

Exit criteria:
- App starts and passes tests against PostgreSQL in staging.
- Schema migration scripts are reproducible from empty DB.

## Phase 3: Data Migration Dry Run

- Freeze writes in a staging copy.
- Export SQLite data and import into PostgreSQL.
- Validate row counts and integrity for all tables:
  - `users`, `sessions`, `lawyers`, `complaints`, `kyc_events`
  - `conversations`, `messages`, `consultations`
  - `payments`, `documents`, `audit_events`, `notifications`
- Run full test suite and key end-to-end smoke checks.

Exit criteria:
- No data loss and no contract regressions.
- Performance is acceptable on staging load.

## Phase 4: Production Cutover

- Set a maintenance window.
- Back up SQLite DB and uploads.
- Stop writes briefly, run final migration, switch app connection to PostgreSQL.
- Run smoke tests immediately after deploy.
- Monitor errors, latency, and payment/document flows closely.

Rollback plan:
- Revert app config to SQLite.
- Restore latest SQLite backup if needed.

## Success Metrics

- Full API parity before and after migration.
- Stable latency and error rates under target load.
- No data integrity issues in critical flows (auth, payments, docs, complaints).

## Practical Recommendation

- Use SQLite for pilot (current phase).
- Start Postgres readiness work after pilot behavior stabilizes.
- Cut over before multi-instance production scaling.
