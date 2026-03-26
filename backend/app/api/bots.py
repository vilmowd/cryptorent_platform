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

# --- Helper for API Keys (Simplified for Dev) ---
def encrypt_key(key: str):
    if not key: return None
    # Simple reverse-string "encryption" for development
    return f"dev_enc_{key[::-1]}" 

# --- ENDPOINTS ---

@router.get("/my-bots")
async def list_user_bots(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Returns a list of all bots owned by the current user."""
    bots = db.query(BotInstance).filter(BotInstance.user_id == current_user.id).all()
    return [{"id": b.id, "symbol": b.symbol} for b in bots]

@router.post("/settings/new")
async def create_bot(
    bot_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Initializes a new bot instance with optional Telegram support."""
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
        consecutive_losses=0,
        min_trade_price=bot_data.get("min_trade_price", 0.0),
        max_trade_price=bot_data.get("max_trade_price", 999999.0),
        max_daily_loss=bot_data.get("max_daily_loss", 50.0),
        # --- New Telegram Fields ---
        telegram_bot_token=bot_data.get("bot_token"),
        telegram_chat_id=bot_data.get("chat_id"),
        # ---------------------------
        last_known_price=0,
        last_rsi=0,
        last_ema_200=0,
        last_ema_20=0
    )

    try:
        db.add(new_bot)
        db.commit()
        db.refresh(new_bot)
        return {"message": "Bot initialized successfully", "bot_id": new_bot.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{bot_id}/stats")
async def get_bot_stats(
    bot_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Consolidated stats including Telegram credentials for the UI."""
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    price = bot.last_known_price or 0
    rsi = bot.last_rsi or 0
    ema200 = bot.last_ema_200 or 0

    return {
        "id": bot.id,
        "symbol": bot.symbol,
        "is_running": bot.is_running,
        "updated_at": bot.updated_at,
        "daily_pnl": f"${bot.daily_pnl:,.2f}",
        # --- Pass Telegram data back to React ---
        "bot_token": bot.telegram_bot_token,
        "chat_id": bot.telegram_chat_id,
        # ----------------------------------------
        "min_trade_price": bot.min_trade_price,
        "max_trade_price": bot.max_trade_price,
        "max_daily_loss": bot.max_daily_loss,
        "decision_factors": {
            "is_trend_ok": price > ema200 if price and ema200 else False,
            "is_rsi_pullback": bot.rsi_low < rsi < bot.rsi_high if rsi else False,
            "is_near_ema": price <= bot.last_ema_20 if price and bot.last_ema_20 else False
        }
    }

@router.patch("/{bot_id}/update-settings")
async def update_safety_thresholds(
    bot_id: int, 
    settings_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Updates thresholds and Telegram credentials."""
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        # Update Thresholds
        if "min_trade_price" in settings_data:
            bot.min_trade_price = float(settings_data["min_trade_price"])
        if "max_trade_price" in settings_data:
            bot.max_trade_price = float(settings_data["max_trade_price"])
        if "max_daily_loss" in settings_data:
            bot.max_daily_loss = float(settings_data["max_daily_loss"])
        
        # --- Update Telegram Credentials ---
        if "bot_token" in settings_data:
            bot.telegram_bot_token = settings_data["bot_token"]
        if "chat_id" in settings_data:
            bot.telegram_chat_id = settings_data["chat_id"]
        # ------------------------------------
        
        db.commit()
        return {"message": "Settings updated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Numerical values required for thresholds")

@router.post("/{bot_id}/toggle")
async def toggle_bot(
    bot_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Starts or stops the bot engine."""
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Check subscription status before allowing a start
    if not bot.is_running and not current_user.is_subscription_active:
        raise HTTPException(status_code=402, detail="Subscription inactive")

    bot.is_running = not bot.is_running
    db.commit()
    
    return {"message": "Status updated", "is_running": bot.is_running}

@router.get("/{bot_id}/trades")
async def get_bot_trades(
    bot_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Returns local trade history from the bot's JSON file."""
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    filename = f"trades_bot_{bot_id}.json"
    if os.path.exists(filename):
        try:
            with open(filename, "r") as f:
                return json.load(f)
        except:
            return []
    return []

@router.put("/{bot_id}/settings")
async def update_strategy_settings(
    bot_id: int, 
    settings_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Updates core strategy parameters like RSI and TP/SL."""
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.rsi_low = settings_data.get("rsi_low", bot.rsi_low)
    bot.rsi_high = settings_data.get("rsi_high", bot.rsi_high) 
    bot.take_profit = settings_data.get("tp", bot.take_profit)
    bot.stop_loss = settings_data.get("sl", bot.stop_loss)
    
    db.commit()
    return {"message": "Strategy settings updated"}