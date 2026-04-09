from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base # Changed from app.database to database
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # --- Subscription & Billing ---
    billing_model = Column(String, default="fixed") 
    is_subscription_active = Column(Boolean, default=False)
    subscription_expires_at = Column(DateTime, nullable=True)
    
    
    # --- The "Taxman" Fields ---
    unpaid_fees = Column(Float, default=0.0) 
    total_paid_to_platform = Column(Float, default=0.0)

    # PayPal Billing Subscriptions API subscription id (e.g. I-xxxxxxxx)
    paypal_subscription_id = Column(String, nullable=True)

    # Full platform access without billing (synced from ADMIN_EMAIL / ADMIN_PASSWORD in .env)
    is_admin = Column(Boolean, default=False)
    
    # --- Relationships ---
    # FIX: Ensure "BotInstance" matches the class name in bot.py
    # and "owner" matches the back_populates in bot.py
    bots = relationship("BotInstance", back_populates="owner")

    # ADD THIS:
    trades = relationship("Trade", back_populates="owner")
    
    # Use datetime.now (utcnow is being deprecated in newer Python versions)
    created_at = Column(DateTime, default=datetime.now)