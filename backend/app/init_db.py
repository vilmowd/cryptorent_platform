# backend/init_db.py
from database import engine, Base
from sqlalchemy import inspect
import importlib

def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")
    try:
        # 1. FORCE REGISTRATION
        # We don't just import the class; we import the whole module 
        # to ensure SQLAlchemy 'sees' the __tablename__ definitions.
        import models.user
        import models.bot
        import models.trade
        
        # 2. CHECK THE REGISTRY (Python-side)
        # If this list is empty, the create_all command will do nothing.
        registered_tables = list(Base.metadata.tables.keys())
        print(f"📦 SQLAlchemy Registry contains: {registered_tables}")

        if not registered_tables:
            print("⚠️ WARNING: Registry is empty! Ensure models import 'Base' from 'database.py'.")
        
        # 3. EXECUTE CREATION
        # checkfirst=True is the default; it skips existing tables.
        Base.metadata.create_all(bind=engine)
        
        # 4. VERIFY ACTUAL POSTGRES STATE
        # This talks to the physical database to see what stuck.
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if len(existing_tables) >= 3:
            print(f"✅ SUCCESS: Tables verified in DB: {existing_tables}")
        else:
            print(f"❓ PARTIAL SYNC: Only found: {existing_tables}")

    except Exception as e:
        print(f"❌ DATABASE ERROR: {e}")
        raise e
    print("----------------------------------\n")