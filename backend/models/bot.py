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
    encrypted_api_key = Column(String)
    encrypted_secret = Column(String)
    encrypted_passphrase = Column(String, nullable=True) 

    # --- User-Defined Parameters ---
    trade_amount_usd = Column(Float, default=100.0)
    rsi_low = Column(Integer, default=35)
    rsi_high = Column(Integer, default=65)
    take_profit = Column(Float, default=1.03)  # 3% profit
    stop_loss = Column(Float, default=0.98)    # 2% loss
    
    # --- NEW: Price Guardrails (Safety Thresholds) ---
    min_trade_price = Column(Float, default=0.0)      # Floor: Don't buy below this
    max_trade_price = Column(Float, default=999999.0) # Ceiling: Don't buy above this
    
    # --- Risk Controls ---
    max_daily_loss = Column(Float, default=50.0)      # Max USD to lose daily
    max_consecutive_losses = Column(Integer, default=3)
    cooldown_minutes = Column(Integer, default=15)

    # --- Live Bot State ---
    is_running = Column(Boolean, default=False)
    in_position = Column(Boolean, default=False)
    buy_price = Column(Float, default=0.0)
    position_size = Column(Float, default=0.0)
    daily_pnl = Column(Float, default=0.0)
    consecutive_losses = Column(Integer, default=0)
    
    # Fixed: Standardized date string for easier daily resets
    last_trade_day = Column(String, default=lambda: str(datetime.now(timezone.utc).date()))
    last_loss_time = Column(DateTime, nullable=True)

    # --- Indicators & Live Stats ---
    last_known_price = Column(Float, default=0.0)
    last_rsi = Column(Float, default=0.0)
    last_ema_200 = Column(Float, default=0.0)
    last_ema_20 = Column(Float, default=0.0)


    # In models/bot.py
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    
    # Heartbeat: Tracks when the Python Engine last processed a tick
    updated_at = Column(DateTime, onupdate=func.now(), default=func.now())