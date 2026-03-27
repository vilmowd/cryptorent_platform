import time
from backend.app.database import SessionLocal
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

def start_engine():
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        db = SessionLocal()
        try:
            # 1. Fetch active bots
            active_bots = db.query(BotInstance).filter(BotInstance.is_running == True).all()
            
            if not active_bots:
                # Optional: Log heartbeat even when no bots are active
                print("--- No active bots. Sleeping... ---")
            
            for bot_model in active_bots:
                try:
                    # CRITICAL: Pull fresh data (Telegram tokens, etc.) from DB 
                    # before the manager starts. Fixes the "Forgotten Data" bug.
                    db.refresh(bot_model) 

                    # 2. Hand the bot to the Manager
                    manager = StrategyManager(bot_model, db)
                    
                    # 3. Execute Tick
                    manager.run_tick()
                    
                    # 4. Commit immediately so UI sees 'updated_at'
                    db.commit() 
                    print(f"✅ Sync: {bot_model.symbol} (ID: {bot_model.id})")
                    
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    
                    # SAFETY: If a bot crashes hard (bad API keys), 
                    # shut it down so the UI stops showing "STALLED".
                    bot_model.is_running = False
                    db.commit()
                    continue 

        except Exception as e:
            print(f"💥 Critical Engine Loop Error: {e}")
            db.rollback()
        finally:
            db.close()
            
        time.sleep(60)