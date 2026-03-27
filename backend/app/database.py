import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. DATABASE URL CONFIGURATION
# Default to SQLite if the Railway variable isn't found
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cryptorent.db")

# Railway fix: SQLAlchemy 1.4+ requires 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 2. CREATE THE ENGINE
if "sqlite" in DATABASE_URL:
    # SQLite specific args
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL specific args
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # 👈 Prevents "Connection Reset" errors on Railway
        pool_size=10,        # Optional: Standard for small/medium apps
        max_overflow=20      # Optional: Helps with sudden traffic spikes
    )

# 3. SESSION & BASE
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 4. DB DEPENDENCY (For use in FastAPI Routes)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()