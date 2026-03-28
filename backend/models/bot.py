from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime, timezone

class BotInstance(Base):
    __tablename__ = "bot_instances"

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Relationships ---
    user_id = Column(Integer, ForeignKey("users.id"), index=True) 
    owner = relationship("User", back_populates="bots")
    trades = relationship("Trade", back_populates="bot", cascade="all, delete-orphan")
    
    # --- Connection & Identity ---
    platform = Column(String) 
    symbol = Column(String, default="BTC/USD")
    encrypted_api_key = Column(String(500))
    encrypted_secret = Column(String(500))
    encrypted_passphrase = Column(String(500), nullable=True) 

    # --- User-Defined Parameters ---
    trade_amount_usd = Column(Float, default=15.0) 
    rsi_low = Column(Integer, default=35)
    rsi_high = Column(Integer, default=65)
    take_profit = Column(Float, default=1.03)
    stop_loss = Column(Float, default=0.98)
    
    # --- Price Guardrails ---
    min_trade_price = Column(Float, default=0.0)
    max_trade_price = Column(Float, default=999999.0)
    
    # --- Risk Controls ---
    max_daily_loss = Column(Float, default=50.0)      
    max_consecutive_losses = Column(Integer, default=3)
    cooldown_minutes = Column(Integer, default=15)

    # --- Live Bot State ---
    is_running = Column(Boolean, default=False)
    in_position = Column(Boolean, default=False)
    buy_price = Column(Float, default=0.0)
    position_size = Column(Float, default=0.0) 
    daily_pnl = Column(Float, default=0.0)      
    unrealized_pnl = Column(Float, default=0.0) 
    consecutive_losses = Column(Integer, default=0)
    
    # --- EMERGENCY & MANUAL OVERRIDE ---
    force_action = Column(String, nullable=True) 

    # FIXED: Use a function reference for default, not an immediately executed string
    # This ensures the date is generated when the bot is CREATED, not when the server starts.
    last_trade_day = Column(String, default=lambda: datetime.now(timezone.utc).strftime('%Y-%m-%d'))
    last_loss_time = Column(DateTime, nullable=True)

    # --- Indicators & Live Stats ---
    last_known_price = Column(Float, default=0.0)
    last_rsi = Column(Float, default=0.0)
    last_ema_200 = Column(Float, default=0.0)
    last_ema_20 = Column(Float, default=0.0)

    # --- Telegram Credentials ---
    
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    
    # FIXED: Standardize heartbeat to auto-update on every change
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))