import time
from datetime import datetime, timezone  # <--- MUST HAVE 'timezone'
from app.database import SessionLocal 
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

def start_engine():
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        db = SessionLocal()
        try:
            # 1. Fetch ALL bots to update heartbeats for the UI
            all_bots = db.query(BotInstance).all()
            
            if not all_bots:
                print("💤 No bots found in database. Waiting...")

            for bot_model in all_bots:
                try:
                    # 2. PUNCH THE CLOCK (Heartbeat)
                    # We update this every 15s so the UI knows the Engine is alive
                    bot_model.updated_at = datetime.now(timezone.utc)
                    db.add(bot_model)
                    db.commit() 

                    # 3. TRADE LOGIC GATE
                    # Only run the heavy StrategyManager if the bot is actually active
                    if bot_model.is_running or bot_model.force_action:
                        manager = StrategyManager(bot_model, db)
                        manager.run_tick()
                        print(f"✅ Tick: {bot_model.symbol} (ID: {bot_model.id}) OK")
                    else:
                        # Optional: Keep the last_known_price fresh even if bot is off
                        # manager = StrategyManager(bot_model, db)
                        # manager.update_only_price() 
                        pass
                        
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    # Emergency shutdown if a specific bot crashes the loop
                    bot_model.is_running = False
                    db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            db.close()
            
        # 15s is perfect for Postgres/Railway stability
        time.sleep(15)

if __name__ == "__main__":
    start_engine()