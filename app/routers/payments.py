import hashlib
import hmac
import json
import os
from datetime import UTC, datetime
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
)
from app.routers.messaging import manager
from app.db import (
    create_payment,
    get_consultation,
    get_lawyer,
    user_can_access_consultation,
    list_consultation_participant_user_ids,
    verify_paystack_payment,
    get_payment_by_reference,
    get_user_by_id,
)
from app.models import (
    PaymentCreateRequest,
    PaymentResponse,
)

def to_payment_response(payment: dict) -> PaymentResponse:
    return PaymentResponse(
        payment_id=payment["id"],
        consultation_id=payment["consultation_id"],
        reference=payment["reference"],
        provider=payment["provider"],
        amount_ngn=payment["amount_ngn"],
        status=payment["status"],
        created_on=payment["created_on"],
        access_code=payment.get("access_code"),
        authorization_url=payment.get("authorization_url"),
        gateway_status=payment.get("gateway_status"),
        paid_on=payment.get("paid_on"),
        released_on=payment.get("released_on"),
    )

router = APIRouter(tags=["payments"])


def _get_paystack_secret_key() -> str:
    secret_key = os.getenv("PAYSTACK_SECRET_KEY", "").strip()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Paystack secret key is not configured")
    return secret_key


def _paystack_request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    secret_key = _get_paystack_secret_key()
    base_url = os.getenv("PAYSTACK_BASE_URL", "https://api.paystack.co").rstrip("/")
    url = f"{base_url}/{path.lstrip('/')}"
    headers = {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"}
    try:
        response = httpx.request(method, url, headers=headers, json=payload, timeout=15.0)
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Paystack API timeout") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Unable to reach Paystack API") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Invalid Paystack API response") from exc

    if response.status_code >= 400:
        message = body.get("message") if isinstance(body, dict) else None
        raise HTTPException(status_code=502, detail=f"Paystack API error: {message or response.status_code}")

    if not body.get("status"):
        raise HTTPException(status_code=502, detail=f"Paystack API error: {body.get('message', 'request failed')}")

    data = body.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="Invalid Paystack API data payload")
    return data


@router.post("/api/payments/paystack/initialize", response_model=PaymentResponse)
def initialize_paystack_payment(
    payload: PaymentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, payload.consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    consultation = get_consultation(payload.consultation_id)
    if consultation is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    lawyer = get_lawyer(consultation["lawyer_id"])
    if lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    client_user = get_user_by_id(consultation["client_user_id"])
    if client_user is None:
        raise HTTPException(status_code=404, detail="Client user not found")
    consult_fee_ngn = lawyer.base_consult_fee_ngn

    paystack_data = _paystack_request(
        "POST",
        "transaction/initialize",
        {
            "email": client_user["email"],
            "amount": consult_fee_ngn * 100,
            "metadata": {"consultation_id": payload.consultation_id},
        },
    )
    if not paystack_data.get("reference"):
        raise HTTPException(status_code=502, detail="Paystack API did not return payment reference")
    payment = create_payment(
        payload.consultation_id,
        payload.provider,
        reference=paystack_data.get("reference"),
        access_code=paystack_data.get("access_code"),
        authorization_url=paystack_data.get("authorization_url"),
        gateway_status="initialized",
        amount_ngn=consult_fee_ngn,
    )
    if payment is None:
        raise HTTPException(status_code=500, detail="Unable to create payment record")
    log_event(user["id"], "payment.initialized", "payment", str(payment["id"]), f"Paystack payment initialized with reference {payment['reference']}")
    notify_users(
        list_consultation_participant_user_ids(payload.consultation_id),
        kind="payment_updated",
        title="Payment initialized",
        body=f"Payment {payment['reference']} was initialized with Paystack.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )
    return to_payment_response(payment)

@router.post("/api/payments/paystack/{reference}/verify", response_model=PaymentResponse)
def verify_paystack_reference(
    reference: str,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    payment = get_payment_by_reference(reference)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Consultation access denied")

    paystack_data = _paystack_request("GET", f"transaction/verify/{reference}")
    gateway_status = str(paystack_data.get("status", "failed")).lower()
    updated = verify_paystack_payment(reference, gateway_status)
    if updated is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    log_event(user["id"], "payment.verified", "payment", str(payment["id"]), f"Paystack verification status: {gateway_status}")
    notify_users(
        list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment verification updated",
        body=f"Payment {reference} verification status: {gateway_status}.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )

    return to_payment_response(updated)


@router.post("/api/payments/webhook")
async def paystack_webhook(request: Request):
    raw_payload = await request.body()
    signature = request.headers.get("x-paystack-signature")
    expected_signature = hmac.new(
        _get_paystack_secret_key().encode("utf-8"),
        raw_payload,
        hashlib.sha512,
    ).hexdigest()
    if not signature or not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid Paystack signature")

    try:
        payload = json.loads(raw_payload.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference")

    if event == "charge.success" and reference:
        payment = get_payment_by_reference(reference)
        if payment:
            updated = verify_paystack_payment(reference, "success")
            if updated is None:
                return {"status": "accepted"}
            
            # Broadcast update via WebSocket
            ws_payload = {
                "event": "payment_verified",
                "timestamp": datetime.now(UTC).isoformat(),
                "data": {
                    "payment_id": payment["id"],
                    "reference": reference,
                    "status": updated["status"],
                    "consultation_id": payment["consultation_id"]
                }
            }
            # Notify both client and lawyer
            participants = list_consultation_participant_user_ids(payment["consultation_id"])
            await manager.broadcast_to_users(ws_payload, participants)
            
            log_event(None, "payment.webhook_verified", "payment", str(payment["id"]), f"Webhook received for {reference}")
            notify_users(
                participants,
                kind="payment_updated",
                title="Payment Verified",
                body=f"Your payment for consultation {payment['consultation_id']} has been verified.",
                resource_type="payment",
                resource_id=str(payment["id"]),
            )

    return {"status": "accepted"}
