"""Monnify / Moniepoint High-Value Payment PoC.
Enables Virtual Account generation for transactions exceeding ₦1M.
"""
from __future__ import annotations
import hashlib
import hmac
import json
from datetime import datetime, UTC
from typing import Any

from app.db import get_payment, update_payment_status

class MonnifyService:
    @staticmethod
    async def generate_virtual_account(payment_id: int) -> dict[str, Any]:
        """Simulate generating a NIP Virtual Account for high-value transfers.
        """
        payment = await get_payment(payment_id)
        if not payment:
            return {"status": "error", "message": "Payment not found"}
        
        # In a real integration, we'd call Monnify API here
        # POST /api/v2/bank-transfer/reserved-accounts
        
        bank_name = "Moniepoint Microfinance Bank"
        account_number = f"99{payment_id:08d}"
        account_name = f"NLM-{payment['reference']}"
        
        return {
            "status": "success",
            "account_number": account_number,
            "bank_name": bank_name,
            "account_name": account_name,
            "amount_payable": payment["total_plus_vat_ngn"],
            "expires_at": (datetime.now(UTC).timestamp() + 3600), # 1 hour
            "instructions": f"Please transfer exactly ₦{payment['total_plus_vat_ngn']:,} to this account via NIP/Mobile App."
        }

    @staticmethod
    async def verify_transfer_webhook(payload: dict[str, Any]):
        """Simulate a Monnify/Moniepoint NIP transfer webhook.
        """
        # In real life, Monnify sends a JSON payload with 'paymentReference'
        event_type = payload.get("eventType")
        if event_type != "SUCCESSFUL_TRANSACTION":
            return
        
        data = payload.get("eventData", {})
        reference = data.get("paymentReference")
        if not reference:
            return

        from app.db import get_payment_by_reference, update_payment_status, log_event, list_consultation_participant_user_ids, notify_users
        payment = await get_payment_by_reference(reference)
        if payment and payment["status"] == "pending":
            await update_payment_status(payment["id"], "paid")
            await log_event(None, "payment.nip_transfer_verified", "payment", str(payment["id"]), f"NIP Transfer verified via Monnify webhook: {reference}")
            
            participants = await list_consultation_participant_user_ids(payment["consultation_id"])
            await notify_users(
                participants,
                kind="payment_updated",
                title="Transfer Verified",
                body=f"Your bank transfer of ₦{payment['total_plus_vat_ngn']:,} has been confirmed.",
                resource_type="payment",
                resource_id=str(payment["id"]),
            )
