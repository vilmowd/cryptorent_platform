import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv() 

# --- 2. DATABASE & MODEL IMPORTS ---
from database import engine, Base
# IMPORTANT: You MUST import your models here. 
# If your User model is in a file called models.py, import it like this:
# from models import User 
# If it's inside api/auth.py, ensure it's imported before create_all.
from api.auth import User # Assuming User model is defined/imported in auth.py

# --- 3. SYNC DATABASE TABLES ---
# This line now has "knowledge" of the User model and will create the table.
print("Checking and creating database tables...")
Base.metadata.create_all(bind=engine)

# --- 4. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 5. CORS CONFIGURATION ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    FRONTEND_URL,
    # Adding the non-www or variations if Railway uses them
    FRONTEND_URL.replace("https://", "http://"), 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- 6. SYSTEM DIAGNOSTICS ---
print("\n--- 🚀 SYSTEM CHECK ---")
print(f"📡 API Mode:    {'PRODUCTION' if os.getenv('RAILWAY_ENVIRONMENT') else 'LOCAL'}")
print(f"🌐 Frontend:    {FRONTEND_URL}")
print(f"💳 Stripe Key:  {'✅' if os.getenv('STRIPE_SECRET_KEY') else '❌'}")
print(f"🔐 JWT Secret:  {'✅' if os.getenv('JWT_SECRET') else '❌'}")
print(f"💰 Price ID:    {'✅' if os.getenv('STRIPE_PRICE_ID') else '❌'}")
print("-----------------------\n")

# --- 7. ROUTER REGISTRATION ---
# Imports are already done at the top, now we just include them
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
        "version": "1.0.0",
        "status": "Operational",
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }