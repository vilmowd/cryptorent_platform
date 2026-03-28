import ccxt
import pandas as pd
import json
import os
import requests
import traceback
import time
from datetime import datetime, timezone
from models.trade import Trade 
from models.bot import BotInstance

ERROR_LOG = "error_log.txt"

class StrategyManager:
    def __init__(self, bot_model, db_session):
        self.db = db_session
        self.bot = bot_model
        from app.utils.exchange_factory import initialize_exchange 
        self.exchange = initialize_exchange(self.bot)
        self.history_file = f"trades_bot_{self.bot.id}.json"

    # --- TELEGRAM ---
    def send_telegram_msg(self, message):
        token = self.bot.telegram_bot_token
        chat_id = self.bot.telegram_chat_id
        if not token or not chat_id or str(token).strip() == "": 
            return

        url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
        payload = {
            "chat_id": chat_id.strip(), 
            "text": message, 
            "parse_mode": "HTML"
        }
        try:
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            print(f"Telegram Fail: {e}")

    def log_error(self, error_msg):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        full_log = f"--- {timestamp} ---\n{error_msg}\n{traceback.format_exc()}\n\n"
        try:
            with open(ERROR_LOG, "a") as f: 
                f.write(full_log)
        except: 
            pass
        self.send_telegram_msg(f"⚠️ <b>BOT ERROR ({self.bot.symbol}):</b>\n<code>{error_msg}</code>")

    # --- FUNDING CHECK ---
    def check_available_funds(self, requested_usd):
        """Checks if Kraken has enough USD/USDT to cover the requested trade amount."""
        try:
            balance = self.exchange.fetch_balance()
            # Kraken keys often prefix with 'Z' for fiat
            available = balance['free'].get('USD', 
                        balance['free'].get('ZUSD', 
                        balance['free'].get('USDT', 0)))
            return available >= requested_usd, float(available)
        except Exception as e:
            # Masking the error to avoid leaking keys in logs while still identifying the issue
            print(f"Balance Check Failed for Bot {self.bot.id}: {e}")
            return False, 0.0

    # --- NEW: STRATEGY SIGNAL METHOD ---
    # This fixes the 'StrategyManager' object has no attribute 'should_buy_signal' error
    def should_buy_signal(self, data, price):
        """
        Determines if the technical conditions for a buy are met.
        """
        # 1. Safety Checks (Price range & Daily Loss)
        if (self.bot.min_trade_price and price < self.bot.min_trade_price) or \
           (self.bot.max_trade_price and price > self.bot.max_trade_price):
            return False
        
        if self.bot.daily_pnl <= -abs(self.bot.max_daily_loss or 50): 
            return False

        # 2. Indicator Logic (EMA Pullback)
        trend_ok = price > data['ema_200']
        pullback_ok = 30 < data['rsi'] < 60
        near_ema_ok = price <= (data['ema_20'] * 1.001)
        
        return trend_ok and pullback_ok and near_ema_ok

    # --- EXECUTION ENGINE ---
    def record_execution(self, action, side, price, amount, pnl=0.0):
        try:
            # 1. LIVE ORDER EXECUTION
            try:
                print(f"⚡ LIVE ORDER: {side} {amount} {self.bot.symbol}")
                order = self.exchange.create_order(
                    symbol=self.bot.symbol,
                    type='market',
                    side=side.lower(),
                    amount=amount
                )
                execution_price = float(order.get('average') or order.get('price') or price)
            except Exception as e:
                self.log_error(f"EXCHANGE REJECTED ORDER: {str(e)}")
                return 

            # 2. PERMANENT LEDGER
            new_db_trade = Trade(
                bot_id=self.bot.id,
                user_id=self.bot.user_id,
                symbol=self.bot.symbol,
                side=f"{side} ({action})",
                price=execution_price,
                amount=amount,
                cost_basis_usd=float(execution_price * amount),
                pnl=pnl,
                timestamp=datetime.now(timezone.utc)
            )
            self.db.add(new_db_trade)

            # 3. UPDATE BOT STATE
            if side == "BUY":
                self.bot.in_position = True
                self.bot.buy_price = execution_price
                self.bot.position_size = amount
                self.bot.unrealized_pnl = 0.0 
                
                usd_val = amount * execution_price
                tg_msg = (f"🚀 <b>BUY EXECUTED: {self.bot.symbol}</b>\n"
                          f"Price: <code>${execution_price:,.2f}</code>\n"
                          f"Value: <code>${usd_val:,.2f}</code>")
            else:
                self.bot.in_position = False
                self.bot.daily_pnl += pnl
                self.bot.unrealized_pnl = 0.0
                self.bot.position_size = 0.0
                
                if pnl > 0 and self.bot.owner:
                    current_fees = self.bot.owner.unpaid_fees or 0
                    self.bot.owner.unpaid_fees = current_fees + (pnl * 0.0012)
                
                self.bot.consecutive_losses = (self.bot.consecutive_losses + 1) if pnl < 0 else 0
                outcome = "PROFIT ✅" if pnl > 0 else "LOSS 🛑"
                tg_msg = (f"💰 <b>SELL EXECUTED: {self.bot.symbol}</b>\n"
                          f"PnL: <b>${pnl:+.2f}</b> ({outcome})")

            self.send_telegram_msg(tg_msg)
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            self.log_error(f"Critical Execution Error: {str(e)}")

    def get_data(self):
        try:
            bars = self.exchange.fetch_ohlcv(self.bot.symbol, timeframe='5m', limit=100)
            df = pd.DataFrame(bars, columns=['time','open','high','low','close','vol'])
            
            df['ema_200'] = df['close'].ewm(span=200).mean()
            df['ema_20'] = df['close'].ewm(span=20).mean()
            
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss.replace(0, 1e-10)
            df['rsi'] = 100 - (100 / (1 + rs))
            
            return df.iloc[-1]
        except Exception as e:
            self.log_error(f"Market Data Fetch Failed: {e}")
            return None

    def calculate_trade_quantity(self, price):
        try:
            usd_to_risk = getattr(self.bot, 'trade_amount_usd', 15.0)
            if usd_to_risk <= 0: 
                usd_to_risk = 15.0

            quantity = usd_to_risk / price
            return float(self.exchange.amount_to_precision(self.bot.symbol, quantity))
        except Exception as e:
            print(f"Quantity Calculation Error: {e}")
            return 0.0

    def run_tick(self):
        try:
            self.db.expire(self.bot)
            self.db.refresh(self.bot)

            if self.bot.updated_at is None:
                self.send_telegram_msg(f"🤖 <b>{self.bot.symbol} Bot Live!</b>")
            self.bot.updated_at = datetime.now(timezone.utc)
            
            data = self.get_data()
            if data is None: 
                self.db.commit() 
                return
                
            price = float(data['close'])
            
            # Update Live Indicators
            self.bot.last_known_price = price
            self.bot.last_rsi = float(data['rsi'])
            self.bot.last_ema_200 = float(data['ema_200'])
            self.bot.last_ema_20 = float(data['ema_20']) 
            
            if self.bot.in_position and self.bot.buy_price > 0:
                self.bot.unrealized_pnl = (price - self.bot.buy_price) * self.bot.position_size
            else:
                self.bot.unrealized_pnl = 0.0

            self.db.commit()

            # --- MANUAL OVERRIDE ---
            if hasattr(self.bot, 'force_action') and self.bot.force_action:
                action_to_take = self.bot.force_action
                self.bot.force_action = None 
                self.db.commit()

                if action_to_take == "BUY" and not self.bot.in_position:
                    size = self.calculate_trade_quantity(price)
                    if size > 0:
                        self.record_execution("MANUAL OVERRIDE", "BUY", price, size)
                    return 
                elif action_to_take == "SELL" and self.bot.in_position:
                    pnl = (price - self.bot.buy_price) * self.bot.position_size
                    self.record_execution("MANUAL OVERRIDE", "SELL", price, self.bot.position_size, pnl=pnl)
                    return 

            # --- AUTOMATED STRATEGY ---
            if not self.bot.in_position:
                # FIXED: Calling the new method
                if self.should_buy_signal(data, price):
                    size = self.calculate_trade_quantity(price)
                    requested_usd = getattr(self.bot, 'trade_amount_usd', 15.0)
                    can_afford, bal = self.check_available_funds(requested_usd)
                    
                    if not can_afford:
                        self.send_telegram_msg(f"🚨 <b>FUNDING ALERT:</b> Tried to buy ${requested_usd} of {self.bot.symbol}, but only ${bal:.2f} available.")
                        return

                    if size > 0:
                        self.record_execution("EMA PULLBACK", "BUY", price, size)

            elif self.bot.in_position:
                sell, reason = False, ""
                sl_pct = self.bot.stop_loss or 0.98
                tp_pct = self.bot.take_profit or 1.05

                if price <= self.bot.buy_price * sl_pct:
                    sell, reason = True, "STOP LOSS"
                elif price >= self.bot.buy_price * tp_pct:
                    sell, reason = True, "TAKE PROFIT"
                elif data['rsi'] > 75:
                    sell, reason = True, "RSI OVERBOUGHT"

                if sell:
                    pnl = (price - self.bot.buy_price) * self.bot.position_size
                    self.record_execution(reason, "SELL", price, self.bot.position_size, pnl=pnl)

        except Exception as e:
            self.db.rollback()
            self.log_error(f"Tick Crash: {str(e)}")