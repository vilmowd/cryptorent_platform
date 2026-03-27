import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DATABASE & MODEL DISCOVERY ---
from database import engine, Base

try:
    from models import User, BotInstance, Trade 
except ImportError:
    pass 

# --- 3. IMMEDIATE DATABASE SYNC ---
print("\n--- 🗄️ DATABASE INITIALIZATION ---")
try:
    # This checks the current state of the DB vs your Python models
    Base.metadata.create_all(bind=engine)
    print("✅ SUCCESS: Database tables are synced.")
except Exception as e:
    print(f"❌ DATABASE ERROR: {e}")
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
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. ROUTER REGISTRATION ---
# Import routers after the DB is initialized
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
    return {"message": "CryptoRent API is Online", "status": "Operational"}