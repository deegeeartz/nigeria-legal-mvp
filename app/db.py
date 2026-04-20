from __future__ import annotations

import os
import re
from hashlib import pbkdf2_hmac, sha256
from secrets import token_hex
import secrets
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError as SQLAlchemyIntegrityError

from app.complaints import apply_open_complaint_trigger, apply_resolution_trigger, complaint_severity
from app.data import SEED_LAWYERS
from app.models import ComplaintCategory, Lawyer
from app.settings import DATABASE_URL


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = Path(os.getenv("APP_UPLOADS_DIR", str(BASE_DIR / "storage" / "uploads")))
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60"))
REFRESH_TOKEN_TTL_DAYS = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))
PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "260000"))
ENGINE = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)


class QueryResultAdapter:
    def __init__(self, result: Any, lastrowid: int | None = None):
        self._result = result
        self.lastrowid = lastrowid

    @staticmethod
    def _to_mapping(row: Any) -> dict[str, Any] | None:
        if row is None:
            return None
        if isinstance(row, dict):
            return row
        if hasattr(row, "_mapping"):
            return dict(row._mapping)
        return dict(row)

    def fetchone(self) -> dict[str, Any] | None:
        return self._to_mapping(self._result.fetchone())

    def fetchall(self) -> list[dict[str, Any]]:
        rows = self._result.fetchall()
        return [self._to_mapping(row) for row in rows if row is not None]

    @property
    def rowcount(self) -> int:
        return self._result.rowcount


def _convert_qmark_sql(sql: str, params: tuple[Any, ...] | list[Any]) -> tuple[str, dict[str, Any]]:
    placeholder_count = sql.count("?")
    if placeholder_count == 0:
        return sql, {}
    if placeholder_count != len(params):
        raise ValueError(f"Placeholder count mismatch. SQL has {placeholder_count} placeholders, got {len(params)} params")

    chunks = sql.split("?")
    converted = chunks[0]
    binds: dict[str, Any] = {}
    for index, value in enumerate(params):
        key = f"p{index}"
        converted += f":{key}{chunks[index + 1]}"
        binds[key] = value
    return converted, binds


class PostgresConnectionAdapter:
    def __init__(self):
        if ENGINE is None:
            raise RuntimeError("PostgreSQL engine is not configured")
        self._conn = ENGINE.connect()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None:
            self._conn.rollback()
        else:
            self._conn.commit()
        self._conn.close()

    def execute(self, sql: str, params: tuple[Any, ...] | list[Any] = ()) -> QueryResultAdapter:
        id_returning_tables = {
            "complaints",
            "kyc_events",
            "kyc_documents",
            "conversations",
            "messages",
            "consultations",
            "payments",
            "documents",
            "consultation_milestones",
            "consultation_notes",
            "audit_events",
            "notifications",
            "consent_events",
            "dsr_requests",
            "dsr_corrections",
            "breach_incidents",
        }

        converted_sql, bind_params = _convert_qmark_sql(sql, list(params))
        executable_sql = converted_sql

        lowered = converted_sql.lstrip().lower()
        if lowered.startswith("insert") and "returning" not in lowered:
            match = re.search(r"insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)", lowered)
            table_name = match.group(1) if match else None
            if table_name in id_returning_tables:
                executable_sql = f"{converted_sql} RETURNING id"

        result = self._conn.execute(text(executable_sql), bind_params)
        lastrowid = None
        if lowered.startswith("insert"):
            try:
                returned = result.fetchone()
                if returned is not None and hasattr(returned, "_mapping") and "id" in returned._mapping:
                    lastrowid = returned._mapping["id"]
            except Exception:
                lastrowid = None
        return QueryResultAdapter(result, lastrowid=lastrowid)

    def commit(self) -> None:
        self._conn.commit()


def _assert_postgres_schema_ready() -> None:
    if ENGINE is None:
        raise RuntimeError("PostgreSQL engine is not configured")
    with ENGINE.connect() as conn:
        required_tables = {
            "users",
            "lawyers",
            "sessions",
            "consultations",
            "payments",
            "consent_events",
            "dsr_requests",
                "dsr_corrections",
                "breach_incidents",
        }
        rows = conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        ).fetchall()
        available = {row[0] for row in rows}
        missing = required_tables - available
        if missing:
            joined = ", ".join(sorted(missing))
            raise RuntimeError(
                f"PostgreSQL schema is incomplete (missing: {joined}). Run 'alembic upgrade head' before starting the API."
            )


def _db_bool(value: bool) -> bool:
    return bool(value)


def connect() -> PostgresConnectionAdapter:
    return PostgresConnectionAdapter()


def init_db() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    _assert_postgres_schema_ready()


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _serialize_practice_areas(practice_areas: list[str]) -> str:
    return ",".join(practice_areas)


def _deserialize_practice_areas(value: str) -> list[str]:
    return [item for item in value.split(",") if item]


def seed_lawyers_if_empty() -> None:
    with connect() as conn:
        count = conn.execute("SELECT COUNT(*) AS total FROM lawyers").fetchone()["total"]
        if count > 0:
            return

        for lawyer in SEED_LAWYERS:
            conn.execute(
                """
                INSERT INTO lawyers (
                    id, full_name, state, practice_areas, years_called, nin_verified, nba_verified,
                    bvn_verified, profile_completeness, completed_matters, rating, response_rate,
                    avg_response_hours, repeat_client_rate, base_consult_fee_ngn, active_complaints, severe_flag,
                    enrollment_number, verification_document_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                ),
            )
        conn.commit()


def seed_users_if_empty() -> None:
    with connect() as conn:
        count = conn.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if count > 0:
            return

        admin_hash = sha256("AdminPass123!".encode("utf-8")).hexdigest()
        admin_hash = _hash_password("AdminPass123!")
        conn.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, lawyer_id, created_on)
            VALUES (?, ?, ?, 'admin', NULL, ?)
            """,
            ("admin@legalmvp.local", admin_hash, "Platform Admin", str(date.today())),
        )
        conn.commit()


def row_to_lawyer(row: Any) -> Lawyer:
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
        enrollment_number=row["enrollment_number"] if "enrollment_number" in row.keys() else None,
        verification_document_id=row["verification_document_id"] if "verification_document_id" in row.keys() else None,
        kyc_submission_status=row["kyc_submission_status"] if "kyc_submission_status" in row.keys() else "none",
        nin=row["nin"] if "nin" in row.keys() else None,
    )


def list_lawyers() -> list[Lawyer]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM lawyers").fetchall()
    return [row_to_lawyer(row) for row in rows]


def get_lawyer(lawyer_id: str) -> Lawyer | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM lawyers WHERE id = ?", (lawyer_id,)).fetchone()
    return row_to_lawyer(row) if row else None


def save_lawyer(lawyer: Lawyer) -> None:
    with connect() as conn:
        conn.execute(
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
                nin = ?
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
                lawyer.nin,
                lawyer.id,
            ),
        )
        conn.commit()


def create_complaint(lawyer_id: str, category: ComplaintCategory, details: str) -> dict[str, Any] | None:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return None

    severity = complaint_severity(category)
    lawyer = apply_open_complaint_trigger(lawyer, severity)
    save_lawyer(lawyer)

    today = str(date.today())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO complaints (lawyer_id, category, severity, status, details, created_on)
            VALUES (?, ?, ?, 'open', ?, ?)
            """,
            (lawyer_id, category.value, severity, details, today),
        )
        conn.commit()
        complaint_id = cursor.lastrowid

        row = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()

    return dict(row) if row else None


def list_complaints_for_lawyer(lawyer_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM complaints WHERE lawyer_id = ? ORDER BY id DESC",
            (lawyer_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def _has_open_severe(lawyer_id: str) -> bool:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS total FROM complaints
            WHERE lawyer_id = ? AND status = 'open' AND severity = 'severe'
            """,
            (lawyer_id,),
        ).fetchone()
    return row["total"] > 0


def resolve_complaint(complaint_id: int, action: str, resolution_note: str) -> dict[str, Any] | None:
    with connect() as conn:
        complaint = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
        if complaint is None:
            return None

        if complaint["status"] != "open":
            return dict(complaint)

        next_status = "upheld" if action == "uphold" else "rejected"
        today = str(date.today())
        conn.execute(
            """
            UPDATE complaints
            SET status = ?, resolved_on = ?, resolution_note = ?
            WHERE id = ?
            """,
            (next_status, today, resolution_note, complaint_id),
        )
        conn.commit()

    lawyer = get_lawyer(complaint["lawyer_id"])
    if lawyer is not None:
        lawyer = apply_resolution_trigger(lawyer, has_open_severe=_has_open_severe(lawyer.id))
        save_lawyer(lawyer)

    with connect() as conn:
        updated = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
    return dict(updated) if updated else None


def reset_db_for_tests() -> None:
    init_db()
    for file_path in UPLOADS_DIR.glob("*"):
        if file_path.is_file():
            file_path.unlink()
    with connect() as conn:
        conn.execute("DELETE FROM breach_incidents")
        conn.execute("DELETE FROM dsr_corrections")
        conn.execute("DELETE FROM dsr_requests")
        conn.execute("DELETE FROM consent_events")
        conn.execute("DELETE FROM notifications")
        conn.execute("DELETE FROM audit_events")
        conn.execute("DELETE FROM documents")
        conn.execute("DELETE FROM payments")
        conn.execute("DELETE FROM consultations")
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM conversations")
        conn.execute("DELETE FROM complaints")
        conn.execute("DELETE FROM kyc_documents")
        conn.execute("DELETE FROM sessions")
        conn.execute("DELETE FROM users")
        conn.execute("DELETE FROM kyc_events")
        conn.execute("DELETE FROM lawyers")
        conn.commit()
    seed_lawyers_if_empty()
    seed_users_if_empty()


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$", 3)
        if len(parts) != 4:
            return False
        _, iterations_text, salt_hex, digest_hex = parts
        try:
            iterations = int(iterations_text)
            salt = bytes.fromhex(salt_hex)
            expected_digest = bytes.fromhex(digest_hex)
        except (ValueError, TypeError):
            return False
        candidate = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return secrets.compare_digest(candidate, expected_digest)

    legacy_digest = sha256(password.encode("utf-8")).hexdigest()
    return secrets.compare_digest(legacy_digest, stored_hash)


def create_user(
    email: str,
    password: str,
    full_name: str,
    role: str,
    lawyer_id: str | None = None,
) -> dict[str, Any] | None:
    if role != "lawyer":
        lawyer_id = None
    elif lawyer_id:
        linked_lawyer = get_lawyer(lawyer_id)
        if linked_lawyer is None:
            return None

    try:
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO users (email, password_hash, full_name, role, lawyer_id, created_on)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (email.lower(), _hash_password(password), full_name, role, lawyer_id, str(date.today())),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return dict(row) if row else None
    except SQLAlchemyIntegrityError:
        return None


def _create_session(user_id: int) -> str:
    created_on = _now()
    access_token = token_hex(24)
    refresh_token = token_hex(32)
    access_expires_at = _iso(created_on + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES))
    refresh_expires_at = _iso(created_on + timedelta(days=REFRESH_TOKEN_TTL_DAYS))
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (
                access_token, refresh_token, user_id, created_on, access_expires_at, refresh_expires_at, revoked
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (access_token, refresh_token, user_id, _iso(created_on), access_expires_at, refresh_expires_at, _db_bool(False)),
        )
        conn.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "access_expires_at": access_expires_at,
        "refresh_expires_at": refresh_expires_at,
    }


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    with connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    if user is None:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None

    if not user["password_hash"].startswith("pbkdf2_sha256$"):
        with connect() as conn:
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (_hash_password(password), user["id"]))
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()

    token_bundle = _create_session(user["id"])
    payload = dict(user)
    payload.update(token_bundle)
    return payload


def create_session_for_user(user_id: int) -> dict[str, Any]:
    return _create_session(user_id)


def get_user_by_access_token(access_token: str) -> dict[str, Any] | None:
    now = _iso(_now())
    with connect() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.email, users.full_name, users.role, users.lawyer_id
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.access_token = ?
                            AND sessions.revoked = ?
              AND sessions.access_expires_at > ?
            """,
                        (access_token, _db_bool(False), now),
        ).fetchone()
    return dict(row) if row else None


def refresh_session(refresh_token: str) -> dict[str, Any] | None:
    now = _now()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT sessions.user_id, users.email, users.full_name, users.role, users.lawyer_id, sessions.revoked, sessions.refresh_expires_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.refresh_token = ?
            """,
            (refresh_token,),
        ).fetchone()
        if row is None:
            return None
        if bool(row["revoked"]) or _parse(row["refresh_expires_at"]) <= now:
            return None

        conn.execute("UPDATE sessions SET revoked = ? WHERE refresh_token = ?", (_db_bool(True), refresh_token))
        conn.commit()

    token_bundle = _create_session(row["user_id"])
    return {
        "id": row["user_id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        "lawyer_id": row["lawyer_id"],
        **token_bundle,
    }


def revoke_session(access_token: str | None = None, refresh_token: str | None = None) -> bool:
    if not access_token and not refresh_token:
        return False
    with connect() as conn:
        if access_token and refresh_token:
            result = conn.execute(
                """
                UPDATE sessions SET revoked = ?
                WHERE access_token = ? OR refresh_token = ?
                """,
                (_db_bool(True), access_token, refresh_token),
            )
        elif access_token:
            result = conn.execute("UPDATE sessions SET revoked = ? WHERE access_token = ?", (_db_bool(True), access_token))
        else:
            result = conn.execute("UPDATE sessions SET revoked = ? WHERE refresh_token = ?", (_db_bool(True), refresh_token))
        conn.commit()
    return result.rowcount > 0


def force_expire_access_token_for_tests(access_token: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE sessions SET access_expires_at = ? WHERE access_token = ?",
            (_iso(_now() - timedelta(minutes=5)), access_token),
        )
        conn.commit()


def upsert_kyc_status(
    lawyer_id: str,
    nin_verified: bool | None,
    nba_verified: bool | None,
    bvn_verified: bool | None,
    note: str,
) -> dict[str, Any] | None:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return None

    if nin_verified is not None:
        lawyer.nin_verified = nin_verified
    if nba_verified is not None:
        lawyer.nba_verified = nba_verified
        if nba_verified:
            lawyer.kyc_submission_status = "approved"
        else:
            lawyer.kyc_submission_status = "rejected"
    if bvn_verified is not None:
        lawyer.bvn_verified = bvn_verified
    save_lawyer(lawyer)

    with connect() as conn:
        conn.execute(
            """
            INSERT INTO kyc_events (lawyer_id, nin_verified, nba_verified, bvn_verified, note, updated_on)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                lawyer.id,
                _db_bool(lawyer.nin_verified),
                _db_bool(lawyer.nba_verified),
                _db_bool(lawyer.bvn_verified),
                note,
                str(date.today()),
            ),
        )
        conn.commit()

    return {
        "lawyer_id": lawyer.id,
        "enrollment_number": lawyer.enrollment_number,
        "kyc_submission_status": lawyer.kyc_submission_status,
        "nin_verified": lawyer.nin_verified,
        "nba_verified": lawyer.nba_verified,
        "bvn_verified": lawyer.bvn_verified,
        "note": note,
        "updated_on": str(date.today()),
    }


def get_latest_kyc_status(lawyer_id: str) -> dict[str, Any] | None:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return None

    with connect() as conn:
        row = conn.execute(
            """
            SELECT * FROM kyc_events
            WHERE lawyer_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (lawyer_id,),
        ).fetchone()

    if row is None:
        return {
            "lawyer_id": lawyer.id,
            "enrollment_number": lawyer.enrollment_number,
            "kyc_submission_status": lawyer.kyc_submission_status,
            "nin_verified": lawyer.nin_verified,
            "nba_verified": lawyer.nba_verified,
            "bvn_verified": lawyer.bvn_verified,
            "note": "No KYC update history yet",
            "updated_on": str(date.today()),
        }
    data = dict(row)
    return {
        "lawyer_id": data["lawyer_id"],
        "enrollment_number": lawyer.enrollment_number,
        "kyc_submission_status": lawyer.kyc_submission_status,
        "nin_verified": bool(data["nin_verified"]),
        "nba_verified": bool(data["nba_verified"]),
        "bvn_verified": bool(data["bvn_verified"]),
        "note": data["note"],
        "updated_on": data["updated_on"],
    }


def list_pending_kyc_submissions() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM lawyers WHERE kyc_submission_status = 'pending' ORDER BY id"
        ).fetchall()
    results = []
    for row in rows:
        lawyer = row_to_lawyer(row)
        results.append({
            "lawyer_id": lawyer.id,
            "full_name": lawyer.full_name,
            "enrollment_number": lawyer.enrollment_number,
            "kyc_submission_status": lawyer.kyc_submission_status,
            "nin_verified": lawyer.nin_verified,
            "nba_verified": lawyer.nba_verified,
            "verification_document_id": lawyer.verification_document_id,
        })
    return results


def create_kyc_document(
    lawyer_id: str,
    uploaded_by_user_id: int,
    original_filename: str,
    content_type: str,
    file_bytes: bytes,
) -> dict[str, Any]:
    created_on = str(date.today())
    suffix = Path(original_filename).suffix[:20]
    storage_key = f"kyc_{token_hex(16)}{suffix}"
    file_path = UPLOADS_DIR / storage_key
    file_path.write_bytes(file_bytes)

    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO kyc_documents (
                lawyer_id, uploaded_by_user_id, original_filename, storage_key,
                content_type, size_bytes, created_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lawyer_id,
                uploaded_by_user_id,
                original_filename,
                storage_key,
                content_type,
                len(file_bytes),
                created_on,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM kyc_documents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def get_kyc_document(document_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM kyc_documents WHERE id = ?", (document_id,)).fetchone()
    return dict(row) if row else None


def get_kyc_document_file_path(document: dict[str, Any]) -> Path:
    return UPLOADS_DIR / document["storage_key"]


def create_conversation(client_user_id: int, lawyer_id: str, initial_message: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return None
    created_on = str(date.today())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO conversations (client_user_id, lawyer_id, status, created_on)
            VALUES (?, ?, 'open', ?)
            """,
            (client_user_id, lawyer_id, created_on),
        )
        conversation_id = cursor.lastrowid
        message_cursor = conn.execute(
            """
            INSERT INTO messages (conversation_id, sender_user_id, body, created_on)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, client_user_id, initial_message, created_on),
        )
        conn.commit()

        conversation = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        message = conn.execute("SELECT * FROM messages WHERE id = ?", (message_cursor.lastrowid,)).fetchone()
    return dict(conversation), dict(message)


def get_conversation(conversation_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
    return dict(row) if row else None


def create_message(conversation_id: int, sender_user_id: int, body: str) -> dict[str, Any] | None:
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return None
    created_on = str(date.today())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO messages (conversation_id, sender_user_id, body, created_on)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, sender_user_id, body, created_on),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM messages WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row) if row else None


def list_messages(conversation_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def list_conversations_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    with connect() as conn:
        if user["role"] == "admin":
            rows = conn.execute("SELECT * FROM conversations ORDER BY id DESC").fetchall()
        elif user["role"] == "client":
            rows = conn.execute(
                "SELECT * FROM conversations WHERE client_user_id = ? ORDER BY id DESC",
                (user["id"],),
            ).fetchall()
        elif user["role"] == "lawyer":
            rows = conn.execute(
                "SELECT * FROM conversations WHERE lawyer_id = ? ORDER BY id DESC",
                (user.get("lawyer_id"),),
            ).fetchall()
        else:
            rows = []
    return [dict(row) for row in rows]


def user_can_access_conversation(user: dict[str, Any], conversation_id: int) -> bool:
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return False
    if user["role"] == "admin":
        return True
    if user["role"] == "client":
        return conversation["client_user_id"] == user["id"]
    if user["role"] == "lawyer":
        return user.get("lawyer_id") == conversation["lawyer_id"]
    return False


def create_consultation(client_user_id: int, lawyer_id: str, scheduled_for: str, summary: str) -> dict[str, Any] | None:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return None
    created_on = str(date.today())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO consultations (client_user_id, lawyer_id, scheduled_for, summary, status, created_on)
            VALUES (?, ?, ?, ?, 'booked', ?)
            """,
            (client_user_id, lawyer_id, scheduled_for, summary, created_on),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM consultations WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row) if row else None


def get_consultation(consultation_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM consultations WHERE id = ?", (consultation_id,)).fetchone()
    return dict(row) if row else None


def list_consultations_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    with connect() as conn:
        if user["role"] == "admin":
            rows = conn.execute("SELECT * FROM consultations ORDER BY id DESC").fetchall()
        elif user["role"] == "client":
            rows = conn.execute(
                "SELECT * FROM consultations WHERE client_user_id = ? ORDER BY id DESC",
                (user["id"],),
            ).fetchall()
        elif user["role"] == "lawyer":
            rows = conn.execute(
                "SELECT * FROM consultations WHERE lawyer_id = ? ORDER BY id DESC",
                (user.get("lawyer_id"),),
            ).fetchall()
        else:
            rows = []
    return [dict(row) for row in rows]


def user_can_access_consultation(user: dict[str, Any], consultation_id: int) -> bool:
    consultation = get_consultation(consultation_id)
    if consultation is None:
        return False
    if user["role"] == "admin":
        return True
    if user["role"] == "client":
        return consultation["client_user_id"] == user["id"]
    if user["role"] == "lawyer":
        return user.get("lawyer_id") == consultation["lawyer_id"]
    return False


def update_consultation_status(consultation_id: int, new_status: str) -> dict[str, Any] | None:
    with connect() as conn:
        conn.execute(
            "UPDATE consultations SET status = ? WHERE id = ?",
            (new_status, consultation_id),
        )
    return get_consultation(consultation_id)


def create_payment(consultation_id: int, provider: str = "simulation") -> dict[str, Any] | None:
    consultation = get_consultation(consultation_id)
    if consultation is None:
        return None
    lawyer = get_lawyer(consultation["lawyer_id"])
    if lawyer is None:
        return None
    created_on = str(date.today())
    normalized_provider = "paystack" if provider in {"simulation", "paystack", "paystack_simulation"} else provider
    reference = f"PSTKSIM-{token_hex(6).upper()}"
    access_code = f"acs_{token_hex(8)}"
    authorization_url = f"https://paystack.mock/checkout/{reference}"
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO payments (
                consultation_id, reference, provider, amount_ngn, status, created_on,
                access_code, authorization_url, gateway_status
            )
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 'initialized')
            """,
            (
                consultation_id,
                reference,
                normalized_provider,
                lawyer.base_consult_fee_ngn,
                created_on,
                access_code,
                authorization_url,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row) if row else None


def get_payment(payment_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
    return dict(row) if row else None


def get_payment_by_reference(reference: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM payments WHERE reference = ?", (reference,)).fetchone()
    return dict(row) if row else None


def update_payment_status(payment_id: int, action: str) -> dict[str, Any] | None:
    payment = get_payment(payment_id)
    if payment is None:
        return None
    next_status = payment["status"]
    gateway_status = payment.get("gateway_status")
    paid_on = payment.get("paid_on")
    released_on = payment.get("released_on")
    if action == "complete":
        next_status = "paid"
        gateway_status = "success"
        paid_on = str(date.today())
    elif action == "fail":
        next_status = "failed"
        gateway_status = "failed"
    elif action == "release":
        next_status = "released"
        gateway_status = payment.get("gateway_status") or "success"
        released_on = str(date.today())

    with connect() as conn:
        conn.execute(
            "UPDATE payments SET status = ?, gateway_status = ?, paid_on = ?, released_on = ? WHERE id = ?",
            (next_status, gateway_status, paid_on, released_on, payment_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
    return dict(row) if row else None


def verify_paystack_payment(reference: str, outcome: str) -> dict[str, Any] | None:
    payment = get_payment_by_reference(reference)
    if payment is None:
        return None
    action = "complete" if outcome == "success" else "fail"
    return update_payment_status(payment["id"], action)


def create_document(
    consultation_id: int,
    uploaded_by_user_id: int,
    document_label: str,
    original_filename: str,
    content_type: str,
    file_bytes: bytes,
) -> dict[str, Any] | None:
    consultation = get_consultation(consultation_id)
    if consultation is None:
        return None

    created_on = str(date.today())
    suffix = Path(original_filename).suffix[:20]
    storage_key = f"{token_hex(16)}{suffix}"
    file_path = UPLOADS_DIR / storage_key
    file_path.write_bytes(file_bytes)

    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO documents (
                consultation_id, uploaded_by_user_id, document_label, original_filename,
                storage_key, content_type, size_bytes, created_on
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                consultation_id,
                uploaded_by_user_id,
                document_label,
                original_filename,
                storage_key,
                content_type,
                len(file_bytes),
                created_on,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row) if row else None


def list_documents_for_consultation(consultation_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE consultation_id = ? ORDER BY id ASC",
            (consultation_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_document(document_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    return dict(row) if row else None


def get_document_file_path(document: dict[str, Any]) -> Path:
    return UPLOADS_DIR / document["storage_key"]


def user_can_access_document(user: dict[str, Any], document_id: int) -> bool:
    document = get_document(document_id)
    if document is None:
        return False
    return user_can_access_consultation(user, document["consultation_id"])


def create_audit_event(
    actor_user_id: int | None,
    action: str,
    resource_type: str,
    resource_id: str | None,
    detail: str,
) -> dict[str, Any]:
    created_on = _iso(_now())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, detail, created_on)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (actor_user_id, action, resource_type, resource_id, detail, created_on),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM audit_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_audit_events(limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM audit_events ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def create_notification(
    user_id: int,
    kind: str,
    title: str,
    body: str,
    resource_type: str,
    resource_id: str | None,
) -> dict[str, Any]:
    created_on = _iso(_now())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO notifications (user_id, kind, title, body, resource_type, resource_id, created_on)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, kind, title, body, resource_type, resource_id, created_on),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM notifications WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_notifications_for_user(user_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def mark_notification_read(notification_id: int, user_id: int) -> dict[str, Any] | None:
    read_on = _iso(_now())
    with connect() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = ?, read_on = ? WHERE id = ? AND user_id = ?",
            (_db_bool(True), read_on, notification_id, user_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, user_id),
        ).fetchone()
    return dict(row) if row else None


def create_consent_event(
    user_id: int,
    purpose: str,
    lawful_basis: str,
    consented: bool,
    policy_version: str,
    metadata_json: str | None,
) -> dict[str, Any]:
    created_on = _iso(_now())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO consent_events (user_id, purpose, lawful_basis, consented, policy_version, metadata_json, created_on)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, purpose, lawful_basis, _db_bool(consented), policy_version, metadata_json, created_on),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM consent_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_consent_events_for_user(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM consent_events WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def create_dsr_request(user_id: int, request_type: str, detail: str) -> dict[str, Any]:
    now = _iso(_now())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO dsr_requests (user_id, request_type, status, detail, created_on, updated_on)
            VALUES (?, ?, 'submitted', ?, ?, ?)
            """,
            (user_id, request_type, detail, now, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_dsr_requests_for_user(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM dsr_requests WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def list_dsr_requests(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    with connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM dsr_requests WHERE status = ? ORDER BY id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM dsr_requests ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [dict(row) for row in rows]


def get_dsr_request(dsr_request_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (dsr_request_id,)).fetchone()
    return dict(row) if row else None


def update_dsr_request_status(
    dsr_request_id: int,
    status: str,
    resolution_note: str,
    resolved_by_user_id: int,
) -> dict[str, Any] | None:
    now = _iso(_now())
    resolved_on = now if status in {"completed", "rejected"} else None
    with connect() as conn:
        conn.execute(
            """
            UPDATE dsr_requests
            SET status = ?, resolution_note = ?, resolved_by_user_id = ?, resolved_on = ?, updated_on = ?
            WHERE id = ?
            """,
            (status, resolution_note, resolved_by_user_id, resolved_on, now, dsr_request_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (dsr_request_id,)).fetchone()
    return dict(row) if row else None


def run_retention_job(retention_days: int, dry_run: bool = True) -> dict[str, Any]:
    cutoff = _iso(_now() - timedelta(days=retention_days))
    with connect() as conn:
        notifications = conn.execute(
            "SELECT COUNT(*) AS total FROM notifications WHERE is_read = ? AND created_on < ?",
            (_db_bool(True), cutoff),
        ).fetchone()["total"]
        audit_events = conn.execute(
            "SELECT COUNT(*) AS total FROM audit_events WHERE created_on < ?",
            (cutoff,),
        ).fetchone()["total"]
        expired_sessions = conn.execute(
            "SELECT COUNT(*) AS total FROM sessions WHERE revoked = ? AND refresh_expires_at < ?",
            (_db_bool(True), cutoff),
        ).fetchone()["total"]

        if not dry_run:
            conn.execute("DELETE FROM notifications WHERE is_read = ? AND created_on < ?", (_db_bool(True), cutoff))
            conn.execute("DELETE FROM audit_events WHERE created_on < ?", (cutoff,))
            conn.execute("DELETE FROM sessions WHERE revoked = ? AND refresh_expires_at < ?", (_db_bool(True), cutoff))
            conn.commit()

    return {
        "retention_days": retention_days,
        "dry_run": dry_run,
        "deleted_notifications": notifications,
        "deleted_audit_events": audit_events,
        "deleted_expired_sessions": expired_sessions,
        "executed_on": _iso(_now()),
    }


def build_dsr_export_bundle(dsr_request_id: int) -> dict[str, Any] | None:
    dsr_request = get_dsr_request(dsr_request_id)
    if dsr_request is None:
        return None

    user = get_user_by_id(dsr_request["user_id"])
    if user is None:
        return None

    consent_events = list_consent_events_for_user(user["id"], limit=1000)
    dsr_history = list_dsr_requests_for_user(user["id"], limit=1000)

    with connect() as conn:
        notifications_count = conn.execute(
            "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?",
            (user["id"],),
        ).fetchone()["total"]
        sessions_count = conn.execute(
            "SELECT COUNT(*) AS total FROM sessions WHERE user_id = ? AND revoked = ?",
            (user["id"], _db_bool(False)),
        ).fetchone()["total"]
        messages_sent_count = conn.execute(
            "SELECT COUNT(*) AS total FROM messages WHERE sender_user_id = ?",
            (user["id"],),
        ).fetchone()["total"]
        notes_count = conn.execute(
            "SELECT COUNT(*) AS total FROM consultation_notes WHERE author_user_id = ?",
            (user["id"],),
        ).fetchone()["total"]
        documents_count = conn.execute(
            "SELECT COUNT(*) AS total FROM documents WHERE uploaded_by_user_id = ?",
            (user["id"],),
        ).fetchone()["total"]
        kyc_documents_count = conn.execute(
            "SELECT COUNT(*) AS total FROM kyc_documents WHERE uploaded_by_user_id = ?",
            (user["id"],),
        ).fetchone()["total"]

        if user["role"] == "client":
            consultations_count = conn.execute(
                "SELECT COUNT(*) AS total FROM consultations WHERE client_user_id = ?",
                (user["id"],),
            ).fetchone()["total"]
            conversations_count = conn.execute(
                "SELECT COUNT(*) AS total FROM conversations WHERE client_user_id = ?",
                (user["id"],),
            ).fetchone()["total"]
        elif user["role"] == "lawyer":
            consultations_count = conn.execute(
                "SELECT COUNT(*) AS total FROM consultations WHERE lawyer_id = ?",
                (user.get("lawyer_id"),),
            ).fetchone()["total"]
            conversations_count = conn.execute(
                "SELECT COUNT(*) AS total FROM conversations WHERE lawyer_id = ?",
                (user.get("lawyer_id"),),
            ).fetchone()["total"]
        else:
            consultations_count = 0
            conversations_count = 0

    return {
        "dsr_request": dsr_request,
        "user_profile": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "lawyer_id": user.get("lawyer_id"),
            "created_on": user["created_on"],
        },
        "consent_events": consent_events,
        "dsr_history": dsr_history,
        "data_summary": {
            "consultations": consultations_count,
            "conversations": conversations_count,
            "messages_sent": messages_sent_count,
            "consultation_notes_authored": notes_count,
            "documents_uploaded": documents_count,
            "kyc_documents_uploaded": kyc_documents_count,
            "notifications": notifications_count,
            "active_sessions": sessions_count,
        },
        "generated_on": _iso(_now()),
    }


def execute_dsr_deletion(dsr_request_id: int, admin_user_id: int, resolution_note: str) -> dict[str, Any] | None:
    request = get_dsr_request(dsr_request_id)
    if request is None:
        return None
    if request["request_type"] != "deletion":
        raise ValueError("DSR request type must be deletion")

    user = get_user_by_id(request["user_id"])
    if user is None:
        raise ValueError("DSR target user not found")

    anonymized_email = f"deleted+{user['id']}@redacted.local"
    anonymized_name = f"Deleted User {user['id']}"
    replacement_hash = _hash_password(token_hex(16))
    now = _iso(_now())

    with connect() as conn:
        notifications_deleted = conn.execute(
            "DELETE FROM notifications WHERE user_id = ?",
            (user["id"],),
        ).rowcount
        sessions_revoked = conn.execute(
            "DELETE FROM sessions WHERE user_id = ?",
            (user["id"],),
        ).rowcount
        redacted_messages = conn.execute(
            "UPDATE messages SET body = ? WHERE sender_user_id = ?",
            ("[redacted by DSR deletion request]", user["id"]),
        ).rowcount
        redacted_notes = conn.execute(
            "UPDATE consultation_notes SET body = ?, is_private = ? WHERE author_user_id = ?",
            ("[redacted by DSR deletion request]", _db_bool(False), user["id"]),
        ).rowcount
        conn.execute(
            """
            UPDATE users
            SET email = ?, full_name = ?, password_hash = ?, lawyer_id = NULL
            WHERE id = ?
            """,
            (anonymized_email, anonymized_name, replacement_hash, user["id"]),
        )
        conn.execute(
            """
            UPDATE dsr_requests
            SET status = 'completed', resolution_note = ?, resolved_by_user_id = ?, resolved_on = ?, updated_on = ?
            WHERE id = ?
            """,
            (resolution_note, admin_user_id, now, now, dsr_request_id),
        )
        conn.commit()

    return {
        "dsr_request_id": dsr_request_id,
        "user_id": user["id"],
        "status": "completed",
        "anonymized_email": anonymized_email,
        "redacted_messages": redacted_messages,
        "redacted_notes": redacted_notes,
        "deleted_notifications": notifications_deleted,
        "revoked_sessions": sessions_revoked,
        "executed_on": now,
    }


def create_dsr_correction_request(
    user_id: int,
    field_name: str,
    requested_value: str,
    justification: str,
    evidence: str | None,
) -> dict[str, Any]:
    user = get_user_by_id(user_id)
    if user is None:
        raise ValueError("User not found")
    if field_name not in {"full_name", "email"}:
        raise ValueError("Unsupported correction field")

    current_value = user[field_name]
    dsr_detail = f"Correction request for field '{field_name}'"
    now = _iso(_now())

    with connect() as conn:
        dsr_cursor = conn.execute(
            """
            INSERT INTO dsr_requests (user_id, request_type, status, detail, created_on, updated_on)
            VALUES (?, 'correction', 'submitted', ?, ?, ?)
            """,
            (user_id, dsr_detail, now, now),
        )
        dsr_request_id = dsr_cursor.lastrowid
        correction_cursor = conn.execute(
            """
            INSERT INTO dsr_corrections (
                dsr_request_id, user_id, field_name, current_value, requested_value,
                justification, evidence, status, created_on, updated_on
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
            """,
            (
                dsr_request_id,
                user_id,
                field_name,
                current_value,
                requested_value,
                justification,
                evidence,
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (correction_cursor.lastrowid,)).fetchone()
    return dict(row)


def list_dsr_corrections_for_user(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM dsr_corrections WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def list_dsr_corrections(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    with connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM dsr_corrections WHERE status = ? ORDER BY id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM dsr_corrections ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [dict(row) for row in rows]


def get_dsr_correction(correction_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (correction_id,)).fetchone()
    return dict(row) if row else None


def review_dsr_correction(
    correction_id: int,
    status: str,
    review_note: str,
    reviewed_by_user_id: int,
) -> dict[str, Any] | None:
    if status not in {"approved", "rejected"}:
        raise ValueError("Invalid review status")

    correction = get_dsr_correction(correction_id)
    if correction is None:
        return None
    if correction["status"] != "submitted":
        raise ValueError("Correction request has already been reviewed")

    now = _iso(_now())
    with connect() as conn:
        if status == "approved":
            if correction["field_name"] == "email":
                existing = conn.execute(
                    "SELECT id FROM users WHERE email = ? AND id != ?",
                    (correction["requested_value"].lower(), correction["user_id"]),
                ).fetchone()
                if existing is not None:
                    raise ValueError("Requested email is already in use")
                conn.execute(
                    "UPDATE users SET email = ? WHERE id = ?",
                    (correction["requested_value"].lower(), correction["user_id"]),
                )
            else:
                conn.execute(
                    "UPDATE users SET full_name = ? WHERE id = ?",
                    (correction["requested_value"], correction["user_id"]),
                )

        conn.execute(
            """
            UPDATE dsr_corrections
            SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_on = ?, updated_on = ?
            WHERE id = ?
            """,
            (status, review_note, reviewed_by_user_id, now, now, correction_id),
        )
        dsr_status = "completed" if status == "approved" else "rejected"
        conn.execute(
            """
            UPDATE dsr_requests
            SET status = ?, resolution_note = ?, resolved_by_user_id = ?, resolved_on = ?, updated_on = ?
            WHERE id = ?
            """,
            (dsr_status, review_note, reviewed_by_user_id, now, now, correction["dsr_request_id"]),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (correction_id,)).fetchone()
    return dict(row) if row else None


def create_breach_incident(
    title: str,
    severity: str,
    description: str,
    impact_summary: str | None,
    affected_data_types: str | None,
    affected_records: int | None,
    occurred_on: str | None,
    detected_on: str,
    actor_user_id: int,
) -> dict[str, Any]:
    now = _iso(_now())
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO breach_incidents (
                title, severity, status, description, impact_summary, affected_data_types,
                affected_records, occurred_on, detected_on, escalation_triggered,
                created_by_user_id, updated_by_user_id, created_on, updated_on
            )
            VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                severity,
                description,
                impact_summary,
                affected_data_types,
                affected_records,
                occurred_on,
                detected_on,
                False,
                actor_user_id,
                actor_user_id,
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_breach_incidents(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    with connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM breach_incidents WHERE status = ? ORDER BY id DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM breach_incidents ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [dict(row) for row in rows]


def get_breach_incident(breach_incident_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (breach_incident_id,)).fetchone()
    return dict(row) if row else None


def update_breach_incident(
    breach_incident_id: int,
    actor_user_id: int,
    status: str,
    impact_summary: str | None,
    affected_records: int | None,
    reported_to_ndpc: bool | None,
    ndpc_reported_on: str | None,
    contained_on: str | None,
    resolved_on: str | None,
    resolution_note: str | None,
) -> dict[str, Any] | None:
    now = _iso(_now())
    with connect() as conn:
        existing = conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (breach_incident_id,)).fetchone()
        if existing is None:
            return None
        incident = dict(existing)

        next_impact_summary = impact_summary if impact_summary is not None else incident.get("impact_summary")
        next_affected_records = affected_records if affected_records is not None else incident.get("affected_records")
        next_reported_to_ndpc = _db_bool(reported_to_ndpc) if reported_to_ndpc is not None else incident.get("reported_to_ndpc")
        next_ndpc_reported_on = ndpc_reported_on if ndpc_reported_on is not None else incident.get("ndpc_reported_on")
        next_contained_on = contained_on if contained_on is not None else incident.get("contained_on")
        next_resolved_on = resolved_on if resolved_on is not None else incident.get("resolved_on")
        next_resolution_note = resolution_note if resolution_note is not None else incident.get("resolution_note")

        conn.execute(
            """
            UPDATE breach_incidents
            SET status = ?, impact_summary = ?, affected_records = ?, reported_to_ndpc = ?,
                ndpc_reported_on = ?, contained_on = ?, resolved_on = ?, resolution_note = ?,
                updated_by_user_id = ?, updated_on = ?
            WHERE id = ?
            """,
            (
                status,
                next_impact_summary,
                next_affected_records,
                next_reported_to_ndpc,
                next_ndpc_reported_on,
                next_contained_on,
                next_resolved_on,
                next_resolution_note,
                actor_user_id,
                now,
                breach_incident_id,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (breach_incident_id,)).fetchone()
    return dict(row) if row else None


def check_breach_sla_status(breach_incident_id: int) -> dict[str, Any] | None:
    """Check SLA status for a breach incident (NDPA 72-hour notification deadline).
    
    Returns SLA status info including days until deadline and escalation state.
    """
    from datetime import datetime, timedelta
    
    with connect() as conn:
        breach = conn.execute(
            "SELECT * FROM breach_incidents WHERE id = ?",
            (breach_incident_id,)
        ).fetchone()
    
    if not breach:
        return None
    
    breach_dict = dict(breach)
    now = datetime.utcnow()
    
    # Calculate notification deadline if not already set (72 hours from detection)
    if breach_dict["notification_deadline"] is None:
        detected_on = datetime.fromisoformat(breach_dict["detected_on"])
        deadline = detected_on + timedelta(hours=72)
        breach_dict["notification_deadline"] = deadline.isoformat()
        with connect() as conn:
            conn.execute(
                "UPDATE breach_incidents SET notification_deadline = ? WHERE id = ?",
                (deadline.isoformat(), breach_incident_id)
            )
            conn.commit()
    else:
        deadline = datetime.fromisoformat(breach_dict["notification_deadline"])
    
    # Calculate days remaining
    time_remaining = deadline - now
    days_remaining = int(time_remaining.total_seconds() / 86400)
    breach_dict["days_until_deadline"] = days_remaining
    
    # Determine SLA status
    if breach_dict["reported_to_ndpc"]:
        sla_status = "notified"
    elif days_remaining < 0:
        sla_status = "overdue"
    elif days_remaining <= 1:
        sla_status = "at-risk"
    else:
        sla_status = "on-track"
    
    breach_dict["sla_status"] = sla_status
    
    return breach_dict


def list_breach_incidents_by_sla_status(sla_status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    """List breach incidents filtered by SLA status (on-track, at-risk, overdue, notified).
    
    Orders by notification deadline ascending (soonest first).
    """
    from datetime import datetime, timedelta
    
    with connect() as conn:
        rows = conn.execute(
            """SELECT * FROM breach_incidents 
               WHERE status NOT IN ('resolved')
               ORDER BY detected_on DESC
               LIMIT ?""",
            (limit,)
        ).fetchall()
    
    breaches = [dict(row) for row in rows]
    now = datetime.utcnow()
    
    # Enrich with SLA status and filter if requested
    enriched = []
    for breach in breaches:
        # Calculate deadline if not already set
        if not breach.get("notification_deadline"):
            detected_on = datetime.fromisoformat(breach["detected_on"])
            deadline = detected_on + timedelta(hours=72)
            breach["notification_deadline"] = deadline.isoformat()
            with connect() as conn:
                conn.execute(
                    "UPDATE breach_incidents SET notification_deadline = ? WHERE id = ?",
                    (deadline.isoformat(), breach["id"])
                )
                conn.commit()
        else:
            # Handle both string and datetime object from DB
            deadline_val = breach["notification_deadline"]
            if isinstance(deadline_val, str):
                deadline = datetime.fromisoformat(deadline_val)
            else:
                deadline = deadline_val
        
        # Calculate days remaining
        time_remaining = deadline - now
        days_remaining = int(time_remaining.total_seconds() / 86400)
        breach["days_until_deadline"] = days_remaining
        
        # Determine SLA status
        if breach["reported_to_ndpc"]:
            breach["sla_status"] = "notified"
        elif days_remaining < 0:
            breach["sla_status"] = "overdue"
        elif days_remaining <= 1:
            breach["sla_status"] = "at-risk"
        else:
            breach["sla_status"] = "on-track"
        
        if sla_status is None or breach.get("sla_status") == sla_status:
            enriched.append(breach)
    
    # Sort by deadline ascending (soonest first)
    enriched.sort(key=lambda b: b.get("notification_deadline", ""), reverse=False)
    
    return enriched


def trigger_breach_escalation(breach_incident_id: int, actor_user_id: int) -> dict[str, Any] | None:
    """Trigger escalation alert for a breach incident.
    
    Sets escalation_triggered flag and logs timestamp. Called when SLA deadline
    is imminent or overdue.
    """
    from datetime import datetime
    
    now = datetime.utcnow().isoformat()
    
    with connect() as conn:
        conn.execute(
            """UPDATE breach_incidents 
               SET escalation_triggered = true, escalation_triggered_at = ?, updated_by_user_id = ?, updated_on = ?
               WHERE id = ? AND escalation_triggered = false""",
            (now, actor_user_id, now, breach_incident_id)
        )
        conn.commit()
        
        # Log as audit event
        create_audit_event(
            actor_user_id=actor_user_id,
            action="breach_escalation_triggered",
            resource_type="breach_incident",
            resource_id=str(breach_incident_id),
            detail=f"Breach SLA escalation triggered at {now}",
        )
        
        row = conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (breach_incident_id,)).fetchone()
    
    return dict(row) if row else None


# ===== PRACTICE SEAL & APL/CPD MANAGEMENT =====

def upsert_practice_seal(
    lawyer_id: str,
    practice_year: int,
    bpf_paid: bool = False,
    bpf_paid_date: str | None = None,
    cpd_points: int = 0,
    seal_file_key: str | None = None,
    seal_mime_type: str | None = None,
    source: str = "manual",
    source_ref: str | None = None,
    verified_by_user_id: int | None = None,
    verification_notes: str | None = None,
) -> dict[str, Any]:
    """
    Upsert lawyer's annual practice seal record (APL/CPD compliance tracking).
    
    Creates or updates seal for given year. Automatically computes:
    - cpd_compliant = bpf_paid AND cpd_points >= 5
    - aplineligible = bpf_paid (Annual Practising List)
    - seal_expires_at = 12/31 of practice_year (31 Dec)
    
    Logs seal_events audit record for verification trail.
    """
    now = datetime.now(UTC).isoformat()
    verified_on = datetime.now(UTC).date().isoformat() if verified_by_user_id else None
    
    # Compute derived fields
    cpd_threshold = 5
    cpd_compliant = bpf_paid and cpd_points >= cpd_threshold
    aplineligible = bpf_paid
    
    # Seal expires 31 Dec of practice year
    seal_expires_at = f"{practice_year}-12-31"
    
    with connect() as conn:
        # Check if record exists
        existing = conn.execute(
            "SELECT id FROM lawyer_practice_seals WHERE lawyer_id = ? AND practice_year = ?",
            (lawyer_id, practice_year)
        ).fetchone()
        
        if existing:
            # Update existing
            conn.execute(
                """UPDATE lawyer_practice_seals 
                   SET bpf_paid = ?, bpf_paid_date = ?, cpd_points = ?, cpd_compliant = ?, aplineligible = ?,
                       seal_file_key = ?, seal_mime_type = ?, source = ?, source_ref = ?,
                       verified_by_user_id = ?, verified_on = ?, verification_notes = ?, updated_on = ?
                   WHERE lawyer_id = ? AND practice_year = ?""",
                (bpf_paid, bpf_paid_date, cpd_points, cpd_compliant, aplineligible,
                 seal_file_key, seal_mime_type, source, source_ref,
                 verified_by_user_id, verified_on, verification_notes, now,
                 lawyer_id, practice_year)
            )
        else:
            # Insert new
            conn.execute(
                """INSERT INTO lawyer_practice_seals 
                   (lawyer_id, practice_year, bpf_paid, bpf_paid_date, cpd_points, cpd_threshold,
                    cpd_compliant, aplineligible, seal_file_key, seal_mime_type, seal_expires_at,
                    source, source_ref, verified_by_user_id, verified_on, verification_notes,
                    created_on, updated_on)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (lawyer_id, practice_year, bpf_paid, bpf_paid_date, cpd_points, cpd_threshold,
                 cpd_compliant, aplineligible, seal_file_key, seal_mime_type, seal_expires_at,
                 source, source_ref, verified_by_user_id, verified_on, verification_notes,
                 now, now)
            )
        
        # Update lawyers table with latest seal info
        conn.execute(
            """UPDATE lawyers SET latest_seal_year = ?, latest_seal_expires_at = ?, seal_badge_visible = ?
               WHERE id = ?""",
            (practice_year, seal_expires_at, cpd_compliant, lawyer_id)
        )
        
        # Log seal event
        action = "seal_updated" if existing else "seal_uploaded"
        conn.execute(
            """INSERT INTO seal_events (lawyer_id, practice_year, action, actor_user_id, detail, created_on)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (lawyer_id, practice_year, action, verified_by_user_id,
             f"Seal {action}: BPF paid={bpf_paid}, CPD points={cpd_points}, compliant={cpd_compliant}",
             now)
        )
        
        conn.commit()
        
        # Fetch and return updated record
        row = conn.execute(
            "SELECT * FROM lawyer_practice_seals WHERE lawyer_id = ? AND practice_year = ?",
            (lawyer_id, practice_year)
        ).fetchone()
    
    return dict(row) if row else {}


def get_practice_seal(lawyer_id: str, practice_year: int) -> dict[str, Any] | None:
    """Get practice seal record for lawyer in specific year."""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM lawyer_practice_seals WHERE lawyer_id = ? AND practice_year = ?",
            (lawyer_id, practice_year)
        ).fetchone()
    return dict(row) if row else None


def get_latest_practice_seal(lawyer_id: str) -> dict[str, Any] | None:
    """Get lawyer's most recent practice seal (current year or latest available)."""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM lawyer_practice_seals WHERE lawyer_id = ? ORDER BY practice_year DESC LIMIT 1",
            (lawyer_id,)
        ).fetchone()
    return dict(row) if row else None


def list_compliant_lawyers(practice_year: int, limit: int = 500) -> list[dict[str, Any]]:
    """
    List lawyers with valid CPD-compliant seals for given year.
    
    Returns lawyers with:
    - bpf_paid = true
    - cpd_points >= 5
    - seal_expires_at >= today
    """
    today = datetime.now(UTC).date().isoformat()
    
    with connect() as conn:
        rows = conn.execute(
            """SELECT lps.*, l.full_name, l.state, l.rating
               FROM lawyer_practice_seals lps
               JOIN lawyers l ON lps.lawyer_id = l.id
               WHERE lps.practice_year = ? AND lps.cpd_compliant = true 
                     AND lps.seal_expires_at >= ?
               ORDER BY l.rating DESC
               LIMIT ?""",
            (practice_year, today, limit)
        ).fetchall()
    return [dict(row) for row in rows]


def list_seal_events(lawyer_id: str, practice_year: int | None = None, limit: int = 100) -> list[dict[str, Any]]:
    """Get audit trail of seal operations for lawyer."""
    if practice_year:
        query = """SELECT * FROM seal_events 
                   WHERE lawyer_id = ? AND practice_year = ? 
                   ORDER BY created_on DESC LIMIT ?"""
        params = (lawyer_id, practice_year, limit)
    else:
        query = """SELECT * FROM seal_events 
                   WHERE lawyer_id = ? 
                   ORDER BY created_on DESC LIMIT ?"""
        params = (lawyer_id, limit)
    
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def get_lawyer_user_ids(lawyer_id: str) -> list[int]:
    lawyer = get_lawyer(lawyer_id)
    if lawyer is None:
        return []
    with connect() as conn:
        rows = conn.execute(
            "SELECT id FROM users WHERE lawyer_id = ? AND role = 'lawyer'",
            (lawyer_id,),
        ).fetchall()
    return [row["id"] for row in rows]


def list_consultation_participant_user_ids(consultation_id: int) -> list[int]:
    consultation = get_consultation(consultation_id)
    if consultation is None:
        return []
    participant_ids = [consultation["client_user_id"], *get_lawyer_user_ids(consultation["lawyer_id"])]
    return list(dict.fromkeys(participant_ids))


def list_conversation_participant_user_ids(conversation_id: int) -> list[int]:
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return []
    participant_ids = [conversation["client_user_id"], *get_lawyer_user_ids(conversation["lawyer_id"])]
    return list(dict.fromkeys(participant_ids))
def create_milestone(consultation_id: int, event_name: str, status_label: str | None = None, description: str | None = None) -> dict:
    with connect() as conn:
        now = datetime.now(UTC).isoformat()
        cursor = conn.execute(
            "INSERT INTO consultation_milestones (consultation_id, event_name, status_label, description, created_on) VALUES (?, ?, ?, ?, ?)",
            (consultation_id, event_name, status_label, description, now),
        )
        mid = cursor.lastrowid
        return {
            "id": mid,
            "consultation_id": consultation_id,
            "event_name": event_name,
            "status_label": status_label,
            "description": description,
            "created_on": now,
        }


def list_milestones(consultation_id: int) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM consultation_milestones WHERE consultation_id = ? ORDER BY created_on ASC",
            (consultation_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def create_consultation_note(consultation_id: int, author_user_id: int, body: str, is_private: bool = False) -> dict:
    with connect() as conn:
        now = datetime.now(UTC).isoformat()
        cursor = conn.execute(
            "INSERT INTO consultation_notes (consultation_id, author_user_id, body, is_private, created_on) VALUES (?, ?, ?, ?, ?)",
            (consultation_id, author_user_id, body, _db_bool(is_private), now),
        )
        nid = cursor.lastrowid
        return {
            "id": nid,
            "consultation_id": consultation_id,
            "author_user_id": author_user_id,
            "body": body,
            "is_private": is_private,
            "created_on": now,
        }


def list_consultation_notes(consultation_id: int, user_id: int | None = None, lawyer_id: str | None = None) -> list[dict]:
    # If lawyer_id is provided, they see everything. If not, only non-private ones or those they authored.
    with connect() as conn:
        if lawyer_id:
            rows = conn.execute(
                "SELECT * FROM consultation_notes WHERE consultation_id = ? ORDER BY created_on DESC",
                (consultation_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM consultation_notes WHERE consultation_id = ? AND (is_private = ? OR author_user_id = ?) ORDER BY created_on DESC",
                (consultation_id, _db_bool(False), user_id),
            ).fetchall()
        return [dict(row) for row in rows]
