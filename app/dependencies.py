from uuid import uuid4
from time import time
from threading import Lock
import logging
from fastapi import HTTPException
from app.settings import (
    AUTH_RATE_LIMIT_WINDOW_SECONDS,
    LOGIN_FAILURE_LIMIT,
    REFRESH_FAILURE_LIMIT,
    RATE_LIMIT_BACKEND,
    REDIS_URL,
)

try:
    import redis
except Exception:  # pragma: no cover - optional dependency fallback
    redis = None

logger = logging.getLogger("legal_mvp")

_failed_login_attempts: dict[str, list[float]] = {}
_failed_refresh_attempts: dict[str, list[float]] = {}
_auth_rate_lock = Lock()
_redis_client = None
_redis_unavailable_logged = False


def _store_prefix(store: dict[str, list[float]]) -> str:
    if store is _failed_login_attempts:
        return "login"
    if store is _failed_refresh_attempts:
        return "refresh"
    return "generic"


def _build_rate_limit_key(prefix: str, key: str) -> str:
    return f"rate_limit:{prefix}:{key}"


def _use_redis_backend() -> bool:
    if RATE_LIMIT_BACKEND == "memory":
        return False
    if RATE_LIMIT_BACKEND == "redis":
        return True
    return bool(REDIS_URL)


def _get_redis_client():
    global _redis_client, _redis_unavailable_logged
    if not _use_redis_backend():
        return None
    if redis is None:
        if not _redis_unavailable_logged:
            logger.warning("Redis backend configured but redis package is unavailable; falling back to memory rate limits")
            _redis_unavailable_logged = True
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        _redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
        _redis_client.ping()
        return _redis_client
    except Exception:
        if not _redis_unavailable_logged:
            logger.warning("Redis backend unavailable; falling back to memory rate limits")
            _redis_unavailable_logged = True
        return None

def _rate_limit_key(raw_value: str) -> str:
    return raw_value.strip().lower()

def _is_rate_limited(store: dict[str, list[float]], key: str, limit: int) -> bool:
    redis_client = _get_redis_client()
    now = time()
    if redis_client is not None:
        redis_key = _build_rate_limit_key(_store_prefix(store), key)
        window_start = now - AUTH_RATE_LIMIT_WINDOW_SECONDS
        pipeline = redis_client.pipeline()
        pipeline.zremrangebyscore(redis_key, 0, window_start)
        pipeline.zcard(redis_key)
        pipeline.expire(redis_key, AUTH_RATE_LIMIT_WINDOW_SECONDS + 5)
        _, count, _ = pipeline.execute()
        return int(count) >= limit

    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        store[key] = attempts
        return len(attempts) >= limit

def _record_failed_attempt(store: dict[str, list[float]], key: str) -> None:
    redis_client = _get_redis_client()
    now = time()
    if redis_client is not None:
        redis_key = _build_rate_limit_key(_store_prefix(store), key)
        member = f"{now}:{uuid4().hex}".encode("utf-8")
        pipeline = redis_client.pipeline()
        pipeline.zadd(redis_key, {member: now})
        pipeline.zremrangebyscore(redis_key, 0, now - AUTH_RATE_LIMIT_WINDOW_SECONDS)
        pipeline.expire(redis_key, AUTH_RATE_LIMIT_WINDOW_SECONDS + 5)
        pipeline.execute()
        return

    with _auth_rate_lock:
        attempts = [value for value in store.get(key, []) if now - value < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        attempts.append(now)
        store[key] = attempts

def _clear_failed_attempts(store: dict[str, list[float]], key: str) -> None:
    redis_client = _get_redis_client()
    if redis_client is not None:
        redis_key = _build_rate_limit_key(_store_prefix(store), key)
        redis_client.delete(redis_key)
        return

    with _auth_rate_lock:
        store.pop(key, None)

def reset_auth_rate_limits_for_tests() -> None:
    with _auth_rate_lock:
        _failed_login_attempts.clear()
        _failed_refresh_attempts.clear()


async def log_event(actor_user_id: int | None, action: str, resource_type: str, resource_id: str | None, detail: str) -> None:
    from app.db import log_audit_event
    await log_audit_event(actor_user_id, action, resource_type, resource_id, detail)

async def notify_users(
    user_ids: list[int],
    *,
    kind: str,
    title: str,
    body: str,
    resource_type: str,
    resource_id: str | None,
    exclude_user_id: int | None = None,
) -> None:
    from app.db import create_notification
    for user_id in sorted(set(user_ids)):
        if exclude_user_id is not None and user_id == exclude_user_id:
            continue
        await create_notification(
            user_id,
            title,
            body,
            kind=kind,
            resource_type=resource_type,
            resource_id=resource_id,
        )

async def require_user(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    from app.db import get_user_by_access_token
    user = await get_user_by_access_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return user

async def require_admin(token: str | None) -> dict:
    user = await require_user(token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user

async def require_client(token: str | None) -> dict:
    user = await require_user(token)
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Client role required")
    return user
