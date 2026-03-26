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
# In Railway, add FRONTEND_URL (e.g., https://your-site.up.railway.app)
# Defaulting to localhost:3000 for local development
SITE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.post("/create-portal")
async def create_stripe_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates a link for users to manage cards/cancel subs on Stripe's site."""
    current_user = db.merge(current_user) # FIX: Prevents 'not persistent' error
    try:
        if not current_user.stripe_customer_id:
            raise HTTPException(status_code=400, detail="No active Stripe customer found.")

        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{SITE_URL}/billing", # UPDATED: Dynamic URL
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout")
async def create_checkout(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Initializes the monthly subscription + metered commission plan."""
    current_user = db.merge(current_user) 
    price_id = os.getenv("STRIPE_PRICE_ID") 

    try:
        # Create customer if they don't exist
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                description=f"User ID: {current_user.id}"
            )
            current_user.stripe_customer_id = customer.id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{SITE_URL}/?payment=success", # UPDATED: Dynamic URL
            cancel_url=f"{SITE_URL}/billing",           # UPDATED: Dynamic URL
        )
        return {"url": session.url}
    except Exception as e:
        print(f"STRIPE ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- THE WEBHOOK RECEIVER (THE ENFORCER) ---
@router.post("/stripe-webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        return {"error": "Invalid signature"}, 400

    # 1. SUCCESSFUL SIGNUP
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_id = session.get('customer')
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        
        if user:
            user.is_subscription_active = True
            user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            user.unpaid_fees = 0.0 
            user.has_outstanding_debt = False
            db.commit()
            print(f"✅ User {user.email} ACTIVATED via Webhook.")

    # 2. MONTHLY RENEWAL / COMMISSION INVOICE PAID
    elif event['type'] == 'invoice.paid':
        invoice = event['data']['object']
        customer_id = invoice.get('customer')
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        
        if user:
            user.is_subscription_active = True
            user.unpaid_fees = 0.0  
            user.has_outstanding_debt = False
            user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            db.commit()
            print(f"💰 Renewal/Commissions Paid for {user.email}.")

    # 3. PAYMENT FAILED OR SUBSCRIPTION DELETED
    elif event['type'] in ['invoice.payment_failed', 'customer.subscription.deleted']:
        data_obj = event['data']['object']
        customer_id = data_obj.get('customer')
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        
        if user:
            user.is_subscription_active = False
            user.has_outstanding_debt = True
            
            # IMMEDIATELY SHUT DOWN BOTS
            db.query(BotInstance).filter(
                BotInstance.user_id == user.id,
                BotInstance.is_running == True
            ).update({
                "is_running": False, 
                "updated_at": datetime.now(timezone.utc)
            }, synchronize_session=False)
            
            db.commit()
            print(f"🛑 DEACTIVATED: {user.email} due to payment issue.")

    return {"status": "success"}