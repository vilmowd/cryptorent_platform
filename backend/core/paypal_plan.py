"""
Create PayPal Catalog Product + Billing Plan ($10/month USD) via API when no PAYPAL_PLAN_ID is set.
Docs: https://developer.paypal.com/docs/subscriptions/
"""
from __future__ import annotations

import os
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from core.paypal_service import api_base, get_access_token_sync

PRODUCT_NAME = os.getenv("PAYPAL_PRODUCT_NAME", "CryptoRent Bot Rental").strip()
PLAN_NAME = os.getenv("PAYPAL_PLAN_NAME", "Monthly bot access").strip()
# e.g. "10.00" USD per month
PLAN_AMOUNT = os.getenv("PAYPAL_PLAN_AMOUNT", "10.00").strip()
PLAN_CURRENCY = os.getenv("PAYPAL_PLAN_CURRENCY", "USD").strip().upper()


def _headers_json(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _create_product_sync(token: str) -> str:
    body = {
        "name": PRODUCT_NAME,
        "description": "Monthly subscription for automated crypto bot access",
        "type": "SERVICE",
        "category": "SOFTWARE",
    }
    with httpx.Client() as client:
        r = client.post(
            f"{api_base()}/v1/catalogs/products",
            headers=_headers_json(token),
            json=body,
            timeout=60.0,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"PayPal create product failed: {r.status_code} {r.text}")
        return r.json()["id"]


def _create_and_activate_plan_sync(token: str, product_id: str) -> str:
    body = {
        "product_id": product_id,
        "name": PLAN_NAME,
        "description": f"{PLAN_AMOUNT} {PLAN_CURRENCY} per month",
        "billing_cycles": [
            {
                "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,
                "pricing_scheme": {
                    "fixed_price": {
                        "value": PLAN_AMOUNT,
                        "currency_code": PLAN_CURRENCY,
                    }
                },
            }
        ],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "payment_failure_threshold": 3,
        },
    }
    base = api_base()
    with httpx.Client() as client:
        r = client.post(
            f"{base}/v1/billing/plans",
            headers=_headers_json(token),
            json=body,
            timeout=60.0,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"PayPal create plan failed: {r.status_code} {r.text}")
        plan_data = r.json()
        plan_id = plan_data["id"]
        status = (plan_data.get("status") or "").upper()
        # Sandbox/live behavior: new plans are often ACTIVE immediately; /activate only applies to CREATED/INACTIVE.
        if status == "ACTIVE":
            return plan_id

        act = client.post(
            f"{base}/v1/billing/plans/{plan_id}/activate",
            headers=_headers_json(token),
            timeout=60.0,
        )
        if act.status_code < 400:
            return plan_id

        # If activate is redundant (plan already ACTIVE), confirm via GET and return.
        if act.status_code == 422 and "PLAN_STATUS_INVALID" in (act.text or ""):
            gr = client.get(
                f"{base}/v1/billing/plans/{plan_id}",
                headers=_headers_json(token),
                timeout=60.0,
            )
            if gr.status_code == 200:
                gst = (gr.json().get("status") or "").upper()
                if gst == "ACTIVE":
                    return plan_id

        raise RuntimeError(f"PayPal activate plan failed: {act.status_code} {act.text}")


def provision_new_plan_sync() -> tuple[str, str]:
    """Returns (product_id, plan_id)."""
    token = get_access_token_sync()
    product_id = _create_product_sync(token)
    plan_id = _create_and_activate_plan_sync(token, product_id)
    return product_id, plan_id


def resolve_plan_id(db: Session) -> Optional[str]:
    """
    Plan id source: PAYPAL_PLAN_ID env, else DB app_config.paypal_plan_id,
    else create product+plan via API and store.
    """
    from models.app_config import AppConfig

    env_id = os.getenv("PAYPAL_PLAN_ID", "").strip()
    if env_id:
        return env_id

    row = db.query(AppConfig).filter(AppConfig.key == "paypal_plan_id").first()
    if row and row.value:
        return row.value.strip()

    client_id = os.getenv("PAYPAL_CLIENT_ID", "").strip()
    secret = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
    if not client_id or not secret:
        return None

    try:
        product_id, plan_id = provision_new_plan_sync()
    except Exception as e:
        print(f"PayPal automatic plan provisioning failed: {e}")
        return None

    try:
        db.merge(AppConfig(key="paypal_product_id", value=product_id))
        db.merge(AppConfig(key="paypal_plan_id", value=plan_id))
        db.commit()
        print(f"✅ PayPal billing plan provisioned and stored: {plan_id}")
        return plan_id
    except Exception as e:
        db.rollback()
        print(f"PayPal plan DB save failed: {e}")
        return None


def ensure_plan_on_startup() -> None:
    """Run during DB init: provision plan so checkout works before first HTTP request."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        if os.getenv("PAYPAL_PLAN_ID", "").strip():
            return
        pid = resolve_plan_id(db)
        if not pid:
            print("⚠️ PayPal plan not available yet (check credentials or set PAYPAL_PLAN_ID).")
    finally:
        db.close()
