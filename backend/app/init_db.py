# backend/init_db.py
from database import engine, Base # Use absolute import

def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")
    
    try:
        # Force the imports INSIDE the function to ensure 
        # they are registered to the Base right before creation.
        from models.user import User
        from models.bot import BotInstance
        from models.trade import Trade
        
        print("📦 Models registered: User, BotInstance, Trade")
        
        # This is the command that actually talks to Postgres
        Base.metadata.create_all(bind=engine)
        
        tables = list(Base.metadata.tables.keys())
        if not tables:
            print("⚠️ WARNING: No tables found to sync. Check your model imports!")
        else:
            print(f"✅ SUCCESS: Tables synced: {tables}")
            
    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
        # In production/Railway, we want to know if this fails immediately
        raise e 
        
    print("----------------------------------\n")