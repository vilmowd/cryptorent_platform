import os
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from datetime import datetime, timedelta, timezone
from paddle_billing import Client, Environment, Options # pip install paddle-python-sdk

router = APIRouter(prefix="/billing", tags=["Billing"])

# 1. Initialize Paddle Client
# Use Environment.SANDBOX if you are still testing!
PADDLE_API_KEY = os.getenv("PADDLE_API_KEY")
PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET")

paddle_client = Client(
    PADDLE_API_KEY, 
    options=Options(Environment.PRODUCTION) 
)

@router.post("/stripe-webhook") # You can keep the path, just update the logic
async def paddle_webhook_receiver(request: Request, db: Session = Depends(get_db)):
    # Paddle verification MUST use the raw bytes of the body
    payload = await request.body()
    signature = request.headers.get("paddle-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing paddle-signature header")

    try:
        # 2. Verify and Parse the Event
        # This replaces stripe.Webhook.construct_event
        event = paddle_client.webhooks.unmarshal(
            payload.decode('utf-8'), 
            PADDLE_WEBHOOK_SECRET, 
            signature
        )
    except Exception as e:
        print(f"⚠️ Paddle Signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.event_type # e.g., "transaction.completed"
    
    # 3. Handle the Payment Event
    # transaction.completed is the best event for granting access
    if event_type == "transaction.completed":
        data = event.data
        
        # Paddle stores your custom data in data.custom_data
        # Ensure you pass 'user_id' in your frontend Paddle.Checkout.open()
        custom_data = getattr(data, 'custom_data', {})
        user_id = custom_data.get("user_id") if custom_data else None
        
        paddle_customer_id = data.customer_id
        
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                # Update your user record
                user.is_subscription_active = True
                # Reusing your existing column for the Paddle ID
                user.stripe_customer_id = paddle_customer_id 
                
                # Set expiration (30 days)
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                user.unpaid_fees = 0.0 
                
                db.commit()
                print(f"✅ User {user.email} ACTIVATED via Paddle (ID: {paddle_customer_id})")
            else:
                print(f"❌ User ID {user_id} found in webhook but not in database.")
        else:
            print("❌ No user_id found in Paddle custom_data.")

    return {"status": "success"}