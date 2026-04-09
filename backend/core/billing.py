import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user, has_service_access
from app.database import get_db
from core import paypal_service
from core.paypal_plan import resolve_plan_id
from models.user import User

router = APIRouter(tags=["Billing"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "").strip()


async def send_telegram_alert(message: str) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                url,
                json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"},
                timeout=15.0,
            )
        except Exception as e:
            print(f"Telegram alert error: {e}")


def _parse_paypal_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _apply_next_billing_expiry(user: User, sub: dict[str, Any]) -> None:
    billing = sub.get("billing_info") or {}
    nbt = _parse_paypal_time(billing.get("next_billing_time"))
    if nbt:
        user.subscription_expires_at = nbt
    else:
        user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=31)


def _activate_from_subscription(user: User, sub: dict[str, Any]) -> None:
    user.is_subscription_active = True
    user.paypal_subscription_id = sub.get("id")
    user.unpaid_fees = 0.0
    _apply_next_billing_expiry(user, sub)


def _deactivate_user(user: User) -> None:
    if getattr(user, "is_admin", False):
        return
    user.is_subscription_active = False


# --- Frontend ---


@router.get("/config")
async def get_billing_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan_id = resolve_plan_id(db)
    return {
        "provider": "paypal",
        "paypalClientId": os.getenv("PAYPAL_CLIENT_ID", "").strip(),
        "planConfigured": bool(plan_id),
        "userId": str(current_user.id),
        "userEmail": current_user.email,
    }


@router.post("/create-portal")
async def create_billing_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Redirect to PayPal's preapproved payments page so subscribers can review or cancel.
    """
    current_user = db.merge(current_user)
    if not has_service_access(current_user):
        raise HTTPException(status_code=400, detail="No active subscription to manage.")
    if getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=400, detail="Administrator accounts do not use PayPal billing.")
    return {"url": paypal_service.manage_subscriptions_url()}


class CreateSubscriptionResponse(BaseModel):
    approval_url: str
    subscription_id: str


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_paypal_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan_id = resolve_plan_id(db)
    if not plan_id:
        raise HTTPException(
            status_code=503,
            detail="Billing is not configured. Set PAYPAL_CLIENT_ID/SECRET or PAYPAL_PLAN_ID.",
        )

    current_user = db.merge(current_user)
    if getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=400, detail="Administrator accounts do not require a subscription.")

    if current_user.is_subscription_active and current_user.paypal_subscription_id:
        raise HTTPException(status_code=400, detail="You already have an active subscription.")

    return_url = f"{FRONTEND_URL}/billing"
    cancel_url = f"{FRONTEND_URL}/billing"

    try:
        raw = await paypal_service.create_subscription(
            plan_id=plan_id,
            user_id=current_user.id,
            user_email=current_user.email,
            return_url=return_url,
            cancel_url=cancel_url,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    approval = paypal_service.approval_url_from_create_response(raw)
    sub_id = raw.get("id") or ""
    if not approval or not sub_id:
        raise HTTPException(status_code=502, detail="PayPal did not return an approval link.")

    return CreateSubscriptionResponse(approval_url=approval, subscription_id=sub_id)


class ConfirmBody(BaseModel):
    subscription_id: str


@router.post("/confirm-subscription")
async def confirm_paypal_subscription(
    body: ConfirmBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called when the user returns from PayPal with a subscription_id (backup if webhooks are delayed).
    """
    current_user = db.merge(current_user)
    if getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=400, detail="Administrator accounts do not use PayPal checkout.")

    try:
        sub = await paypal_service.get_subscription(body.subscription_id.strip())
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail="Could not load subscription from PayPal.") from e

    cid = sub.get("custom_id")
    if cid and str(current_user.id) != str(cid):
        raise HTTPException(status_code=403, detail="This subscription is tied to a different account.")

    status = (sub.get("status") or "").upper()
    if status == "ACTIVE":
        _activate_from_subscription(current_user, sub)
        db.commit()
        await send_telegram_alert(f"💰 *Subscription confirmed*: `{current_user.email}` is ACTIVE (PayPal).")
        return {"status": "active"}

    if status == "APPROVAL_PENDING":
        return {"status": "pending", "detail": "Complete approval in the PayPal window."}

    return {"status": status.lower(), "detail": "Subscription is not active yet."}


# --- Webhook ---


def _headers_lower(request: Request) -> dict[str, str]:
    return {k.lower(): v for k, v in request.headers.items()}


@router.post("/paypal-webhook")
async def paypal_webhook_receiver(request: Request, db: Session = Depends(get_db)):
    raw_bytes = await request.body()
    try:
        body_json: dict[str, Any] = json.loads(raw_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    hdr = _headers_lower(request)

    if PAYPAL_WEBHOOK_ID:
        ok = await paypal_service.verify_webhook_signature(
            webhook_id=PAYPAL_WEBHOOK_ID,
            headers=hdr,
            body_json=body_json,
        )
        if not ok:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    elif os.getenv("PAYPAL_MODE", "sandbox").lower().strip() != "sandbox":
        raise HTTPException(status_code=503, detail="PAYPAL_WEBHOOK_ID is required in live mode.")
    else:
        print("PayPal webhook: signature verification skipped (sandbox, no PAYPAL_WEBHOOK_ID).")

    event_type = body_json.get("event_type") or ""
    resource = body_json.get("resource") or {}

    async def load_full_subscription(sid: str) -> dict[str, Any]:
        try:
            return await paypal_service.get_subscription(sid)
        except Exception:
            return resource

    try:
        if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            sid = resource.get("id")
            sub = await load_full_subscription(sid) if sid else resource
            cid = sub.get("custom_id")
            if not cid:
                return {"status": "ignored", "reason": "no custom_id"}
            user = db.query(User).filter(User.id == int(cid)).first()
            if user:
                _activate_from_subscription(user, sub)
                db.commit()
                await send_telegram_alert(f"💰 *PayPal subscription activated*: `{user.email}`")

        elif event_type in (
            "BILLING.SUBSCRIPTION.CANCELLED",
            "BILLING.SUBSCRIPTION.EXPIRED",
            "BILLING.SUBSCRIPTION.SUSPENDED",
        ):
            sid = resource.get("id")
            user = None
            if sid:
                user = db.query(User).filter(User.paypal_subscription_id == sid).first()
            if user:
                _deactivate_user(user)
                db.commit()
                await send_telegram_alert(f"❌ *PayPal subscription ended*: `{user.email}` ({event_type})")

        elif event_type == "PAYMENT.SALE.COMPLETED":
            # Renewal: extend billing period from the agreement id when present
            sid = resource.get("billing_agreement_id")
            if sid:
                user = db.query(User).filter(User.paypal_subscription_id == sid).first()
                if user:
                    sub = await load_full_subscription(sid)
                    _apply_next_billing_expiry(user, sub)
                    user.unpaid_fees = 0.0
                    db.commit()

    except Exception as e:
        db.rollback()
        print(f"PayPal webhook handler error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed") from e

    return {"status": "success"}
