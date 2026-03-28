# backend/init_db.py
from database import engine, Base

def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")
    try:
        # Explicitly import models here to register them with Base.metadata
        from models.user import User
        from models.bot import BotInstance
        from models.trade import Trade
        
        print(f"📦 Found models: {[User.__tablename__, BotInstance.__tablename__, Trade.__tablename__]}")

        # This command creates tables that DON'T exist. 
        # It will NOT update existing tables.
        Base.metadata.create_all(bind=engine)
        
        # Verify what actually exists in the DB now
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        print(f"✅ SUCCESS: Tables currently in DB: {existing_tables}")

    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
        raise e
    print("----------------------------------\n")