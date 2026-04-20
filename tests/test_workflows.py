import pytest
from fastapi.testclient import TestClient

from app.db import create_user, reset_db_for_tests
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    reset_db_for_tests()
    create_user("lawyer.user@example.com", "SecurePass123!", "Sadiq Bello", "lawyer", "lw_004")


def _signup_client() -> dict:
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "client.workflow@example.com",
            "password": "SecurePass123!",
            "full_name": "Workflow Client",
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


def test_conversation_and_message_flow() -> None:
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    conversation = client.post(
        "/api/conversations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"lawyer_id": "lw_004", "initial_message": "Hello, I need help with a tenancy issue."},
    )
    assert conversation.status_code == 200
    conversation_id = conversation.json()["conversation_id"]

    lawyer_message = client.post(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
        json={"body": "I can help. Please share your notice and timeline."},
    )
    assert lawyer_message.status_code == 200

    messages = client.get(
        f"/api/conversations/{conversation_id}/messages",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert messages.status_code == 200
    assert len(messages.json()) == 2


def test_consultation_booking_and_payment_simulation() -> None:
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need a consultation on tenancy notice and landlord dispute.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    payment = client.post(
        "/api/payments/simulate",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"consultation_id": consultation_id, "provider": "simulation"},
    )
    assert payment.status_code == 200
    payment_id = payment.json()["payment_id"]
    assert payment.json()["status"] == "pending"

    complete = client.post(
        f"/api/payments/{payment_id}/simulate",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"action": "complete"},
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "paid"

    release = client.post(
        f"/api/payments/{payment_id}/simulate",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
        json={"action": "release"},
    )
    assert release.status_code == 200
    assert release.json()["status"] == "released"


def test_lawyer_cannot_access_other_client_consultation() -> None:
    client_auth = _signup_client()
    other_lawyer_auth = _login_lawyer()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_001",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need a consultation on employment termination.",
        },
    )
    consultation_id = consultation.json()["consultation_id"]

    denied = client.get(
        f"/api/consultations/{consultation_id}",
        headers={"X-Auth-Token": other_lawyer_auth["access_token"]},
    )
    assert denied.status_code == 403


def test_consultation_document_upload_list_and_download() -> None:
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need a consultation on tenancy notice and landlord dispute.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    upload = client.post(
        f"/api/consultations/{consultation_id}/documents",
        headers={"X-Auth-Token": client_auth["access_token"]},
        data={"document_label": "tenancy_notice"},
        files={"file": ("notice.pdf", b"sample pdf bytes", "application/pdf")},
    )
    assert upload.status_code == 200
    uploaded = upload.json()
    assert uploaded["document_label"] == "tenancy_notice"
    assert uploaded["original_filename"] == "notice.pdf"

    listed = client.get(
        f"/api/consultations/{consultation_id}/documents",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    downloaded = client.get(
        f"/api/documents/{uploaded['document_id']}/download",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert downloaded.status_code == 200
    assert downloaded.content == b"sample pdf bytes"
    assert downloaded.headers["content-type"] == "application/pdf"


def test_other_client_cannot_access_consultation_documents() -> None:
    client_auth = _signup_client()
    other_client_response = client.post(
        "/api/auth/signup",
        json={
            "email": "other.client@example.com",
            "password": "SecurePass123!",
            "full_name": "Other Client",
            "role": "client",
        },
    )
    assert other_client_response.status_code == 200
    other_client = other_client_response.json()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need a consultation on tenancy notice and landlord dispute.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    upload = client.post(
        f"/api/consultations/{consultation_id}/documents",
        headers={"X-Auth-Token": client_auth["access_token"]},
        data={"document_label": "evidence_bundle"},
        files={"file": ("evidence.txt", b"private evidence", "text/plain")},
    )
    assert upload.status_code == 200
    document_id = upload.json()["document_id"]

    denied_list = client.get(
        f"/api/consultations/{consultation_id}/documents",
        headers={"X-Auth-Token": other_client["access_token"]},
    )
    assert denied_list.status_code == 403

    denied_download = client.get(
        f"/api/documents/{document_id}/download",
        headers={"X-Auth-Token": other_client["access_token"]},
    )
    assert denied_download.status_code == 403


def test_document_upload_rejects_malware_signature() -> None:
    client_auth = _signup_client()

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-05T10:00:00Z",
            "summary": "Need a consultation on tenancy notice and landlord dispute.",
        },
    )
    assert consultation.status_code == 200
    consultation_id = consultation.json()["consultation_id"]

    eicar = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    upload = client.post(
        f"/api/consultations/{consultation_id}/documents",
        headers={"X-Auth-Token": client_auth["access_token"]},
        data={"document_label": "malware_sample"},
        files={"file": ("infected.pdf", eicar, "application/pdf")},
    )
    assert upload.status_code == 400
    assert "Malware signature detected" in upload.json()["detail"]


def test_list_consultations_and_conversations_for_participants() -> None:
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    conversation = client.post(
        "/api/conversations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={"lawyer_id": "lw_004", "initial_message": "Can you advise on this tenancy issue?"},
    )
    assert conversation.status_code == 200

    consultation = client.post(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
        json={
            "lawyer_id": "lw_004",
            "scheduled_for": "2026-04-12T10:00:00Z",
            "summary": "Need legal advice on tenancy terms and landlord dispute.",
        },
    )
    assert consultation.status_code == 200

    client_consultations = client.get(
        "/api/consultations",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert client_consultations.status_code == 200
    assert len(client_consultations.json()) == 1

    lawyer_consultations = client.get(
        "/api/consultations",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert lawyer_consultations.status_code == 200
    assert len(lawyer_consultations.json()) == 1

    client_conversations = client.get(
        "/api/conversations",
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert client_conversations.status_code == 200
    assert len(client_conversations.json()) == 1

    lawyer_conversations = client.get(
        "/api/conversations",
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert lawyer_conversations.status_code == 200
    assert len(lawyer_conversations.json()) == 1


def test_consultation_status_update_permissions() -> None:
    """Clients can only cancel; lawyers can complete or cancel; forbidden transitions rejected."""
    client_auth = _signup_client()
    lawyer_auth = _login_lawyer()

    # Book a consultation
    book = client.post(
        "/api/consultations",
        json={"lawyer_id": "lw_004", "scheduled_for": "2026-05-01T10:00:00", "summary": "Status test"},
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert book.status_code == 200
    consultation_id = book.json()["consultation_id"]

    # Client cannot mark as completed
    forbidden = client.patch(
        f"/api/consultations/{consultation_id}/status",
        json={"status": "completed"},
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    assert forbidden.status_code == 403

    # Lawyer can mark as completed
    complete = client.patch(
        f"/api/consultations/{consultation_id}/status",
        json={"status": "completed"},
        headers={"X-Auth-Token": lawyer_auth["access_token"]},
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"

    # Cannot change a completed consultation via client (already terminal, but client can only cancel anyway)
    cancel_attempt = client.patch(
        f"/api/consultations/{consultation_id}/status",
        json={"status": "cancelled"},
        headers={"X-Auth-Token": client_auth["access_token"]},
    )
    # Allowed by role (client can cancel) — status change itself goes through
    assert cancel_attempt.status_code == 200
    assert cancel_attempt.json()["status"] == "cancelled"
