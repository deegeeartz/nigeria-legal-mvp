import pytest
from fastapi.testclient import TestClient
import hashlib
import hmac
import json

from app.db import create_user, reset_db_for_tests
from app.main import app
from app.settings import PAYSTACK_SECRET_KEY


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()
    create_user("lawyer.user@example.com", "SecurePass123!", "Sadiq Bello", "lawyer", "lw_004")


def _signup_client() -> dict:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "audit.client@example.com",
            "password": "SecurePass123!",
            "full_name": "Audit Client",
            "role": "client",
        },
    )
    assert response.status_code == 200
    return response.json()


def _login_lawyer() -> dict:
    response = client.post(
        "/api/auth/login",
        json={"email": "lawyer.user@example.com", "password": "SecurePass123!"},
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


def test_message_notifications_can_be_read() -> None:
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    conversation = client.post(
        "/api/conversations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"lawyer_id": "lw_004", "initial_message": "Need help with a land dispute in Lagos."},
    )
    assert conversation.status_code == 200

    notifications = client.get(
        "/api/notifications",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert notifications.status_code == 200
    payload = notifications.json()
    assert len(payload) >= 1
    assert payload[0]["kind"] == "message_received"
    assert payload[0]["is_read"] is False

    marked = client.post(
        f"/api/notifications/{payload[0]['notification_id']}/read",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert marked.status_code == 200
    assert marked.json()["is_read"] is True


def test_paystack_simulation_and_audit_feed() -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need help reviewing a property agreement.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    initialized = client.post(
        "/api/payments/paystack/initialize",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"consultation_id": consultation_id, "provider": "paystack"},
    )
    assert initialized.status_code == 200
    payment = initialized.json()
    assert payment["provider"] == "paystack"
    assert payment["status"] == "pending"
    assert payment["gateway_status"] == "initialized"
    assert payment["authorization_url"].startswith("https://paystack.mock/checkout/")

    verified = client.post(
        f"/api/payments/paystack/{payment['reference']}/verify",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"outcome": "success"},
    )
    assert verified.status_code == 200
    verified_payment = verified.json()
    assert verified_payment["status"] == "paid"
    assert verified_payment["gateway_status"] == "success"
    assert verified_payment["paid_on"] is not None

    client_notifications = client.get(
        "/api/notifications",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert client_notifications.status_code == 200
    kinds = [item["kind"] for item in client_notifications.json()]
    assert "payment_updated" in kinds
    assert "consultation_booked" in kinds

    audit_feed = client.get(
        "/api/audit-events?limit=20",
        headers={"X-Auth-Token": admin_auth["access_token"]},
    )
    assert audit_feed.status_code == 200
    actions = [item["action"] for item in audit_feed.json()]
    assert "consultation.booked" in actions
    assert "payment.initialized" in actions
    assert "payment.verified" in actions


def test_paystack_webhook_requires_valid_signature() -> None:
    client_auth = _signup_client()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need help reviewing a property agreement.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    initialized = client.post(
        "/api/payments/paystack/initialize",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"consultation_id": consultation_id, "provider": "paystack"},
    )
    assert initialized.status_code == 200
    payment = initialized.json()

    payload = {
        "event": "charge.success",
        "data": {"reference": payment["reference"]},
    }
    raw_body = json.dumps(payload).encode("utf-8")

    no_signature = client.post(
        "/api/payments/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )
    assert no_signature.status_code == 401

    signature = hmac.new(PAYSTACK_SECRET_KEY.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    signed = client.post(
        "/api/payments/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Paystack-Signature": signature},
    )
    assert signed.status_code == 200
    assert signed.json()["status"] == "accepted"
