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
    side = Column(String)       
    price = Column(Float)
    amount = Column(Float)
    pnl = Column(Float, default=0.0) 
    
    # Use timezone-aware UTC (utcnow is deprecated in newer Python/SQLAlchemy)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    bot = relationship("BotInstance", back_populates="trades")
    owner = relationship("User", back_populates="trades") # Added this