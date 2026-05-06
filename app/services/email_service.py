import logging
import time
from email.message import EmailMessage
from typing import Any

import httpx

try:
  import aiosmtplib
except Exception:  # pragma: no cover - optional dependency fallback
  aiosmtplib = None

from app.settings import (
  EMAIL_PROVIDER,
  SENDPULSE_API_BASE_URL,
  SENDPULSE_CLIENT_ID,
  SENDPULSE_CLIENT_SECRET,
  SENDPULSE_FROM_EMAIL,
  SENDPULSE_FROM_NAME,
  SMTP_FROM_EMAIL,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_USER,
)

logger = logging.getLogger("legal_mvp.email")

_sendpulse_access_token: str | None = None
_sendpulse_token_expires_at: float = 0.0


async def _get_sendpulse_access_token() -> str | None:
  global _sendpulse_access_token, _sendpulse_token_expires_at

  if _sendpulse_access_token and time.time() < _sendpulse_token_expires_at:
    return _sendpulse_access_token

  if not SENDPULSE_CLIENT_ID or not SENDPULSE_CLIENT_SECRET:
    logger.warning("SendPulse not configured. Missing client credentials.")
    return None

  token_url = f"{SENDPULSE_API_BASE_URL}/oauth/access_token"
  payload = {
    "grant_type": "client_credentials",
    "client_id": SENDPULSE_CLIENT_ID,
    "client_secret": SENDPULSE_CLIENT_SECRET,
  }

  try:
    async with httpx.AsyncClient(timeout=15.0) as client:
      response = await client.post(token_url, json=payload)
    response.raise_for_status()
    data = response.json()
  except Exception as exc:
    logger.error("Failed to obtain SendPulse token: %s", exc)
    return None

  access_token = data.get("access_token")
  expires_in = int(data.get("expires_in", 3600))
  if not access_token:
    logger.error("SendPulse token response did not include access_token")
    return None

  _sendpulse_access_token = access_token
  _sendpulse_token_expires_at = time.time() + max(expires_in - 60, 60)
  return _sendpulse_access_token


async def _send_via_sendpulse(to_email: str, subject: str, html_content: str) -> bool:
  token = await _get_sendpulse_access_token()
  if not token:
    logger.warning("SendPulse token unavailable. Skipping email to %s with subject: '%s'", to_email, subject)
    return False

  body = {
    "email": {
      "html": html_content,
      "text": "Please enable HTML to view this email.",
      "subject": subject,
      "from": {
        "name": SENDPULSE_FROM_NAME,
        "email": SENDPULSE_FROM_EMAIL,
      },
      "to": [{"email": to_email}],
    }
  }

  try:
    async with httpx.AsyncClient(timeout=20.0) as client:
      response = await client.post(
        f"{SENDPULSE_API_BASE_URL}/smtp/emails",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
      )
    response.raise_for_status()
    logger.info("Email sent successfully via SendPulse to %s", to_email)
    return True
  except Exception as exc:
    logger.error("Failed to send email via SendPulse to %s: %s", to_email, exc)
    return False


async def _send_via_smtp(to_email: str, subject: str, html_content: str) -> bool:
  if aiosmtplib is None:
    logger.warning(f"aiosmtplib not installed. Skipping email to {to_email} with subject: '{subject}'")
    return False

  if not SMTP_USER or not SMTP_PASSWORD:
    logger.warning(f"SMTP not configured. Skipping email to {to_email} with subject: '{subject}'")
    return False

  message = EmailMessage()
  message["From"] = SMTP_FROM_EMAIL
  message["To"] = to_email
  message["Subject"] = subject
  message.set_content("Please enable HTML to view this email.")
  message.add_alternative(html_content, subtype="html")

  try:
    await aiosmtplib.send(
      message,
      hostname=SMTP_HOST,
      port=SMTP_PORT,
      username=SMTP_USER,
      password=SMTP_PASSWORD,
      use_tls=(SMTP_PORT == 465),
      start_tls=(SMTP_PORT == 587),
    )
    logger.info(f"Email sent successfully to {to_email}")
    return True
  except Exception as e:
    logger.error(f"Failed to send email to {to_email}: {str(e)}")
    return False

async def send_email_async(to_email: str, subject: str, html_content: str) -> bool:
    """
    Sends an email asynchronously using aiosmtplib.
    Fails silently (logs error) if SMTP credentials are not configured properly,
    which is useful for local development without crashing the app.
    """
    provider = EMAIL_PROVIDER
    if provider == "sendpulse":
      return await _send_via_sendpulse(to_email, subject, html_content)
    if provider != "smtp":
      logger.warning("Unknown EMAIL_PROVIDER '%s'. Falling back to SMTP.", provider)
    return await _send_via_smtp(to_email, subject, html_content)

# --- Email Templates ---

async def send_welcome_email(to_email: str, full_name: str, role: str):
    subject = "Welcome to Nigeria Legal MVP!"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to Nigeria Legal MVP, {full_name}!</h2>
        <p>We are thrilled to have you join us as a <strong>{role}</strong>.</p>
        <p>You can now log in to your dashboard and start using the platform.</p>
        <br>
        <p>Best regards,<br>Nigeria Legal MVP Team</p>
      </body>
    </html>
    """
    await send_email_async(to_email, subject, html_content)


async def send_consultation_booked_email(to_email: str, full_name: str, lawyer_name: str, scheduled_for: str):
    subject = "Consultation Booked Successfully"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Consultation Confirmed</h2>
        <p>Hi {full_name},</p>
        <p>Your consultation with <strong>{lawyer_name}</strong> has been successfully booked.</p>
        <p><strong>Scheduled Time:</strong> {scheduled_for}</p>
        <p>Please log in to your dashboard at the scheduled time to connect.</p>
        <br>
        <p>Best regards,<br>Nigeria Legal MVP Team</p>
      </body>
    </html>
    """
    await send_email_async(to_email, subject, html_content)


async def send_kyc_status_email(to_email: str, full_name: str, status: str, note: str = ""):
    subject = f"KYC Status Update: {status.upper()}"
    note_html = f"<p><strong>Reviewer Note:</strong> {note}</p>" if note else ""
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>KYC Status Update</h2>
        <p>Hi {full_name},</p>
        <p>Your KYC application status has been updated to: <strong>{status.upper()}</strong></p>
        {note_html}
        <p>Log in to your dashboard for more details.</p>
        <br>
        <p>Best regards,<br>Nigeria Legal MVP Team</p>
      </body>
    </html>
    """
    await send_email_async(to_email, subject, html_content)
