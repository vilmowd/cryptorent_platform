import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from models.user import User
from app.api.auth import get_current_user
from datetime import datetime, timedelta, timezone
from paddle_billing import Client, Environment, Options # pip install paddle-python-sdk

router = APIRouter(prefix="/billing", tags=["Billing"])

# --- PADDLE CONFIGURATION ---
PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "").strip()
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "").strip()
# Switch to Environment.SANDBOX if testing locally
PADDLE_ENV = Environment.PRODUCTION 
PADDLE_PRICE_ID = os.getenv("PADDLE_PRICE_ID", "").strip()

# Initialize the Official Paddle SDK
paddle_client = Client(
    PADDLE_API_KEY, 
    options=Options(PADDLE_ENV)
)

@router.get("/config")
async def get_paddle_config(current_user: User = Depends(get_current_user)):
    """
    Frontend calls this to get the keys needed to open the Paddle Checkout.
    Matches the keys expected by the React BillingDetails component.
    """
    return {
        "clientToken": os.getenv("PADDLE_CLIENT_TOKEN", "").strip(),
        "priceId": PADDLE_PRICE_ID,
        "userId": str(current_user.id),
        "userEmail": current_user.email
    }

@router.post("/create-portal")
async def create_paddle_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a portal link for users to manage their subscription.
    """
    # Merge user into current session to avoid DetachedInstanceError
    current_user = db.merge(current_user)
    
    try:
        # We use 'stripe_customer_id' to store Paddle's 'ctm_...' ID for compatibility
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            raise HTTPException(status_code=400, detail="No active subscription found to manage.")

        # Paddle Billing Portal URL format
        portal_url = f"https://buy.paddle.com/customer-receipt/portal-link/{customer_id}"
        return {"url": portal_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def paddle_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Unified Webhook Receiver for Paddle v2.
    """
    payload = await request.body()
    signature = request.headers.get("paddle-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing paddle-signature header")

    try:
        # Verify the webhook signature using the SDK
        event = paddle_client.webhooks.unmarshal(
            payload.decode('utf-8'), 
            PADDLE_WEBHOOK_SECRET, 
            signature
        )
    except Exception as e:
        print(f"⚠️ Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.event_type
    data = event.data

    # --- 1. SUBSCRIPTION ACTIVATED / TRANSACTION COMPLETED ---
    if event_type in ["transaction.completed", "subscription.activated"]:
        # Extract user_id from custom_data sent by React frontend
        custom_data = getattr(data, 'custom_data', {})
        user_id = custom_data.get("user_id") if custom_data else None
        
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.is_subscription_active = True
                user.stripe_customer_id = data.customer_id # Stores ctm_...
                # Mark expiry for 31 days (buffer for month-to-month)
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=31)
                user.unpaid_fees = 0.0 
                db.commit()
                print(f"✅ [PADDLE] User {user.email} ACTIVATED.")

    # --- 2. SUBSCRIPTION CANCELED ---
    elif event_type == "subscription.canceled":
        customer_id = data.customer_id
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.is_subscription_active = False
            db.commit()
            print(f"❌ [PADDLE] User {user.email} subscription REVOKED.")

    # --- 3. PAYMENT FAILED / OVERDUE ---
    elif event_type in ["subscription.past_due", "transaction.payment_failed"]:
        customer_id = data.customer_id
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            # Here you could trigger your Telegram notification bot to warn the user
            print(f"⚠️ [PADDLE] Payment failed for {user.email}. System flagged.")

    return {"status": "success"}