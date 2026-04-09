"""Key-value settings persisted in the database (e.g. auto-provisioned PayPal plan id)."""

from sqlalchemy import Column, String

from app.database import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    key = Column(String(64), primary_key=True)
    value = Column(String(512), nullable=True)
