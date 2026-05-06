"""Reviews repository for lawyer reviews and ratings.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
)


async def create_review(
    consultation_id: int,
    client_user_id: int,
    lawyer_id: str,
    rating: int,
    review_text: str | None = None,
) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        # Prevent duplicate reviews for the same consultation
        existing = await conn.execute(
            "SELECT id FROM lawyer_reviews WHERE consultation_id = ?",
            (consultation_id,),
        )
        if existing.fetchone():
            return {"error": "Review already exists for this consultation"}

        res = await conn.execute(
            """
            INSERT INTO lawyer_reviews (consultation_id, client_user_id, lawyer_id, rating, review_text, created_on)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (consultation_id, client_user_id, lawyer_id, rating, review_text, now),
        )
        await conn.commit()
        review_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM lawyer_reviews WHERE id = ?", (review_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def get_review(review_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM lawyer_reviews WHERE id = ?", (review_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def get_review_by_consultation(consultation_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM lawyer_reviews WHERE consultation_id = ?",
            (consultation_id,),
        )
        row = res.fetchone()
    return dict(row) if row else None


async def list_reviews_for_lawyer(lawyer_id: str, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM lawyer_reviews WHERE lawyer_id = ? ORDER BY created_on DESC LIMIT ? OFFSET ?",
            (lawyer_id, limit, offset),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def get_lawyer_average_rating(lawyer_id: str) -> dict[str, Any]:
    """Returns the average rating and count for a lawyer."""
    async with connect() as conn:
        res = await conn.execute(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM lawyer_reviews WHERE lawyer_id = ?",
            (lawyer_id,),
        )
        row = res.fetchone()
    if row and row["review_count"] > 0:
        return {
            "average_rating": round(float(row["avg_rating"]), 2),
            "review_count": int(row["review_count"]),
        }
    return {"average_rating": 0.0, "review_count": 0}


async def add_lawyer_reply(review_id: int, reply_text: str) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        await conn.execute(
            "UPDATE lawyer_reviews SET lawyer_reply = ?, lawyer_replied_on = ? WHERE id = ?",
            (reply_text, now, review_id),
        )
        await conn.commit()
        res = await conn.execute("SELECT * FROM lawyer_reviews WHERE id = ?", (review_id,))
        row = res.fetchone()
    return dict(row) if row else None
