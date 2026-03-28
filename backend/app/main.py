import os
import threading
import time
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DELAYED IMPORTS ---
# We import these here to ensure they don't trigger side effects before env is ready
from init_db import setup_database
from core.engine import start_engine 
from api import auth, bots, dashboard, trades, webhooks
from core import billing 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- ON STARTUP ---
    print("\n--- 🚀 SYSTEM BOOT SEQUENCE ---")
    
    # A. Initialize Database Schema
    # This MUST happen before the engine tries to SELECT from bot_instances
    print("🗄️ [1/3] Initializing Database...")
    try:
        setup_database()
        print("✅ [2/3] Database synced successfully.")
    except Exception as e:
        print(f"❌ [CRITICAL] Database initialization failed: {e}")
        # On Railway, you want the app to crash here so you can see why in the logs
        raise e

    # B. Safety Buffer
    # Gives the DB driver a moment to stabilize before heavy threading begins
    time.sleep(1.5)

    # C. Start Trading Engine
    print("🧵 [3/3] Starting Trading Engine thread...")
    engine_thread = threading.Thread(target=start_engine, daemon=True)
    engine_thread.start()
    
    print("🟢 [SYSTEM] API & Engine are now LIVE.\n")
    
    yield  # --- API IS ACTIVE HERE ---
    
    # --- ON SHUTDOWN ---
    print("🛑 [SYSTEM] Shutting down API and Engine...")

# --- 3. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API", lifespan=lifespan)

# --- 4. CORS CONFIGURATION ---
# Dynamically pull frontend URL from environment
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
    allow_origins=origins, # Using your secure list instead of "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 5. ROUTER REGISTRATION ---
app.include_router(auth.router, prefix="/auth")
app.include_router(bots.router)
app.include_router(dashboard.router)
app.include_router(trades.router)
app.include_router(billing.router)
app.include_router(webhooks.router)

@app.get("/")
async def root():
    return {
        "message": "CryptoRent API is Online", 
        "status": "Operational",
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local",
        "timestamp": time.time()
    }