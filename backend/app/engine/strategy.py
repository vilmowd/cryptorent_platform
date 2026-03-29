import ccxt
import pandas as pd
import requests
import traceback
import time
from datetime import datetime, timezone
from models.trade import Trade 

class StrategyManager:
    def __init__(self, bot_model, db_session):
        self.db = db_session
        self.bot = bot_model
        from app.utils.exchange_factory import initialize_exchange 
        self.exchange = initialize_exchange(self.bot)
        self.last_heartbeat = 0 # Tracks console heartbeats

    def send_telegram_msg(self, message):
        token = self.bot.telegram_bot_token
        chat_id = self.bot.telegram_chat_id
        if not token or not chat_id: return
        url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
        payload = {"chat_id": chat_id.strip(), "text": message, "parse_mode": "HTML"}
        try: 
            requests.post(url, json=payload, timeout=5)
        except: 
            pass

    def log_error(self, error_msg):
        self.send_telegram_msg(f"⚠️ <b>BOT ERROR:</b>\n<code>{error_msg}</code>")

    def check_available_funds(self, requested_usd):
        try:
            balance = self.exchange.fetch_balance()
            available = balance['free'].get('USD', 
                        balance['free'].get('ZUSD', 
                        balance['free'].get('USDT', 0)))
            return available >= requested_usd, float(available)
        except Exception as e:
            print(f"Balance Check Failed: {e}")
            return False, 0.0

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
            self.log_error(f"Data Fetch Fail: {e}")
            return None

    def record_execution(self, action, side, price, amount, pnl=0.0):
        try:
            # Limit orders to protect your margins
            self.exchange.create_order(
                symbol=self.bot.symbol,
                type='limit',
                side=side.lower(),
                amount=amount,
                price=price
            )
            
            new_db_trade = Trade(
                bot_id=self.bot.id,
                user_id=self.bot.user_id,
                symbol=self.bot.symbol,
                side=f"{side} ({action})",
                price=price,
                amount=amount,
                cost_basis_usd=float(price * amount),
                pnl=pnl,
                timestamp=datetime.now(timezone.utc)
            )
            self.db.add(new_db_trade)

            if side == "BUY":
                self.bot.in_position = True
                self.bot.buy_price = price
                self.bot.position_size = amount
                tg_msg = f"🚀 <b>BUY: {self.bot.symbol}</b> @ ${price:,.2f}"
            else:
                self.bot.in_position = False
                self.bot.daily_pnl += pnl
                self.bot.position_size = 0.0
                outcome = "PROFIT ✅" if pnl > 0 else "LOSS 🛑"
                tg_msg = f"💰 <b>SELL: {self.bot.symbol}</b>\nReason: {action}\nPnL: ${pnl:+.2f} ({outcome})"

            self.send_telegram_msg(tg_msg)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            self.log_error(f"Execution Error: {str(e)}")

    def run_tick(self):
        try:
            self.db.refresh(self.bot)

            # --- STARTUP NOTIFICATION ---
            # If the bot hasn't updated in over an hour, treat this as a fresh start
            now = datetime.now(timezone.utc)
            if self.bot.updated_at is None or (now - self.bot.updated_at).total_seconds() > 3600:
                self.send_telegram_msg(f"🤖 <b>Bot Online: {self.bot.symbol}</b>\nStrategy: 13% Target / 3% Stop")
            
            self.bot.updated_at = now

            # --- CONSOLE HEARTBEAT (Every 10 mins) ---
            if time.time() - self.last_heartbeat > 600:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Active: Scanning {self.bot.symbol}...")
                self.last_heartbeat = time.time()

            data = self.get_data()
            if data is None: return
                
            price = float(data['close'])
            self.bot.last_known_price = price
            
            if self.bot.in_position:
                target_price = self.bot.buy_price * 1.13
                stop_price = self.bot.buy_price * 0.97
                
                sell, reason = False, ""
                if price >= target_price:
                    sell, reason = True, "TAKE PROFIT (13%)"
                elif price <= stop_price:
                    sell, reason = True, "STOP LOSS (3%)"
                
                if sell:
                    pnl = (price - self.bot.buy_price) * self.bot.position_size
                    self.record_execution(reason, "SELL", price, self.bot.position_size, pnl=pnl)
            
            else:
                trend_ok = price > data['ema_200'] and data['ema_20'] > data['ema_200']
                momentum_ok = 45 < data['rsi'] < 65 
                
                if trend_ok and momentum_ok:
                    requested_usd = getattr(self.bot, 'trade_amount_usd', 100.0)
                    can_afford, bal = self.check_available_funds(requested_usd)
                    
                    if can_afford:
                        qty = float(self.exchange.amount_to_precision(self.bot.symbol, requested_usd / price))
                        self.record_execution("EMA PULLBACK", "BUY", price, qty)

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            self.log_error(f"Tick Crash: {str(e)}")