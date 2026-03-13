"""
utils/email_service.py – SMTP email sending with DEV_MODE gating.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import settings


def send_email(to: str, subject: str, body: str, is_html: bool = False) -> bool:
    """
    Send an email to `to`.
    In DEV_MODE, only sends if `to` is in DEV_ALLOWED_EMAILS; otherwise silently skips.
    Returns True on success, False on failure.
    """
    if settings.DEV_MODE:
        allowed = settings.get_dev_allowed_emails()
        if to not in allowed:
            print(f"[DEV MODE] Skipping email to {to} (not in allowed list)")
            return False
        print(f"[DEV MODE] Sending email to allowed address: {to}")

    host = settings.get_effective_email_host()
    port = settings.get_effective_email_port()
    user = settings.get_effective_email_user()
    password = settings.get_effective_email_password()

    if not user or not password:
        print("[EMAIL] Email credentials not configured, skipping.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = to

        part = MIMEText(body, "html" if is_html else "plain", "utf-8")
        msg.attach(part)

        with smtplib.SMTP(host, port) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(user, to, msg.as_string())

        print(f"[EMAIL] Successfully sent to {to}: {subject}")
        return True

    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to}: {e}")
        return False


def send_drive_notification(to: str, student_name: str, company: str, job_role: str) -> bool:
    subject = f"🎯 New Placement Drive: {company} – {job_role}"
    body = f"""Hi {student_name},

A new placement drive has been posted that matches your profile!

🏢 Company: {company}
💼 Role: {job_role}

Please log in to PlacementPro to view details and apply.

Best regards,
PlacementPro Team"""
    return send_email(to, subject, body)


def send_status_update(to: str, student_name: str, company: str, status: str) -> bool:
    emoji = {"Shortlisted": "✅", "Selected": "🎉", "Rejected": "❌"}.get(status, "📋")
    subject = f"{emoji} Application Update: {company}"
    body = f"""Hi {student_name},

Your application status for {company} has been updated to: {status}

Please log in to PlacementPro to see more details.

Best regards,
PlacementPro Team"""
    return send_email(to, subject, body)


def send_interview_slot(
    to: str, student_name: str, company: str,
    time_slot: str, panel: Optional[str] = None, duration: int = 30
) -> bool:
    subject = f"📅 Interview Scheduled: {company}"
    body = f"""Hi {student_name},

Your interview with {company} has been scheduled.

🕐 Time: {time_slot}
⏱ Duration: {duration} minutes
{'🚪 Panel/Room: ' + panel if panel else ''}

Please be on time and come prepared. Good luck!

Best regards,
PlacementPro Team"""
    return send_email(to, subject, body)


def send_otp(to: str, otp: str) -> bool:
    subject = "PlacementPro – Your Password Reset OTP"
    body = f"""Your one-time password (OTP) for resetting your PlacementPro password is:

🔑  {otp}

This OTP is valid for 10 minutes. Do NOT share it with anyone.

If you did not request this, please ignore this email.

PlacementPro Team"""
    return send_email(to, subject, body)
