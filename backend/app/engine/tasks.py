import stripe
import os
from engine.celery_app import app
from backend.app.database import SessionLocal
from models.bot import BotInstance
from models.user import User
from datetime import datetime, timezone

# Ensure your environment variable is set
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@app.task(name="billing.check_subscriptions")
def check_billing_and_subscriptions():
    """
    Periodic task to synchronize Stripe subscription status 
    and local risk/fee rules with running bot instances.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Fetch all users who currently have an active subscription flag
        active_users = db.query(User).filter(User.is_subscription_active == True).all()

        for user in active_users:
            should_deactivate = False
            reason = ""

            # --- RULE A: Local Expiry Check ---
            # If we store a hard expiry date, check it first
            if user.subscription_expires_at:
                # Ensure the expiry date is timezone aware for comparison
                expiry = user.subscription_expires_at.replace(tzinfo=timezone.utc)
                if expiry < now:
                    should_deactivate = True
                    reason = "Local subscription period expired"
            
            # --- RULE B: Debt Ceiling Check ---
            # If they haven't paid their profit-sharing fees
            elif user.unpaid_fees and user.unpaid_fees > 50.0:
                should_deactivate = True
                reason = f"Unpaid fees (${user.unpaid_fees}) exceed threshold"

            # --- RULE C: Stripe 'Source of Truth' Check ---
            # Verify the actual status on Stripe's servers
            elif user.stripe_subscription_id:
                try:
                    stripe_sub = stripe.Subscription.retrieve(user.stripe_subscription_id)
                    
                    # If Stripe says 'canceled', 'past_due', or 'unpaid', kill the bots
                    if stripe_sub.status not in ["active", "trialing"]:
                        should_deactivate = True
                        reason = f"Stripe status reported as: {stripe_sub.status}"
                except stripe.error.StripeError as e:
                    print(f" Stripe API Error for {user.email}: {e}")
                    # We don't deactivate on API errors to avoid false negatives

            # 2. TRIGGER SHUTDOWN
            if should_deactivate:
                print(f" DEACTIVATING USER: {user.email} | Reason: {reason}")
                
                # Update User Status
                user.is_subscription_active = False
                
                # 3. Kill all running bots for this user
                # We update 'updated_at' so the React Card shows the engine stopped
                db.query(BotInstance).filter(
                    BotInstance.user_id == user.id,
                    BotInstance.is_running == True
                ).update({
                    BotInstance.is_running: False,
                    BotInstance.updated_at: now
                }, synchronize_session=False)
        
        # Finalize all changes for this cycle
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f" Critical Billing Task Error: {str(e)}")
    finally:
        db.close()