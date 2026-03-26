from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from models.bot import BotInstance
from models.user import User
from app.api.auth import get_current_user # Updated import path for consistency

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_my_dashboard(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Consolidated endpoint for the main Dashboard view.
    """
    # 1. FIXED: Fetch bots belonging to the CURRENT user
    bots = db.query(BotInstance).filter(BotInstance.user_id == current_user.id).all()
    
    # 2. Format bot list to match BotCard.jsx requirements
    bot_list = []
    for bot in bots:
        bot_list.append({
            "id": bot.id,
            "symbol": bot.symbol,
            "is_running": bot.is_running,
            # Ensure currency is formatted as a float for frontend flexibility
            "daily_pnl": round(float(bot.daily_pnl or 0), 2),
            "last_rsi": round(float(bot.last_rsi or 0), 2),
            "consecutive_losses": bot.consecutive_losses or 0,
            "status": "active" if bot.is_running else "paused"
        })

    # 3. Return data matching the frontend's new state variables
    return {
        "email": current_user.email,
        "is_subscription_active": current_user.is_subscription_active,
        "unpaid_fees": round(float(current_user.unpaid_fees or 0), 2),
        "has_bots": len(bot_list) > 0,
        "bots": bot_list
    }