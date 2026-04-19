from uuid import uuid4
from time import monotonic
from threading import Lock
from fastapi import HTTPException
from app.db import (
    get_user_by_access_token,
    create_audit_event,
    create_notification,
)

AUTH_RATE_LIMIT_WINDOW_SECONDS = 60
LOGIN_FAILURE_LIMIT = 5
REFRESH_FAILURE_LIMIT = 8

_failed_login_attempts: dict[str, list[float]] = {}
_failed_refresh_attempts: dict[str, list[float]] = {}
_auth_rate_lock = Lock()

def _rate_limit_key(raw_value: str) -> str:
    return raw_value.strip().lower()

def _is_rate_limited(store: dict[str, list[float]], key: str, limit: int) -> bool:
    now = monotonic()
    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        store[key] = attempts
        return len(attempts) >= limit

def _record_failed_attempt(store: dict[str, list[float]], key: str) -> None:
    now = monotonic()
    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        attempts.append(now)
        store[key] = attempts

def _clear_failed_attempts(store: dict[str, list[float]], key: str) -> None:
    with _auth_rate_lock:
        store.pop(key, None)

def reset_auth_rate_limits_for_tests() -> None:
    with _auth_rate_lock:
        _failed_login_attempts.clear()
        _failed_refresh_attempts.clear()


def log_event(actor_user_id: int | None, action: str, resource_type: str, resource_id: str | None, detail: str) -> None:
    create_audit_event(actor_user_id, action, resource_type, resource_id, detail)

def notify_users(
    user_ids: list[int],
    *,
    kind: str,
    title: str,
    body: str,
    resource_type: str,
    resource_id: str | None,
    exclude_user_id: int | None = None,
) -> None:
    for user_id in sorted(set(user_ids)):
        if exclude_user_id is not None and user_id == exclude_user_id:
            continue
        create_notification(user_id, kind, title, body, resource_type, resource_id)

def require_user(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    user = get_user_by_access_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return user

def require_admin(token: str | None) -> dict:
    user = require_user(token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user

def require_client(token: str | None) -> dict:
    user = require_user(token)
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Client role required")
    return user
