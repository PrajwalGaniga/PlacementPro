"""
config.py – Centralised settings loaded from .env file.
Raises a clear exception at import time if any required variable is missing.
"""

import json
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",          # ignore unknown keys like EXTRA=…
    )

    # ── Database ───────────────────────────────────────────────────────
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "placementpro"

    # ── Security ───────────────────────────────────────────────────────
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 hours

    # ── AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str

    # ── Email (map old var names as aliases) ───────────────────────────
    EMAIL_HOST: str = ""
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""

    # Fallback to old naming convention present in .env
    MAIL_SERVER: str = ""
    MAIL_PORT: int = 587
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""

    # ── Dev / Feature flags ────────────────────────────────────────────
    DEV_MODE: bool = True
    DEV_ALLOWED_EMAILS: str = '["ishwarya9448@gmail.com","anvithashetty41@gmail.com","prajwalganiga06@gmail.com"]'

    # ── Server ─────────────────────────────────────────────────────────
    PORT: int = 8000

    # ── Super Admin (fixed credentials) ───────────────────────────────
    SUPER_ADMIN_EMAIL: str = "prajwal@gmail.com"
    SUPER_ADMIN_PASSWORD: str = "12345"

    # ── Fixed college (seeded) ─────────────────────────────────────────
    DEFAULT_COLLEGE_ID: str = "SIT_001"

    def get_effective_email_host(self) -> str:
        return self.EMAIL_HOST or self.MAIL_SERVER or "smtp.gmail.com"

    def get_effective_email_port(self) -> int:
        return self.EMAIL_PORT or self.MAIL_PORT or 587

    def get_effective_email_user(self) -> str:
        return self.EMAIL_USER or self.MAIL_USERNAME or ""

    def get_effective_email_password(self) -> str:
        return self.EMAIL_PASSWORD or self.MAIL_PASSWORD or ""

    def get_dev_allowed_emails(self) -> List[str]:
        try:
            return json.loads(self.DEV_ALLOWED_EMAILS)
        except Exception:
            return []

    def validate_required(self) -> None:
        """Called at startup to raise a clear error for missing required vars."""
        missing = []
        if not self.JWT_SECRET:
            missing.append("JWT_SECRET")
        if not self.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY")
        if not self.MONGO_URL:
            missing.append("MONGO_URL")
        if missing:
            raise RuntimeError(
                f"[STARTUP ERROR] Missing required environment variables: {', '.join(missing)}. "
                "Please set them in your .env file before starting the server."
            )


# Singleton – imported everywhere
settings = Settings()
