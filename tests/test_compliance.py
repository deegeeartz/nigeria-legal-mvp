from fastapi.testclient import TestClient
import pytest

from app.db import reset_db_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()


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
    from datetime import datetime, timedelta
    
    admin_auth = _login_admin()
    client_auth = _signup_client()
    
    # Create a breach incident with detection timestamp
    detected_now = datetime.utcnow().isoformat()
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
    from datetime import datetime
    
    admin_auth = _login_admin()
    client_auth = _signup_client()
    
    # Create a breach incident
    detected_now = datetime.utcnow().isoformat()
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
    from datetime import datetime
    
    admin_auth = _login_admin()
    
    # Create breach that will be reported (notified status)
    detected_now = datetime.utcnow().isoformat()
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



