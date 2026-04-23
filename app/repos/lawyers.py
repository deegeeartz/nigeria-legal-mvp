"""Lawyer repository.
"""
from __future__ import annotations

from typing import Any

from app.repos.connection import (
    _deserialize_practice_areas,
    _serialize_practice_areas,
    _db_bool,
    connect,
    encrypt_pii,
    decrypt_pii,
)
from app.models import Lawyer
from app.data import SEED_LAWYERS


def _safe_get(row: Any, key: str, default: Any = None) -> Any:
    """Safely get value from row dict, return default if key missing."""
    try:
        if isinstance(row, dict):
            return row.get(key, default)
        if hasattr(row, "_mapping"):
            return row._mapping.get(key, default)
        return getattr(row, key, default)
    except Exception:
        return default


def row_to_lawyer(row: Any) -> Lawyer:
    court_admissions_raw = _safe_get(row, "court_admissions", "")
    court_admissions = _deserialize_practice_areas(court_admissions_raw) if court_admissions_raw else None
    return Lawyer(
        id=row["id"],
        full_name=row["full_name"],
        state=row["state"],
        practice_areas=_deserialize_practice_areas(row["practice_areas"]),
        years_called=row["years_called"],
        nin_verified=bool(row["nin_verified"]),
        nba_verified=bool(row["nba_verified"]),
        bvn_verified=bool(row["bvn_verified"]),
        profile_completeness=row["profile_completeness"],
        completed_matters=row["completed_matters"],
        rating=row["rating"],
        response_rate=row["response_rate"],
        avg_response_hours=row["avg_response_hours"],
        repeat_client_rate=row["repeat_client_rate"],
        base_consult_fee_ngn=row["base_consult_fee_ngn"],
        active_complaints=row["active_complaints"],
        severe_flag=bool(row["severe_flag"]),
        enrollment_number=_safe_get(row, "enrollment_number"),
        verification_document_id=_safe_get(row, "verification_document_id"),
        kyc_submission_status=_safe_get(row, "kyc_submission_status", "none"),
        nin=decrypt_pii(_safe_get(row, "nin")),
        is_san=bool(_safe_get(row, "is_san", False)),
        court_admissions=court_admissions,
        legal_system=_safe_get(row, "legal_system", "common_law"),
        bvn=decrypt_pii(_safe_get(row, "bvn")),
        bar_chapter=_safe_get(row, "bar_chapter"),
        pro_bono_practice_areas=_deserialize_practice_areas(_safe_get(row, "pro_bono_practice_areas", "")) or None,
        profile_picture_url=_safe_get(row, "profile_picture_url"),
    )


async def seed_lawyers_if_empty() -> None:
    async with connect() as conn:
        res = await conn.execute("SELECT COUNT(*) AS total FROM lawyers")
        count = res.fetchone()["total"]
        if count > 0:
            return

        for lawyer in SEED_LAWYERS:
            court_admissions_csv = _serialize_practice_areas(lawyer.court_admissions) if lawyer.court_admissions else ""
            await conn.execute(
                """
                INSERT INTO lawyers (
                    id, full_name, state, practice_areas, years_called, nin_verified, nba_verified,
                    bvn_verified, profile_completeness, completed_matters, rating, response_rate,
                    avg_response_hours, repeat_client_rate, base_consult_fee_ngn, active_complaints, severe_flag,
                    enrollment_number, verification_document_id, is_san, court_admissions, legal_system, bvn, nin,
                    pro_bono_practice_areas, profile_picture_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lawyer.id,
                    lawyer.full_name,
                    lawyer.state,
                    _serialize_practice_areas(lawyer.practice_areas),
                    lawyer.years_called,
                    _db_bool(lawyer.nin_verified),
                    _db_bool(lawyer.nba_verified),
                    _db_bool(lawyer.bvn_verified),
                    lawyer.profile_completeness,
                    lawyer.completed_matters,
                    lawyer.rating,
                    lawyer.response_rate,
                    lawyer.avg_response_hours,
                    lawyer.repeat_client_rate,
                    lawyer.base_consult_fee_ngn,
                    lawyer.active_complaints,
                    _db_bool(lawyer.severe_flag),
                    lawyer.enrollment_number,
                    lawyer.verification_document_id,
                    _db_bool(lawyer.is_san),
                    court_admissions_csv,
                    lawyer.legal_system,
                    encrypt_pii(lawyer.bvn),
                    encrypt_pii(lawyer.nin),
                    _serialize_practice_areas(lawyer.pro_bono_practice_areas) if lawyer.pro_bono_practice_areas else "",
                    lawyer.profile_picture_url,
                ),
            )
        await conn.commit()


async def list_lawyers(limit: int = 100, offset: int = 0) -> list[Lawyer]:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM lawyers ORDER BY id LIMIT ? OFFSET ?", (limit, offset))
        rows = res.fetchall()
    return [row_to_lawyer(row) for row in rows]


async def get_lawyer(lawyer_id: str) -> Lawyer | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM lawyers WHERE id = ?", (lawyer_id,))
        row = res.fetchone()
    return row_to_lawyer(row) if row else None


async def save_lawyer(lawyer: Lawyer) -> None:
    async with connect() as conn:
        await conn.execute(
            """
            UPDATE lawyers SET
                full_name = ?,
                state = ?,
                practice_areas = ?,
                years_called = ?,
                nin_verified = ?,
                nba_verified = ?,
                bvn_verified = ?,
                profile_completeness = ?,
                completed_matters = ?,
                rating = ?,
                response_rate = ?,
                avg_response_hours = ?,
                repeat_client_rate = ?,
                base_consult_fee_ngn = ?,
                active_complaints = ?,
                severe_flag = ?,
                enrollment_number = ?,
                verification_document_id = ?,
                kyc_submission_status = ?,
                nin = ?,
                is_san = ?,
                court_admissions = ?,
                legal_system = ?,
                bvn = ?,
                pro_bono_practice_areas = ?,
                profile_picture_url = ?
            WHERE id = ?
            """,
            (
                lawyer.full_name,
                lawyer.state,
                _serialize_practice_areas(lawyer.practice_areas),
                lawyer.years_called,
                _db_bool(lawyer.nin_verified),
                _db_bool(lawyer.nba_verified),
                _db_bool(lawyer.bvn_verified),
                lawyer.profile_completeness,
                lawyer.completed_matters,
                lawyer.rating,
                lawyer.response_rate,
                lawyer.avg_response_hours,
                lawyer.repeat_client_rate,
                lawyer.base_consult_fee_ngn,
                lawyer.active_complaints,
                _db_bool(lawyer.severe_flag),
                lawyer.enrollment_number,
                lawyer.verification_document_id,
                lawyer.kyc_submission_status,
                encrypt_pii(lawyer.nin),
                _db_bool(lawyer.is_san),
                _serialize_practice_areas(lawyer.court_admissions) if lawyer.court_admissions else "",
                lawyer.legal_system,
                encrypt_pii(lawyer.bvn),
                _serialize_practice_areas(lawyer.pro_bono_practice_areas) if lawyer.pro_bono_practice_areas else "",
                lawyer.profile_picture_url,
                lawyer.id,
            ),
        )
        await conn.commit()


async def update_lawyer_disciplinary_status(lawyer_id: str, severe_flag: bool, active_complaints: int) -> bool:
    """Update sensitive compliance fields (Admin only)."""
    async with connect() as conn:
        res = await conn.execute(
            "UPDATE lawyers SET severe_flag = ?, active_complaints = ? WHERE id = ?",
            (_db_bool(severe_flag), active_complaints, lawyer_id)
        )
        await conn.commit()
        return res.rowcount > 0
