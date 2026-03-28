import os
import httpx
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from models.user import User
from app.api.auth import get_current_user
from datetime import datetime, timedelta, timezone
from paddle_billing import Client, Environment, Options

# REMOVED prefix="/billing" from here to prevent doubling up
router = APIRouter(tags=["Billing"])

PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "").strip()
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "").strip()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

paddle_client = Client(
    PADDLE_API_KEY, 
    options=Options(Environment.PRODUCTION) 
)

async def send_telegram_alert(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"})
        except Exception as e:
            print(f"❌ Telegram Error: {e}")

@router.get("/config")
async def get_paddle_config(current_user: User = Depends(get_current_user)):
    return {
        "clientToken": os.getenv("PADDLE_CLIENT_TOKEN", "").strip(),
        "priceId": os.getenv("PADDLE_PRICE_ID", "").strip(),
        "userId": str(current_user.id),
        "userEmail": current_user.email
    }

@router.post("/create-portal")
async def create_paddle_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user = db.merge(current_user)
    customer_id = current_user.stripe_customer_id
    if not customer_id:
        raise HTTPException(status_code=400, detail="No active subscription found.")
    portal_url = f"https://buy.paddle.com/customer-receipt/portal-link/{customer_id}"
    return {"url": portal_url}

@router.post("/paddle-webhook")
async def paddle_webhook_receiver(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("paddle-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")
    try:
        event = paddle_client.webhooks.unmarshal(payload.decode('utf-8'), PADDLE_WEBHOOK_SECRET, signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.event_type
    data = event.data

    if event_type == "transaction.completed":
        custom_data = getattr(data, 'custom_data', {})
        user_id = custom_data.get("user_id") if custom_data else None
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.is_subscription_active = True
                user.stripe_customer_id = data.customer_id 
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=31)
                user.unpaid_fees = 0.0 
                db.commit()
                await send_telegram_alert(f"💰 *New Subscription*: `{user.email}` is now LIVE.")
    
    return {"status": "success"}