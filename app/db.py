from __future__ import annotations

import os
import sqlite3
from hashlib import sha256
from secrets import token_hex
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from app.complaints import apply_open_complaint_trigger, apply_resolution_trigger, complaint_severity
from app.data import SEED_LAWYERS
from app.models import ComplaintCategory, Lawyer


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("APP_DB_PATH", str(BASE_DIR / "legal_mvp.db")))
UPLOADS_DIR = Path(os.getenv("APP_UPLOADS_DIR", str(BASE_DIR / "storage" / "uploads")))
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "60"))
REFRESH_TOKEN_TTL_DAYS = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS lawyers (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                state TEXT NOT NULL,
                practice_areas TEXT NOT NULL,
                years_called INTEGER NOT NULL,
                nin_verified INTEGER NOT NULL,
                nba_verified INTEGER NOT NULL,
                bvn_verified INTEGER NOT NULL,
                profile_completeness INTEGER NOT NULL,
                completed_matters INTEGER NOT NULL,
                rating REAL NOT NULL,
                response_rate INTEGER NOT NULL,
                avg_response_hours REAL NOT NULL,
                repeat_client_rate INTEGER NOT NULL,
                base_consult_fee_ngn INTEGER NOT NULL,
                active_complaints INTEGER NOT NULL,
                severe_flag INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lawyer_id TEXT NOT NULL,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT NOT NULL,
                created_on TEXT NOT NULL,
                resolved_on TEXT,
                resolution_note TEXT,
                FOREIGN KEY(lawyer_id) REFERENCES lawyers(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL,
                created_on TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                access_token TEXT PRIMARY KEY,
                refresh_token TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                created_on TEXT NOT NULL,
                access_expires_at TEXT NOT NULL,
                refresh_expires_at TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS kyc_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lawyer_id TEXT NOT NULL,
                nin_verified INTEGER NOT NULL,
                nba_verified INTEGER NOT NULL,
                bvn_verified INTEGER NOT NULL,
                note TEXT NOT NULL,
                updated_on TEXT NOT NULL,
                FOREIGN KEY(lawyer_id) REFERENCES lawyers(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_user_id INTEGER NOT NULL,
                lawyer_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_on TEXT NOT NULL,
                FOREIGN KEY(client_user_id) REFERENCES users(id),
                FOREIGN KEY(lawyer_id) REFERENCES lawyers(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                sender_user_id INTEGER NOT NULL,
                body TEXT NOT NULL,
                created_on TEXT NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id),
                FOREIGN KEY(sender_user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS consultations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_user_id INTEGER NOT NULL,
                lawyer_id TEXT NOT NULL,
                scheduled_for TEXT NOT NULL,
                summary TEXT NOT NULL,
                status TEXT NOT NULL,
                created_on TEXT NOT NULL,
                FOREIGN KEY(client_user_id) REFERENCES users(id),
                FOREIGN KEY(lawyer_id) REFERENCES lawyers(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                consultation_id INTEGER NOT NULL,
                reference TEXT UNIQUE NOT NULL,
                provider TEXT NOT NULL,
                amount_ngn INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_on TEXT NOT NULL,
                access_code TEXT,
                authorization_url TEXT,
                gateway_status TEXT,
                paid_on TEXT,
                released_on TEXT,
                FOREIGN KEY(consultation_id) REFERENCES consultations(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                consultation_id INTEGER NOT NULL,
                uploaded_by_user_id INTEGER NOT NULL,
                document_label TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                storage_key TEXT UNIQUE NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_on TEXT NOT NULL,
                FOREIGN KEY(consultation_id) REFERENCES consultations(id),
                FOREIGN KEY(uploaded_by_user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                detail TEXT NOT NULL,
                created_on TEXT NOT NULL,
                FOREIGN KEY(actor_user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_on TEXT NOT NULL,
                read_on TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()
    _ensure_sessions_schema()
    _ensure_payments_schema()


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _ensure_sessions_schema() -> None:
    with connect() as conn:
        rows = conn.execute("PRAGMA table_info(sessions)").fetchall()
        columns = {row["name"] for row in rows}
        if not columns:
            return

        if "access_token" not in columns and "token" in columns:
            conn.execute("ALTER TABLE sessions RENAME TO sessions_legacy")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    access_token TEXT PRIMARY KEY,
                    refresh_token TEXT UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_on TEXT NOT NULL,
                    access_expires_at TEXT NOT NULL,
                    refresh_expires_at TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
            now = _now()
            access_exp = _iso(now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES))
            refresh_exp = _iso(now + timedelta(days=REFRESH_TOKEN_TTL_DAYS))
            legacy_rows = conn.execute("SELECT * FROM sessions_legacy").fetchall()
            for row in legacy_rows:
                conn.execute(
                    """
                    INSERT INTO sessions (access_token, refresh_token, user_id, created_on, access_expires_at, refresh_expires_at, revoked)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                    """,
                    (
                        row["token"],
                        token_hex(24),
                        row["user_id"],
                        row["created_on"],
                        access_exp,
                        refresh_exp,
                    ),
                )
            conn.execute("DROP TABLE sessions_legacy")
            conn.commit()
            return

        alter_statements = []
        if "refresh_token" not in columns:
            alter_statements.append("ALTER TABLE sessions ADD COLUMN refresh_token TEXT")
        if "access_expires_at" not in columns:
            alter_statements.append("ALTER TABLE sessions ADD COLUMN access_expires_at TEXT")
        if "refresh_expires_at" not in columns:
            alter_statements.append("ALTER TABLE sessions ADD COLUMN refresh_expires_at TEXT")
        if "revoked" not in columns:
            alter_statements.append("ALTER TABLE sessions ADD COLUMN revoked INTEGER NOT NULL DEFAULT 0")

        for statement in alter_statements:
            conn.execute(statement)

        if alter_statements:
            now = _now()
            conn.execute(
                "UPDATE sessions SET refresh_token = COALESCE(refresh_token, ?) WHERE refresh_token IS NULL",
                (token_hex(24),),
            )
            conn.execute(
                "UPDATE sessions SET access_expires_at = COALESCE(access_expires_at, ?) WHERE access_expires_at IS NULL",
                (_iso(now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)),),
            )
            conn.execute(
                "UPDATE sessions SET refresh_expires_at = COALESCE(refresh_expires_at, ?) WHERE refresh_expires_at IS NULL",
                (_iso(now + timedelta(days=REFRESH_TOKEN_TTL_DAYS)),),
            )
            conn.commit()


def _ensure_payments_schema() -> None:
    with connect() as conn:
        rows = conn.execute("PRAGMA table_info(payments)").fetchall()
        columns = {row["name"] for row in rows}
        if not columns:
            return

        alter_statements = []
        if "access_code" not in columns:
            alter_statements.append("ALTER TABLE payments ADD COLUMN access_code TEXT")
        if "authorization_url" not in columns:
            alter_statements.append("ALTER TABLE payments ADD COLUMN authorization_url TEXT")
        if "gateway_status" not in columns:
            alter_statements.append("ALTER TABLE payments ADD COLUMN gateway_status TEXT")
        if "paid_on" not in columns:
            alter_statements.append("ALTER TABLE payments ADD COLUMN paid_on TEXT")

        for statement in alter_statements:
            conn.execute(statement)
        if alter_statements:
            conn.commit()


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
                    avg_response_hours, repeat_client_rate, base_consult_fee_ngn, active_complaints, severe_flag
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lawyer.id,
                    lawyer.full_name,
                    lawyer.state,
                    _serialize_practice_areas(lawyer.practice_areas),
                    lawyer.years_called,
                    int(lawyer.nin_verified),
                    int(lawyer.nba_verified),
                    int(lawyer.bvn_verified),
                    lawyer.profile_completeness,
                    lawyer.completed_matters,
                    lawyer.rating,
                    lawyer.response_rate,
                    lawyer.avg_response_hours,
                    lawyer.repeat_client_rate,
                    lawyer.base_consult_fee_ngn,
                    lawyer.active_complaints,
                    int(lawyer.severe_flag),
                ),
            )
        conn.commit()


def seed_users_if_empty() -> None:
    with connect() as conn:
        count = conn.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if count > 0:
            return

        admin_hash = sha256("AdminPass123!".encode("utf-8")).hexdigest()
        conn.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, created_on)
            VALUES (?, ?, ?, 'admin', ?)
            """,
            ("admin@legalmvp.local", admin_hash, "Platform Admin", str(date.today())),
        )
        conn.commit()


def row_to_lawyer(row: sqlite3.Row) -> Lawyer:
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
                severe_flag = ?
            WHERE id = ?
            """,
            (
                lawyer.full_name,
                lawyer.state,
                _serialize_practice_areas(lawyer.practice_areas),
                lawyer.years_called,
                int(lawyer.nin_verified),
                int(lawyer.nba_verified),
                int(lawyer.bvn_verified),
                lawyer.profile_completeness,
                lawyer.completed_matters,
                lawyer.rating,
                lawyer.response_rate,
                lawyer.avg_response_hours,
                lawyer.repeat_client_rate,
                lawyer.base_consult_fee_ngn,
                lawyer.active_complaints,
                int(lawyer.severe_flag),
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
        conn.execute("DELETE FROM notifications")
        conn.execute("DELETE FROM audit_events")
        conn.execute("DELETE FROM documents")
        conn.execute("DELETE FROM payments")
        conn.execute("DELETE FROM consultations")
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM conversations")
        conn.execute("DELETE FROM complaints")
        conn.execute("DELETE FROM sessions")
        conn.execute("DELETE FROM users")
        conn.execute("DELETE FROM kyc_events")
        conn.execute("DELETE FROM lawyers")
        conn.commit()
    seed_lawyers_if_empty()
    seed_users_if_empty()


def _hash_password(password: str) -> str:
    return sha256(password.encode("utf-8")).hexdigest()


def create_user(email: str, password: str, full_name: str, role: str) -> dict[str, Any] | None:
    try:
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO users (email, password_hash, full_name, role, created_on)
                VALUES (?, ?, ?, ?, ?)
                """,
                (email.lower(), _hash_password(password), full_name, role, str(date.today())),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return dict(row) if row else None
    except sqlite3.IntegrityError:
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
            ) VALUES (?, ?, ?, ?, ?, ?, 0)
            """,
            (access_token, refresh_token, user_id, _iso(created_on), access_expires_at, refresh_expires_at),
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
    if user["password_hash"] != _hash_password(password):
        return None

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
            SELECT users.id, users.email, users.full_name, users.role
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.access_token = ?
              AND sessions.revoked = 0
              AND sessions.access_expires_at > ?
            """,
            (access_token, now),
        ).fetchone()
    return dict(row) if row else None


def refresh_session(refresh_token: str) -> dict[str, Any] | None:
    now = _now()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT sessions.user_id, users.email, users.full_name, users.role, sessions.revoked, sessions.refresh_expires_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.refresh_token = ?
            """,
            (refresh_token,),
        ).fetchone()
        if row is None:
            return None
        if row["revoked"] == 1 or _parse(row["refresh_expires_at"]) <= now:
            return None

        conn.execute("UPDATE sessions SET revoked = 1 WHERE refresh_token = ?", (refresh_token,))
        conn.commit()

    token_bundle = _create_session(row["user_id"])
    return {
        "id": row["user_id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        **token_bundle,
    }


def revoke_session(access_token: str | None = None, refresh_token: str | None = None) -> bool:
    if not access_token and not refresh_token:
        return False
    with connect() as conn:
        if access_token and refresh_token:
            result = conn.execute(
                """
                UPDATE sessions SET revoked = 1
                WHERE access_token = ? OR refresh_token = ?
                """,
                (access_token, refresh_token),
            )
        elif access_token:
            result = conn.execute("UPDATE sessions SET revoked = 1 WHERE access_token = ?", (access_token,))
        else:
            result = conn.execute("UPDATE sessions SET revoked = 1 WHERE refresh_token = ?", (refresh_token,))
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
                int(lawyer.nin_verified),
                int(lawyer.nba_verified),
                int(lawyer.bvn_verified),
                note,
                str(date.today()),
            ),
        )
        conn.commit()

    return {
        "lawyer_id": lawyer.id,
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
            "nin_verified": lawyer.nin_verified,
            "nba_verified": lawyer.nba_verified,
            "bvn_verified": lawyer.bvn_verified,
            "note": "No KYC update history yet",
            "updated_on": str(date.today()),
        }
    data = dict(row)
    return {
        "lawyer_id": data["lawyer_id"],
        "nin_verified": bool(data["nin_verified"]),
        "nba_verified": bool(data["nba_verified"]),
        "bvn_verified": bool(data["bvn_verified"]),
        "note": data["note"],
        "updated_on": data["updated_on"],
    }


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


def user_can_access_conversation(user: dict[str, Any], conversation_id: int) -> bool:
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return False
    if user["role"] == "admin":
        return True
    if user["role"] == "client":
        return conversation["client_user_id"] == user["id"]
    if user["role"] == "lawyer":
        lawyer = conn_user_lawyer_map(user["full_name"])
        return lawyer is not None and lawyer["id"] == conversation["lawyer_id"]
    return False


def conn_user_lawyer_map(full_name: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM lawyers WHERE full_name = ?", (full_name,)).fetchone()
    return dict(row) if row else None


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


def user_can_access_consultation(user: dict[str, Any], consultation_id: int) -> bool:
    consultation = get_consultation(consultation_id)
    if consultation is None:
        return False
    if user["role"] == "admin":
        return True
    if user["role"] == "client":
        return consultation["client_user_id"] == user["id"]
    if user["role"] == "lawyer":
        lawyer = conn_user_lawyer_map(user["full_name"])
        return lawyer is not None and lawyer["id"] == consultation["lawyer_id"]
    return False


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
            "UPDATE notifications SET is_read = 1, read_on = ? WHERE id = ? AND user_id = ?",
            (read_on, notification_id, user_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, user_id),
        ).fetchone()
    return dict(row) if row else None


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
            "SELECT id FROM users WHERE full_name = ? AND role = 'lawyer'",
            (lawyer.full_name,),
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
