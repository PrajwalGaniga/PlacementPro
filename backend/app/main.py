from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import connect_db, close_db
from app.routes import tpo, drive, student,scheduler,top_resume
import os

app = FastAPI(
    title="PlacementPro AI",
    description="Multi-tenant Autonomous Placement Management System v2",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded logos as static files at /logos/*
LOGO_DIR = os.path.join(os.path.dirname(__file__), "..", "drive-logos")
os.makedirs(LOGO_DIR, exist_ok=True)
app.mount("/logos", StaticFiles(directory=LOGO_DIR), name="logos")


@app.on_event("startup")
async def startup_event():
    await connect_db()


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


app.include_router(tpo.router)
app.include_router(drive.router)
app.include_router(student.router)
app.include_router(scheduler.router)
app.include_router(top_resume.router)

@app.get("/")
async def root():
    return {"message": "PlacementPro AI v2", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
