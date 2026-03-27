import ccxt
import pandas as pd
import json
import os
import requests
import traceback
from datetime import datetime, timezone, date
from app.utils.exchange_factory import initialize_exchange 
from models.trade import Trade 

# Define local log file path
ERROR_LOG = "error_log.txt"

class StrategyManager:
    def __init__(self, bot_model, db_session):
        self.db = db_session
        self.bot = bot_model
        self.exchange = initialize_exchange(self.bot)
        self.history_file = f"trades_bot_{self.bot.id}.json"

    # --- INTEGRATED TELEGRAM FUNCTIONS ---

    def send_telegram_msg(self, message):
        """Sends a notification to Telegram using bot-specific credentials."""
        # Only proceed if the user has actually provided credentials
        if not self.bot.telegram_bot_token or not self.bot.telegram_chat_id:
            return

        url = f"https://api.telegram.org/bot{self.bot.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": self.bot.telegram_chat_id, 
            "text": message,
            "parse_mode": "HTML"
        }
        try:
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code != 200:
                print(f"❌ Telegram Failed! Code: {response.status_code}")
        except Exception as e:
            print(f"❌ Telegram Connection Error: {e}")

    def log_error(self, error_msg):
        """Writes any bot errors to error_log.txt and alerts Telegram."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        # We use traceback to get the full stack trace for the text file
        full_log = f"--- {timestamp} ---\n{error_msg}\n{traceback.format_exc()}\n\n"
        
        with open(ERROR_LOG, "a") as f:
            f.write(full_log)
        
        # Notify Telegram of the Error with HTML formatting
        self.send_telegram_msg(f"⚠️ <b>BOT ERROR ({self.bot.symbol}):</b>\n<code>{error_msg}</code>")

    # --- CORE EXECUTION LOGIC ---

    def record_execution(self, action, side, price, amount, pnl=0.0):
        """Updates Ledger, State, and notifies Telegram of the trade."""
        try:
            # 1. PERMANENT LEDGER (Database)
            new_db_trade = Trade(
                bot_id=self.bot.id,
                user_id=self.bot.user_id,
                symbol=self.bot.symbol,
                side=f"{side} ({action})",
                price=price,
                amount=amount,
                pnl=pnl,
                timestamp=datetime.now(timezone.utc)
            )
            self.db.add(new_db_trade)

            # 2. UPDATE BOT STATE & PREPARE MESSAGE
            if side == "BUY":
                self.bot.in_position = True
                self.bot.buy_price = price
                self.bot.position_size = amount
                tg_msg = (f"🚀 <b>BUY EXECUTED: {self.bot.symbol}</b>\n"
                          f"Price: <code>${price:,.2f}</code>\n"
                          f"Type: {action}")
            else:
                self.bot.in_position = False
                self.bot.daily_pnl += pnl
                
                # Performance Fee Logic
                if pnl > 0:
                    commission = pnl * 0.0012
                    self.bot.owner.unpaid_fees = (self.bot.owner.unpaid_fees or 0) + commission
                
                if pnl < 0:
                    self.bot.consecutive_losses += 1
                    self.bot.last_loss_time = datetime.now(timezone.utc)
                else:
                    self.bot.consecutive_losses = 0

                outcome = "PROFIT ✅" if pnl > 0 else "LOSS 🛑"
                tg_msg = (f"💰 <b>SELL EXECUTED: {self.bot.symbol}</b>\n"
                          f"Price: <code>${price:,.2f}</code>\n"
                          f"PnL: <b>{pnl:+.2f}</b> ({outcome})\n"
                          f"Reason: {action}")

            # 3. LIVE MONITOR (JSON)
            self.record_trade_to_file(action, price, pnl=pnl, type=side)

            # 4. SEND TELEGRAM MESSAGE
            self.send_telegram_msg(tg_msg)

            # 5. SYNC TO DB
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            self.log_error(f"Critical Sync Error: {str(e)}")

    def record_trade_to_file(self, action, price, pnl=0, type="INFO"):
        new_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "type": type,
            "price": f"{price:,.2f}",
            "pnl": f"{pnl:+.2f}" if pnl != 0 else "0.00",
            "outcome": "WIN" if pnl > 0 else ("LOSS" if pnl < 0 else "NEUTRAL")
        }
        history = []
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r") as f:
                    history = json.load(f)
            except: history = []

        history.insert(0, new_entry)
        with open(self.history_file, "w") as f:
            json.dump(history[:30], f, indent=4)

    def get_data(self):
        bars = self.exchange.fetch_ohlcv(self.bot.symbol, timeframe='5m', limit=300)
        df = pd.DataFrame(bars, columns=['time','open','high','low','close','vol'])
        df['ema_200'] = df['close'].ewm(span=200).mean()
        df['ema_20'] = df['close'].ewm(span=20).mean()
        
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss.replace(0, 1e-10)
        df['rsi'] = 100 - (100 / (1 + rs))

        df['tr'] = pd.concat([
            df['high'] - df['low'],
            abs(df['high'] - df['close'].shift()),
            abs(df['low'] - df['close'].shift())
        ], axis=1).max(axis=1)
        df['atr'] = df['tr'].rolling(14).mean()
        
        return df.iloc[-1]

    def check_risk_controls(self):
        now = datetime.now(timezone.utc)
        today_str = str(date.today())
        
        if self.bot.last_trade_day != today_str:
            self.bot.daily_pnl = 0
            self.bot.consecutive_losses = 0
            self.bot.last_trade_day = today_str
            self.db.commit()

        if self.bot.daily_pnl <= -abs(self.bot.max_daily_loss):
            return "DAILY LOSS LIMIT"
        
        if self.bot.consecutive_losses >= 3: # Example limit
            return "LOSS STREAK"
            
        return None

    def calculate_dynamic_size(self, price, atr):
        try:
            balance_data = self.exchange.fetch_balance()
            usd_balance = balance_data['total'].get('USD', 0)
            risk_amount = usd_balance * 0.01 
            size = risk_amount / atr if atr > 0 else 10 / price
            self.exchange.load_markets()
            return float(self.exchange.amount_to_precision(self.bot.symbol, size))
        except:
            return 10 / price

    def run_tick(self):
        """Main loop executed by the Engine."""
        try:
            # 1. IMMEDIATE HEARTBEAT & REFRESH
            # We refresh the bot object to pull in any new settings saved from React
            self.db.refresh(self.bot)
            self.bot.updated_at = datetime.now(timezone.utc)
            
            # 2. FETCH MARKET DATA
            data = self.get_data()
            price = data['close']
            
            # 3. SYNC STATS (Updates current price/RSI on the Dashboard)
            self.bot.last_known_price = price
            self.bot.last_rsi = float(data['rsi'])
            self.bot.last_ema_200 = float(data['ema_200'])
            self.bot.last_ema_20 = float(data['ema_20'])
            
            # We commit here so the Dashboard sees the bot is "Live" even if guardrails block a trade
            self.db.commit()

            # 4. GUARDRAILS (Early exits now happen AFTER the heartbeat)
            if not self.bot.in_position:
                # Check if price is within the user-defined safe range
                if self.bot.min_trade_price and price < self.bot.min_trade_price:
                    return
                if self.bot.max_trade_price and price > self.bot.max_trade_price:
                    return

            # Check for Daily Loss limits or Loss Streaks
            blocked_reason = self.check_risk_controls()
            if blocked_reason and not self.bot.in_position:
                return

            # 5. STRATEGY LOGIC
            trend_ok = price > data['ema_200']
            pullback_ok = self.bot.rsi_low < data['rsi'] < self.bot.rsi_high
            near_ema_ok = price <= data['ema_20']

            if not self.bot.in_position:
                # ENTRY LOGIC
                if trend_ok and pullback_ok and near_ema_ok:
                    size = self.calculate_dynamic_size(price, data['atr'])
                    self.record_execution("STRATEGY ENTRY", "BUY", price, size)

            elif self.bot.in_position:
                # EXIT LOGIC
                sell, action_type = False, ""
                
                # Stop Loss check
                if price <= self.bot.buy_price * self.bot.stop_loss:
                    sell, action_type = True, "STOP LOSS"
                # Take Profit check
                elif price >= self.bot.buy_price * self.bot.take_profit:
                    sell, action_type = True, "TAKE PROFIT"
                # Overbought RSI check
                elif data['rsi'] > 70:
                    sell, action_type = True, "RSI EXIT"

                if sell:
                    pnl = (price - self.bot.buy_price) * self.bot.position_size
                    self.record_execution(action_type, "SELL", price, self.bot.position_size, pnl=pnl)

        except Exception as e:
            self.db.rollback()
            # This will now trigger your Telegram alert and write to error_log.txt
            self.log_error(f"Tick Crash: {str(e)}")