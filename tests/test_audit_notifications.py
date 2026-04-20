import hashlib
import hmac
import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.db import create_user, get_payment_by_reference, reset_db_for_tests
from app.main import app
from app.routers.messaging import manager


client = TestClient(app)


class _MockPaystackResponse:
    def __init__(self, status_code: int, payload: dict) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload


@pytest.fixture(autouse=True)
def reset_db(monkeypatch: pytest.MonkeyPatch) -> None:
    reset_db_for_tests()
    create_user("lawyer.user@example.com", "SecurePass123!", "Sadiq Bello", "lawyer", "lw_004")
    monkeypatch.setenv("PAYSTACK_SECRET_KEY", "sk_test_1234567890abcdef")
    monkeypatch.delenv("PAYSTACK_BASE_URL", raising=False)


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


def test_paystack_verify_and_audit_feed(monkeypatch: pytest.MonkeyPatch) -> None:
    client_auth = _signup_client()
    admin_auth = _login_admin()
    call_state = {"initialize_called": False, "verify_called": False}

    def _mock_paystack_request(method: str, url: str, **kwargs) -> _MockPaystackResponse:
        if method == "POST" and url.endswith("/transaction/initialize"):
            call_state["initialize_called"] = True
            return _MockPaystackResponse(
                200,
                {
                    "status": True,
                    "data": {
                        "reference": "PSK_REF_AUDIT_1",
                        "access_code": "acs_audit_1",
                        "authorization_url": "https://checkout.paystack.com/audit",
                    },
                },
            )
        if method == "GET" and url.endswith("/transaction/verify/PSK_REF_AUDIT_1"):
            call_state["verify_called"] = True
            return _MockPaystackResponse(200, {"status": True, "data": {"status": "success"}})
        raise AssertionError(f"Unexpected Paystack request: {method} {url}")

    monkeypatch.setattr("app.routers.payments.httpx.request", _mock_paystack_request)

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
    assert payment["authorization_url"] == "https://checkout.paystack.com/audit"
    assert call_state["initialize_called"] is True

    verified = client.post(
        "/api/payments/paystack/PSK_REF_AUDIT_1/verify",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert verified.status_code == 200
    verified_payment = verified.json()
    assert verified_payment["status"] == "paid"
    assert verified_payment["gateway_status"] == "success"
    assert verified_payment["paid_on"] is not None
    assert call_state["verify_called"] is True

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


def test_paystack_webhook_rejects_invalid_signature() -> None:
    payload = {"event": "charge.success", "data": {"reference": "missing"}}
    response = client.post(
        "/api/payments/webhook",
        data=json.dumps(payload),
        headers={"x-paystack-signature": "bad-signature", "content-type": "application/json"},
    )
    assert response.status_code == 401


def test_paystack_webhook_accepts_valid_signature_and_broadcasts(monkeypatch: pytest.MonkeyPatch) -> None:
    client_auth = _signup_client()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Webhook verification for payment updates.",
        },
    )
    consultation_id = consultation.json()["consultation_id"]

    def _mock_paystack_request(method: str, url: str, **kwargs) -> _MockPaystackResponse:
        if method == "POST" and url.endswith("/transaction/initialize"):
            return _MockPaystackResponse(
                200,
                {
                    "status": True,
                    "data": {
                        "reference": "PSK_REF_WEBHOOK_1",
                        "access_code": "acs_webhook_1",
                        "authorization_url": "https://checkout.paystack.com/webhook",
                    },
                },
            )
        raise AssertionError(f"Unexpected Paystack request: {method} {url}")

    monkeypatch.setattr("app.routers.payments.httpx.request", _mock_paystack_request)
    initialize = client.post(
        "/api/payments/paystack/initialize",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"consultation_id": consultation_id, "provider": "paystack"},
    )
    assert initialize.status_code == 200

    mock_broadcast = AsyncMock()
    monkeypatch.setattr(manager, "broadcast_to_users", mock_broadcast)

    payload = {"event": "charge.success", "data": {"reference": "PSK_REF_WEBHOOK_1"}}
    raw_payload = json.dumps(payload).encode("utf-8")
    signature = hmac.new(b"sk_test_1234567890abcdef", raw_payload, hashlib.sha512).hexdigest()
    response = client.post(
        "/api/payments/webhook",
        data=raw_payload,
        headers={"x-paystack-signature": signature, "content-type": "application/json"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
    mock_broadcast.assert_awaited_once()
    payment = get_payment_by_reference("PSK_REF_WEBHOOK_1")
    assert payment is not None
    assert payment["status"] == "paid"
    assert payment["gateway_status"] == "success"
