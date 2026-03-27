import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DATABASE & MODEL DISCOVERY ---
from database import engine, Base

# CRITICAL FIX: We must explicitly import the models so Base "sees" them.
# Based on your logs, your models are likely inside your API files.
# Importing these registers 'users', 'bots', and 'trades' into Base.metadata.
try:
    from api.auth import User
    # Import other models here if they are in different files, e.g.:
    # from api.bots import BotInstance
    # from api.trades import Trade
    print(f"✅ Models registered: {list(Base.metadata.tables.keys())}")
except ImportError as e:
    print(f"⚠️ Warning: Could not import models directly: {e}")
    # If the above fails, your routers below will eventually load them, 
    # but we want them loaded BEFORE create_all runs.

# --- 3. IMMEDIATE DATABASE SYNC ---
print("\n--- 🗄️ DATABASE INITIALIZATION ---")
try:
    # This command creates any table that is missing in Postgres
    Base.metadata.create_all(bind=engine)
    if not Base.metadata.tables:
        print("❌ WARNING: No tables found to create. Check your model imports!")
    else:
        print(f"✅ SUCCESS: Tables synced: {list(Base.metadata.tables.keys())}")
except Exception as e:
    print(f"❌ DATABASE ERROR: {e}")
print("----------------------------------\n")

# --- 4. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 5. CORS CONFIGURATION ---
# Added "*" to origins temporarily to bypass the CORS error 
# caused by the 500 Internal Server Error.
FRONTEND_URL = os.getenv("FRONTEND_URL", "").rstrip("/")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "https://cryptorentplatform-production.up.railway.app",
    FRONTEND_URL,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not FRONTEND_URL else origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. ROUTER REGISTRATION ---
from api import auth, bots, dashboard, trades, webhooks
from core import billing 

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
        "tables_detected": list(Base.metadata.tables.keys())
    }