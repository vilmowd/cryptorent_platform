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
        # --- NEW: TRADE AMOUNT ---
        trade_amount_usd=bot_data.get("trade_amount_usd", 15.0),
        # ------------------------
        telegram_bot_token=bot_data.get("bot_token"),
        telegram_chat_id=bot_data.get("chat_id"),
        updated_at=None
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
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    price = bot.last_known_price or 0
    rsi = bot.last_rsi or 0
    ema200 = bot.last_ema_200 or 0
    ema20 = bot.last_ema_20 or 0

    return {
        "id": bot.id,
        "symbol": bot.symbol,
        "is_running": bot.is_running,
        "in_position": bot.in_position,
        "buy_price": bot.buy_price,
        "daily_pnl": f"${bot.daily_pnl:,.2f}",
        "daily_pnl_value": bot.daily_pnl,
        "current_price": price,
        "rsi_value": rsi,
        "last_ema_200": ema200,
        "last_ema_20": ema20,
        "last_sync": bot.updated_at.isoformat() if bot.updated_at else None,
        
        "telegram_bot_token": bot.telegram_bot_token,
        "telegram_chat_id": bot.telegram_chat_id,

        "min_trade_price": bot.min_trade_price,
        "max_trade_price": bot.max_trade_price,
        "max_daily_loss": bot.max_daily_loss,
        # --- NEW: TRADE AMOUNT ---
        "trade_amount_usd": bot.trade_amount_usd,
        # ------------------------
        "take_profit": bot.take_profit or 1.05,
        "stop_loss": bot.stop_loss or 0.98,
        
        "decision_factors": {
            "is_trend_ok": price > ema200 if price and ema200 else False,
            "is_rsi_pullback": 30 < rsi < 60 if rsi else False,
            "is_near_ema": price <= (ema20 * 1.001) if price and ema20 else False
        }
    }

@router.patch("/{bot_id}/update-settings")
async def update_safety_thresholds(
    bot_id: int, 
    settings_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Update Safety Thresholds
    if "min_trade_price" in settings_data:
        bot.min_trade_price = float(settings_data["min_trade_price"])
    
    if "max_trade_price" in settings_data:
        bot.max_trade_price = float(settings_data["max_trade_price"])
        
    if "max_daily_loss" in settings_data:
        bot.max_daily_loss = float(settings_data["max_daily_loss"])

    # --- NEW: UPDATE TRADE AMOUNT ---
    if "trade_amount_usd" in settings_data:
        val = float(settings_data["trade_amount_usd"])
        if val < 5.0:
            raise HTTPException(status_code=400, detail="Trade amount must be at least $5.00")
        bot.trade_amount_usd = val
    # --------------------------------

    # Update Telegram Credentials
    if "bot_token" in settings_data:
        val = settings_data["bot_token"]
        bot.telegram_bot_token = val.strip() if (val and val.strip()) else None

    if "chat_id" in settings_data:
        val = settings_data["chat_id"]
        bot.telegram_chat_id = val.strip() if (val and val.strip()) else None
    
    try:
        db.commit()
        db.refresh(bot)
        return {
            "status": "success",
            "message": "Safety, Trade Amount, and Telegram settings synchronized",
            "bot_id": bot.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist settings: {str(e)}")

@router.post("/{bot_id}/toggle")
async def toggle_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bot = db.query(BotInstance).filter(BotInstance.id == bot_id, BotInstance.user_id == current_user.id).first()
    if not bot: raise HTTPException(status_code=404, detail="Bot not found")
    
    if not bot.is_running and not current_user.is_subscription_active:
        raise HTTPException(status_code=402, detail="Subscription inactive")

    bot.is_running = not bot.is_running
    
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
    

@router.post("/{bot_id}/force-trade")
async def force_trade(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bot = db.query(BotInstance).filter(BotInstance.id == bot_id, BotInstance.user_id == current_user.id).first()
    if not bot: raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.force_action = "SELL" if bot.in_position else "BUY"
    db.commit()
    
    return {"status": "signal_sent", "action": bot.force_action}


@router.post("/panic-close-all")
async def panic_close_all(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_positions = db.query(BotInstance).filter(
        BotInstance.user_id == current_user.id,
        BotInstance.in_position == True
    ).all()

    if not active_positions:
        return {"message": "No active positions found. System is already clear."}

    for bot in active_positions:
        bot.force_action = "SELL"
    
    try:
        db.commit()
        return {
            "status": "PANIC_INITIATED",
            "count": len(active_positions),
            "message": f"Emergency sell signals sent for {len(active_positions)} bots."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Panic command failed to persist.")
    

@router.post("/{bot_id}/reset-pnl")
def reset_bot_pnl(bot_id: int, db: Session = Depends(get_db)):
    bot = db.query(BotInstance).filter(BotInstance.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.daily_pnl = 0.0
    db.commit()
    
    return {"message": f"Daily PnL for Bot {bot_id} has been reset to $0.00"}