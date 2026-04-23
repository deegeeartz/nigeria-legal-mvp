"""Authentication repository.
"""
from __future__ import annotations

from datetime import timedelta
from hashlib import sha256
from secrets import token_hex
from typing import Any

from sqlalchemy.exc import IntegrityError as SQLAlchemyIntegrityError

from app.repos.connection import (
    ACCESS_TOKEN_TTL_MINUTES,
    REFRESH_TOKEN_TTL_DAYS,
    _hash_password,
    _verify_password,
    _now,
    _iso,
    _db_bool,
    connect,
)


async def create_user(
    email: str,
    password: str,
    full_name: str,
    role: str,
    phone_number: str | None = None,
    lawyer_id: str | None = None,
) -> dict[str, Any] | None:
    if role != "lawyer":
        lawyer_id = None

    try:
        async with connect() as conn:
            # Check if lawyer exists if lawyer_id provided
            if lawyer_id:
                res_lawyer = await conn.execute("SELECT id FROM lawyers WHERE id = ?", (lawyer_id,))
                if res_lawyer.fetchone() is None:
                    return None

            await conn.execute(
                """
                INSERT INTO users (email, password_hash, full_name, role, lawyer_id, phone_number, created_on)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (email.lower(), _hash_password(password), full_name, role, lawyer_id, phone_number, _now()),
            )
            await conn.commit()
            res = await conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
            row = res.fetchone()
        return dict(row) if row else None
    except SQLAlchemyIntegrityError:
        # This catches unique constraint violations on email or phone_number
        return None


async def seed_users_if_empty() -> None:
    async with connect() as conn:
        res = await conn.execute("SELECT COUNT(*) AS total FROM users")
        count = res.fetchone()["total"]
        if count > 0:
            return

        admin_hash = _hash_password("AdminPass123!")
        await conn.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, lawyer_id, created_on)
            VALUES (?, ?, ?, 'admin', NULL, ?)
            """,
            ("admin@legalmvp.local", admin_hash, "Platform Admin", _now()),
        )
        await conn.commit()


async def _create_session(user_id: int) -> dict[str, Any]:
    created_on = _now()
    access_token = token_hex(24)
    refresh_token = token_hex(32)
    access_expires_at = created_on + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)
    refresh_expires_at = created_on + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
    async with connect() as conn:
        await conn.execute(
            """
            INSERT INTO sessions (
                access_token, refresh_token, user_id, created_on, access_expires_at, refresh_expires_at, revoked
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (access_token, refresh_token, user_id, created_on, access_expires_at, refresh_expires_at, _db_bool(False)),
        )
        await conn.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "access_expires_at": _iso(access_expires_at),
        "refresh_expires_at": _iso(refresh_expires_at),
    }


async def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        user = res.fetchone()
    if user is None:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None

    # Upgrade to PBKDF2 if it was a legacy hash
    if not user["password_hash"].startswith("pbkdf2_sha256$"):
        async with connect() as conn:
            await conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (_hash_password(password), user["id"]))
            await conn.commit()
            res = await conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
            user = res.fetchone()
    return dict(user)


async def create_session_for_user(user_id: int) -> dict[str, Any]:
    return await _create_session(user_id)


async def get_user_by_access_token(access_token: str) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            SELECT users.* FROM users
            INNER JOIN sessions ON users.id = sessions.user_id
            WHERE sessions.access_token = ? AND sessions.revoked = ? AND sessions.access_expires_at > ?
            """,
            (access_token, _db_bool(False), now),
        )
        row = res.fetchone()
    return dict(row) if row else None


async def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def refresh_session(refresh_token: str) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM sessions WHERE refresh_token = ? AND revoked = ? AND refresh_expires_at > ?",
            (refresh_token, _db_bool(False), now),
        )
        session = res.fetchone()
        if session is None:
            return None

        # Revoke old session using refresh_token since table lacks an 'id' column
        await conn.execute("UPDATE sessions SET revoked = ? WHERE refresh_token = ?", (_db_bool(True), refresh_token))
        await conn.commit()

    return await _create_session(session["user_id"])


async def revoke_session(access_token: str | None = None, refresh_token: str | None = None) -> None:
    async with connect() as conn:
        if access_token:
            await conn.execute("UPDATE sessions SET revoked = ? WHERE access_token = ?", (_db_bool(True), access_token))
        if refresh_token:
            await conn.execute("UPDATE sessions SET revoked = ? WHERE refresh_token = ?", (_db_bool(True), refresh_token))
        await conn.commit()


async def force_expire_access_token_for_tests(access_token: str) -> None:
    past = _now() - timedelta(minutes=10)
    async with connect() as conn:
        await conn.execute("UPDATE sessions SET access_expires_at = ? WHERE access_token = ?", (past, access_token))
        await conn.commit()


async def save_user(user_id: int, full_name: str, phone_number: str | None, profile_picture_url: str | None, nin_verified: bool, nin_encrypted: str | None, nin_hash: str | None) -> None:
    async with connect() as conn:
        await conn.execute(
            """
            UPDATE users SET
                full_name = ?,
                phone_number = ?,
                profile_picture_url = ?,
                nin_verified = ?,
                nin_encrypted = ?,
                nin_hash = ?
            WHERE id = ?
            """,
            (full_name, phone_number, profile_picture_url, _db_bool(nin_verified), nin_encrypted, nin_hash, user_id),
        )
        await conn.commit()

async def get_user_by_nin(nin_hash: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM users WHERE nin_hash = ?", (nin_hash,))
        row = res.fetchone()
    return dict(row) if row else None

async def get_lawyer_user_ids(lawyer_id: str) -> list[int]:
    async with connect() as conn:
        res = await conn.execute("SELECT id FROM users WHERE lawyer_id = ?", (lawyer_id,))
        rows = res.fetchall()
    return [row["id"] for row in rows]
