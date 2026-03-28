import os
import httpx # Ensure you have 'pip install httpx' for the telegram call
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from models.user import User
from datetime import datetime, timedelta, timezone
from paddle_billing import Client, Environment, Options

router = APIRouter(prefix="/billing", tags=["Billing"])

# --- CONFIGURATION ---
PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "").strip()
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "").strip()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

paddle_client = Client(
    PADDLE_API_KEY, 
    options=Options(Environment.PRODUCTION) 
)

async def send_telegram_alert(message: str):
    """Helper to send alerts to your Telegram bot."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Telegram config missing. Alert not sent.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"})
        except Exception as e:
            print(f"❌ Failed to send Telegram alert: {e}")

@router.post("/paddle-webhook")
async def paddle_webhook_receiver(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("paddle-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing paddle-signature header")

    try:
        event = paddle_client.webhooks.unmarshal(
            payload.decode('utf-8'), 
            PADDLE_WEBHOOK_SECRET, 
            signature
        )
    except Exception as e:
        print(f"⚠️ Paddle Signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.event_type
    data = event.data

    # --- 1. HANDLING SUCCESSFUL PAYMENTS ---
    if event_type == "transaction.completed":
        custom_data = getattr(data, 'custom_data', {})
        user_id = custom_data.get("user_id") if custom_data else None
        
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                # Update Database
                user.is_subscription_active = True
                user.stripe_customer_id = data.customer_id 
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=31)
                user.unpaid_fees = 0.0 
                db.commit()

                # Send Telegram Notification
                msg = (
                    f"💰 *New Subscription Active!*\_ \n"
                    f"👤 User: `{user.email}`\n"
                    f"💳 System: Paddle\n"
                    f"🤖 Bot Status: **Online & Ready**"
                )
                await send_telegram_alert(msg)
                print(f"✅ User {user.email} ACTIVATED and Alerted.")
            else:
                await send_telegram_alert(f"⚠️ Webhook Error: Received payment for User ID {user_id}, but user not found in DB.")
        else:
            await send_telegram_alert("⚠️ Webhook Warning: Payment received but no `user_id` found in custom_data.")

    # --- 2. HANDLING CANCELLATIONS ---
    elif event_type == "subscription.canceled":
        user = db.query(User).filter(User.stripe_customer_id == data.customer_id).first()
        if user:
            user.is_subscription_active = False
            db.commit()
            await send_telegram_alert(f"❌ *Subscription Cancelled*: `{user.email}` has deactivated their bot.")

    return {"status": "success"}