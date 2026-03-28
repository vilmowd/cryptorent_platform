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
        # initialize_exchange should return a ccxt exchange instance
        from app.utils.exchange_factory import initialize_exchange 
        self.exchange = initialize_exchange(self.bot)
        self.history_file = f"trades_bot_{self.bot.id}.json"

    # --- TELEGRAM ---
    def send_telegram_msg(self, message):
        token = self.bot.telegram_bot_token
        chat_id = self.bot.telegram_chat_id
        if not token or not chat_id or str(token).strip() == "": return

        url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
        payload = {"chat_id": chat_id.strip(), "text": message, "parse_mode": "HTML"}
        try:
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            print(f"Telegram Fail: {e}")

    def log_error(self, error_msg):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        full_log = f"--- {timestamp} ---\n{error_msg}\n{traceback.format_exc()}\n\n"
        try:
            with open(ERROR_LOG, "a") as f: f.write(full_log)
        except: pass
        self.send_telegram_msg(f"⚠️ <b>BOT ERROR ({self.bot.symbol}):</b>\n<code>{error_msg}</code>")

    # --- EXECUTION ENGINE ---
    def record_execution(self, action, side, price, amount, pnl=0.0):
        """Executes trade on exchange and updates DB state."""
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
                execution_price = order.get('average') or order.get('price') or price
            except Exception as e:
                self.log_error(f"EXCHANGE REJECTED ORDER: {str(e)}")
                return 

            # 2. PERMANENT LEDGER (Database)
            new_db_trade = Trade(
                bot_id=self.bot.id,
                user_id=self.bot.user_id,
                symbol=self.bot.symbol,
                side=f"{side} ({action})",
                price=execution_price,
                amount=amount,
                pnl=pnl,
                timestamp=datetime.now(timezone.utc)
            )
            self.db.add(new_db_trade)

            # 3. UPDATE BOT STATE
            if side == "BUY":
                self.bot.in_position = True
                self.bot.buy_price = execution_price
                self.bot.position_size = amount
                tg_msg = (f"🚀 <b>BUY EXECUTED: {self.bot.symbol}</b>\n"
                          f"Price: <code>${execution_price:,.2f}</code>")
            else:
                self.bot.in_position = False
                self.bot.daily_pnl += pnl
                # Handle Profit Share / Fees
                if pnl > 0 and self.bot.owner:
                    current_fees = self.bot.owner.unpaid_fees or 0
                    self.bot.owner.unpaid_fees = current_fees + (pnl * 0.0012)
                
                self.bot.consecutive_losses = (self.bot.consecutive_losses + 1) if pnl < 0 else 0
                outcome = "PROFIT ✅" if pnl > 0 else "LOSS 🛑"
                tg_msg = (f"💰 <b>SELL EXECUTED: {self.bot.symbol}</b>\n"
                          f"PnL: <b>{pnl:+.2f}</b> ({outcome})")

            # 4. SYNC
            self.record_trade_to_file(action, execution_price, pnl=pnl, type=side)
            self.send_telegram_msg(tg_msg)
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            self.log_error(f"Critical Execution Error: {str(e)}")

    def get_data(self):
        try:
            bars = self.exchange.fetch_ohlcv(self.bot.symbol, timeframe='5m', limit=100)
            df = pd.DataFrame(bars, columns=['time','open','high','low','close','vol'])
            
            # Indicators
            df['ema_200'] = df['close'].ewm(span=200).mean()
            df['ema_20'] = df['close'].ewm(span=20).mean()
            
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss.replace(0, 1e-10)
            df['rsi'] = 100 - (100 / (1 + rs))
            
            df['tr'] = pd.concat([df['high']-df['low'], 
                                  abs(df['high']-df['close'].shift()), 
                                  abs(df['low']-df['close'].shift())], axis=1).max(axis=1)
            df['atr'] = df['tr'].rolling(14).mean()
            
            return df.iloc[-1]
        except Exception as e:
            self.log_error(f"Market Data Fetch Failed: {e}")
            return None

    def calculate_dynamic_size(self, price, atr):
        try:
            balance = self.exchange.fetch_balance()
            usd = balance['total'].get('USDT', balance['total'].get('USD', 0))
            risk_usd = usd * 0.01 
            size = risk_usd / atr if (atr and atr > 0) else (usd * 0.1) / price
            return float(self.exchange.amount_to_precision(self.bot.symbol, size))
        except:
            return 0.0

    def run_tick(self):
        try:
            # 1. HOT RELOAD & DB REFRESH
            self.db.expire(self.bot)
            self.db.refresh(self.bot)

            # 2. HEARTBEAT & STARTUP ALERT
            if self.bot.updated_at is None:
                self.send_telegram_msg(f"🤖 <b>{self.bot.symbol} Bot Live!</b>")
            self.bot.updated_at = datetime.now(timezone.utc)
            
            # 3. GET MARKET DATA
            data = self.get_data()
            if data is None: 
                self.db.commit() 
                return
                
            price = float(data['close'])
            
            # 4. UPDATE UI INDICATORS (Save these every tick for the React Modal)
            self.bot.last_known_price = price
            self.bot.last_rsi = float(data['rsi'])
            self.bot.last_ema_200 = float(data['ema_200'])
            self.bot.last_ema_20 = float(data['ema_20']) 
            self.db.commit()

            # --- NEW: 5. CHECK FOR MANUAL FORCE ACTION ---
            # This bypasses all indicator checks and safety gates
            if hasattr(self.bot, 'force_action') and self.bot.force_action:
                action_to_take = self.bot.force_action # "BUY" or "SELL"
                self.bot.force_action = None # CLEAR THE FLAG IMMEDIATELY
                self.db.commit()

                if action_to_take == "BUY" and not self.bot.in_position:
                    size = self.calculate_dynamic_size(price, data['atr'])
                    self.record_execution("MANUAL OVERRIDE", "BUY", price, size)
                    return # Finish tick after manual execution
                
                elif action_to_take == "SELL" and self.bot.in_position:
                    pnl = (price - self.bot.buy_price) * self.bot.position_size
                    self.record_execution("MANUAL OVERRIDE", "SELL", price, self.bot.position_size, pnl=pnl)
                    return # Finish tick after manual execution

            # 6. AUTOMATED SAFETY CHECKS (Only blocks automated trading)
            if not self.bot.in_position:
                if (self.bot.min_trade_price and price < self.bot.min_trade_price) or \
                   (self.bot.max_trade_price and price > self.bot.max_trade_price):
                    return
                
                if self.bot.daily_pnl <= -abs(self.bot.max_daily_loss or 100): 
                    return

            # 7. AUTOMATED STRATEGY LOGIC
            trend_ok = price > data['ema_200']
            pullback_ok = 30 < data['rsi'] < 60
            near_ema_ok = price <= (data['ema_20'] * 1.001)
            
            if not self.bot.in_position:
                if trend_ok and pullback_ok and near_ema_ok:
                    size = self.calculate_dynamic_size(price, data['atr'])
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