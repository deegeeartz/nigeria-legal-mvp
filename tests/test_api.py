from fastapi.testclient import TestClient
import pytest

from app.db import reset_db_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_intake_match() -> None:
    response = client.post(
        "/api/intake/match",
        json={
            "summary": "My employer terminated me without notice in Lagos.",
            "state": "Lagos",
            "urgency": "this_week",
            "budget_max_ngn": 60000,
            "legal_terms_mode": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "matches" in body
    assert body["matches"]
    assert "Ranking reflects platform performance" in body["disclaimer"]


def test_get_lawyer_profile() -> None:
    response = client.get("/api/lawyers/lw_001")
    assert response.status_code == 200
    body = response.json()
    assert body["verification"]["nin_verified"] is True


def test_lawyer_not_found() -> None:
    response = client.get("/api/lawyers/missing")
    assert response.status_code == 404


def test_file_and_resolve_complaint_flow() -> None:
    filed_by = client.post(
        "/api/auth/signup",
        json={
            "email": "complaint.client@example.com",
            "password": "SecurePass123!",
            "full_name": "Complaint Client",
            "role": "client",
        },
    )
    assert filed_by.status_code == 200
    client_token = filed_by.json()["access_token"]

    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    file_response = client.post(
        "/api/complaints",
        headers={"X-Auth-Token": client_token},
        json={
            "lawyer_id": "lw_001",
            "category": "misconduct",
            "details": "Lawyer shared confidential details with a third party.",
        },
    )
    assert file_response.status_code == 200
    filed = file_response.json()
    assert filed["status"] == "open"
    assert filed["severity"] == "severe"

    list_response = client.get("/api/complaints/lw_001", headers={"X-Auth-Token": client_token})
    assert list_response.status_code == 200
    complaints = list_response.json()
    assert complaints

    resolve_response = client.post(
        f"/api/complaints/{filed['complaint_id']}/resolve",
        headers={"X-Auth-Token": admin_token},
        json={"action": "uphold", "resolution_note": "Reviewed and closed after enforcement."},
    )
    assert resolve_response.status_code == 200
    resolved = resolve_response.json()
    assert resolved["status"] == "upheld"
    assert resolved["resolved_on"] is not None
