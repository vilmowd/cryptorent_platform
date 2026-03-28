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
                print(f"🌅 New Day Detected ({current_date}). Resetting Daily PnL for all bots...")
                try:
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
                    if bot_model.is_running or bot_model.force_action:
                        manager = StrategyManager(bot_model, db)
                        
                        # --- C. FUNDING & VALIDATION CHECK ---
                        # We check if the trade_amount_usd is valid before running the tick
                        trade_amt = getattr(bot_model, 'trade_amount_usd', 15.0)
                        
                        if trade_amt < 5.0:
                            manager.send_telegram(f"⚠️ Bot {bot_model.symbol} halted: Trade amount (${trade_amt}) is too small for exchange limits.")
                            bot_model.is_running = False
                            db.commit()
                            continue

                        # Check exchange balance before attempting strategy
                        # Note: 'check_funds' should be a method in your StrategyManager 
                        # that compares trade_amt against actual Kraken balance.
                        has_funds, balance = manager.check_available_funds(trade_amt)
                        
                        if not has_funds:
                            print(f"💸 Insufficient Funds for {bot_model.symbol}: Need ${trade_amt}, Have ${balance}")
                            # Only alert if the bot is actually trying to buy
                            if manager.should_buy_signal(): 
                                manager.send_telegram(f"🚨 FUNDING ERROR: Tried to buy ${trade_amt} of {bot_model.symbol} but only ${balance} is available.")
                        
                        # Run the strategy tick
                        manager.run_tick()
                        print(f"✅ Tick: {bot_model.symbol} (ID: {bot_model.id}) OK")
                    else:
                        pass
                        
                except Exception as bot_err:
                    db.rollback()
                    print(f"❌ Bot {bot_model.id} Failed: {bot_err}")
                    bot_model.is_running = False
                    db.commit()

        except Exception as e:
            print(f"💥 ENGINE CRITICAL ERROR: {e}")
        finally:
            db.close()
            
        time.sleep(15)

if __name__ == "__main__":
    start_engine()