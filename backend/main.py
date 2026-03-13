"""
main.py – FastAPI application entry point.
New rebuild with clean modular structure.
"""

import re
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from config import settings
from database import create_indexes

# ── Import all routers ────────────────────────────────────────────────────────
from routes.auth import router as auth_router
from routes.super_admin import router as super_admin_router
from routes.tpo import router as tpo_router
from routes.drive import router as drive_router
from routes.student import router as student_router
from routes.bot import router as bot_router
from routes.scheduler import router as scheduler_router
from routes.notifications import router as notifications_router


# ── Startup / Shutdown lifecycle ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("  PlacementPro API – Starting up…")
    # Validate required config
    try:
        settings.validate_required()
        print(f"  ✅ Config validated")
        print(f"  📊 Database: {settings.MONGO_URL}/{settings.DB_NAME}")
        print(f"  🔒 JWT expiry: {settings.JWT_EXPIRATION_MINUTES} min")
        print(f"  🛠  Dev mode: {settings.DEV_MODE}")
    except RuntimeError as e:
        print(f"  ❌ {e}")
        raise

    # Create MongoDB indexes
    try:
        await create_indexes()
        print("  ✅ MongoDB indexes created/verified")
    except Exception as e:
        print(f"  ⚠️  Index creation failed (non-fatal): {e}")

    print("=" * 60)
    yield
    print("PlacementPro API – Shutdown complete.")


# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="PlacementPro API",
    description="Multi-tenant AI-powered College Placement Management System",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Permissive for Flutter + ngrok
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (served at /static) ─────────────────────────────────────────
from pathlib import Path
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Don't swallow HTTPExceptions – let FastAPI handle them
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    print(f"[UNHANDLED ERROR] {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "details": str(exc)},
    )

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Meta"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}

# ── Register all routers ──────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(super_admin_router)
app.include_router(tpo_router)
app.include_router(drive_router)
app.include_router(student_router)
app.include_router(bot_router)
app.include_router(scheduler_router)
app.include_router(notifications_router)


# ── Dev entrypoint ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
