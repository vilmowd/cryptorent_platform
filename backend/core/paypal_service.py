"""
PayPal REST API helpers (subscriptions + webhook verification).
Docs: https://developer.paypal.com/docs/api/overview/
"""
from __future__ import annotations

import base64
import os
from typing import Any, Optional

import httpx

SANDBOX = "https://api-m.sandbox.paypal.com"
LIVE = "https://api-m.paypal.com"


def api_base() -> str:
    return SANDBOX if os.getenv("PAYPAL_MODE", "sandbox").lower().strip() == "sandbox" else LIVE


def manage_subscriptions_url() -> str:
    if os.getenv("PAYPAL_MODE", "sandbox").lower().strip() == "sandbox":
        return "https://www.sandbox.paypal.com/myaccount/autopay/"
    return "https://www.paypal.com/myaccount/autopay/"


async def get_access_token() -> str:
    client_id = os.getenv("PAYPAL_CLIENT_ID", "").strip()
    secret = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
    if not client_id or not secret:
        raise RuntimeError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set")

    auth = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{api_base()}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def create_subscription(
    *,
    plan_id: str,
    user_id: int,
    user_email: str,
    return_url: str,
    cancel_url: str,
) -> dict[str, Any]:
    token = await get_access_token()
    body = {
        "plan_id": plan_id,
        "custom_id": str(user_id),
        "application_context": {
            "brand_name": os.getenv("PAYPAL_BRAND_NAME", "CryptoRent").strip(),
            "locale": "en-US",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "payment_method": {
                "payer_selected": "PAYPAL",
                "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED",
            },
            "return_url": return_url,
            "cancel_url": cancel_url,
        },
        "subscriber": {"email_address": user_email},
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{api_base()}/v1/billing/subscriptions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json=body,
            timeout=60.0,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"PayPal create subscription failed: {r.status_code} {r.text}")
        return r.json()


def approval_url_from_create_response(payload: dict[str, Any]) -> Optional[str]:
    for link in payload.get("links") or []:
        if link.get("rel") == "approve" and link.get("href"):
            return link["href"]
    return None


async def get_subscription(subscription_id: str) -> dict[str, Any]:
    token = await get_access_token()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{api_base()}/v1/billing/subscriptions/{subscription_id}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()


async def verify_webhook_signature(
    *,
    webhook_id: str,
    headers: dict[str, str],
    body_json: dict[str, Any],
) -> bool:
    """
    POST /v1/notifications/verify-webhook-signature
    """
    if not webhook_id:
        return False
    token = await get_access_token()
    payload = {
        "transmission_id": headers.get("paypal-transmission-id"),
        "transmission_time": headers.get("paypal-transmission-time"),
        "cert_url": headers.get("paypal-cert-url"),
        "auth_algo": headers.get("paypal-auth-algo"),
        "transmission_sig": headers.get("paypal-transmission-sig"),
        "webhook_id": webhook_id,
        "webhook_event": body_json,
    }
    if not all(
        [
            payload["transmission_id"],
            payload["transmission_time"],
            payload["cert_url"],
            payload["auth_algo"],
            payload["transmission_sig"],
        ]
    ):
        return False

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{api_base()}/v1/notifications/verify-webhook-signature",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30.0,
        )
        if r.status_code >= 400:
            return False
        data = r.json()
        return data.get("verification_status") == "SUCCESS"


# --- Synchronous helpers (Celery / background tasks) ---


def get_access_token_sync() -> str:
    client_id = os.getenv("PAYPAL_CLIENT_ID", "").strip()
    secret = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
    if not client_id or not secret:
        raise RuntimeError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set")

    auth = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    with httpx.Client() as client:
        r = client.post(
            f"{api_base()}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()["access_token"]


def get_subscription_sync(subscription_id: str) -> dict[str, Any]:
    token = get_access_token_sync()
    with httpx.Client() as client:
        r = client.get(
            f"{api_base()}/v1/billing/subscriptions/{subscription_id}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()
