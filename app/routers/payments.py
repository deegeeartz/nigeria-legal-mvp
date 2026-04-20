from fastapi import APIRouter, Header, HTTPException, Request
from typing import Optional
from datetime import datetime, UTC

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
)
from app.routers.messaging import manager
from app.db import (
    create_payment,
    user_can_access_consultation,
    list_consultation_participant_user_ids,
    verify_paystack_payment,
    update_payment_status,
    get_payment_by_reference,
    get_payment,
)
from app.models import (
    PaymentCreateRequest,
    PaymentResponse,
    PaystackVerifyRequest,
    PaymentActionRequest,
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

@router.post("/api/payments/paystack/initialize", response_model=PaymentResponse)
def initialize_paystack_payment(
    payload: PaymentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    if not user_can_access_consultation(user, payload.consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    payment = create_payment(payload.consultation_id, payload.provider)
    if payment is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    log_event(user["id"], "payment.initialized", "payment", str(payment["id"]), f"Paystack simulation initialized with reference {payment['reference']}")
    notify_users(
        list_consultation_participant_user_ids(payload.consultation_id),
        kind="payment_updated",
        title="Payment initialized",
        body=f"Payment {payment['reference']} is awaiting verification.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )
    return to_payment_response(payment)

@router.post("/api/payments/simulate", response_model=PaymentResponse)
def simulate_payment_create(
    payload: PaymentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    return initialize_paystack_payment(payload, x_auth_token)


@router.post("/api/payments/paystack/{reference}/verify", response_model=PaymentResponse)
def verify_paystack_reference(
    reference: str,
    payload: PaystackVerifyRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    payment = get_payment_by_reference(reference)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    updated = verify_paystack_payment(reference, payload.outcome)
    log_event(user["id"], "payment.verified", "payment", str(payment["id"]), f"Paystack verification outcome: {payload.outcome}")
    notify_users(
        list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment verification updated",
        body=f"Payment {reference} verification outcome: {payload.outcome}.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )

    return to_payment_response(updated)


@router.post("/api/payments/{payment_id}/simulate", response_model=PaymentResponse)
def simulate_payment_action(
    payment_id: int,
    payload: PaymentActionRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = require_user(x_auth_token)
    payment = get_payment(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Payment access denied")
    
    updated = update_payment_status(payment_id, payload.action)
    log_event(user["id"], f"payment.{payload.action}", "payment", str(payment_id), f"Payment action {payload.action} applied")
    notify_users(
        list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment status changed",
        body=f"Payment {updated['reference']} is now {updated['status']}.",
        resource_type="payment",
        resource_id=str(payment_id),
    )
    return to_payment_response(updated)


@router.post("/api/payments/webhook")
async def paystack_webhook(request: Request):
    # In production, verify X-Paystack-Signature here
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference")

    if event == "charge.success" and reference:
        payment = get_payment_by_reference(reference)
        if payment:
            updated = verify_paystack_payment(reference, "success")
            
            # Broadcast update via WebSocket
            ws_payload = {
                "event": "payment_verified",
                "timestamp": datetime.now(UTC).isoformat(),
                "data": {
                    "payment_id": payment["id"],
                    "reference": reference,
                    "status": "verified",
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


