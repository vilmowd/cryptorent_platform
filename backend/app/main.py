import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv() 

# --- 2. DATABASE & BASE IMPORT ---
from database import engine, Base

# --- 3. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API")

# --- 4. ROUTER IMPORTS (Must happen BEFORE metadata.create_all) ---
# This ensures all models (User, etc.) are registered with the 'Base'
from api import auth, bots, dashboard, trades, webhooks
from core import billing 

# --- 5. SYNC DATABASE TABLES ---
# Now 'Base' has been populated by the imports above.
print("\n--- 🗄️ DATABASE SYNC ---")
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables checked/created successfully.")
except Exception as e:
    print(f"❌ Database sync failed: {e}")
print("-----------------------\n")

# --- 6. CORS CONFIGURATION ---
# Clean the URL to avoid trailing slash mismatches
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

# --- 7. SYSTEM DIAGNOSTICS ---
print("--- 🚀 SYSTEM CHECK ---")
print(f"📡 API Mode:    {'PRODUCTION' if os.getenv('RAILWAY_ENVIRONMENT') else 'LOCAL'}")
print(f"🌐 Frontend:    {FRONTEND_URL}")
print(f"💳 Stripe Key:  {'✅' if os.getenv('STRIPE_SECRET_KEY') else '❌'}")
print(f"🔐 JWT Secret:  {'✅' if os.getenv('JWT_SECRET') else '❌'}")
print(f"💰 Price ID:    {'✅' if os.getenv('STRIPE_PRICE_ID') else '❌'}")
print("-----------------------\n")

# --- 8. ROUTER REGISTRATION ---
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
        "version": "1.1.0",
        "status": "Operational",
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }