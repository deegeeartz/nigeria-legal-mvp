import logging
from email.message import EmailMessage
from typing import Any
import aiosmtplib

from app.settings import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL

logger = logging.getLogger("legal_mvp.email")

async def send_email_async(to_email: str, subject: str, html_content: str) -> bool:
    """
    Sends an email asynchronously using aiosmtplib.
    Fails silently (logs error) if SMTP credentials are not configured properly,
    which is useful for local development without crashing the app.
    """
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
