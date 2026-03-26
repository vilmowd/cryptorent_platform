import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. THE CLOUD SWITCH: Check for Railway's DATABASE_URL
# If it doesn't exist, we fall back to your local SQLite file
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Railway/Heroku sometimes uses 'postgres://', but SQLAlchemy requires 'postgresql://'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # LOCAL FALLBACK
    DATABASE_URL = "sqlite:///./cryptorent.db"

# 2. CREATE THE ENGINE
# We only need 'check_same_thread' if we are using SQLite
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL settings for Railway
    engine = create_engine(DATABASE_URL)

# 3. SESSION & BASE (These stay the same)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 4. DB DEPENDENCY
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()