import pytest
from fastapi.testclient import TestClient

from app.db import force_expire_access_token_for_tests, reset_db_for_tests
from app.dependencies import reset_auth_rate_limits_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()
    reset_auth_rate_limits_for_tests()


def test_signup_and_me_flow() -> None:
    signup = client.post(
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

    me = client.get("/api/auth/me", headers={"X-Auth-Token": token})
    assert me.status_code == 200
    assert me.json()["email"] == "client1@example.com"


def test_admin_login_and_kyc_update() -> None:
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert login.status_code == 200
    admin_token = login.json()["access_token"]

    verify = client.post(
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


def test_non_admin_cannot_update_kyc() -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "client2@example.com",
            "password": "SecurePass123!",
            "full_name": "Client Two",
            "role": "client",
        },
    )
    token = signup.json()["access_token"]

    verify = client.post(
        "/api/kyc/verify",
        headers={"X-Auth-Token": token},
        json={
            "lawyer_id": "lw_004",
            "nba_verified": True,
            "note": "Attempted non-admin update",
        },
    )
    assert verify.status_code == 403


def test_tracker_endpoint_requires_auth_and_returns_payload() -> None:
    unauth = client.get("/api/tracker")
    assert unauth.status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    token = login.json()["access_token"]

    auth = client.get("/api/tracker", headers={"X-Auth-Token": token})
    assert auth.status_code == 200
    assert "project" in auth.json()


def test_refresh_rotates_tokens_and_invalidates_old_refresh() -> None:
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert login.status_code == 200
    original = login.json()

    refreshed = client.post(
        "/api/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert refreshed.status_code == 200
    rotated = refreshed.json()
    assert rotated["access_token"] != original["access_token"]
    assert rotated["refresh_token"] != original["refresh_token"]

    replay = client.post(
        "/api/auth/refresh",
        json={"refresh_token": original["refresh_token"]},
    )
    assert replay.status_code == 401


def test_expired_access_token_is_rejected() -> None:
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    access_token = login.json()["access_token"]

    force_expire_access_token_for_tests(access_token)

    response = client.get("/api/auth/me", headers={"X-Auth-Token": access_token})
    assert response.status_code == 401


def test_logout_revokes_tokens() -> None:
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    body = login.json()

    logout = client.post(
        "/api/auth/logout",
        headers={"X-Auth-Token": body["access_token"]},
        json={"refresh_token": body["refresh_token"]},
    )
    assert logout.status_code == 200

    me = client.get("/api/auth/me", headers={"X-Auth-Token": body["access_token"]})
    assert me.status_code == 401

    refresh = client.post("/api/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refresh.status_code == 401


def test_signup_rejects_weak_password() -> None:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "weakpass@example.com",
            "password": "password123",
            "full_name": "Weak Password User",
            "role": "client",
        },
    )
    assert response.status_code == 422


def test_login_rate_limits_repeated_failed_attempts() -> None:
    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"email": "admin@legalmvp.local", "password": "WrongPass123!"},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "WrongPass123!"},
    )
    assert blocked.status_code == 429


def test_refresh_rate_limits_repeated_failed_attempts() -> None:
    bad_token = "invalid-refresh-token-value"
    for _ in range(8):
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": bad_token},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/api/auth/refresh",
        json={"refresh_token": bad_token},
    )
    assert blocked.status_code == 429


def test_lawyer_can_submit_kyc_and_auto_verify() -> None:
    """Submit KYC sets status to pending, not auto-verified."""
    signup = client.post(
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

    from io import BytesIO
    fake_cert = BytesIO(b"fake certificate content")
    submit = client.post(
        "/api/kyc/submit",
        headers={"X-Auth-Token": token},
        data={"enrollment_number": "SCN12345"},
        files={"certificate_file": ("cert.pdf", fake_cert, "application/pdf")}
    )
    assert submit.status_code == 200
    
    data = submit.json()
    assert data["enrollment_number"] == "SCN12345"
    assert data["kyc_submission_status"] == "pending"


def test_admin_approves_pending_kyc() -> None:
    """Admin can see pending submissions and approve them."""
    # Lawyer submits KYC
    signup = client.post(
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

    from io import BytesIO
    fake_cert = BytesIO(b"fake certificate content")
    submit = client.post(
        "/api/kyc/submit",
        headers={"X-Auth-Token": lawyer_token},
        data={"enrollment_number": "SCN99999"},
        files={"certificate_file": ("cert.pdf", fake_cert, "application/pdf")}
    )
    assert submit.status_code == 200
    assert submit.json()["kyc_submission_status"] == "pending"

    # Admin logs in and sees pending list
    login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    admin_token = login.json()["access_token"]

    pending = client.get("/api/kyc/pending", headers={"X-Auth-Token": admin_token})
    assert pending.status_code == 200
    assert any(item["lawyer_id"] == "lw_001" for item in pending.json())

    # Admin approves
    verify = client.post(
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
    assert verify.json()["kyc_submission_status"] == "approved"


def test_lawyer_nin_auto_verification() -> None:
    """NIN verification is automated — valid 11-digit NIN passes."""
    signup = client.post(
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

    result = client.post(
        "/api/kyc/nin/verify",
        headers={"X-Auth-Token": token},
        data={"nin": "12345678901"},
    )
    assert result.status_code == 200
    assert result.json()["nin_verified"] is True

    # Invalid NIN
    result_bad = client.post(
        "/api/kyc/nin/verify",
        headers={"X-Auth-Token": token},
        data={"nin": "SHORT"},
    )
    assert result_bad.status_code == 200
    assert result_bad.json()["nin_verified"] is False


def test_auth_responses_include_lawyer_id_for_lawyer_user() -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "lawyer.with.id@example.com",
            "password": "SecurePass123!",
            "full_name": "Linked Lawyer",
            "role": "lawyer",
            "lawyer_id": "lw_004",
        },
    )
    assert signup.status_code == 200
    assert signup.json()["lawyer_id"] == "lw_004"

    login = client.post(
        "/api/auth/login",
        json={"email": "lawyer.with.id@example.com", "password": "SecurePass123!"},
    )
    assert login.status_code == 200
    assert login.json()["lawyer_id"] == "lw_004"

    refresh = client.post(
        "/api/auth/refresh",
        json={"refresh_token": login.json()["refresh_token"]},
    )
    assert refresh.status_code == 200
    assert refresh.json()["lawyer_id"] == "lw_004"

    me = client.get("/api/auth/me", headers={"X-Auth-Token": refresh.json()["access_token"]})
    assert me.status_code == 200
    assert me.json()["lawyer_id"] == "lw_004"


def test_admin_can_download_submitted_kyc_certificate() -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "kyc.download@example.com",
            "password": "SecurePass123!",
            "full_name": "KYC Download Lawyer",
            "role": "lawyer",
            "lawyer_id": "lw_003",
        },
    )
    assert signup.status_code == 200
    lawyer_token = signup.json()["access_token"]

    from io import BytesIO

    fake_cert = BytesIO(b"certificate bytes for download test")
    submit = client.post(
        "/api/kyc/submit",
        headers={"X-Auth-Token": lawyer_token},
        data={"enrollment_number": "SCN-DOWNLOAD-1"},
        files={"certificate_file": ("cert.pdf", fake_cert, "application/pdf")},
    )
    assert submit.status_code == 200

    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@legalmvp.local", "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    download = client.get(
        "/api/kyc/lw_003/certificate/download",
        headers={"X-Auth-Token": admin_token},
    )
    assert download.status_code == 200
    assert download.content == b"certificate bytes for download test"

