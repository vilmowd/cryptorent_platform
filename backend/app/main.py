import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DATABASE INITIALIZATION ---
from init_db import setup_database
setup_database()

# --- 3. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 4. CORS CONFIGURATION ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    FRONTEND_URL,
    "https://cryptocommandcenter.net",                          # NEW DOMAIN
    "https://www.cryptocommandcenter.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 5. ROUTER REGISTRATION ---
# Note: Ensure these paths match your folder structure (backend/app/api/...)
from app.api import auth, bots, dashboard, trades, webhooks
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
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }