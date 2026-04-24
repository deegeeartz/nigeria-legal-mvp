from fastapi import APIRouter, Header, HTTPException, Request
from typing import Optional
from datetime import datetime, UTC
import hashlib
import hmac
import json
import httpx

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
    list_milestones,
)
from app.services.document_service import generate_tax_receipt
from app.models import (
    PaymentCreateRequest,
    PaymentResponse,
    PaystackVerifyRequest,
    PaymentActionRequest,
)
from app.settings import PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE, ENVIRONMENT
from app.services.high_value_payments import MonnifyService

HIGH_VALUE_THRESHOLD_NGN = 1_000_000


def _verify_paystack_signature(raw_body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    computed = hmac.new(PAYSTACK_SECRET_KEY.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)

def to_payment_response(payment: dict) -> PaymentResponse:
    return PaymentResponse(
        payment_id=payment["id"],
        consultation_id=payment["consultation_id"],
        reference=payment["reference"],
        provider=payment["provider"],
        amount_ngn=payment["amount_ngn"],
        vat_amount_ngn=payment.get("vat_amount_ngn", 0),
        total_plus_vat_ngn=payment.get("total_plus_vat_ngn", 0),
        status=payment["status"],
        payment_method=payment.get("payment_method", "card"),
        created_on=payment["created_on"],
        access_code=payment.get("access_code"),
        authorization_url=payment.get("authorization_url"),
        gateway_status=payment.get("gateway_status"),
        paid_on=payment.get("paid_on"),
        released_on=payment.get("released_on"),
    )

router = APIRouter(tags=["payments"])

@router.post("/api/payments/paystack/initialize", response_model=PaymentResponse)
async def initialize_paystack_payment(
    payload: PaymentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = await require_user(x_auth_token)
    if not await user_can_access_consultation(user, payload.consultation_id):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    # In a real app, fee would be fetched from lawyer profile
    # For now, default to 5000 NGN
    amount_ngn = 5000
    amount_kobo = amount_ngn * 100
    
    # Call Paystack API to initialize transaction
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.paystack.co/transaction/initialize",
                headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
                json={
                    "email": user["email"],
                    "amount": amount_kobo,
                    "metadata": {"consultation_id": payload.consultation_id}
                },
                timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            access_code = data["access_code"]
            authorization_url = data["authorization_url"]
            reference = data["reference"]
        except Exception as e:
            # Fallback to simulation if Paystack is unreachable/config is test-only
            # but log the failure
            await log_event(user["id"], "payment.initialization_failed", "system", str(payload.consultation_id), f"Paystack API error: {str(e)}")
            # For this task, we want to fail/raise if real integration is intended but fails
            if ENVIRONMENT in {"staging", "production"}:
                 raise HTTPException(status_code=502, detail=f"Payment gateway communication failed: {str(e)}")
            
            # Dev/Test fallback
            access_code = None
            authorization_url = None

    payment = await create_payment(
        payload.consultation_id, 
        payload.provider, 
        amount_ngn=amount_ngn,
        access_code=access_code,
        authorization_url=authorization_url
    )
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    await log_event(user["id"], "payment.initialized", "payment", str(payment["id"]), f"Paystack initialized with reference {payment['reference']}")
    await notify_users(
        await list_consultation_participant_user_ids(payload.consultation_id),
        kind="payment_updated",
        title="Payment initialized",
        body=f"Payment {payment['reference']} is awaiting verification.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )
    return to_payment_response(payment)

@router.post("/api/payments/simulate", response_model=PaymentResponse)
async def simulate_payment_create(
    payload: PaymentCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    return await initialize_paystack_payment(payload, x_auth_token)


@router.post("/api/payments/paystack/{reference}/verify", response_model=PaymentResponse)
async def verify_paystack_reference(
    reference: str,
    payload: PaystackVerifyRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = await require_user(x_auth_token)
    payment = await get_payment_by_reference(reference)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not await user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Consultation access denied")
    
    updated = await verify_paystack_payment(reference, payload.outcome)
    
    # Auto-generate VAT Receipt on success
    if payload.outcome == "success":
        try:
            await generate_tax_receipt(payment["id"])
        except Exception as e:
            await log_event(user["id"], "payment.receipt_generation_failed", "payment", str(payment["id"]), f"Receipt error: {str(e)}")
    await log_event(user["id"], "payment.verified", "payment", str(payment["id"]), f"Paystack verification outcome: {payload.outcome}")
    await notify_users(
        await list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment verification updated",
        body=f"Payment {reference} verification outcome: {payload.outcome}.",
        resource_type="payment",
        resource_id=str(payment["id"]),
    )

    return to_payment_response(updated)


@router.post("/api/payments/{payment_id}/simulate", response_model=PaymentResponse)
async def simulate_payment_action(
    payment_id: int,
    payload: PaymentActionRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> PaymentResponse:
    user = await require_user(x_auth_token)
    payment = await get_payment(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not await user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Payment access denied")
    
    if payload.action == "release":
        milestones = await list_milestones(payment["consultation_id"])
        if milestones and not any(m.get("status_label") == "completed" for m in milestones):
            raise HTTPException(status_code=400, detail="Escrow release denied: No milestones are marked as completed for this consultation.")

    updated = await update_payment_status(payment_id, payload.action)
    await log_event(user["id"], f"payment.{payload.action}", "payment", str(payment_id), f"Payment action {payload.action} applied")
    await notify_users(
        await list_consultation_participant_user_ids(payment["consultation_id"]),
        kind="payment_updated",
        title="Payment status changed",
        body=f"Payment {updated['reference']} is now {updated['status']}.",
        resource_type="payment",
        resource_id=str(payment_id),
    )
    return to_payment_response(updated)


@router.post("/api/payments/webhook")
async def paystack_webhook(request: Request):
    if PAYSTACK_WEBHOOK_ENFORCE_SIGNATURE:
        if not PAYSTACK_SECRET_KEY:
            raise HTTPException(status_code=503, detail="Webhook signature verification is enabled but PAYSTACK_SECRET_KEY is not configured")
        raw_body = await request.body()
        signature = request.headers.get("X-Paystack-Signature")
        if not _verify_paystack_signature(raw_body, signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    else:
        raw_body = await request.body()

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference")

    if event == "charge.success" and reference:
        payment = await get_payment_by_reference(reference)
        if payment:
            await verify_paystack_payment(reference, "success")
            
            # Generate VAT Receipt
            try:
                await generate_tax_receipt(payment["id"])
            except:
                pass
            
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
            participants = await list_consultation_participant_user_ids(payment["consultation_id"])
            await manager.broadcast_to_users(ws_payload, participants)
            
            await log_event(None, "payment.webhook_verified", "payment", str(payment["id"]), f"Webhook received for {reference}")
            await notify_users(
                participants,
                kind="payment_updated",
                title="Payment Verified",
                body=f"Your payment for consultation {payment['consultation_id']} has been verified.",
                resource_type="payment",
                resource_id=str(payment["id"]),
            )

    return {"status": "accepted"}


# ---------------------------------------------------------------------------
# High-Value Payments — Virtual Account (Monnify/Moniepoint NIP)
# ---------------------------------------------------------------------------

@router.post("/api/payments/{payment_id}/virtual-account")
async def generate_virtual_account(
    payment_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
):
    """Generate a bank transfer Virtual Account for payments ≥ ₦1,000,000.

    CBN AML/CFT guidelines require enhanced due diligence for high-value
    transactions; routing through a dedicated virtual account satisfies
    the traceable-transfer requirement.
    """
    user = await require_user(x_auth_token)
    payment = await get_payment(payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not await user_can_access_consultation(user, payment["consultation_id"]):
        raise HTTPException(status_code=403, detail="Payment access denied")
    if payment["total_plus_vat_ngn"] < HIGH_VALUE_THRESHOLD_NGN:
        raise HTTPException(
            status_code=400,
            detail=f"Virtual account is only available for payments ≥ ₦{HIGH_VALUE_THRESHOLD_NGN:,}. Use Paystack for smaller amounts.",
        )
    result = await MonnifyService.generate_virtual_account(payment_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=502, detail=result.get("message", "Virtual account generation failed"))

    await log_event(
        user["id"],
        "payment.virtual_account_generated",
        "payment",
        str(payment_id),
        f"Virtual account {result.get('account_number')} generated for ₦{payment['total_plus_vat_ngn']:,}",
    )
    return result


@router.post("/api/payments/monnify/webhook")
async def monnify_webhook(request: Request):
    """Accept Monnify/Moniepoint NIP transfer callbacks."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    await MonnifyService.verify_transfer_webhook(payload)
    return {"status": "accepted"}
