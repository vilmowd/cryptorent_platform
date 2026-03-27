# backend/init_db.py
from app.database import engine, Base

# Import your models here so they are registered with Base
# This solves the "unused import" issue in main.py
try:
    from models.user import User
    from models.bot import BotInstance
    from models.trade import Trade
except ImportError as e:
    print(f"⚠️ Could not import some models: {e}")

def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")
    try:
        # Now Base.metadata contains the 'users' table definition
        Base.metadata.create_all(bind=engine)
        tables = list(Base.metadata.tables.keys())
        print(f"✅ SUCCESS: Tables synced: {tables}")
    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
    print("----------------------------------\n")