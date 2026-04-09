import os
import threading
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

# Project root .env (repo root). Railway injects the same variable names in production.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from init_db import setup_database
from core.engine import start_engine 
from api import auth, bots, dashboard, trades
from core import billing

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n--- 🚀 SYSTEM BOOT SEQUENCE ---")
    try:
        setup_database()
        print("✅ Database synced.")
    except Exception as e:
        print(f"❌ DB Failure: {e}")
        raise e

    time.sleep(1.5)
    engine_thread = threading.Thread(target=start_engine, daemon=True)
    engine_thread.start()
    yield

app = FastAPI(title="CryptoRent Bot API", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
# Comma-separated extra origins for staging/preview (e.g. Railway/Vercel URLs)
_extra = os.getenv("CORS_ORIGINS", "").strip()
_extra_origins = [o.strip().rstrip("/") for o in _extra.split(",") if o.strip()]
origins = list(
    dict.fromkeys(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            FRONTEND_URL,
            "https://cryptocommandcenter.net",
            "https://www.cryptocommandcenter.net",
            "https://cryptorentplatform-production.up.railway.app",
            *_extra_origins,
        ]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER REGISTRATION ---
app.include_router(auth.router, prefix="/auth")
app.include_router(bots.router)
app.include_router(dashboard.router)
app.include_router(trades.router)

# THE FIX: Add the prefix here because it was removed from core/billing.py
app.include_router(billing.router, prefix="/billing")

@app.get("/")
async def root():
    return {"message": "CryptoRent API is Online"}


@app.get("/downloads/cryptocommandcenter.apk")
async def download_android_apk():
    """Public Android app package (debug build)."""
    apk = (
        Path(__file__).resolve().parent.parent
        / "static"
        / "downloads"
        / "cryptocommandcenter.apk"
    )
    if not apk.is_file():
        raise HTTPException(status_code=404, detail="APK file is not available on this server.")
    return FileResponse(
        path=apk,
        filename="cryptocommandcenter.apk",
        media_type="application/vnd.android.package-archive",
    )