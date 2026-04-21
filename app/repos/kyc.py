"""KYC and Document repository.
"""
from __future__ import annotations

import os
from typing import Any

from app.repos.connection import (
    UPLOADS_DIR,
    _now,
    _db_bool,
    connect,
)
import app.repos.lawyers as lawyer_repo


async def upsert_kyc_status(
    lawyer_id: str,
    nin_verified: bool | None,
    nba_verified: bool | None,
    bvn_verified: bool | None,
    note: str,
) -> dict[str, Any]:
    lawyer = await lawyer_repo.get_lawyer(lawyer_id)
    if not lawyer:
        return {"lawyer_id": lawyer_id, "error": "Lawyer not found"}
        
    # Use existing values if None provided
    final_nin = nin_verified if nin_verified is not None else lawyer.nin_verified
    final_nba = nba_verified if nba_verified is not None else lawyer.nba_verified
    final_bvn = bvn_verified if bvn_verified is not None else lawyer.bvn_verified

    async with connect() as conn:
        now = _now()
        await conn.execute(
            """
            INSERT INTO kyc_events (lawyer_id, note, updated_on, nin_verified, nba_verified, bvn_verified)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (lawyer_id, note, now, _db_bool(final_nin), _db_bool(final_nba), _db_bool(final_bvn)),
        )
        await conn.commit()

    if lawyer:
        if nin_verified is not None:
            lawyer.nin_verified = nin_verified
        if nba_verified is not None:
            lawyer.nba_verified = nba_verified
        if bvn_verified is not None:
            lawyer.bvn_verified = bvn_verified
        
        # Simple profile completeness logic
        score = 0
        if lawyer.nin_verified: score += 33
        if lawyer.nba_verified: score += 33
        if lawyer.bvn_verified: score += 34
        lawyer.profile_completeness = score
        
        if lawyer.nin_verified and lawyer.nba_verified and lawyer.bvn_verified:
            lawyer.kyc_submission_status = "verified"
        else:
            lawyer.kyc_submission_status = "pending"
            
        await lawyer_repo.save_lawyer(lawyer)
        latest = await get_latest_kyc_status(lawyer_id)
        if latest is not None:
            latest["enrollment_number"] = lawyer.enrollment_number
            latest["kyc_submission_status"] = lawyer.kyc_submission_status
            return latest

        return {
            "lawyer_id": lawyer_id,
            "enrollment_number": lawyer.enrollment_number,
            "kyc_submission_status": lawyer.kyc_submission_status,
            "nin_verified": bool(lawyer.nin_verified),
            "nba_verified": bool(lawyer.nba_verified),
            "bvn_verified": bool(lawyer.bvn_verified),
            "updated_on": now,
            "note": note,
        }
    return {"lawyer_id": lawyer_id, "error": "Lawyer not found"}


async def get_latest_kyc_status(lawyer_id: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM kyc_events WHERE lawyer_id = ? ORDER BY id DESC LIMIT 1",
            (lawyer_id,),
        )
        row = res.fetchone()
    if row is None:
        return None

    payload = dict(row)
    lawyer = await lawyer_repo.get_lawyer(lawyer_id)
    if lawyer is not None:
        payload["enrollment_number"] = lawyer.enrollment_number
        payload["kyc_submission_status"] = lawyer.kyc_submission_status
    return payload


async def list_pending_kyc_submissions() -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM lawyers WHERE kyc_submission_status = 'pending' ORDER BY id"
        )
        rows = res.fetchall()
    pending: list[dict[str, Any]] = []
    for row in rows:
        lawyer = lawyer_repo.row_to_lawyer(row)
        item = lawyer.__dict__.copy()
        item["lawyer_id"] = item.get("id")
        pending.append(item)
    return pending


async def create_kyc_document(
    lawyer_id: str,
    uploaded_by_user_id: int,
    original_filename: str,
    content_type: str,
    file_bytes: bytes,
) -> dict[str, Any]:
    now = _now()
    filename = f"{lawyer_id}_{int(now.timestamp())}_{original_filename}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO kyc_documents (
                lawyer_id, uploaded_by_user_id, storage_key, original_filename, content_type, size_bytes, created_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (lawyer_id, uploaded_by_user_id, filename, original_filename, content_type, len(file_bytes), now),
        )
        await conn.commit()
        doc_id = res.lastrowid
        
        # Link to lawyer
        await conn.execute(
            "UPDATE lawyers SET verification_document_id = ?, kyc_submission_status = 'pending' WHERE id = ?",
            (doc_id, lawyer_id),
        )
        await conn.commit()
        
        res2 = await conn.execute("SELECT * FROM kyc_documents WHERE id = ?", (doc_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def get_kyc_document(document_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM kyc_documents WHERE id = ?", (document_id,))
        row = res.fetchone()
    return dict(row) if row else None


def get_kyc_document_file_path(document: dict[str, Any]) -> str:
    return str(UPLOADS_DIR / document["storage_key"])
