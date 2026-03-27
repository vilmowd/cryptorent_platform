import time
from datetime import datetime
from backend.app.database import SessionLocal # Ensure this path is correct
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

def start_engine():
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        db = SessionLocal()
        try:
            # 1. Fetch bots marked as running
            active_bots = db.query(BotInstance).filter(BotInstance.is_running == True).all()
            
            if not active_bots:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] No active bots. Sleeping...")
            
            for bot_model in active_bots:
                try:
                    # 2. Refresh model to get latest UI-changed settings
                    db.refresh(bot_model) 

                    # 3. Process the bot tick
                    manager = StrategyManager(bot_model, db)
                    manager.run_tick()
                    
                    print(f"✅ Sync: {bot_model.symbol} (ID: {bot_model.id}) OK")
                    
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    # Safety shutdown if a specific bot is broken (e.g., bad API keys)
                    bot_model.is_running = False
                    db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            # CRITICAL: Always close session to prevent DB connection leaks
            db.close()
            
        time.sleep(60)

if __name__ == "__main__":
    start_engine()