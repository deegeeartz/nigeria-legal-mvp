import pytest
from fastapi.testclient import TestClient

from app.db import force_expire_access_token_for_tests, reset_db_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()


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
