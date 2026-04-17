from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import httpx


class UatRunner:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(base_url=self.base_url, timeout=20.0)
        self.client_token = ""
        self.lawyer_token = ""
        self.admin_token = ""

    def _assert_status(self, response: httpx.Response, expected: int, label: str) -> None:
        if response.status_code != expected:
            raise RuntimeError(
                f"{label} failed: expected {expected}, got {response.status_code}, body={response.text}"
            )

    def _post_json(self, path: str, payload: dict, token: str | None = None) -> httpx.Response:
        headers = {"X-Auth-Token": token} if token else None
        return self.client.post(path, json=payload, headers=headers)

    def run(self) -> None:
        self.health_check()
        self.auth_flow()
        self.matching_flow()
        self.complaint_flow()
        self.conversation_flow()
        self.consultation_payment_document_flow()
        print("UAT passed ✅")

    def health_check(self) -> None:
        response = self.client.get("/health")
        self._assert_status(response, 200, "health")
        payload = response.json()
        if payload.get("status") != "ok":
            raise RuntimeError(f"health payload invalid: {payload}")
        print("[PASS] health")

    def auth_flow(self) -> None:
        suffix = "pilot"
        client_signup = self._post_json(
            "/api/auth/signup",
            {
                "email": f"uat.client.{suffix}@example.com",
                "password": "UatPass123!",
                "full_name": "UAT Client",
                "role": "client",
            },
        )
        self._assert_status(client_signup, 200, "client signup")
        self.client_token = client_signup.json()["access_token"]

        lawyer_signup = self._post_json(
            "/api/auth/signup",
            {
                "email": f"uat.lawyer.{suffix}@example.com",
                "password": "UatPass123!",
                "full_name": "UAT Lawyer",
                "role": "lawyer",
                "lawyer_id": "lw_004",
            },
        )
        self._assert_status(lawyer_signup, 200, "lawyer signup")
        self.lawyer_token = lawyer_signup.json()["access_token"]

        admin_login = self._post_json(
            "/api/auth/login",
            {"email": "admin@legalmvp.local", "password": "AdminPass123!"},
        )
        self._assert_status(admin_login, 200, "admin login")
        self.admin_token = admin_login.json()["access_token"]
        print("[PASS] auth flows")

    def matching_flow(self) -> None:
        response = self._post_json(
            "/api/intake/match",
            {
                "summary": "Need urgent help for a tenancy notice and landlord dispute in Lagos.",
                "state": "Lagos",
                "urgency": "urgent",
                "budget_max_ngn": 50000,
                "legal_terms_mode": False,
            },
            token=self.client_token,
        )
        self._assert_status(response, 200, "intake match")
        payload = response.json()
        if not payload.get("matches"):
            raise RuntimeError("intake match returned no lawyers")
        print("[PASS] intake matching")

    def complaint_flow(self) -> None:
        created = self._post_json(
            "/api/complaints",
            {
                "lawyer_id": "lw_004",
                "category": "billing_issue",
                "details": "Billing line items were unclear during consultation prep.",
            },
            token=self.client_token,
        )
        self._assert_status(created, 200, "create complaint")
        complaint_id = created.json()["complaint_id"]

        listed = self.client.get(
            "/api/complaints/lw_004",
            headers={"X-Auth-Token": self.client_token},
        )
        self._assert_status(listed, 200, "list complaints")
        if not listed.json():
            raise RuntimeError("complaints list empty after create")

        resolved = self._post_json(
            f"/api/complaints/{complaint_id}/resolve",
            {"action": "uphold", "resolution_note": "Validated and resolved for pilot test."},
            token=self.admin_token,
        )
        self._assert_status(resolved, 200, "resolve complaint")
        print("[PASS] complaints workflow")

    def conversation_flow(self) -> None:
        conversation = self._post_json(
            "/api/conversations",
            {"lawyer_id": "lw_004", "initial_message": "Hello, can you help with my tenancy issue?"},
            token=self.client_token,
        )
        self._assert_status(conversation, 200, "create conversation")
        conversation_id = conversation.json()["conversation_id"]

        sent = self._post_json(
            f"/api/conversations/{conversation_id}/messages",
            {"body": "Please share your timeline and any notice letters."},
            token=self.lawyer_token,
        )
        self._assert_status(sent, 200, "send message")

        listed = self.client.get(
            f"/api/conversations/{conversation_id}/messages",
            headers={"X-Auth-Token": self.client_token},
        )
        self._assert_status(listed, 200, "list messages")
        if len(listed.json()) < 2:
            raise RuntimeError("conversation should include at least 2 messages")
        print("[PASS] conversation workflow")

    def consultation_payment_document_flow(self) -> None:
        consultation = self._post_json(
            "/api/consultations",
            {
                "lawyer_id": "lw_004",
                "scheduled_for": "2026-04-25T10:00:00Z",
                "summary": "Need legal advice on a rental agreement dispute.",
            },
            token=self.client_token,
        )
        self._assert_status(consultation, 200, "book consultation")
        consultation_id = consultation.json()["consultation_id"]

        payment = self._post_json(
            "/api/payments/paystack/initialize",
            {"consultation_id": consultation_id, "provider": "paystack"},
            token=self.client_token,
        )
        self._assert_status(payment, 200, "initialize payment")
        payment_ref = payment.json()["reference"]

        verified = self._post_json(
            f"/api/payments/paystack/{payment_ref}/verify",
            {"outcome": "success"},
            token=self.client_token,
        )
        self._assert_status(verified, 200, "verify payment")

        upload_resp = self.client.post(
            f"/api/consultations/{consultation_id}/documents",
            headers={"X-Auth-Token": self.client_token},
            data={"document_label": "uat_evidence"},
            files={"file": ("uat-note.txt", b"pilot evidence payload", "text/plain")},
        )
        self._assert_status(upload_resp, 200, "upload document")
        document_id = upload_resp.json()["document_id"]

        listed_docs = self.client.get(
            f"/api/consultations/{consultation_id}/documents",
            headers={"X-Auth-Token": self.lawyer_token},
        )
        self._assert_status(listed_docs, 200, "list consultation documents")
        if len(listed_docs.json()) < 1:
            raise RuntimeError("expected at least one consultation document")

        downloaded = self.client.get(
            f"/api/documents/{document_id}/download",
            headers={"X-Auth-Token": self.lawyer_token},
        )
        self._assert_status(downloaded, 200, "download document")
        if downloaded.content != b"pilot evidence payload":
            raise RuntimeError("downloaded document bytes do not match upload")

        print("[PASS] consultation, payment, and document workflow")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run end-to-end UAT scenarios against the API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    args = parser.parse_args()

    try:
        UatRunner(args.base_url).run()
    except Exception as error:  # pragma: no cover
        print(f"UAT failed: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
