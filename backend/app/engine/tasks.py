import os
import sys

# Celery loads this file from various cwd values; normalize paths like other backend modules.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_APP_ROOT = os.path.join(_BACKEND_ROOT, "app")
for p in (_BACKEND_ROOT, _APP_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from datetime import datetime, timezone

from engine.celery_app import app

from core import paypal_service
from database import SessionLocal
from models.bot import BotInstance
from models.user import User


@app.task(name="billing.check_subscriptions")
def check_billing_and_subscriptions():
    """
    Hourly: enforce local expiry, fee limits, and PayPal subscription status when an id is stored.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        active_users = db.query(User).filter(User.is_subscription_active == True).all()

        for user in active_users:
            if getattr(user, "is_admin", False):
                continue

            should_deactivate = False
            reason = ""

            if user.subscription_expires_at:
                expiry = user.subscription_expires_at
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if expiry < now:
                    should_deactivate = True
                    reason = "Local subscription period expired"

            if not should_deactivate and user.unpaid_fees and user.unpaid_fees > 50.0:
                should_deactivate = True
                reason = f"Unpaid fees (${user.unpaid_fees}) exceed threshold"

            if not should_deactivate and user.paypal_subscription_id:
                try:
                    sub = paypal_service.get_subscription_sync(user.paypal_subscription_id)
                    st = (sub.get("status") or "").upper()
                    if st != "ACTIVE":
                        should_deactivate = True
                        reason = f"PayPal subscription status: {st}"
                except Exception as e:
                    print(f"PayPal API check failed for {user.email}: {e}")

            if should_deactivate:
                print(f"DEACTIVATING USER: {user.email} | Reason: {reason}")
                user.is_subscription_active = False
                db.query(BotInstance).filter(
                    BotInstance.user_id == user.id,
                    BotInstance.is_running == True,
                ).update(
                    {
                        BotInstance.is_running: False,
                        BotInstance.updated_at: now,
                    },
                    synchronize_session=False,
                )

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"Critical Billing Task Error: {str(e)}")
    finally:
        db.close()
