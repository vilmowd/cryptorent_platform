import time
from backend.app.database import SessionLocal
from models.bot import BotInstance
from app.engine.strategy import StrategyManager # Import your class

def start_engine():
    print(" BT Engine Started - Monitoring Active Bots...")
    while True:
        db = SessionLocal()
        try:
            # 1. Fetch only bots the user has toggled "ON"
            active_bots = db.query(BotInstance).filter(BotInstance.is_running == True).all()
            
            for bot_model in active_bots:
                # 2. Hand the bot to the Manager
                # This handles data, risk, execution, and JSON logging in one go
                manager = StrategyManager(bot_model, db)
                manager.run_tick()
                
            db.commit() # Save any state changes made during the ticks
        except Exception as e:
            print(f" Engine Loop Error: {e}")
            db.rollback()
        finally:
            db.close()
            
        time.sleep(60) # Heartbeat