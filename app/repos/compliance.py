"""Compliance and Privacy repository (Consent, DSR, Breach).
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from app.repos.connection import (
    _now,
    connect,
    _parse,
)


def _coerce_datetime(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return _parse(value)


async def log_consent_event(
    user_id: int,
    purpose: str,
    lawful_basis: str,
    consented: bool,
    policy_version: str,
    metadata_json: str | None = None,
) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO consent_events (user_id, purpose, lawful_basis, consented, policy_version, metadata_json, created_on)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, purpose, lawful_basis, consented, policy_version, metadata_json, now),
        )
        await conn.commit()
        event_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM consent_events WHERE id = ?", (event_id,))
        row = res2.fetchone()
    return dict(row) if row else {}

async def create_consent_event(
    user_id: int,
    purpose: str,
    lawful_basis: str,
    consented: bool,
    policy_version: str,
    metadata_json: str | None = None,
) -> dict[str, Any]:
    return await log_consent_event(
        user_id=user_id,
        purpose=purpose,
        lawful_basis=lawful_basis,
        consented=consented,
        policy_version=policy_version,
        metadata_json=metadata_json,
    )


async def list_consent_history(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM consent_events WHERE user_id = ? ORDER BY created_on DESC LIMIT ?",
            (user_id, limit),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]

# Aliases for router compatibility
list_consent_events_for_user = list_consent_history


async def create_dsr_request(user_id: int, request_type: str, detail: str) -> dict[str, Any]:
    now = _now()
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO dsr_requests (user_id, request_type, status, detail, created_on, updated_on)
            VALUES (?, ?, 'submitted', ?, ?, ?)
            """,
            (user_id, request_type, detail, now, now),
        )
        await conn.commit()
        dsr_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (dsr_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_dsr_requests(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    async with connect() as conn:
        sql = "SELECT * FROM dsr_requests"
        params = []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY created_on DESC LIMIT ?"
        params.append(limit)
        
        res = await conn.execute(sql, tuple(params))
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def list_dsr_requests_for_user(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM dsr_requests WHERE user_id = ? ORDER BY created_on DESC LIMIT ?",
            (user_id, limit),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def update_dsr_request_status(dsr_id: int, status: str, note: str | None, resolved_by: int | None) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        if status == "completed":
            await conn.execute(
                """
                UPDATE dsr_requests SET status = ?, resolution_note = ?, resolved_by_user_id = ?, 
                resolved_on = ?, updated_on = ? WHERE id = ?
                """,
                (status, note, resolved_by, now, now, dsr_id),
            )
        else:
            await conn.execute(
                "UPDATE dsr_requests SET status = ?, updated_on = ? WHERE id = ?",
                (status, now, dsr_id),
            )
        await conn.commit()
        
        res = await conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (dsr_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def create_dsr_correction_request(user_id: int, field_name: str, requested_value: str, justification: str, evidence: str | None) -> dict[str, Any]:
    now = _now()
    # Find active DSR request for correction or create a shadow one
    async with connect() as conn:
        # Simplified: we assume a DSR record is needed
        res_dsr = await conn.execute(
            "INSERT INTO dsr_requests (user_id, request_type, status, detail, created_on, updated_on) VALUES (?, 'correction', 'submitted', ?, ?, ?)",
            (user_id, f"Correction of {field_name}", now, now)
        )
        dsr_id = res_dsr.lastrowid
        
        res = await conn.execute(
            """
            INSERT INTO dsr_corrections (dsr_request_id, user_id, field_name, requested_value, justification, evidence, status, created_on, updated_on)
            VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
            """,
            (dsr_id, user_id, field_name, requested_value, justification, evidence, now, now),
        )
        await conn.commit()
        corr_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (corr_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_dsr_corrections(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    async with connect() as conn:
        sql = "SELECT * FROM dsr_corrections"
        params = []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY created_on DESC LIMIT ?"
        params.append(limit)
        res = await conn.execute(sql, tuple(params))
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def list_dsr_corrections_for_user(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM dsr_corrections WHERE user_id = ? ORDER BY created_on DESC LIMIT ?",
            (user_id, limit),
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def review_dsr_correction(correction_id: int, status: str, note: str, reviewed_by: int) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        await conn.execute(
            "UPDATE dsr_corrections SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_on = ?, updated_on = ? WHERE id = ?",
            (status, note, reviewed_by, now, now, correction_id),
        )
        res = await conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (correction_id,))
        row = res.fetchone()
        if row is None:
            await conn.commit()
            return None

        correction = dict(row)
        if status == "approved":
            field_name = correction.get("field_name")
            requested_value = correction.get("requested_value")
            user_id = correction.get("user_id")

            if field_name == "full_name":
                await conn.execute("UPDATE users SET full_name = ? WHERE id = ?", (requested_value, user_id))
            elif field_name == "email":
                await conn.execute("UPDATE users SET email = ? WHERE id = ?", (requested_value, user_id))

        await conn.commit()
        res2 = await conn.execute("SELECT * FROM dsr_corrections WHERE id = ?", (correction_id,))
        row = res2.fetchone()
    return dict(row) if row else None


async def create_breach_incident(
    title: str, severity: str, description: str, impact_summary: str | None, 
    affected_data_types: str | None, affected_records: int | None, 
    occurred_on: str | datetime | None, detected_on: str | datetime, actor_user_id: int
) -> dict[str, Any]:
    now = _now()
    disc_dt = _coerce_datetime(detected_on)
    occ_dt = _coerce_datetime(occurred_on)
    async with connect() as conn:
        res = await conn.execute(
            """
            INSERT INTO breach_incidents (
                title, severity, status, description, impact_summary, 
                affected_data_types, affected_records, occurred_on, detected_on,
                created_by_user_id, updated_by_user_id, created_on, updated_on, 
                reported_to_ndpc, escalation_triggered
            ) VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title, severity, description, impact_summary, 
                affected_data_types, affected_records, occ_dt, disc_dt,
                actor_user_id, actor_user_id, now, now, 
                False, False
            ),
        )
        await conn.commit()
        inf_id = res.lastrowid
        res2 = await conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (inf_id,))
        row = res2.fetchone()
    return dict(row) if row else {}


async def list_breach_incidents(status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    async with connect() as conn:
        sql = "SELECT * FROM breach_incidents"
        params = []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY created_on DESC LIMIT ?"
        params.append(limit)
        res = await conn.execute(sql, tuple(params))
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def update_breach_incident(
    breach_incident_id: int, actor_user_id: int, status: str, 
    impact_summary: str | None, affected_records: int | None,
    reported_to_ndpc: bool | None, ndpc_reported_on: str | datetime | None,
    contained_on: str | datetime | None, resolved_on: str | datetime | None, resolution_note: str | None
) -> dict[str, Any] | None:
    now = _now()
    ndpc_dt = _coerce_datetime(ndpc_reported_on)
    cont_dt = _coerce_datetime(contained_on)
    res_dt = _coerce_datetime(resolved_on)
    
    async with connect() as conn:
        await conn.execute(
            """
            UPDATE breach_incidents SET 
                status = ?, impact_summary = ?, affected_records = ?,
                reported_to_ndpc = ?, ndpc_reported_on = ?, contained_on = ?, 
                resolved_on = ?, resolution_note = ?, updated_by_user_id = ?, updated_on = ?
            WHERE id = ?
            """,
            (
                status, impact_summary, affected_records, 
                reported_to_ndpc, ndpc_dt, cont_dt, 
                res_dt, resolution_note, actor_user_id, now,
                breach_incident_id
            ),
        )
        await conn.commit()
        res = await conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (breach_incident_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def get_dsr_request(dsr_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM dsr_requests WHERE id = ?", (dsr_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def build_dsr_export_bundle(dsr_id: int) -> dict[str, Any] | None:
    request = await get_dsr_request(dsr_id)
    if not request:
        return None
    
    async with connect() as conn:
        res_user = await conn.execute("SELECT id, email, full_name, role, created_on FROM users WHERE id = ?", (request["user_id"],))
        user_row = res_user.fetchone()
        if user_row is None:
            return None
        user_data = dict(user_row)
        
        res_consents = await conn.execute("SELECT * FROM consent_events WHERE user_id = ?", (request["user_id"],))
        consents = [dict(r) for r in res_consents.fetchall()]

        res_history = await conn.execute(
            "SELECT * FROM dsr_requests WHERE user_id = ? ORDER BY created_on DESC",
            (request["user_id"],),
        )
        dsr_history = [dict(r) for r in res_history.fetchall()]
        
    bundle = {
        "dsr_request": request,
        "user_profile": user_data,
        "consent_events": consents,
        "dsr_history": dsr_history,
        "data_summary": {
            "consent_events_count": len(consents),
            "dsr_requests_count": len(dsr_history),
        },
        "generated_on": _now(),
    }
    return bundle


async def execute_dsr_deletion(dsr_id: int, admin_user_id: int, resolution_note: str) -> dict[str, Any] | None:
    request = await get_dsr_request(dsr_id)
    if not request:
        return None
    if request.get("request_type") != "deletion":
        raise ValueError("DSR request type must be deletion")
    
    user_id = request["user_id"]
    anonymized_email = f"deleted+{user_id}@legalmvp.local"

    async with connect() as conn:
        res_sessions = await conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        revoked_sessions = res_sessions.rowcount or 0

        res_notifications = await conn.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
        deleted_notifications = res_notifications.rowcount or 0

        res_messages = await conn.execute(
            "UPDATE messages SET body = '[redacted by dsr deletion]' WHERE sender_user_id = ?",
            (user_id,),
        )
        redacted_messages = res_messages.rowcount or 0

        res_notes = await conn.execute(
            "UPDATE consultation_notes SET body = '[redacted by dsr deletion]' WHERE author_user_id = ?",
            (user_id,),
        )
        redacted_notes = res_notes.rowcount or 0

        await conn.execute("DELETE FROM consent_events WHERE user_id = ?", (user_id,))
        await conn.execute(
            "UPDATE users SET email = ?, full_name = 'DELETED USER' WHERE id = ?",
            (anonymized_email, user_id),
        )

        await update_dsr_request_status(dsr_id, "completed", resolution_note, admin_user_id)
        await conn.commit()

    return {
        "dsr_request_id": dsr_id,
        "user_id": user_id,
        "status": "completed",
        "anonymized_email": anonymized_email,
        "redacted_messages": redacted_messages,
        "redacted_notes": redacted_notes,
        "deleted_notifications": deleted_notifications,
        "revoked_sessions": revoked_sessions,
        "executed_on": _now(),
    }


async def get_breach_incident(incident_id: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (incident_id,))
        row = res.fetchone()
    return dict(row) if row else None


async def list_breach_incidents_by_sla_status(sla_status: str | None = None) -> list[dict[str, Any]]:
    # In a real system, this would use complex SQL with date math
    # We'll simulate by fetching and augmenting
    incidents = await list_breach_incidents()
    results = []
    for inc in incidents:
        sla_info = await check_breach_sla_status(inc["id"])
        inc.update(sla_info)
        if sla_status and inc.get("sla_status") != sla_status:
            continue
        results.append(inc)
    return results


async def check_breach_sla_status(incident_id: int) -> dict[str, Any]:
    incident = await get_breach_incident(incident_id)
    if not incident: return {}
    
    detected_on = incident["detected_on"]
    deadline = detected_on + timedelta(hours=72)
    now = _now()
    remaining = deadline - now
    hours = remaining.total_seconds() / 3600
    
    status = "on-track"
    if incident["reported_to_ndpc"]:
        status = "notified"
    elif hours < 0:
        status = "overdue"
    elif hours < 24:
        status = "at-risk"
        
    return {
        "notification_deadline": deadline,
        "days_until_deadline": int(remaining.days),
        "sla_status": status,
        "escalation_triggered": incident.get("escalation_triggered", False)
    }


async def trigger_breach_escalation(incident_id: int, admin_user_id: int) -> dict[str, Any] | None:
    now = _now()
    async with connect() as conn:
        await conn.execute(
            "UPDATE breach_incidents SET escalation_triggered = ?, escalation_triggered_at = ?, updated_by_user_id = ?, updated_on = ? WHERE id = ?",
            (True, now, admin_user_id, now, incident_id),
        )
        await conn.commit()
        res = await conn.execute("SELECT * FROM breach_incidents WHERE id = ?", (incident_id,))
        row = res.fetchone()
    return dict(row) if row else None


# ===== Practice Seal Management =====

async def upsert_practice_seal(
    lawyer_id: str, practice_year: int, bpf_paid: bool, cpd_points: int,
    seal_file_key: str | None = None, seal_mime_type: str | None = None,
    source: str = "manual", verified_by_user_id: int | None = None,
    verification_notes: str = ""
) -> dict[str, Any]:
    now = _now()
    verified_on = now.date() if verified_by_user_id is not None else None
    # Seal expires at 31st Dec of practice year
    expires_at = _parse(f"{practice_year}-12-31T23:59:59+01:00")
    cpd_compliant = bpf_paid and cpd_points >= 5
    aplineligible = bool(bpf_paid)
    
    async with connect() as conn:
        # Check if exists
        res = await conn.execute(
            "SELECT id FROM lawyer_practice_seals WHERE lawyer_id = ? AND practice_year = ?",
            (lawyer_id, practice_year)
        )
        existing = res.fetchone()
        
        if existing:
            await conn.execute(
                """
                UPDATE lawyer_practice_seals SET 
                    bpf_paid = ?, cpd_points = ?, cpd_compliant = ?, aplineligible = ?,
                    seal_file_key = COALESCE(?, seal_file_key),
                    seal_mime_type = COALESCE(?, seal_mime_type),
                    source = ?, verified_by_user_id = COALESCE(?, verified_by_user_id),
                    verified_on = COALESCE(?, verified_on),
                    verification_notes = ?, updated_on = ?
                WHERE id = ?
                """,
                (
                    bpf_paid, cpd_points, cpd_compliant, aplineligible,
                    seal_file_key, seal_mime_type, 
                    source, verified_by_user_id, verified_on,
                    verification_notes, now, existing["id"]
                )
            )
            seal_id = existing["id"]
        else:
            res_ins = await conn.execute(
                """
                INSERT INTO lawyer_practice_seals (
                    lawyer_id, practice_year, bpf_paid, cpd_points, cpd_compliant, aplineligible,
                    seal_file_key, seal_mime_type, seal_expires_at, seal_uploaded_at,
                    source, verified_by_user_id, verified_on, verification_notes, created_on, updated_on
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lawyer_id, practice_year, bpf_paid, cpd_points, cpd_compliant, aplineligible,
                    seal_file_key, seal_mime_type, expires_at, now,
                    source, verified_by_user_id, verified_on, verification_notes, now, now
                )
            )
            seal_id = res_ins.lastrowid
            
        await conn.commit()
        # Also update lawyer model for public visibility if compliant
        if cpd_compliant:
            await conn.execute(
                "UPDATE lawyers SET latest_seal_year = ?, latest_seal_expires_at = ?, seal_badge_visible = ? WHERE id = ?",
                (practice_year, expires_at, True, lawyer_id)
            )
            await conn.commit()
            
        res_final = await conn.execute("SELECT * FROM lawyer_practice_seals WHERE id = ?", (seal_id,))
        row = res_final.fetchone()

    payload = dict(row) if row else {}
    payload.setdefault("lawyer_id", lawyer_id)
    payload.setdefault("practice_year", practice_year)
    payload.setdefault("bpf_paid", bpf_paid)
    payload.setdefault("cpd_points", cpd_points)
    payload.setdefault("cpd_compliant", cpd_compliant)
    payload.setdefault("aplineligible", aplineligible)
    payload.setdefault("source", source)
    payload.setdefault("seal_uploaded_at", now)
    payload.setdefault("seal_expires_at", expires_at)
    payload.setdefault("verified_by_user_id", verified_by_user_id)
    payload.setdefault("verified_on", verified_on)
    payload.setdefault("created_on", now)
    payload.setdefault("updated_on", now)
    return payload


async def get_practice_seal(lawyer_id: str, practice_year: int) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM lawyer_practice_seals WHERE lawyer_id = ? AND practice_year = ?",
            (lawyer_id, practice_year)
        )
        row = res.fetchone()
    return dict(row) if row else None


async def get_latest_practice_seal(lawyer_id: str) -> dict[str, Any] | None:
    async with connect() as conn:
        res = await conn.execute(
            "SELECT * FROM lawyer_practice_seals WHERE lawyer_id = ? ORDER BY practice_year DESC LIMIT 1",
            (lawyer_id,)
        )
        row = res.fetchone()
    return dict(row) if row else None


async def list_compliant_lawyers(practice_year: int, limit: int = 500) -> list[dict[str, Any]]:
    async with connect() as conn:
        res = await conn.execute(
            """
            SELECT l.id as lawyer_id, l.full_name, l.state, l.rating, s.cpd_points, s.seal_expires_at
            FROM lawyers l
            INNER JOIN lawyer_practice_seals s ON l.id = s.lawyer_id
            WHERE s.practice_year = ? AND s.cpd_compliant = ?
            ORDER BY l.rating DESC LIMIT ?
            """,
            (practice_year, True, limit)
        )
        rows = res.fetchall()
    return [dict(row) for row in rows]


async def list_seal_events(lawyer_id: str, practice_year: int | None = None, limit: int = 100) -> list[dict[str, Any]]:
    from app.repos.admin import list_audit_events
    events = await list_audit_events(limit=1000)
    filtered: list[dict[str, Any]] = []
    for event in events:
        if event.get("resource_type") != "lawyer_practice_seal":
            continue
        if event.get("resource_id") != lawyer_id:
            continue

        action = event.get("action", "")
        if action.startswith("compliance."):
            action = action.split(".", 1)[1]

        normalized = dict(event)
        normalized["action"] = action
        filtered.append(normalized)

    return filtered[:limit]


async def run_retention_job(retention_days: int, dry_run: bool = True) -> dict[str, Any]:
    now = _now()
    threshold = now - timedelta(days=retention_days)
    
    counts = {
        "retention_days": retention_days,
        "dry_run": dry_run,
        "deleted_notifications": 0,
        "deleted_audit_events": 0,
        "deleted_expired_sessions": 0,
        "executed_on": str(now)
    }
    
    if dry_run:
        return counts
        
    async with connect() as conn:
        res1 = await conn.execute("DELETE FROM notifications WHERE created_on < ?", (threshold,))
        counts["deleted_notifications"] = res1.rowcount
        
        res2 = await conn.execute("DELETE FROM audit_events WHERE created_on < ?", (threshold,))
        counts["deleted_audit_events"] = res2.rowcount
        
        res3 = await conn.execute("DELETE FROM sessions WHERE access_expires_at < ?", (now,))
        counts["deleted_expired_sessions"] = res3.rowcount
        
        await conn.commit()
        
    return counts

