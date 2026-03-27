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
        # CRITICAL: Stripe needs a 400 error to know the signature failed
        from fastapi import HTTPException
        print(f"⚠️ Webhook signature failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        # USE THIS INSTEAD: Find user by the ID we sent to Stripe
        user_id = session.get("client_reference_id")
        stripe_cust_id = session.get("customer")
        
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            
            if user:
                # Update user with the new Stripe info
                user.stripe_customer_id = stripe_cust_id
                user.is_subscription_active = True
                # Using datetime.now() since utcnow is being phased out
                user.subscription_expires_at = datetime.now() + timedelta(days=60)
                user.unpaid_fees = 0.0
                
                db.commit()
                print(f"✅ User {user.email} is now ACTIVE for 60 days.")
            else:
                print(f"❌ User ID {user_id} not found in database.")
        else:
            print("❌ No client_reference_id found in Stripe session.")

    return {"status": "success"}