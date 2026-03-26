import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
# Load .env for local development. Railway will ignore this and use its own Dashboard Variables.
load_dotenv() 

# --- 2. DATABASE & MODULE IMPORTS ---
from app.database import engine, Base
from app.api import auth, bots, dashboard, trades, webhooks
from core import billing 

# Sync Database Tables
Base.metadata.create_all(bind=engine)

# --- 3. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 4. CORS CONFIGURATION (The "Gatekeeper") ---
# We get the FRONTEND_URL from Railway's variables.
# If it's not found (like on your local PC), it defaults to localhost:3000.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    FRONTEND_URL,  # This allows your live Railway frontend to talk to this API
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- 5. SYSTEM DIAGNOSTICS ---
# Added FRONTEND_URL check so you can verify it's pointing to the right place
print("\n--- 🚀 SYSTEM CHECK ---")
print(f"📡 API Mode:    {'PRODUCTION' if os.getenv('RAILWAY_ENVIRONMENT') else 'LOCAL'}")
print(f"🌐 Frontend:    {FRONTEND_URL}")
print(f"💳 Stripe Key:  {'✅' if os.getenv('STRIPE_SECRET_KEY') else '❌'}")
print(f"🔐 JWT Secret:  {'✅' if os.getenv('JWT_SECRET') else '❌'}")
print(f"💰 Price ID:    {'✅' if os.getenv('STRIPE_PRICE_ID') else '❌'}")
print("-----------------------\n")

# --- 6. ROUTER REGISTRATION ---
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
        "version": "1.0.0",
        "status": "Operational",
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }