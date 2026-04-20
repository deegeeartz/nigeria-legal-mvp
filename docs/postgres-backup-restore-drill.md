# PostgreSQL Backup & Restore Drill

## Purpose

Validate that PostgreSQL backups are restorable within expected RTO/RPO.

## Prerequisites

- Running PostgreSQL service (Docker or managed).
- `pg_dump` and `psql` available, or access via Docker exec.
- Backup output folder with write access.

## 1) Take a backup

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
.\scripts\backup_postgres.ps1 -DatabaseUrl "postgresql://postgres:postgres@localhost:5432/nigeria_legal_mvp" -OutputDir ".\backups"
```

## 2) Restore drill into temporary DB

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
.\scripts\postgres_restore_drill.ps1 -DatabaseUrl "postgresql://postgres:postgres@localhost:5432/nigeria_legal_mvp" -BackupFile ".\backups\latest.backup"
```

## 3) Verify critical checks

- API startup succeeds with restored DB.
- Admin login works.
- Core tables contain expected row counts.
- A quick smoke test passes.

## Drill frequency

- Weekly in staging.
- Monthly in production-like environment.
- After major schema changes.
