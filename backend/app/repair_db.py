import os
import sys

# 1. Add the current directory (backend) to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# 2. Import everything using the full folder path
from app.database import engine, Base
from models.user import User  # Make sure the folder is 'app/models/user.py'
# Assuming your other models are in these locations:
from models.bot import BotInstance  # Update path if different
from models.trade import Trade      # Update path if different

def repair():
    print("--- Starting Database Repair ---")
    db_path = os.path.join(current_dir, "app", "cryptorent.db")
    print(f"Target Database: {db_path}")
    
    # This command maps your Python classes to the SQLite file
    Base.metadata.create_all(bind=engine)
    
    print("Tables created successfully!")
    
    # Double check if 'users' actually exists now
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found in DB: {tables}")
    
    if "users" in tables:
        print("SUCCESS: The 'users' table is ready.")
    else:
        print("FAIL: The table was not created. Check your User model inheritance.")

if __name__ == "__main__":
    repair()