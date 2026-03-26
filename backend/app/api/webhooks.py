import stripe
import os
from fastapi import APIRouter, Request, Depends, Header
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from datetime import datetime, timedelta

router = APIRouter()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/stripe")
async def handle_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        return {"error": str(e)}

    # When the checkout is finished successfully
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session.get("customer")
        
        # 1. Find the user by Stripe Customer ID
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        
        if user:
            # 2. Activate them and set the 2-month (60 days) expiry
            user.is_subscription_active = True
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=60)
            user.unpaid_fees = 0.0
            
            db.commit()
            print(f"User {user.email} is now ACTIVE for 30 days.")

    return {"status": "success"}