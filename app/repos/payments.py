"""Payments repository (Paystack simulation).
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _now,
    connect,
)


async def create_payment(
    consultation_id: int, 
    provider: str = "simulation", 
    amount_ngn: int = 5000, 
    access_code: str | None = None, 
    authorization_url: str | None = None,
    payment_method: str = "card"
) -> dict[str, Any]:
    now = _now()
    reference = f"TREF_{int(now.timestamp())}"
    gateway_status = "initialized" if provider == "paystack" else None
    
    # Calculate FIRS VAT (7.5%)
    vat_amount = int(amount_ngn * 0.075)
    total_plus_vat = amount_ngn + vat_amount
    
    # If simulated paystack, generate mock values
    if provider == "paystack" and not access_code:
        access_code = f"AC_{reference}"
        authorization_url = f"https://paystack.mock/checkout/{reference}"
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO payments (
                consultation_id, reference, provider, amount_ngn, status, created_on,
                access_code, authorization_url, gateway_status,
                vat_amount_ngn, total_plus_vat_ngn, payment_method
            )
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                consultation_id, reference, provider, amount_ngn, now, 
                access_code, authorization_url, gateway_status,
                vat_amount, total_plus_vat, payment_method
            ),
        )
        await conn.commit()
        pay_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM payments WHERE id = ?", (pay_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def get_payment(payment_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def get_payment_by_reference(reference: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM payments WHERE reference = ?", (reference,))
        row = res.fetchone()
    return dict(row) if row else None


async def update_payment_status(payment_id: int, new_status: str) -> dict[str, Any]:
    now = _now()
    normalized_status = {
        "complete": "paid",
        "completed": "paid",
        "release": "released",
        "released": "released",
        "fail": "failed",
        "failed": "failed",
        "pending": "pending",
        "paid": "paid",
    }.get(new_status, new_status)
    async with connect() as conn:
        if normalized_status == "paid":
            await conn.execute(
                "UPDATE payments SET status = ?, paid_on = ? WHERE id = ?",
                ("paid", now, payment_id),
            )
        elif normalized_status == "released":
            await conn.execute(
                "UPDATE payments SET status = ?, released_on = ? WHERE id = ?",
                ("released", now, payment_id),
            )
        else:
            await conn.execute("UPDATE payments SET status = ? WHERE id = ?", (normalized_status, payment_id))
        await conn.commit()
        
        res = await conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,))
        row = res.fetchone()
    return dict(row) if row else {}


async def verify_paystack_payment(reference: str, outcome: str) -> dict[str, Any]:
    new_status = "paid" if outcome == "success" else "failed"
    now = _now()
    async with connect() as conn:
        if new_status == "paid":
            await conn.execute(
                "UPDATE payments SET status = ?, gateway_status = ?, paid_on = ? WHERE reference = ?",
                (new_status, outcome, now, reference),
            )
        else:
            await conn.execute(
                "UPDATE payments SET status = ?, gateway_status = ? WHERE reference = ?",
                (new_status, outcome, reference),
            )
        await conn.commit()
        res = await conn.execute("SELECT * FROM payments WHERE reference = ?", (reference,))
        row = res.fetchone()
        if row is None:
            return {}
    return dict(row)
