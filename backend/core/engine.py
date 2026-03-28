import time
from datetime import datetime
from app.database import SessionLocal # Ensure this path is correct
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

def start_engine():
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        db = SessionLocal()
        try:
            # UPDATED: Fetch bots that are RUNNING -OR- have a pending FORCE ACTION
            active_bots = db.query(BotInstance).filter(
                (BotInstance.is_running == True) | (BotInstance.force_action != None)
            ).all()
            
            if not active_bots:
                # Still sleep 15s so we check for new UI interactions frequently
                pass 
            
            for bot_model in active_bots:
                try:
                    db.refresh(bot_model) 

                    # Process the bot tick
                    manager = StrategyManager(bot_model, db)
                    manager.run_tick()
                    
                    print(f"✅ Sync: {bot_model.symbol} (ID: {bot_model.id}) OK")
                    
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    # Safety shutdown
                    bot_model.is_running = False
                    db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            db.close()
            
        
        time.sleep(15)

if __name__ == "__main__":
    start_engine()