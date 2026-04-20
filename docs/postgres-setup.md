# PostgreSQL Setup Guide

This project now runs with PostgreSQL as the primary and expected database backend.

## What is included

- `DATABASE_URL`-based configuration in `app/settings.py`
- Alembic migration scaffold in `alembic/`
- Initial schema migration in `alembic/versions/20260420_0001_initial_schema.py`
- Local PostgreSQL service in `docker-compose.postgres.yml`
- Connectivity smoke script in `scripts/postgres_smoke.py`

## 1. Start PostgreSQL locally

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
docker compose -f docker-compose.postgres.yml up -d
```

## Containerized migration workflow (recommended)

Run the app stack with PostgreSQL sidecar and migrate schema before serving traffic:

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build -d
```

Apply migrations inside container tooling:

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
docker compose -f docker-compose.yml -f docker-compose.postgres.yml --profile migration run --rm migrate
```

Run migration smoke checks against running containers:

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
.\scripts\container_migration_smoke.ps1 -ApiUrl "http://127.0.0.1:8000"
```

## 2. Set the PostgreSQL database URL

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
$env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/nigeria_legal_mvp"
```

## 3. Apply the initial schema

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
alembic upgrade head
```

## 4. Verify connectivity

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/Users/PC/Desktop/nigeria-legal-mvp/.venv/Scripts/python.exe scripts/postgres_smoke.py
```

## Current limitation

App startup requires PostgreSQL schema to exist. If migrations are missing, startup fails with an instruction to run Alembic.

This setup now provides:

- connection configuration
- reproducible schema migrations
- local Postgres provisioning
- connectivity validation
- containerized migration execution in parallel with the running app stack

## Recommended next step

Run a controlled staging verification:

1. Start PostgreSQL container.
2. Apply Alembic migrations.
3. Set `DATABASE_URL` to PostgreSQL.
4. Start API and run smoke/UAT checks.
5. Keep rollback path by restoring a previous PostgreSQL backup snapshot.
