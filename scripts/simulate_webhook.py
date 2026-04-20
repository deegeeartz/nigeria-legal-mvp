import requests
import json
import time

API_BASE = "http://localhost:8000"

def simulate_webhook(reference):
    print(f"--- Simulating Paystack Webhook for Ref: {reference} ---")
    payload = {
        "event": "charge.success",
        "data": {
            "reference": reference,
            "status": "success",
            "amount": 500000,
            "currency": "NGN",
            "customer": {
                "email": "test@example.com"
            }
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Paystack-Signature": "simulated_signature"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/payments/webhook", json=payload, headers=headers)
        if response.status_code == 200:
            print("✅ Webhook accepted by server.")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Webhook failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error sending webhook: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python simulate_webhook.py <payment_reference>")
    else:
        simulate_webhook(sys.argv[1])
