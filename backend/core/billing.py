import stripe
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from models.user import User
from models.bot import BotInstance
from app.api.auth import get_current_user
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/billing", tags=["Billing"])

# Load credentials
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# --- CONFIGURATION ---
SITE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.post("/create-portal")
async def create_stripe_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates a link for users to manage cards/cancel subs on Stripe's site."""
    current_user = db.merge(current_user) 
    try:
        if not current_user.stripe_customer_id:
            raise HTTPException(status_code=400, detail="No active Stripe customer found.")

        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            # Redirecting to /billing ensures the React app is already in an 
            # authenticated view context when they return.
            return_url=f"{SITE_URL}/billing", 
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout")
async def create_checkout(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    current_user = db.merge(current_user) 
    price_id = os.getenv("STRIPE_PRICE_ID") 

    try:
        # Create customer if they don't exist
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": current_user.id}
            )
            current_user.stripe_customer_id = customer.id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            client_reference_id=str(current_user.id),
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            # UPDATED: Sending to /billing?payment=success prevents the 
            # root path (/) from defaulting to the login screen.
            success_url=f"{SITE_URL}/billing?payment=success",
            cancel_url=f"{SITE_URL}/billing",
        )
        return {"url": session.url}
    except Exception as e:
        print(f"STRIPE ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# --- THE WEBHOOK RECEIVER ---
@router.post("/stripe-webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.is_subscription_active = True
                user.stripe_customer_id = session.get('customer')
                user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                user.unpaid_fees = 0.0 
                db.commit()
                print(f"✅ User {user.email} ACTIVATED.")

    elif event['type'] == 'invoice.paid':
        invoice = event['data']['object']
        customer_id = invoice.get('customer')
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        
        if user:
            user.is_subscription_active = True
            user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            db.commit()

    return {"status": "success"}