import asyncio
from fastapi.testclient import TestClient
import pytest

from app.db import reset_db_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    asyncio.run(reset_db_for_tests())


def _signup_client() -> dict:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "compliance.client@example.com",
            "password": "SecurePass123!",
            "full_name": "Compliance Client",
            "role": "client",
        },
    )
    assert response.status_code == 200
    return response.json()


def _login_admin() -> dict:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert response.status_code == 200
    return response.json()


def test_consent_and_dsr_lifecycle() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    consent = client.post(
        "/api/compliance/consents",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "purpose": "service_notifications",
            "lawful_basis": "consent",
            "consented": True,
            "policy_version": "v1.0",
            "metadata": {"channel": "email"},
        },
    )
    assert consent.status_code == 200
    assert consent.json()["purpose"] == "service_notifications"

    consents = client.get(
        "/api/compliance/consents/me",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert consents.status_code == 200
    assert len(consents.json()) == 1

    dsr = client.post(
        "/api/compliance/dsr-requests",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"request_type": "access", "detail": "Please share all personal data on record."},
    )
    assert dsr.status_code == 200
    dsr_id = dsr.json()["dsr_request_id"]

    listed = client.get(
        "/api/compliance/dsr-requests?status=submitted",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert listed.status_code == 200
    assert any(item["dsr_request_id"] == dsr_id for item in listed.json())

    updated = client.patch(
        f"/api/compliance/dsr-requests/{dsr_id}",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={"status": "completed", "resolution_note": "Request fulfilled and exported."},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"


def test_retention_run_requires_admin() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    denied = client.post(
        "/api/compliance/retention/run",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"retention_days": 30, "dry_run": True},
    )
    assert denied.status_code == 403

    allowed = client.post(
        "/api/compliance/retention/run",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={"retention_days": 30, "dry_run": True},
    )
    assert allowed.status_code == 200
    body = allowed.json()
    assert body["retention_days"] == 30
    assert body["dry_run"] is True


def test_admin_can_export_and_execute_dsr_deletion() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    dsr = client.post(
        "/api/compliance/dsr-requests",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"request_type": "deletion", "detail": "Please delete my personal data."},
    )
    assert dsr.status_code == 200
    dsr_id = dsr.json()["dsr_request_id"]

    exported = client.get(
        f"/api/compliance/dsr-requests/{dsr_id}/export",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert exported.status_code == 200
    bundle = exported.json()
    assert bundle["dsr_request"]["id"] == dsr_id
    assert bundle["user_profile"]["email"] == "compliance.client@example.com"
    assert "data_summary" in bundle

    executed = client.post(
        f"/api/compliance/dsr-requests/{dsr_id}/execute-deletion",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={"resolution_note": "Deletion workflow executed."},
    )
    assert executed.status_code == 200
    result = executed.json()
    assert result["status"] == "completed"
    assert result["anonymized_email"].startswith("deleted+")

    old_login = client.post(
        "/api/auth/login",
        json={"email": "compliance.client@example.com", "password": "SecurePass123!"},
    )
    assert old_login.status_code == 401


def test_execute_deletion_requires_deletion_request_type() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    dsr = client.post(
        "/api/compliance/dsr-requests",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"request_type": "access", "detail": "Please provide my data export."},
    )
    assert dsr.status_code == 200
    dsr_id = dsr.json()["dsr_request_id"]

    executed = client.post(
        f"/api/compliance/dsr-requests/{dsr_id}/execute-deletion",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={"resolution_note": "Attempted deletion on non-deletion request."},
    )
    assert executed.status_code == 400


def test_dsr_correction_workflow() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    submitted = client.post(
        "/api/compliance/dsr-corrections",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "field_name": "full_name",
            "requested_value": "Corrected Compliance Client",
            "justification": "My legal name was entered incorrectly.",
            "evidence": "Government issued ID updated.",
        },
    )
    assert submitted.status_code == 200
    correction = submitted.json()
    correction_id = correction["correction_id"]

    listed_mine = client.get(
        "/api/compliance/dsr-corrections/me",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert listed_mine.status_code == 200
    assert any(item["correction_id"] == correction_id for item in listed_mine.json())

    reviewed = client.patch(
        f"/api/compliance/dsr-corrections/{correction_id}",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={"status": "approved", "review_note": "Identity evidence verified; updated."},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "approved"

    profile = client.get(
        "/api/auth/me",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Corrected Compliance Client"


def test_breach_registry_admin_only_and_lifecycle() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    denied_create = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "title": "Unauthorized access attempt",
            "severity": "high",
            "description": "Suspicious access to restricted endpoint.",
            "detected_on": "2026-04-20T10:00:00Z",
        },
    )
    assert denied_create.status_code == 403

    created = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "title": "Unauthorized access attempt",
            "severity": "high",
            "description": "Suspicious access to restricted endpoint.",
            "impact_summary": "No confirmed data exfiltration.",
            "affected_data_types": "email,full_name",
            "affected_records": 12,
            "detected_on": "2026-04-20T10:00:00Z",
        },
    )
    assert created.status_code == 200
    incident_id = created.json()["breach_incident_id"]
    assert created.json()["status"] == "open"

    listed = client.get(
        "/api/compliance/breach-incidents?status=open",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert listed.status_code == 200
    assert any(item["breach_incident_id"] == incident_id for item in listed.json())

    updated = client.patch(
        f"/api/compliance/breach-incidents/{incident_id}",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "status": "resolved",
            "reported_to_ndpc": True,
            "ndpc_reported_on": "2026-04-20T12:00:00Z",
            "contained_on": "2026-04-20T11:00:00Z",
            "resolved_on": "2026-04-20T13:00:00Z",
            "resolution_note": "Access keys rotated and affected sessions revoked.",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "resolved"
    assert updated.json()["reported_to_ndpc"] is True


def test_breach_sla_tracking() -> None:
    """Test that breach SLA deadlines are calculated and status tracked correctly."""
    from datetime import datetime, timedelta, timezone
    
    admin_auth = _login_admin()
    client_auth = _signup_client()
    
    # Create a breach incident with detection timestamp
    detected_now = datetime.now(timezone.utc).isoformat()
    response = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "title": "Database exposure in dev environment",
            "severity": "high",
            "description": "Staging database accessible without credentials",
            "detected_on": detected_now,
            "affected_data_types": "PII",
        },
    )
    assert response.status_code == 200
    incident_id = response.json()["breach_incident_id"]
    
    # Check SLA status - should be on-track initially
    sla_response = client.get(
        "/api/compliance/breach-incidents/sla-status",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert sla_response.status_code == 200
    statuses = sla_response.json()
    assert len(statuses) > 0
    
    our_breach = next((b for b in statuses if b["breach_incident_id"] == incident_id), None)
    assert our_breach is not None
    assert our_breach["sla_status"] in ["on-track", "at-risk"]  # Depends on timing
    assert our_breach["notification_deadline"] is not None
    assert our_breach["days_until_deadline"] is not None
    assert our_breach["escalation_triggered"] is False


def test_breach_escalation_admin_only() -> None:
    """Test that breach SLA escalation is admin-only and triggers correctly."""
    from datetime import datetime, timezone
    
    admin_auth = _login_admin()
    client_auth = _signup_client()
    
    # Create a breach incident
    detected_now = datetime.now(timezone.utc).isoformat()
    response = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "title": "API key leak detected",
            "severity": "critical",
            "description": "Production API keys exposed in GitHub repository",
            "detected_on": detected_now,
            "affected_data_types": "Credentials",
        },
    )
    assert response.status_code == 200
    incident_id = response.json()["breach_incident_id"]
    
    # Non-admin cannot trigger escalation
    escalate_response = client.post(
        f"/api/compliance/breach-incidents/{incident_id}/escalate",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert escalate_response.status_code == 403
    
    # Admin can trigger escalation
    escalate_response = client.post(
        f"/api/compliance/breach-incidents/{incident_id}/escalate",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert escalate_response.status_code == 200
    assert escalate_response.json()["escalation_triggered"] is True
    assert escalate_response.json()["escalation_triggered_at"] is not None
    
    # Verify escalation flag persists
    get_response = client.get(
        f"/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert get_response.status_code == 200
    incidents = get_response.json()
    our_incident = next((inc for inc in incidents if inc["breach_incident_id"] == incident_id), None)
    assert our_incident is not None
    assert our_incident["escalation_triggered"] is True


def test_breach_sla_filter_by_status() -> None:
    """Test filtering breaches by SLA status (on-track, at-risk, overdue, notified)."""
    from datetime import datetime, timezone
    
    admin_auth = _login_admin()
    
    # Create breach that will be reported (notified status)
    detected_now = datetime.now(timezone.utc).isoformat()
    response1 = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "title": "Notified breach",
            "severity": "low",
            "description": "Minor issue already reported",
            "detected_on": detected_now,
        },
    )
    assert response1.status_code == 200
    incident1_id = response1.json()["breach_incident_id"]
    
    # Mark as reported to NDPC (this should change sla_status to "notified")
    update_response = client.patch(
        f"/api/compliance/breach-incidents/{incident1_id}",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "status": "open",
            "reported_to_ndpc": True,
            "ndpc_reported_on": "2026-04-20T10:00:00Z",
        },
    )
    assert update_response.status_code == 200
    
    # Create another breach (not reported)
    response2 = client.post(
        "/api/compliance/breach-incidents",
        headers={"X-Auth-Token": admin_auth["access_token"]},
        json={
            "title": "Unreported breach",
            "severity": "medium",
            "description": "Still under investigation",
            "detected_on": detected_now,
        },
    )
    assert response2.status_code == 200
    incident2_id = response2.json()["breach_incident_id"]
    
    # List all breaches by SLA status
    all_response = client.get(
        "/api/compliance/breach-incidents/sla-status",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert all_response.status_code == 200
    all_breaches = all_response.json()
    assert len(all_breaches) >= 2
    
    # Filter for notified breaches
    notified_response = client.get(
        "/api/compliance/breach-incidents/sla-status?sla_status=notified",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert notified_response.status_code == 200
    notified = notified_response.json()
    # Should have at least the one we marked as reported
    assert any(b["breach_incident_id"] == incident1_id and b["sla_status"] == "notified" for b in notified)


# ===== PRACTICE SEAL & APL/CPD COMPLIANCE TESTS =====

def test_practice_seal_upload_and_check() -> None:
    """Test uploading practice seal (BPF + CPD compliance data)."""
    admin_auth = _login_admin()
    
    # Get first seed lawyer via intake/match
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Contract review needed",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 500000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert search_response.status_code == 200
    matches = search_response.json()["matches"]
    assert len(matches) > 0
    lawyer_id = matches[0]["lawyer_id"]
    
    # Upload seal for 2026
    seal_response = client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 7,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert seal_response.status_code == 200
    seal_data = seal_response.json()
    assert seal_data["lawyer_id"] == lawyer_id
    assert seal_data["practice_year"] == 2026
    assert seal_data["bpf_paid"] is True
    assert seal_data["cpd_points"] == 7
    assert seal_data["cpd_compliant"] is True  # bpf_paid AND cpd_points >= 5
    assert seal_data["aplineligible"] is True  # bpf_paid
    
    # Check seal status (public endpoint, no auth)
    check_response = client.get(f"/api/compliance/practice-seal/check?lawyer_id={lawyer_id}")
    assert check_response.status_code == 200
    check_data = check_response.json()
    assert check_data["has_valid_seal"] is True
    assert check_data["cpd_compliant"] is True
    assert check_data["apl_eligible"] is True


def test_practice_seal_non_compliant() -> None:
    """Test seal when CPD points below threshold."""
    admin_auth = _login_admin()
    
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Litigation support needed",
            "state": "Lagos",
            "urgency": "urgent",
            "budget_max_ngn": 1000000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    matches = search_response.json()["matches"]
    lawyer_id = matches[0]["lawyer_id"]
    
    # Upload seal with insufficient CPD points
    seal_response = client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 3,  # Below 5 threshold
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert seal_response.status_code == 200
    seal_data = seal_response.json()
    assert seal_data["cpd_compliant"] is False  # cpd_points < 5
    assert seal_data["aplineligible"] is True  # BPF paid
    
    # Check seal status
    check_response = client.get(f"/api/compliance/practice-seal/check?lawyer_id={lawyer_id}")
    check_data = check_response.json()
    assert check_data["has_valid_seal"] is False  # Not compliant despite BPF


def test_apl_list_compliant_lawyers() -> None:
    """Test listing compliant lawyers (Annual Practising List equivalent)."""
    admin_auth = _login_admin()
    
    # Upload seals for two lawyers
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Business law help needed",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 750000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    matches = search_response.json()["matches"]
    assert len(matches) >= 2
    
    lawyer1_id = matches[0]["lawyer_id"]
    lawyer2_id = matches[1]["lawyer_id"]
    
    # Make lawyer1 compliant
    client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer1_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 5,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    
    # Make lawyer2 non-compliant (no BPF)
    client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer2_id,
            "practice_year": 2026,
            "bpf_paid": False,
            "cpd_points": 7,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    
    # List APL compliant
    apl_response = client.get("/api/compliance/practising-list?practice_year=2026&limit=500")
    assert apl_response.status_code == 200
    apl_list = apl_response.json()
    
    # lawyer1 should be in list
    lawyer1_in_list = any(l["lawyer_id"] == lawyer1_id for l in apl_list)
    assert lawyer1_in_list
    
    # lawyer2 should NOT be in list (not bpf_paid)
    lawyer2_in_list = any(l["lawyer_id"] == lawyer2_id for l in apl_list)
    assert not lawyer2_in_list


def test_admin_verify_practice_seal() -> None:
    """Test admin verification of practice seal (sets verified_on, verified_by_user_id)."""
    admin_auth = _login_admin()
    
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Corporate counsel advice",
            "state": "Lagos",
            "urgency": "researching",
            "budget_max_ngn": 2000000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    matches = search_response.json()["matches"]
    lawyer_id = matches[0]["lawyer_id"]
    
    # Admin verifies seal (e.g., after checking NBA source)
    verify_response = client.post(
        f"/api/compliance/practice-seal/{lawyer_id}/verify",
        params={
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 6,
            "verification_notes": "Verified via NBA records",
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert verify_response.status_code == 200
    verify_data = verify_response.json()
    assert verify_data["lawyer_id"] == lawyer_id
    assert verify_data["cpd_compliant"] is True
    assert verify_data["verified_by_user_id"] is not None
    assert "Seal verified for" in verify_data["message"]


def test_practice_seal_audit_trail() -> None:
    """Test seal audit trail (seal_events records all actions)."""
    admin_auth = _login_admin()
    
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Employment law question",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 300000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    matches = search_response.json()["matches"]
    lawyer_id = matches[0]["lawyer_id"]
    
    # Upload seal (creates seal_events record)
    client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 5,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    
    # Get audit trail
    audit_response = client.get(
        f"/api/compliance/practice-seal/{lawyer_id}/audit-trail?practice_year=2026",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert audit_response.status_code == 200
    events = audit_response.json()
    assert len(events) > 0
    
    # Should have seal_uploaded event
    upload_event = next((e for e in events if e["action"] == "seal_uploaded"), None)
    assert upload_event is not None
    assert "BPF paid=True" in upload_event["detail"]


def test_seal_badge_in_lawyer_matches() -> None:
    """Test that seal badge appears in lawyer matching results if compliant."""
    admin_auth = _login_admin()
    
    # Get lawyers
    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Property law advice",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 600000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    matches = search_response.json()["matches"]
    assert len(matches) >= 1
    
    lawyer_id = matches[0]["lawyer_id"]
    
    # Make lawyer compliant
    client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 6,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    
    # Search for lawyers again (should include seal badge)
    search_response2 = client.post(
        "/api/intake/match",
        json={
            "summary": "Property dispute resolution",
            "state": "Lagos",
            "urgency": "urgent",
            "budget_max_ngn": 500000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert search_response2.status_code == 200
    results = search_response2.json()
    
    # Find our lawyer in results
    our_lawyer = next((m for m in results["matches"] if m["lawyer_id"] == lawyer_id), None)
    if our_lawyer:
        # Check if seal badge is present
        seal_badge = next((b for b in our_lawyer.get("badges", []) if "Seal & Stamp" in b), None)
        assert seal_badge is not None
        assert "2026" in seal_badge


def test_seal_authorization_controls() -> None:
    """Test that non-admin users cannot upload seals for other lawyers."""
    # Create a client user
    client_response = client.post(
        "/api/auth/signup",
        json={
            "email": "seal.client@example.com",
            "password": "SecurePass123!",
            "full_name": "Seal Test Client",
            "role": "client",
        },
    )
    assert client_response.status_code == 200
    client_auth = client_response.json()
    
    admin_auth = _login_admin()
    
    # Use a seed lawyer from the data
    lawyer_id = "lw_001"  # First seed lawyer
    
    
    # Client tries to upload seal for a lawyer (should fail)
    seal_response = client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 5,
        },
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    # Client should either fail auth or get forbidden (non-admin)
    # Note: upload endpoint may accept clients but auth system rejects them
    assert seal_response.status_code in [403, 401, 422]  # Forbidden, Unauthorized, or Invalid
        
    # But admin can upload for any lawyer
    seal_response_admin = client.post(
        f"/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 5,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    # Admin should succeed
    assert seal_response_admin.status_code == 200


def test_practice_seal_file_is_encrypted_at_rest() -> None:
    admin_auth = _login_admin()

    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Need corporate legal review for 2026 filings.",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 700000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert search_response.status_code == 200
    lawyer_id = search_response.json()["matches"][0]["lawyer_id"]

    raw_file_bytes = b"%PDF-1.4\nStampAndSeal2026\n%%EOF"
    upload_response = client.post(
        "/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 8,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
        files={"seal_document": ("seal.pdf", raw_file_bytes, "application/pdf")},
    )
    assert upload_response.status_code == 200

    from app.db import UPLOADS_DIR, get_practice_seal
    from app.security import decrypt_seal_bytes

    stored_record = get_practice_seal(lawyer_id, 2026)
    assert stored_record is not None
    storage_key = stored_record["seal_file_key"]
    assert storage_key is not None

    encrypted_path = UPLOADS_DIR / storage_key
    assert encrypted_path.exists()
    encrypted_bytes = encrypted_path.read_bytes()

    assert encrypted_bytes != raw_file_bytes
    assert decrypt_seal_bytes(encrypted_bytes) == raw_file_bytes


def test_admin_can_download_decrypted_seal_document() -> None:
    admin_auth = _login_admin()

    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Need legal review for annual compliance filings.",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 700000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert search_response.status_code == 200
    lawyer_id = search_response.json()["matches"][0]["lawyer_id"]

    raw_file_bytes = b"%PDF-1.4\nAdminDownloadSeal2026\n%%EOF"
    upload_response = client.post(
        "/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 8,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
        files={"seal_document": ("seal.pdf", raw_file_bytes, "application/pdf")},
    )
    assert upload_response.status_code == 200

    download_response = client.get(
        f"/api/compliance/practice-seal/{lawyer_id}/document/download",
        params={"practice_year": 2026},
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )

    assert download_response.status_code == 200
    assert download_response.content == raw_file_bytes
    assert "application/pdf" in download_response.headers.get("content-type", "")
    assert "attachment; filename=\"stamp_seal_" in download_response.headers.get("content-disposition", "")


def test_non_admin_cannot_download_seal_document() -> None:
    admin_auth = _login_admin()
    client_auth = _signup_client()

    search_response = client.post(
        "/api/intake/match",
        json={
            "summary": "Need legal review for annual compliance filings.",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 700000,
            "legal_terms_mode": False,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert search_response.status_code == 200
    lawyer_id = search_response.json()["matches"][0]["lawyer_id"]

    upload_response = client.post(
        "/api/compliance/practice-seal/upload",
        params={
            "lawyer_id": lawyer_id,
            "practice_year": 2026,
            "bpf_paid": True,
            "cpd_points": 8,
        },
        headers={"X-Auth-Token": admin_auth["access_token"]},
        files={"seal_document": ("seal.pdf", b"%PDF-1.4\nRoleCheck\n%%EOF", "application/pdf")},
    )
    assert upload_response.status_code == 200

    download_response = client.get(
        f"/api/compliance/practice-seal/{lawyer_id}/document/download",
        params={"practice_year": 2026},
        headers={"X-Auth-Token": client_auth["access_token"]},
    )

    assert download_response.status_code == 403
