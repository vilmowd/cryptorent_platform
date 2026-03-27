import json
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from models.bot import BotInstance
from models.user import User
from api.auth import get_current_user 
from datetime import datetime, timezone

router = APIRouter(prefix="/bots", tags=["Bots"])

# --- Helper for API Keys ---
def encrypt_key(key: str):
    if not key: return None
    # Note: Consider using a real library like 'cryptography' for production!
    return f"dev_enc_{key[::-1]}" 

@router.get("/my-bots")
async def list_user_bots(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bots = db.query(BotInstance).filter(BotInstance.user_id == current_user.id).all()
    return [{"id": b.id, "symbol": b.symbol} for b in bots]

@router.post("/settings/new")
async def create_bot(bot_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    api_key = bot_data.get("api_key")
    api_secret = bot_data.get("api_secret")
    platform = bot_data.get("platform", "kraken").lower()
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="API Key and Secret are required")

    new_bot = BotInstance(
        user_id=current_user.id,
        platform=platform,
        symbol=bot_data.get("symbol", "BTC/USD"),
        encrypted_api_key=encrypt_key(api_key),
        encrypted_secret=encrypt_key(api_secret),
        is_running=False,
        daily_pnl=0.0,
        min_trade_price=bot_data.get("min_trade_price", 0.0),
        max_trade_price=bot_data.get("max_trade_price", 999999.0),
        max_daily_loss=bot_data.get("max_daily_loss", 50.0),
        telegram_bot_token=bot_data.get("bot_token"),
        telegram_chat_id=bot_data.get("chat_id"),
        updated_at=None  # Explicitly start as None
    )

    try:
        db.add(new_bot)
        db.commit()
        return {"message": "Bot initialized successfully", "bot_id": new_bot.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{bot_id}/stats")
async def get_bot_stats(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch the bot and ensure it belongs to the current user
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # 2. Extract values with safe defaults for the UI
    price = bot.last_known_price or 0
    rsi = bot.last_rsi or 0
    ema200 = bot.last_ema_200 or 0
    ema20 = bot.last_ema_20 or 0

    # 3. Return the payload exactly as the React BotCard expects it
    return {
        "id": bot.id,
        "symbol": bot.symbol,
        "is_running": bot.is_running,
        "daily_pnl": f"${bot.daily_pnl:,.2f}",
        "current_price": price,
        "rsi_value": rsi,
        
        # This ISO format allows the React Date() constructor to work correctly
        "last_sync": bot.updated_at.isoformat() if bot.updated_at else None,
        
        # --- TELEGRAM PERSISTENCE FIX ---
        # These keys must match the state setters in your BotCard.js
        "telegram_bot_token": bot.telegram_bot_token,
        "telegram_chat_id": bot.telegram_chat_id,
        
        # --- THRESHOLD PERSISTENCE FIX ---
        "min_trade_price": bot.min_trade_price or 0.0,
        "max_trade_price": bot.max_trade_price or 999999.0,
        "max_daily_loss": bot.max_daily_loss or 0.0,
        
        # --- ANALYTICS LOGIC ---
        "decision_factors": {
            "is_trend_ok": price > ema200 if price and ema200 else False,
            "is_rsi_pullback": bot.rsi_low < rsi < bot.rsi_high if rsi else False,
            "is_near_ema": price <= ema20 if price and ema20 else False
        }
    }

@router.patch("/{bot_id}/update-settings")
async def update_safety_thresholds(
    bot_id: int, 
    settings_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. Locate the specific bot for the current user
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # 2. Update Safety Thresholds (Price Floors/Ceilings)
    # We use .get() and check for existence to avoid overwriting with None 
    # unless intended.
    if "min_trade_price" in settings_data:
        bot.min_trade_price = float(settings_data["min_trade_price"])
    
    if "max_trade_price" in settings_data:
        bot.max_trade_price = float(settings_data["max_trade_price"])
        
    if "max_daily_loss" in settings_data:
        bot.max_daily_loss = float(settings_data["max_daily_loss"])
    
    # 3. Update Telegram Credentials
    # Mapping 'bot_token' from React payload to 'telegram_bot_token' in DB
    if "bot_token" in settings_data:
        val = settings_data["bot_token"]
        # If the string is empty or just spaces, store as NULL in DB
        bot.telegram_bot_token = val.strip() if (val and val.strip()) else None

    if "chat_id" in settings_data:
        val = settings_data["chat_id"]
        bot.telegram_chat_id = val.strip() if (val and val.strip()) else None
    
    try:
        db.commit()
        db.refresh(bot) # Refresh to get the latest state from DB
        return {
            "status": "success",
            "message": "Safety and Telegram settings synchronized",
            "bot_id": bot.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to persist settings: {str(e)}"
        )

@router.post("/{bot_id}/toggle")
async def toggle_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bot = db.query(BotInstance).filter(BotInstance.id == bot_id, BotInstance.user_id == current_user.id).first()
    if not bot: raise HTTPException(status_code=404, detail="Bot not found")
    
    if not bot.is_running and not current_user.is_subscription_active:
        raise HTTPException(status_code=402, detail="Subscription inactive")

    # Change State
    bot.is_running = not bot.is_running
    
    # --- TRIGGER STARTUP ALERT ---
    # When starting, we wipe updated_at so the Engine sends the Telegram alert on the first tick
    if bot.is_running:
        bot.updated_at = None
    
    db.commit()
    return {"is_running": bot.is_running}

@router.get("/{bot_id}/trades")
async def get_bot_trades(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    filename = f"trades_bot_{bot_id}.json"
    if os.path.exists(filename):
        with open(filename, "r") as f:
            return json.load(f)
    return []

@router.get("/{bot_id}/logs")
async def get_bot_logs(bot_id: int, current_user: User = Depends(get_current_user)):
    log_path = "error_log.txt"
    if not os.path.exists(log_path):
        return {"logs": ["System clean. No logs detected."]}
    with open(log_path, "r") as f:
        return {"logs": f.readlines()[-50:]}