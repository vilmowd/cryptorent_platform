import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DATABASE & MODEL DISCOVERY ---
from database import engine, Base

# CRITICAL: We import the routers/models HERE. 
# This "registers" User, BotInstance, and Trade with the Base object.
from api import auth, bots, dashboard, trades, webhooks
from core import billing 

# --- 3. IMMEDIATE DATABASE SYNC ---
# This happens before the FastAPI app even finishes initializing.
print("\n--- 🗄️ DATABASE INITIALIZATION ---")
try:
    # This command creates any table that is missing in Postgres
    Base.metadata.create_all(bind=engine)
    print("✅ SUCCESS: All tables (users, bots, trades) are synced.")
except Exception as e:
    print(f"❌ DATABASE ERROR: {e}")
    print("Tip: Check if DATABASE_URL starts with 'postgresql://' not 'postgres://'")
print("----------------------------------\n")

# --- 4. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 5. CORS CONFIGURATION ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    FRONTEND_URL,
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
print("--- 🚀 SYSTEM CHECK ---")
print(f"📡 API Mode:    {'PRODUCTION' if os.getenv('RAILWAY_ENVIRONMENT') else 'LOCAL'}")
print(f"🌐 Frontend:    {FRONTEND_URL}")
print(f"💳 Stripe Key:  {'✅' if os.getenv('STRIPE_SECRET_KEY') else '❌'}")
print(f"🔐 JWT Secret:  {'✅' if os.getenv('JWT_SECRET') else '❌'}")
print(f"💰 Price ID:    {'✅' if os.getenv('STRIPE_PRICE_ID') else '❌'}")
print("-----------------------\n")

# --- 7. ROUTER REGISTRATION ---
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
        "version": "1.2.0",
        "status": "Operational",
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }