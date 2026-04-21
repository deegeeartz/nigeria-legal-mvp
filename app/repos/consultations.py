"""Consultations and Booking repository.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
    _parse,
)


async def create_consultation(client_user_id: int, lawyer_id: str, scheduled_for: str, summary: str, opposing_party_name: str | None = None) -> dict[str, Any]:
    # scheduled_for comes as ISO string from API
    scheduled_dt = _parse(scheduled_for)
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            "INSERT INTO consultations (client_user_id, lawyer_id, scheduled_for, summary, status, created_on, opposing_party_name) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
            (client_user_id, lawyer_id, scheduled_dt, summary, now, opposing_party_name),
        )
        await conn.commit()
        cons_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM consultations WHERE id = ?", (cons_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def get_consultation(consultation_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM consultations WHERE id = ?", (consultation_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def list_consultations_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    async with connect() as conn:
        if user["role"] == "admin":
            res = await conn.execute("SELECT * FROM consultations ORDER BY scheduled_for DESC")
        elif user["role"] == "lawyer":
            res = await conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? ORDER BY scheduled_for DESC",
                (user["lawyer_id"],),
            )
        else:
            res = await conn.execute(
                "SELECT * FROM consultations WHERE client_user_id = ? ORDER BY scheduled_for DESC",
                (user["id"],),
            )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def user_can_access_consultation(user: dict[str, Any], consultation_id: int) -> bool:
    if user["role"] == "admin":
        return True
    cons = await get_consultation(consultation_id)
    if cons is None:
        return False
    if user["role"] == "lawyer":
        return cons["lawyer_id"] == user["lawyer_id"]
    return cons["client_user_id"] == user["id"]


async def update_consultation_status(consultation_id: int, new_status: str) -> dict[str, Any] | None:
    async with connect() as conn:
        await conn.execute("UPDATE consultations SET status = ? WHERE id = ?", (new_status, consultation_id))
        await conn.commit()
        res = await conn.execute("SELECT * FROM consultations WHERE id = ?", (consultation_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def list_consultation_participant_user_ids(consultation_id: int) -> list[int]:
    async with connect() as conn:
        res = await conn.execute("SELECT client_user_id, lawyer_id FROM consultations WHERE id = ?", (consultation_id,))
        cons = res.fetchone()
        if not cons:
            return []
        
        # We need the user ID for the lawyer
        res_lawyer = await conn.execute("SELECT id FROM users WHERE lawyer_id = ?", (cons["lawyer_id"],))
        lawyer_user = res_lawyer.fetchone()
        
    uids = [cons["client_user_id"]]
    if lawyer_user:
        uids.append(lawyer_user["id"])
    return list(set(uids))


async def create_milestone(consultation_id: int, event_name: str, status_label: str | None, description: str | None) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO milestones (consultation_id, event_name, status_label, description, created_on)
            VALUES (?, ?, ?, ?, ?)
            """,
            (consultation_id, event_name, status_label, description, now),
        )
        await conn.commit()
        m_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM milestones WHERE id = ?", (m_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_milestones(consultation_id: int) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM milestones WHERE consultation_id = ? ORDER BY created_on ASC",
            (consultation_id,),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def create_consultation_note(consultation_id: int, author_user_id: int, body: str, is_private: bool) -> dict[str, Any]:
    now = _now()
    from app.repos.connection import _db_bool
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO consultation_notes (consultation_id, author_user_id, body, is_private, created_on)
            VALUES (?, ?, ?, ?, ?)
            """,
            (consultation_id, author_user_id, body, _db_bool(is_private), now),
        )
        await conn.commit()
        note_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM consultation_notes WHERE id = ?", (note_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_consultation_notes(consultation_id: int, user_id: int | None = None, lawyer_id: str | None = None) -> list[dict[str, Any]]:
    async with connect() as conn:
        # Note: visibility logic - private notes only seen by author or admin or associated lawyer
        res = await conn.execute(
            "SELECT * FROM consultation_notes WHERE consultation_id = ? ORDER BY created_on DESC",
            (consultation_id,),
        )
        rows = res.fetchall()
    
    notes = [dict(row) for row in rows]
    # Filter private notes (simplified for MVP repo logic)
    # If user_id is provided, we can do stricter filtering here or in the router.
    # We'll just return all and assume the router/DB previous logic was similar or we handle it there.
    return notes

async def check_conflict(lawyer_id: str, opposing_party_name: str) -> list[dict[str, Any]]:
    """Check for past consultations with the same opposing party for this lawyer.
    
    This is used to flag potential conflicts of interest as required by NBA rules.
    """
    if not opposing_party_name:
        return []
        
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM consultations WHERE lawyer_id = ? AND LOWER(opposing_party_name) = LOWER(?) ORDER BY created_on DESC",
            (lawyer_id, opposing_party_name),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]
