"""Conversations and Messaging repository.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
)


async def create_conversation(client_user_id: int, lawyer_id: str, initial_message: str) -> dict[str, Any]:
    async with connect() as conn:
        now = _now()
        res = await conn.execute(
            "INSERT INTO conversations (client_user_id, lawyer_id, status, created_on) VALUES (?, ?, 'open', ?)",
            (client_user_id, lawyer_id, now),
        )
        await conn.commit()
        conv_id = res.lastrowid

        await conn.execute(
            "INSERT INTO messages (conversation_id, sender_user_id, body, created_on) VALUES (?, ?, ?, ?)",
            (conv_id, client_user_id, initial_message, now),
        )
        await conn.commit()

        res2 = await conn.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def get_conversation(conversation_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def create_message(conversation_id: int, sender_user_id: int, body: str) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            "INSERT INTO messages (conversation_id, sender_user_id, body, created_on) VALUES (?, ?, ?, ?)",
            (conversation_id, sender_user_id, body, now),
        )
        await conn.commit()
        msg_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_messages(conversation_id: int) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_on ASC",
            (conversation_id,),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def list_conversations_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    async with connect() as conn:
        if user["role"] == "admin":
            res = await conn.execute("SELECT * FROM conversations ORDER BY created_on DESC")
        elif user["role"] == "lawyer":
            res = await conn.execute(
                "SELECT * FROM conversations WHERE lawyer_id = ? ORDER BY created_on DESC",
                (user["lawyer_id"],),
            )
        else:
            res = await conn.execute(
                "SELECT * FROM conversations WHERE client_user_id = ? ORDER BY created_on DESC",
                (user["id"],),
            )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def user_can_access_conversation(user: dict[str, Any], conversation_id: int) -> bool:
    if user["role"] == "admin":
        return True
    conv = await get_conversation(conversation_id)
    if conv is None:
        return False
    if user["role"] == "lawyer":
        return conv["lawyer_id"] == user["lawyer_id"]
    return conv["client_user_id"] == user["id"]


async def list_conversation_participant_user_ids(conversation_id: int) -> list[int]:
    async with connect() as conn:
        res = await conn.execute("SELECT client_user_id, lawyer_id FROM conversations WHERE id = ?", (conversation_id,))
        conv = res.fetchone()
        if not conv:
            return []
        
        # We need the user ID for the lawyer
        res_lawyer = await conn.execute("SELECT id FROM users WHERE lawyer_id = ?", (conv["lawyer_id"],))
        lawyer_user = res_lawyer.fetchone()
        
    uids = [conv["client_user_id"]]
    if lawyer_user:
        uids.append(lawyer_user["id"])
    return list(set(uids))
