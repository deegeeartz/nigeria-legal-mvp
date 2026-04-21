"""Backward-compatible persistence module.

All shared infrastructure lives in app.repos.connection.
Logic is distributed across domain repositories in app.repos.*.
"""
from __future__ import annotations

import asyncio

# Re-export shared infrastructure
from app.repos.connection import (  # noqa: F401
    ASYNC_ENGINE as ENGINE,
    UPLOADS_DIR,
    ACCESS_TOKEN_TTL_MINUTES,
    REFRESH_TOKEN_TTL_DAYS,
    PASSWORD_HASH_ITERATIONS,
    QueryResultAdapter,
    AsyncPostgresConnectionAdapter,
    _convert_qmark_sql,
    _db_bool,
    connect,
    init_db,
    _now,
    _iso,
    _parse,
    _serialize_practice_areas,
    _deserialize_practice_areas,
    _hash_password,
    _verify_password,
)

# Re-export domain logic from specialized repositories
from app.repos.auth import (  # noqa: F401
    create_user,
    seed_users_if_empty,
    authenticate_user,
    create_session_for_user,
    get_user_by_access_token,
    refresh_session,
    revoke_session,
    force_expire_access_token_for_tests,
    get_lawyer_user_ids,
    get_user_by_id,
)
from app.repos.lawyers import (  # noqa: F401
    row_to_lawyer,
    seed_lawyers_if_empty,
    list_lawyers,
    get_lawyer,
    save_lawyer,
)
from app.repos.complaints import (  # noqa: F401
    create_complaint,
    list_complaints_for_lawyer,
    resolve_complaint,
)
from app.repos.kyc import (  # noqa: F401
    upsert_kyc_status,
    get_latest_kyc_status,
    list_pending_kyc_submissions,
    create_kyc_document,
    get_kyc_document,
    get_kyc_document_file_path,
)
from app.repos.conversations import (  # noqa: F401
    create_conversation,
    get_conversation,
    create_message,
    list_messages,
    list_conversations_for_user,
    user_can_access_conversation,
    list_conversation_participant_user_ids,
)
from app.repos.consultations import (  # noqa: F401
    create_consultation,
    get_consultation,
    list_consultations_for_user,
    user_can_access_consultation,
    update_consultation_status,
    list_consultation_participant_user_ids,
    create_milestone,
    list_milestones,
    create_consultation_note,
    list_consultation_notes,
)
from app.repos.payments import (  # noqa: F401
    create_payment,
    get_payment,
    get_payment_by_reference,
    update_payment_status,
    verify_paystack_payment,
)
from app.repos.compliance import (  # noqa: F401
    log_consent_event,
    list_consent_history,
    create_consent_event,
    list_consent_events_for_user,
    create_dsr_request,
    list_dsr_requests,
    list_dsr_requests_for_user,
    update_dsr_request_status,
    create_dsr_correction_request,
    list_dsr_corrections,
    list_dsr_corrections_for_user,
    review_dsr_correction,
    create_breach_incident,
    get_breach_incident,
    list_breach_incidents,
    list_breach_incidents_by_sla_status,
    check_breach_sla_status,
    trigger_breach_escalation,
    update_breach_incident,
    run_retention_job,
    build_dsr_export_bundle,
    execute_dsr_deletion,
    upsert_practice_seal,
    get_practice_seal as _get_practice_seal_async,
    get_latest_practice_seal,
    list_compliant_lawyers,
    list_seal_events,
)
from app.repos.admin import (  # noqa: F401
    log_audit_event,
    list_audit_events,
    create_notification,
    list_notifications as list_notifications_for_user,
    mark_notification_read,
)
from app.repos.documents import (  # noqa: F401
    create_document,
    list_documents_for_consultation,
    get_document,
    get_document_file_path,
    user_can_access_document,
)


def get_practice_seal(lawyer_id: str, practice_year: int) -> dict | None:
    """Sync wrapper so tests can call this without await."""
    return asyncio.run(_get_practice_seal_async(lawyer_id, practice_year))


async def reset_db_for_tests() -> None:
    await ENGINE.dispose()
    await init_db()
    for file_path in UPLOADS_DIR.glob("*"):
        if file_path.is_file():
            file_path.unlink()
    async with connect() as conn:
        await conn.execute("DELETE FROM breach_incidents")
        await conn.execute("DELETE FROM dsr_corrections")
        await conn.execute("DELETE FROM dsr_requests")
        await conn.execute("DELETE FROM consent_events")
        await conn.execute("DELETE FROM notifications")
        await conn.execute("DELETE FROM audit_events")
        await conn.execute("DELETE FROM documents")
        await conn.execute("DELETE FROM payments")
        await conn.execute("DELETE FROM consultations")
        await conn.execute("DELETE FROM messages")
        await conn.execute("DELETE FROM conversations")
        await conn.execute("DELETE FROM complaints")
        await conn.execute("DELETE FROM kyc_documents")
        await conn.execute("DELETE FROM sessions")
        await conn.execute("DELETE FROM users")
        await conn.execute("DELETE FROM kyc_events")
        await conn.execute("DELETE FROM lawyers")
        await conn.commit()
    await seed_lawyers_if_empty()
    await seed_users_if_empty()
