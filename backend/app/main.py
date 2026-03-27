import os
import threading
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- 1. ENV LOADING ---
load_dotenv()

# --- 2. DATABASE INITIALIZATION ---
from init_db import setup_database
setup_database()

# --- 3. TRADING ENGINE INTEGRATION ---
# Import your engine start function
# Adjust the import path if your file is named differently!
from core.engine import start_engine 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This block runs ON STARTUP
    print("🧵 [SYSTEM] Starting Trading Engine thread...")
    engine_thread = threading.Thread(target=start_engine, daemon=True)
    engine_thread.start()
    
    yield  # The API runs here...
    
    # This block runs ON SHUTDOWN
    print("🛑 [SYSTEM] Shutting down API and Engine...")

# --- 4. APP INITIALIZATION ---
app = FastAPI(title="CryptoRent Bot API", lifespan=lifespan)

# --- 5. CORS CONFIGURATION ---
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
    allow_origins=["*"], # Since you have origins defined, you can use allow_origins=origins for better security
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
        "environment": "Production" if os.getenv("RAILWAY_ENVIRONMENT") else "Local"
    }