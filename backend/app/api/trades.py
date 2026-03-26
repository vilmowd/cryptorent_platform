from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from models.trade import Trade
from models.bot import BotInstance
from models.user import User
from app.api.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/trades", tags=["Trades"])

@router.get("/{bot_id}")
async def get_bot_trade_history(
    bot_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the last 50 trades for a specific bot.
    Includes a security check to ensure the bot belongs to the user.
    """
    # 1. Security Check: Ensure the bot exists and belongs to the user
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    # 2. Fetch Trades
    trades = db.query(Trade).filter(
        Trade.bot_id == bot_id
    ).order_by(Trade.timestamp.desc()).limit(50).all()

    # 3. Format for Frontend (TradeHistory.jsx)
    return [
        {
            "id": t.id,
            "timestamp": t.timestamp,
            "action": t.side, # This will show "BUY (STRATEGY)" or "SELL (STOP LOSS)"
            "price": f"{t.price:,.2f}",
            "size": f"{t.amount:.6f}",
            "pnl": f"{t.pnl:+.2f}" if t.pnl else "0.00",
            # Calculate a theoretical 10% performance fee for display
            "fee": f"{(t.pnl * 0.10):.2f}" if t.pnl and t.pnl > 0 else "0.00"
        }
        for t in trades
    ]

@router.get("/{bot_id}/summary")
async def get_bot_summary(
    bot_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Calculates aggregate stats for the bot's lifetime performance.
    """
    # 1. Verify Ownership
    bot = db.query(BotInstance).filter(
        BotInstance.id == bot_id, 
        BotInstance.user_id == current_user.id
    ).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # 2. Fetch all trades to calculate stats
    trades = db.query(Trade).filter(Trade.bot_id == bot_id).all()

    if not trades:
        return {
            "total_pnl_percent": "0.00%",
            "win_rate": "0%",
            "trade_count": 0,
            "net_profit_usd": "$0.00"
        }

    # 3. Perform Calculations
    # We only count 'SELL' actions for PnL and Win Rate
    closed_trades = [t for t in trades if t.pnl is not None and t.pnl != 0]
    
    total_net_profit = sum(t.pnl for t in closed_trades)
    wins = len([t for t in closed_trades if t.pnl > 0])
    trade_count = len(closed_trades)
    
    win_rate = (wins / trade_count * 100) if trade_count > 0 else 0
    
    # Calculate PnL % based on the bot's configured trade amount
    pnl_percent = (total_net_profit / bot.trade_amount_usd * 100) if bot.trade_amount_usd > 0 else 0

    return {
        "total_pnl_percent": f"{pnl_percent:+.2f}%",
        "win_rate": f"{win_rate:.1f}%",
        "trade_count": trade_count,
        "net_profit_usd": f"${total_net_profit:,.2f}"
    }