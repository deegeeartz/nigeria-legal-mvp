from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response
from typing import Optional
from app.dependencies import (
    log_event,
    require_user,
    _rate_limit_key,
    _is_rate_limited,
    _record_failed_attempt,
    _clear_failed_attempts,
    LOGIN_FAILURE_LIMIT,
    REFRESH_FAILURE_LIMIT,
    _failed_login_attempts,
    _failed_refresh_attempts,
)
from app.db import (
    create_user,
    create_session_for_user,
    authenticate_user,
    refresh_session,
    revoke_session,
    get_user_by_access_token,
)
from app.models import (
    SignUpRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    AuthResponse,
    UserProfileResponse,
)
from app.settings import ENVIRONMENT

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Cookie configuration
# ---------------------------------------------------------------------------
_COOKIE_SECURE = ENVIRONMENT in {"staging", "production"}
_COOKIE_SAMESITE = "lax"
_COOKIE_HTTPONLY = True
_ACCESS_COOKIE = "access_token"
_REFRESH_COOKIE = "refresh_token"


def _set_auth_cookies(response: Response, token_bundle: dict) -> None:
    """Set access and refresh tokens as HTTP-only cookies."""
    response.set_cookie(
        key=_ACCESS_COOKIE,
        value=token_bundle["access_token"],
        httponly=_COOKIE_HTTPONLY,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token_bundle["refresh_token"],
        httponly=_COOKIE_HTTPONLY,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/api/auth",  # refresh cookie only sent to auth endpoints
    )


def _clear_auth_cookies(response: Response) -> None:
    """Clear auth cookies on logout."""
    response.delete_cookie(key=_ACCESS_COOKIE, path="/")
    response.delete_cookie(key=_REFRESH_COOKIE, path="/api/auth")


def _resolve_access_token(
    header_token: str | None,
    cookie_token: str | None,
) -> str | None:
    """Prefer header token (for API clients / tests), fall back to cookie."""
    return header_token or cookie_token or None


def _resolve_refresh_token(
    body_token: str | None,
    cookie_token: str | None,
) -> str | None:
    """Prefer body token, fall back to cookie."""
    return body_token or cookie_token or None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignUpRequest, response: Response) -> AuthResponse:
    created = await create_user(payload.email, payload.password, payload.full_name, payload.role.value, payload.lawyer_id)
    if created is None:
        raise HTTPException(status_code=409, detail="User already exists or invalid lawyer_id")

    token_bundle = await create_session_for_user(created["id"])
    await log_event(created["id"], "auth.signup", "user", str(created["id"]), f"User signed up as {created['role']}")
    _set_auth_cookies(response, token_bundle)
    return AuthResponse(
        user_id=created["id"],
        email=created["email"],
        full_name=created["full_name"],
        role=created["role"],
        lawyer_id=created.get("lawyer_id"),
        access_token=token_bundle["access_token"],
        refresh_token=token_bundle["refresh_token"],
        access_expires_at=token_bundle["access_expires_at"],
        refresh_expires_at=token_bundle["refresh_expires_at"],
    )

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response) -> AuthResponse:
    email_key = _rate_limit_key(payload.email)
    if _is_rate_limited(_failed_login_attempts, email_key, LOGIN_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again shortly.")

    user = await authenticate_user(payload.email, payload.password)
    if user is None:
        _record_failed_attempt(_failed_login_attempts, email_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _clear_failed_attempts(_failed_login_attempts, email_key)

    await log_event(user["id"], "auth.login", "user", str(user["id"]), "User authenticated successfully")

    token_bundle = await create_session_for_user(user["id"])
    _set_auth_cookies(response, token_bundle)
    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
        access_token=token_bundle["access_token"],
        refresh_token=token_bundle["refresh_token"],
        access_expires_at=token_bundle["access_expires_at"],
        refresh_expires_at=token_bundle["refresh_expires_at"],
    )

@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    response: Response,
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
) -> AuthResponse:
    actual_refresh = _resolve_refresh_token(payload.refresh_token, refresh_token_cookie)
    if not actual_refresh:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    refresh_key = actual_refresh.strip()
    if _is_rate_limited(_failed_refresh_attempts, refresh_key, REFRESH_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed refresh attempts. Please try again shortly.")

    token_bundle = await refresh_session(actual_refresh)
    if token_bundle is None:
        _record_failed_attempt(_failed_refresh_attempts, refresh_key)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = await get_user_by_access_token(token_bundle["access_token"])
    if not user:
         raise HTTPException(status_code=401, detail="Session lost after refresh")

    _clear_failed_attempts(_failed_refresh_attempts, refresh_key)

    await log_event(user["id"], "auth.refresh", "user", str(user["id"]), "Refresh token rotated successfully")

    _set_auth_cookies(response, token_bundle)
    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
        access_token=token_bundle["access_token"],
        refresh_token=token_bundle["refresh_token"],
        access_expires_at=token_bundle["access_expires_at"],
        refresh_expires_at=token_bundle["refresh_expires_at"],
    )

@router.post("/logout")
async def logout(
    payload: LogoutRequest,
    response: Response,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
    access_token_cookie: Optional[str] = Cookie(default=None, alias="access_token"),
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
) -> dict:
    access = _resolve_access_token(x_auth_token, access_token_cookie)
    refresh = _resolve_refresh_token(payload.refresh_token, refresh_token_cookie)
    current_user = await get_user_by_access_token(access) if access else None
    await revoke_session(access_token=access, refresh_token=refresh)
    # Note: revoke_session always returns None now, we'll assume it worked or handle error in repo
    if current_user is not None:
        await log_event(current_user["id"], "auth.logout", "user", str(current_user["id"]), "Session revoked")
    _clear_auth_cookies(response)
    return {"status": "logged_out"}

@router.get("/me", response_model=UserProfileResponse)
async def me(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
    access_token_cookie: Optional[str] = Cookie(default=None, alias="access_token"),
) -> UserProfileResponse:
    token = _resolve_access_token(x_auth_token, access_token_cookie)
    user = await require_user(token)
    return UserProfileResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
    )
