import time
from backend.app.database import SessionLocal
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

def start_engine():
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        # Create a fresh session for this cycle
        db = SessionLocal()
        try:
            # 1. Fetch only active bots
            active_bots = db.query(BotInstance).filter(BotInstance.is_running == True).all()
            
            if not active_bots:
                print("--- No active bots. Sleeping... ---")
            
            for bot_model in active_bots:
                try:
                    # 2. Hand the bot to the Manager
                    manager = StrategyManager(bot_model, db)
                    
                    # 3. Individual tick with timestamp update
                    # This ensures 'updated_at' is saved even if strategy logic returns early
                    manager.run_tick()
                    
                    # Manual commit per bot to ensure UI updates immediately
                    db.commit() 
                    print(f"✅ Sync: {bot_model.symbol} (ID: {bot_model.id})")
                    
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Error in Bot {bot_model.id} ({bot_model.symbol}): {bot_err}")
                    # Note: StrategyManager.log_error should ideally handle the Telegram alert here
                    continue 

        except Exception as e:
            print(f"💥 Critical Engine Loop Error: {e}")
            db.rollback()
        finally:
            db.close()
            
        # 60s is good for a 5m strategy; gives plenty of time for API calls to resolve
        time.sleep(60)