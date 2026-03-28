import time
from datetime import datetime, timezone, date
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
            current_date = date.today()
            if current_date > last_reset_date:
                print(f"🌅 New Day Detected ({current_date}). Resetting Daily PnL...")
                try:
                    db.query(BotInstance).update({BotInstance.daily_pnl: 0.0})
                    db.commit()
                    last_reset_date = current_date
                    print("✅ PnL Reset Complete.")
                except Exception as reset_err:
                    db.rollback()
                    print(f"⚠️ Failed to reset Daily PnL: {reset_err}")

            # --- 2. FETCH ACTIVE BOTS ---
            # We filter for running bots or bots with a manual force action pending
            active_bots = db.query(BotInstance).filter(
                (BotInstance.is_running == True) | (BotInstance.force_action != None)
            ).all()
            
            if not active_bots:
                print("💤 No active bots found. Waiting...")

            for bot_model in active_bots:
                try:
                    # A. PUNCH THE CLOCK (Heartbeat)
                    bot_model.updated_at = datetime.now(timezone.utc)
                    db.commit() 

                    # B. INITIALIZE STRATEGY MANAGER
                    # This also creates the Kraken exchange object internally
                    manager = StrategyManager(bot_model, db)
                    
                    # C. PRE-FLIGHT CHECKS
                    trade_amt = float(getattr(bot_model, 'trade_amount_usd', 15.0))
                    
                    if trade_amt < 5.0:
                        manager.send_telegram_msg(f"⚠️ Bot {bot_model.symbol} halted: Trade amount (${trade_amt}) is too small.")
                        bot_model.is_running = False
                        db.commit()
                        continue

                    # D. FUNDING CHECK
                    # We check funds here to log locally, but the StrategyManager 
                    # will also check this inside run_tick() before execution.
                    has_funds, balance = manager.check_available_funds(trade_amt)
                    if not has_funds:
                        print(f"💸 Low Funds for {bot_model.symbol}: Need ${trade_amt}, Have ${balance}")
                    
                    # E. RUN THE TICK
                    # This handles fetching market data and calling should_buy_signal(data, price)
                    manager.run_tick()
                    print(f"✅ Tick: {bot_model.symbol} (ID: {bot_model.id}) OK")
                        
                except Exception as bot_err:
                    db.rollback()
                    error_str = str(bot_err)
                    print(f"❌ Bot {bot_model.id} Failed: {error_str}")
                    
                    # If the error is an Authentication/Key error, stop the bot automatically
                    # to prevent Kraken from banning your IP for repeated bad requests.
                    if "Invalid key" in error_str or "EAPI" in error_str or "Authentication" in error_str:
                        print(f"🛑 Stopping Bot {bot_model.id} due to invalid credentials.")
                        bot_model.is_running = False
                        db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            db.close()
            
        # 15 second delay prevents hitting Kraken rate limits too hard
        time.sleep(15)

if __name__ == "__main__":
    start_engine()