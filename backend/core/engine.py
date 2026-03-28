import time
from datetime import datetime, timezone, date  # Added 'date' for reset check
from app.database import SessionLocal 
from models.bot import BotInstance
from app.engine.strategy import StrategyManager

# Global tracker for the last reset date
last_reset_date = date.today()

def start_engine():
    global last_reset_date
    print("🚀 BT Engine Started - Monitoring Active Bots...")
    
    while True:
        db = SessionLocal()
        try:
            # --- 1. MIDNIGHT RESET LOGIC ---
            # Check if the current date is greater than our last recorded reset
            current_date = date.today()
            if current_date > last_reset_date:
                print(f"🌅 New Day Detected ({current_date}). Resetting Daily PnL for all bots...")
                try:
                    # Update all bots in one go to be efficient
                    db.query(BotInstance).update({BotInstance.daily_pnl: 0.0})
                    db.commit()
                    last_reset_date = current_date
                    print("✅ PnL Reset Complete.")
                except Exception as reset_err:
                    db.rollback()
                    print(f"⚠️ Failed to reset Daily PnL: {reset_err}")

            # --- 2. FETCH & PROCESS BOTS ---
            all_bots = db.query(BotInstance).all()
            
            if not all_bots:
                print("💤 No bots found in database. Waiting...")

            for bot_model in all_bots:
                try:
                    # A. PUNCH THE CLOCK (Heartbeat)
                    bot_model.updated_at = datetime.now(timezone.utc)
                    db.add(bot_model)
                    db.commit() 

                    # B. TRADE LOGIC GATE
                    # Run logic if bot is ON or if a Manual Force Trade was requested
                    if bot_model.is_running or bot_model.force_action:
                        manager = StrategyManager(bot_model, db)
                        manager.run_tick()
                        print(f"✅ Tick: {bot_model.symbol} (ID: {bot_model.id}) OK")
                    else:
                        # Bot is idle; we could optionally update price here
                        pass
                        
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    # Safety shutdown to prevent loop-breaking errors
                    bot_model.is_running = False
                    db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            db.close()
            
        # 15s interval ensures we don't spam the DB or API
        time.sleep(15)

if __name__ == "__main__":
    start_engine()