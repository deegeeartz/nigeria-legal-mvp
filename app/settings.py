from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = Path(os.getenv("APP_UPLOADS_DIR", str(BASE_DIR / "storage" / "uploads")))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "nigeria_legal_mvp")
DATABASE_URL = os.getenv("DATABASE_URL") or (
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

STRICT_SECURITY_MODE = _env_bool("STRICT_SECURITY_MODE", ENVIRONMENT in {"staging", "production"})

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "dev_paystack_secret")
PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE = _env_bool("PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE", True)

SEAL_ENCRYPTION_KEY = os.getenv("SEAL_ENCRYPTION_KEY", "").strip()
if not SEAL_ENCRYPTION_KEY:
    derived_key_bytes = hashlib.sha256(PAYSTACK_SECRET_KEY.encode("utf-8")).digest()
    SEAL_ENCRYPTION_KEY = base64.urlsafe_b64encode(derived_key_bytes).decode("utf-8")

AUTH_RATE_LIMIT_WINDOW_SECONDS = _env_int("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60)
LOGIN_FAILURE_LIMIT = _env_int("LOGIN_FAILURE_LIMIT", 5)
REFRESH_FAILURE_LIMIT = _env_int("REFRESH_FAILURE_LIMIT", 8)
RATE_LIMIT_BACKEND = os.getenv("RATE_LIMIT_BACKEND", "auto").strip().lower()
REDIS_URL = os.getenv("REDIS_URL")

MALWARE_SCAN_MODE = os.getenv("MALWARE_SCAN_MODE", "eicar").strip().lower()
MALWARE_SCAN_FAIL_CLOSED = _env_bool("MALWARE_SCAN_FAIL_CLOSED", False)
CLAMAV_HOST = os.getenv("CLAMAV_HOST", "localhost")
CLAMAV_PORT = _env_int("CLAMAV_PORT", 3310)
CLAMAV_TIMEOUT_SECONDS = _env_int("CLAMAV_TIMEOUT_SECONDS", 5)


def _is_default_db_credential(database_url: str) -> bool:
    parsed = urlparse(database_url)
    username = parsed.username or ""
    password = parsed.password or ""
    return username == "postgres" and password == "postgres"


def validate_runtime_configuration() -> None:
    errors: list[str] = []
    if PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE and not PAYSTACK_SECRET_KEY:
        errors.append("PAYSTACK_SECRET_KEY is required when PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE=true")

    if STRICT_SECURITY_MODE and _is_default_db_credential(DATABASE_URL):
        errors.append("Default DATABASE_URL credentials are not allowed in STRICT_SECURITY_MODE")

    if MALWARE_SCAN_MODE not in {"off", "eicar", "clamav"}:
        errors.append("MALWARE_SCAN_MODE must be one of: off, eicar, clamav")

    if RATE_LIMIT_BACKEND not in {"auto", "memory", "redis"}:
        errors.append("RATE_LIMIT_BACKEND must be one of: auto, memory, redis")

    if errors:
        raise RuntimeError("Invalid runtime configuration: " + "; ".join(errors))
