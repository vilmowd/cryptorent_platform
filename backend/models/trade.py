from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bot_instances.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    symbol = Column(String)     
    side = Column(String)       # e.g., "BUY (STRATEGY ENTRY)" or "SELL (STOP LOSS)"
    price = Column(Float)       # The execution price from the exchange
    amount = Column(Float)      # The exact crypto quantity (e.g., 0.00025 BTC)
    
    # --- NEW: Fixed Amount Tracking ---
    # This stores the total USD value at the moment of execution (e.g., 15.0)
    cost_basis_usd = Column(Float, default=0.0) 
    
    pnl = Column(Float, default=0.0) # Realized profit/loss for SELL trades
    
    # Use timezone-aware UTC
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    bot = relationship("BotInstance", back_populates="trades")
    owner = relationship("User", back_populates="trades")