"""Shared database connection infrastructure.

Contains the PostgreSQL engine, connection adapter, query helpers,
and common utilities used by all domain repository modules.
"""
from __future__ import annotations

import os
import re
from datetime import UTC, date, datetime, timedelta
from hashlib import pbkdf2_hmac, sha256
from pathlib import Path
from secrets import token_hex
import secrets
from typing import Any
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from cryptography.fernet import Fernet

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError as SQLAlchemyIntegrityError

from app.settings import DATABASE_URL, PII_SECRET_KEY


BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = Path(os.getenv("APP_UPLOADS_DIR", str(BASE_DIR / "storage" / "uploads")))
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60"))
REFRESH_TOKEN_TTL_DAYS = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))
PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "260000"))

def _cleanup_url(url: str) -> str:
    # psycopg (v3) doesn't like pgbouncer=true in the URL
    parsed = urlparse(url)
    params = dict(parse_qsl(parsed.query))
    params.pop("pgbouncer", None)
    new_query = urlencode(params)
    return urlunparse(parsed._replace(query=new_query))


# Use the same URL but with the async version of the driver
# psycopg handles both, but SQLAlchemy needs the specific dialect
ASYNC_DATABASE_URL = _cleanup_url(DATABASE_URL)
if ASYNC_DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

ASYNC_ENGINE = create_async_engine(ASYNC_DATABASE_URL, pool_pre_ping=True, future=True)


class QueryResultAdapter:
    def __init__(self, result: Any, lastrowid: int | None = None):
        self._result = result
        self.lastrowid = lastrowid

    @staticmethod
    def _to_mapping(row: Any) -> dict[str, Any] | None:
        if row is None:
            return None
        if isinstance(row, dict):
            return row
        # Handles SQLAlchemy RowMapping or legacy Row
        if hasattr(row, "_mapping"):
            return dict(row._mapping)
        if hasattr(row, "mapping"):
            return dict(row.mapping())
        try:
            return dict(row)
        except (TypeError, ValueError):
            return row

    def fetchone(self) -> dict[str, Any] | None:
        return self._to_mapping(self._result.fetchone() if hasattr(self._result, "fetchone") else self._result)

    def fetchall(self) -> list[dict[str, Any]]:
        rows = self._result.fetchall() if hasattr(self._result, "fetchall") else self._result
        return [self._to_mapping(row) for row in rows if row is not None]

    @property
    def rowcount(self) -> int:
        return self._result.rowcount


def _convert_qmark_sql(sql: str, params: tuple[Any, ...] | list[Any]) -> tuple[str, dict[str, Any]]:
    placeholder_count = sql.count("?")
    if placeholder_count == 0:
        return sql, {}
    if placeholder_count != len(params):
        raise ValueError(f"Placeholder count mismatch. SQL has {placeholder_count} placeholders, got {len(params)} params")

    chunks = sql.split("?")
    converted = chunks[0]
    binds: dict[str, Any] = {}
    for index, value in enumerate(params):
        key = f"p{index}"
        converted += f":{key}{chunks[index + 1]}"
        binds[key] = value
    return converted, binds


class AsyncPostgresConnectionAdapter:
    def __init__(self):
        if ASYNC_ENGINE is None:
            raise RuntimeError("PostgreSQL engine is not configured")
        self._conn = None

    async def __aenter__(self):
        self._conn = await ASYNC_ENGINE.connect()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if exc_type is not None:
            await self._conn.rollback()
        else:
            await self._conn.commit()
        await self._conn.close()

    async def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> QueryResultAdapter:
        id_returning_tables = {
            "complaints", "kyc_events", "kyc_documents", "conversations", "messages",
            "consultations", "payments", "documents", "consultation_milestones",
            "consultation_notes", "audit_events", "notifications", "consent_events",
            "dsr_requests", "dsr_corrections", "breach_incidents",
        }

        converted_sql, bind_params = _convert_qmark_sql(sql, list(params))
        executable_sql = converted_sql

        lowered = converted_sql.lstrip().lower()
        if lowered.startswith("insert") and "returning" not in lowered:
            match = re.search(r"insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)", lowered)
            table_name = match.group(1) if match else None
            if table_name in id_returning_tables:
                executable_sql = f"{converted_sql} RETURNING id"

        result = await self._conn.execute(text(executable_sql), bind_params)
        lastrowid = None
        if lowered.startswith("insert"):
            try:
                # We need to fetch the row to get the ID if we added RETURNING
                row = result.fetchone()
                if row is not None:
                    mapping = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
                    lastrowid = mapping.get("id")
            except Exception:
                lastrowid = None
        return QueryResultAdapter(result, lastrowid=lastrowid)

    async def commit(self) -> None:
        await self._conn.commit()


async def _assert_postgres_schema_ready() -> None:
    if ASYNC_ENGINE is None:
        raise RuntimeError("PostgreSQL engine is not configured")
    async with ASYNC_ENGINE.connect() as conn:
        required_tables = {
            "users", "lawyers", "sessions", "consultations", "payments",
            "consent_events", "dsr_requests", "dsr_corrections", "breach_incidents",
        }
        result = await conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        )
        rows = result.fetchall()
        available = {row[0] for row in rows}
        missing = required_tables - available
        if missing:
            joined = ", ".join(sorted(missing))
            raise RuntimeError(
                f"PostgreSQL schema is incomplete (missing: {joined}). Run 'alembic upgrade head' before starting the API."
            )


def _db_bool(value: bool) -> bool:
    return bool(value)


def connect() -> AsyncPostgresConnectionAdapter:
    return AsyncPostgresConnectionAdapter()


async def init_db() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    await _assert_postgres_schema_ready()


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _serialize_practice_areas(practice_areas: list[str]) -> str:
    return ",".join(practice_areas)


def _deserialize_practice_areas(value: str) -> list[str]:
    return [item for item in value.split(",") if item]


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$", 3)
        if len(parts) != 4:
            return False
        _, iterations_text, salt_hex, digest_hex = parts
        try:
            iterations = int(iterations_text)
            salt = bytes.fromhex(salt_hex)
            expected_digest = bytes.fromhex(digest_hex)
        except (ValueError, TypeError):
            return False
        candidate = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return secrets.compare_digest(candidate, expected_digest)

    legacy_digest = sha256(password.encode("utf-8")).hexdigest()
    return secrets.compare_digest(legacy_digest, stored_hash)


# --- PII Encryption Utilities ---

_FERNET = Fernet(PII_SECRET_KEY.encode())


def encrypt_pii(value: str | None) -> str | None:
    """Encrypt sensitive string (NIN/BVN) for at-rest storage."""
    if not value:
        return None
    return _FERNET.encrypt(value.encode()).decode()


def decrypt_pii(encrypted_value: str | None) -> str | None:
    """Decrypt sensitive string from storage."""
    if not encrypted_value:
        return None
    try:
        return _FERNET.decrypt(encrypted_value.encode()).decode()
    except Exception:
        # Fallback for plain-text data during migration or dev
        return encrypted_value

def hash_pii(value: str | None) -> str | None:
    """Returns a deterministic SHA-256 hash of a PII value (for uniqueness checks)."""
    if not value:
        return None
    return sha256(value.encode()).hexdigest()
