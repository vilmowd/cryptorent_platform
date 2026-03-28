import os
import threading
import time
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

load_dotenv()

from init_db import setup_database
from core.engine import start_engine 
from api import auth, bots, dashboard, trades, webhooks
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
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    FRONTEND_URL,
    "https://cryptocommandcenter.net",
    "https://www.cryptocommandcenter.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REVERTED ROUTER REGISTRATION ---
app.include_router(auth.router, prefix="/auth")
app.include_router(bots.router)
app.include_router(dashboard.router)
app.include_router(trades.router)
app.include_router(billing.router) # Back to the original call
app.include_router(webhooks.router)

@app.get("/")
async def root():
    return {"message": "CryptoRent API is Online"}