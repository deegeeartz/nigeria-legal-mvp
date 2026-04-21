import pytest
import pytest_asyncio
from io import BytesIO

from app.db import force_expire_access_token_for_tests
from app.dependencies import reset_auth_rate_limits_for_tests


@pytest_asyncio.fixture(autouse=True)
async def clear_limits():
    reset_auth_rate_limits_for_tests()


@pytest.mark.asyncio
async def test_signup_and_me_flow(client) -> None:
    signup = await client.post(
        "/api/auth/signup",
        json={
            "email": "client1@example.com",
            "password": "SecurePass123!",
            "full_name": "Client One",
            "role": "client",
        },
    )
    assert signup.status_code == 200
    body = signup.json()
    token = body["access_token"]

    me = await client.get("/api/auth/me", headers={"X-Auth-Token": token})
    assert me.status_code == 200
    assert me.json()["email"] == "client1@example.com"


@pytest.mark.asyncio
async def test_admin_login_and_kyc_update(client) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert login.status_code == 200
    admin_token = login.json()["access_token"]

    verify = await client.post(
        "/api/kyc/verify",
        headers={"X-Auth-Token": admin_token},
        json={
            "lawyer_id": "lw_004",
            "bvn_verified": True,
            "note": "BVN completed after payout onboarding.",
        },
    )
    assert verify.status_code == 200
    assert verify.json()["bvn_verified"] is True


@pytest.mark.asyncio
async def test_non_admin_cannot_update_kyc(client) -> None:
    signup = await client.post(
        "/api/auth/signup",
        json={
            "email": "client2@example.com",
            "password": "SecurePass123!",
            "full_name": "Client Two",
            "role": "client",
        },
    )
    token = signup.json()["access_token"]

    verify = await client.post(
        "/api/kyc/verify",
        headers={"X-Auth-Token": token},
        json={
            "lawyer_id": "lw_004",
            "nba_verified": True,
            "note": "Attempted non-admin update",
        },
    )
    assert verify.status_code == 403


@pytest.mark.asyncio
async def test_refresh_rotates_tokens_and_invalidates_old_refresh(client) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert login.status_code == 200
    original = login.json()

    refreshed = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert refreshed.status_code == 200
    rotated = refreshed.json()
    assert rotated["access_token"] != original["access_token"]
    assert rotated["refresh_token"] != original["refresh_token"]

    replay = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert replay.status_code == 401


@pytest.mark.asyncio
async def test_expired_access_token_is_rejected(client) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    access_token = login.json()["access_token"]

    await force_expire_access_token_for_tests(access_token)

    response = await client.get("/api/auth/me", headers={"X-Auth-Token": access_token})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_tokens(client) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    body = login.json()

    logout = await client.post(
        "/api/auth/logout",
        headers={"X-Auth-Token": body["access_token"]},
        json={"refresh_token": body["refresh_token"]},
    )
    assert logout.status_code == 200

    me = await client.get("/api/auth/me", headers={"X-Auth-Token": body["access_token"]})
    assert me.status_code == 401

    refresh = await client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refresh.status_code == 401


@pytest.mark.asyncio
async def test_signup_rejects_weak_password(client) -> None:
    response = await client.post(
        "/api/auth/signup",
        json={
            "email": "weakpass@example.com",
            "password": "password123",
            "full_name": "Weak Password User",
            "role": "client",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_rate_limits_repeated_failed_attempts(client) -> None:
    for _ in range(5):
        response = await client.post(
            "/api/auth/login",
            json={"email": "admin@legalmvp.local", "password": "WrongPass123!"},
        )
        assert response.status_code == 401

    blocked = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "WrongPass123!"},
    )
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_refresh_rate_limits_repeated_failed_attempts(client) -> None:
    bad_token = "invalid-refresh-token-value"
    for _ in range(8):
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": bad_token},
        )
        assert response.status_code == 401

    blocked = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": bad_token},
    )
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_lawyer_can_submit_kyc_and_auto_verify(client) -> None:
    signup = await client.post(
        "/api/auth/signup",
        json={
            "email": "auto_verify@example.com",
            "password": "SecurePass123!",
            "full_name": "Auto Verify Lawyer",
            "role": "lawyer",
            "lawyer_id": "lw_003"
        },
    )
    assert signup.status_code == 200
    token = signup.json()["access_token"]

    fake_cert = BytesIO(b"fake certificate content")
    submit = await client.post(
        "/api/kyc/submit",
        headers={"X-Auth-Token": token},
        data={"enrollment_number": "SCN12345"},
        files={"certificate_file": ("cert.pdf", fake_cert, "application/pdf")}
    )
    assert submit.status_code == 200
    
    data = submit.json()
    assert data["enrollment_number"] == "SCN12345"
    assert data["kyc_submission_status"] == "pending"


@pytest.mark.asyncio
async def test_admin_approves_pending_kyc(client) -> None:
    signup = await client.post(
        "/api/auth/signup",
        json={
            "email": "pending_lawyer@example.com",
            "password": "SecurePass123!",
            "full_name": "Pending Lawyer",
            "role": "lawyer",
            "lawyer_id": "lw_001"
        },
    )
    assert signup.status_code == 200
    lawyer_token = signup.json()["access_token"]

    fake_cert = BytesIO(b"fake certificate content")
    submit = await client.post(
        "/api/kyc/submit",
        headers={"X-Auth-Token": lawyer_token},
        data={"enrollment_number": "SCN99999"},
        files={"certificate_file": ("cert.pdf", fake_cert, "application/pdf")}
    )
    assert submit.status_code == 200
    assert submit.json()["kyc_submission_status"] == "pending"

    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    admin_token = login.json()["access_token"]

    pending = await client.get("/api/kyc/pending", headers={"X-Auth-Token": admin_token})
    assert pending.status_code == 200
    assert any(item["lawyer_id"] == "lw_001" for item in pending.json())

    verify = await client.post(
        "/api/kyc/verify",
        headers={"X-Auth-Token": admin_token},
        json={
            "lawyer_id": "lw_001",
            "nba_verified": True,
            "note": "Call to Bar certificate verified manually.",
        },
    )
    assert verify.status_code == 200
    assert verify.json()["nba_verified"] is True
    assert verify.json()["kyc_submission_status"] == "verified"  # Updated from repo logic


@pytest.mark.asyncio
async def test_lawyer_nin_auto_verification(client) -> None:
    signup = await client.post(
        "/api/auth/signup",
        json={
            "email": "nin_lawyer@example.com",
            "password": "SecurePass123!",
            "full_name": "NIN Lawyer",
            "role": "lawyer",
            "lawyer_id": "lw_004"
        },
    )
    assert signup.status_code == 200
    token = signup.json()["access_token"]

    result = await client.post(
        "/api/kyc/nin/verify",
        headers={"X-Auth-Token": token},
        data={"nin": "12345678901"},
    )
    assert result.status_code == 200
    assert result.json()["nin_verified"] is True

    result_bad = await client.post(
        "/api/kyc/nin/verify",
        headers={"X-Auth-Token": token},
        data={"nin": "SHORT"},
    )
    assert result_bad.status_code == 200
    assert result_bad.json()["nin_verified"] is False
