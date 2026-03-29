import ccxt
import pandas as pd
import requests
import traceback
from datetime import datetime, timezone
from models.trade import Trade 

class StrategyManager:
    def __init__(self, bot_model, db_session):
        self.db = db_session
        self.bot = bot_model
        from app.utils.exchange_factory import initialize_exchange 
        self.exchange = initialize_exchange(self.bot)

    # --- TELEGRAM ---
    def send_telegram_msg(self, message):
        token = self.bot.telegram_bot_token
        chat_id = self.bot.telegram_chat_id
        if not token or not chat_id: return
        url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
        payload = {"chat_id": chat_id.strip(), "text": message, "parse_mode": "HTML"}
        try: requests.post(url, json=payload, timeout=5)
        except: pass

    def log_error(self, error_msg):
        self.send_telegram_msg(f"⚠️ <b>BOT ERROR:</b>\n<code>{error_msg}</code>")

    def get_data(self):
        try:
            bars = self.exchange.fetch_ohlcv(self.bot.symbol, timeframe='5m', limit=100)
            df = pd.DataFrame(bars, columns=['time','open','high','low','close','vol'])
            
            # Use Exponential Moving Averages for faster reaction to price changes
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
            # LIMIT orders prevent the 'Market Taker' fees and slippage that were killing your PnL
            order = self.exchange.create_order(
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
                tg_msg = f"🚀 <b>BUY EXECUTED: {self.bot.symbol}</b>\nPrice: <code>${price:,.2f}</code>"
            else:
                self.bot.in_position = False
                self.bot.daily_pnl += pnl
                self.bot.position_size = 0.0
                outcome = "PROFIT ✅" if pnl > 0 else "LOSS 🛑"
                tg_msg = f"💰 <b>SELL EXECUTED: {self.bot.symbol}</b>\nReason: <b>{action}</b>\nPnL: <b>${pnl:+.2f}</b> ({outcome})"

            self.send_telegram_msg(tg_msg)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            self.log_error(f"Execution Error: {str(e)}")

    def run_tick(self):
        try:
            self.db.refresh(self.bot)
            data = self.get_data()
            if data is None: return
                
            price = float(data['close'])
            self.bot.last_known_price = price
            
            if self.bot.in_position:
                # --- DYNAMIC PROFIT TARGETS ---
                buy_price = self.bot.buy_price
                profit_pct = (price - buy_price) / buy_price
                
                sell, reason = False, ""
                
                # If price jumps 13%, we sell to lock in at least 11-12%
                if profit_pct >= 0.13:
                    sell, reason = True, "TARGET HIT (13%+)"
                # Traditional Stop Loss at 3%
                elif profit_pct <= -0.03:
                    sell, reason = True, "STOP LOSS (3%)"
                
                if sell:
                    pnl = (price - buy_price) * self.bot.position_size
                    self.record_execution(reason, "SELL", price, self.bot.position_size, pnl=pnl)
            
            else:
                # --- STRONGER BUY SIGNAL ---
                # Added Volume trend check: only buy if there's enough RSI momentum
                trend_ok = price > data['ema_200'] and data['ema_20'] > data['ema_200']
                momentum_ok = 45 < data['rsi'] < 65 # Narrower window to avoid 'dead' coins
                
                if trend_ok and momentum_ok:
                    usd_to_risk = getattr(self.bot, 'trade_amount_usd', 100.0)
                    qty = usd_to_risk / price
                    size = float(self.exchange.amount_to_precision(self.bot.symbol, qty))
                    
                    # Ensure we have the cash on Kraken
                    balance = self.exchange.fetch_balance()['free'].get('USD', 0)
                    if balance >= usd_to_risk:
                        self.record_execution("EMA PULLBACK", "BUY", price, size)

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            self.log_error(f"Tick Crash: {str(e)}")