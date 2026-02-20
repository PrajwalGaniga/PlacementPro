import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

# In-memory OTP store: email -> (otp, expiry)
otp_store: Dict[str, Tuple[str, datetime]] = {}

OTP_EXPIRY_MINUTES = 10

# Backdoor credentials for testing
BACKDOOR_EMAIL = "bangeraujwal35@gmail.com"
BACKDOOR_OTP = "123456"

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


async def send_otp(email: str) -> str:
    """Generate and send OTP. Returns the generated OTP."""
    # Backdoor: always store 123456 for test email
    if email.lower() == BACKDOOR_EMAIL.lower():
        otp_store[email.lower()] = (
            BACKDOOR_OTP,
            datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        )
        return BACKDOOR_OTP

    otp = generate_otp()
    otp_store[email.lower()] = (
        otp,
        datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px;
                border-radius: 12px; background: #0f172a; color: #e2e8f0;">
        <h2 style="color: #6366f1; margin-bottom: 8px;">PlacementPro AI</h2>
        <p style="margin-bottom: 24px;">Your One-Time Password (OTP) for login:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px;
                    color: #a78bfa; text-align: center; padding: 24px;
                    background: #1e293b; border-radius: 8px; margin-bottom: 24px;">
            {otp}
        </div>
        <p style="color: #94a3b8; font-size: 14px;">
            This OTP expires in {OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.
        </p>
    </div>
    """

    message = MessageSchema(
        subject="PlacementPro AI – Your Login OTP",
        recipients=[email],
        body=html_body,
        subtype="html",
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """Verify OTP for email. Returns True if valid."""
    key = email.lower()

    # Backdoor check
    if key == BACKDOOR_EMAIL.lower() and otp == BACKDOOR_OTP:
        return True

    if key not in otp_store:
        return False

    stored_otp, expiry = otp_store[key]
    if datetime.utcnow() > expiry:
        del otp_store[key]
        return False

    if stored_otp != otp:
        return False

    del otp_store[key]
    return True
