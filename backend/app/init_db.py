# backend/init_db.py
# backend/init_db.py
from database import engine, Base
from sqlalchemy import inspect

def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")
    
    # Force a refresh of the metadata
    from models.user import User
    from models.bot import BotInstance
    from models.trade import Trade

    registered = list(Base.metadata.tables.keys())
    print(f"📦 SQLAlchemy Registry contains: {registered}")

    if not registered:
        print("❌ ERROR: Still empty. Try importing Base directly from the model's perspective.")
        # Manual fallback registration
        User.__table__.tometadata(Base.metadata)
        BotInstance.__table__.tometadata(Base.metadata)
        Trade.__table__.tometadata(Base.metadata)
        print(f"📦 Registry after manual push: {list(Base.metadata.tables.keys())}")

    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    print(f"✅ Tables in DB: {inspector.get_table_names()}")
    print("----------------------------------\n")