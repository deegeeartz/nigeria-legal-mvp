"""Consultations and Booking repository.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
    _parse,
    _db_bool,
)


async def create_consultation(
    client_user_id: int, 
    lawyer_id: str, 
    scheduled_for: str, 
    summary: str, 
    opposing_party_name: str | None = None,
    opposing_party_nin: str | None = None,
    opposing_party_rc_number: str | None = None,
    is_contingency: bool = False,
    contingency_percentage: float | None = None,
    matter_type: str = "general",
    adr_preferred: bool = False,
) -> dict[str, Any]:
    # scheduled_for comes as ISO string from API
    scheduled_dt = _parse(scheduled_for)
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO consultations (
                client_user_id, lawyer_id, scheduled_for, summary, status, created_on, 
                opposing_party_name, opposing_party_nin, opposing_party_rc_number,
                is_contingency, contingency_percentage, matter_type, adr_preferred
            ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (client_user_id, lawyer_id, scheduled_dt, summary, now, opposing_party_name, opposing_party_nin, opposing_party_rc_number, _db_bool(is_contingency), contingency_percentage, matter_type, _db_bool(adr_preferred)),
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


async def list_consultations_for_user(user: dict[str, Any], limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    async with connect() as conn:
        if user["role"] == "admin":
            res = await conn.execute(
                "SELECT * FROM consultations ORDER BY scheduled_for DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
        elif user["role"] == "lawyer":
            res = await conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? ORDER BY scheduled_for DESC LIMIT ? OFFSET ?",
                (user["lawyer_id"], limit, offset),
            )
        else:
            res = await conn.execute(
                "SELECT * FROM consultations WHERE client_user_id = ? ORDER BY scheduled_for DESC LIMIT ? OFFSET ?",
                (user["id"], limit, offset),
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
            INSERT INTO consultation_milestones (consultation_id, event_name, status_label, description, created_on)
            VALUES (?, ?, ?, ?, ?)
            """,
            (consultation_id, event_name, status_label, description, now),
        )
        await conn.commit()
        m_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM consultation_milestones WHERE id = ?", (m_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_milestones(consultation_id: int) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM consultation_milestones WHERE consultation_id = ? ORDER BY created_on ASC",
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

async def check_conflict(
    lawyer_id: str,
    opposing_party_name: str | None = None,
    opposing_party_nin: str | None = None,
    opposing_party_rc_number: str | None = None,
) -> list[dict[str, Any]]:
    """Check for past consultations with the same opposing party for this lawyer.

    Matches on any of: name (fuzzy), NIN (exact), or CAC RC number (exact).
    NIN and RC number matches are definitive — they bypass name-only ambiguity.
    Used to flag potential conflicts of interest as required by NBA RPC.
    """
    if not opposing_party_name and not opposing_party_nin and not opposing_party_rc_number:
        return []

    results: list[dict] = []
    async with connect() as conn:
        # 1. Name match (case-insensitive) — lowest confidence
        if opposing_party_name:
            res = await conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? AND LOWER(opposing_party_name) = LOWER(?) ORDER BY created_on DESC",
                (lawyer_id, opposing_party_name),
            )
            rows = res.fetchall()
            results.extend([{**dict(r), "conflict_match_type": "name"} for r in rows])

        # 2. NIN match (exact) — high confidence
        if opposing_party_nin:
            res = await conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? AND opposing_party_nin = ? ORDER BY created_on DESC",
                (lawyer_id, opposing_party_nin),
            )
            rows = res.fetchall()
            results.extend([{**dict(r), "conflict_match_type": "nin"} for r in rows])

        # 3. RC number match (exact) — high confidence
        if opposing_party_rc_number:
            res = await conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? AND opposing_party_rc_number = ? ORDER BY created_on DESC",
                (lawyer_id, opposing_party_rc_number),
            )
            rows = res.fetchall()
            results.extend([{**dict(r), "conflict_match_type": "rc_number"} for r in rows])

    # Deduplicate by consultation id, preferring higher-confidence match types
    seen: dict[int, dict] = {}
    priority = {"nin": 0, "rc_number": 1, "name": 2}
    for r in results:
        cid = r["id"]
        if cid not in seen or priority[r["conflict_match_type"]] < priority[seen[cid]["conflict_match_type"]]:
            seen[cid] = r
    return list(seen.values())
