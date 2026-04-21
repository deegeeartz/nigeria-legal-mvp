"""Complaints repository.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
)
from app.complaints import apply_open_complaint_trigger, apply_resolution_trigger, complaint_severity
from app.models import ComplaintCategory
# To avoid circular imports, we import get_lawyer/save_lawyer from their own repo
import app.repos.lawyers as lawyer_repo


async def create_complaint(lawyer_id: str, category: ComplaintCategory, details: str) -> dict[str, Any] | None:
    lawyer = await lawyer_repo.get_lawyer(lawyer_id)
    if lawyer is None:
        return None

    severity = complaint_severity(category)
    lawyer = apply_open_complaint_trigger(lawyer, severity)
    await lawyer_repo.save_lawyer(lawyer)

    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO complaints (lawyer_id, category, severity, status, details, created_on)
            VALUES (?, ?, ?, 'open', ?, ?)
            """,
            (lawyer_id, category.value, severity, details, now),
        )
        await conn.commit()
        complaint_id = res.lastrowid

        res2 = await conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
        row = res2.fetchone()

    return dict(row) if row else None


async def list_complaints_for_lawyer(lawyer_id: str) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM complaints WHERE lawyer_id = ? ORDER BY id DESC",
            (lawyer_id,),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def _has_open_severe(lawyer_id: str) -> bool:
    async with connect() as conn:
        res = await conn.execute(
            """
            SELECT COUNT(*) AS total FROM complaints
            WHERE lawyer_id = ? AND status = 'open' AND severity = 'severe'
            """,
            (lawyer_id,),
        )
        row = res.fetchone()
    return row["total"] > 0


async def resolve_complaint(complaint_id: int, action: str, resolution_note: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
        complaint = res.fetchone()
        if complaint is None:
            return None

        if complaint["status"] != "open":
            return dict(complaint)

        next_status = "upheld" if action == "uphold" else "rejected"
        now = _now()
        await conn.execute(
            """
            UPDATE complaints
            SET status = ?, resolved_on = ?, resolution_note = ?
            WHERE id = ?
            """,
            (next_status, now, resolution_note, complaint_id),
        )
        await conn.commit()

    lawyer = await lawyer_repo.get_lawyer(complaint["lawyer_id"])
    if lawyer is not None:
        lawyer = apply_resolution_trigger(lawyer, has_open_severe=await _has_open_severe(lawyer.id))
        await lawyer_repo.save_lawyer(lawyer)

    async with connect() as conn:
        res2 = await conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
        updated = res2.fetchone()
    return dict(updated) if updated else None
