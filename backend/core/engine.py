import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. DATABASE URL CONFIGURATION
# Default to SQLite only for local dev; Railway will provide DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cryptorent.db")

# Railway fix: SQLAlchemy 1.4+ requires 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 2. CREATE THE ENGINE
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,    # Checks if connection is alive before using it
    pool_recycle=300,      # Prevents "Connection closed by peer" errors on Railway
    pool_size=10,          # Standard pool for bot concurrency
    max_overflow=20        # Allows extra connections during high traffic
)

# 3. SESSION & BASE
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This 'Base' is the "Registry". 
# ALL models in /models must import THIS specific Base instance.
Base = declarative_base()

# 4. DB DEPENDENCY
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()