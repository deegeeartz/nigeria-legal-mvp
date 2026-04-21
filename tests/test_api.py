import pytest

# reset_db is now handled in conftest.py as autouse async fixture


@pytest.mark.asyncio
async def test_health(client) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_intake_match(client) -> None:
    response = await client.post(
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


@pytest.mark.asyncio
async def test_get_lawyer_profile(client) -> None:
    response = await client.get("/api/lawyers/lw_001")
    assert response.status_code == 200
    body = response.json()
    assert body["verification"]["nin_verified"] is True


@pytest.mark.asyncio
async def test_lawyer_not_found(client) -> None:
    response = await client.get("/api/lawyers/missing")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_file_and_resolve_complaint_flow(client) -> None:
    filed_by = await client.post(
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

    admin_login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    file_response = await client.post(
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

    list_response = await client.get("/api/complaints/lw_001", headers={"X-Auth-Token": client_token})
    assert list_response.status_code == 200
    complaints = list_response.json()
    assert complaints

    resolve_response = await client.post(
        f"/api/complaints/{filed['complaint_id']}/resolve",
        headers={"X-Auth-Token": admin_token},
        json={"action": "uphold", "resolution_note": "Reviewed and closed after enforcement."},
    )
    assert resolve_response.status_code == 200
    resolved = resolve_response.json()
    assert resolved["status"] == "upheld"
    assert resolved["resolved_on"] is not None
