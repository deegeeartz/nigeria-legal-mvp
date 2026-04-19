from fastapi import APIRouter, Header, HTTPException
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

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignUpRequest) -> AuthResponse:
    created = create_user(payload.email, payload.password, payload.full_name, payload.role.value, payload.lawyer_id)
    if created is None:
        raise HTTPException(status_code=409, detail="User already exists or invalid lawyer_id")

    token_bundle = create_session_for_user(created["id"])
    log_event(created["id"], "auth.signup", "user", str(created["id"]), f"User signed up as {created['role']}")
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
def login(payload: LoginRequest) -> AuthResponse:
    email_key = _rate_limit_key(payload.email)
    if _is_rate_limited(_failed_login_attempts, email_key, LOGIN_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed login attempts. Please try again shortly.")

    user = authenticate_user(payload.email, payload.password)
    if user is None:
        _record_failed_attempt(_failed_login_attempts, email_key)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _clear_failed_attempts(_failed_login_attempts, email_key)

    log_event(user["id"], "auth.login", "user", str(user["id"]), "User authenticated successfully")

    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
        access_token=user["access_token"],
        refresh_token=user["refresh_token"],
        access_expires_at=user["access_expires_at"],
        refresh_expires_at=user["refresh_expires_at"],
    )

@router.post("/refresh", response_model=AuthResponse)
def refresh_token(payload: RefreshTokenRequest) -> AuthResponse:
    refresh_key = payload.refresh_token.strip()
    if _is_rate_limited(_failed_refresh_attempts, refresh_key, REFRESH_FAILURE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many failed refresh attempts. Please try again shortly.")

    user = refresh_session(payload.refresh_token)
    if user is None:
        _record_failed_attempt(_failed_refresh_attempts, refresh_key)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    _clear_failed_attempts(_failed_refresh_attempts, refresh_key)

    log_event(user["id"], "auth.refresh", "user", str(user["id"]), "Refresh token rotated successfully")

    return AuthResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
        access_token=user["access_token"],
        refresh_token=user["refresh_token"],
        access_expires_at=user["access_expires_at"],
        refresh_expires_at=user["refresh_expires_at"],
    )

@router.post("/logout")
def logout(
    payload: LogoutRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> dict:
    current_user = get_user_by_access_token(x_auth_token) if x_auth_token else None
    revoked = revoke_session(access_token=x_auth_token, refresh_token=payload.refresh_token)
    if not revoked:
        raise HTTPException(status_code=400, detail="No active session found")
    if current_user is not None:
        log_event(current_user["id"], "auth.logout", "user", str(current_user["id"]), "Session revoked")
    return {"status": "logged_out"}

@router.get("/me", response_model=UserProfileResponse)
def me(x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token")) -> UserProfileResponse:
    user = require_user(x_auth_token)
    return UserProfileResponse(
        user_id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        lawyer_id=user.get("lawyer_id"),
    )
