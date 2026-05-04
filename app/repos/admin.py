"""Admin and System repository (Audit Events, Notifications).
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
)


async def log_audit_event(actor_user_id: int | None, action: str, resource_type: str, resource_id: str | int | None, detail: str | None = None) -> None:
    now = _now()
    async with connect() as conn:
        await conn.execute(
            """
            INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, detail, created_on)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (actor_user_id, action, resource_type, str(resource_id) if resource_id else None, detail, now),
        )
        await conn.commit()


async def list_audit_events(limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM audit_events ORDER BY created_on DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def create_notification(
    user_id: int,
    title: str,
    body: str,
    *,
    kind: str,
    resource_type: str,
    resource_id: str | None = None,
) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO notifications (user_id, kind, title, body, resource_type, resource_id, is_read, created_on)
            VALUES (?, ?, ?, ?, ?, ?, false, ?)
            """,
            (user_id, kind, title, body, resource_type, resource_id, now),
        )
        await conn.commit()
        not_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM notifications WHERE id = ?", (not_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_notifications(user_id: int, unread_only: bool = False, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    async with connect() as conn:
        if unread_only:
            res = await conn.execute(
                "SELECT * FROM notifications WHERE user_id = ? AND is_read = false ORDER BY created_on DESC LIMIT ? OFFSET ?",
                (user_id, limit, offset),
            )
        else:
            res = await conn.execute(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_on DESC LIMIT ? OFFSET ?",
                (user_id, limit, offset),
            )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def mark_notification_read(notification_id: int, user_id: int) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        await conn.execute(
            "UPDATE notifications SET is_read = true, read_on = ? WHERE id = ? AND user_id = ?",
            (now, notification_id, user_id),
        )
        res = await conn.execute(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, user_id),
        )
        row = res.fetchone()
        await conn.commit()
    return dict(row) if row else None
