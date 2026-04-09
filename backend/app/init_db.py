# backend/init_db.py
from sqlalchemy import inspect, text

from database import engine, Base


def _migrate_user_billing_columns():
    """SQLite: add paypal_subscription_id; copy PayPal-shaped ids from legacy billing column if present."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "users" not in tables:
        return
    cols = {c["name"] for c in inspector.get_columns("users")}
    # Historical SQLite column name from older schema (must match DB on disk; values migrated to PayPal fields).
    _legacy_billing_sub_col = "stripe_customer_id"
    with engine.begin() as conn:
        if "paypal_subscription_id" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN paypal_subscription_id VARCHAR"))
        if _legacy_billing_sub_col in cols:
            conn.execute(
                text(
                    f"UPDATE users SET paypal_subscription_id = {_legacy_billing_sub_col} "
                    f"WHERE paypal_subscription_id IS NULL AND {_legacy_billing_sub_col} IS NOT NULL "
                    f"AND {_legacy_billing_sub_col} LIKE 'I-%'"
                )
            )
        if "is_admin" not in cols:
            # PostgreSQL requires a boolean default (FALSE), not integer 0.
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))


def ensure_admin_user():
    """Create or update admin user from ADMIN_EMAIL / ADMIN_PASSWORD in the environment."""
    import os

    from database import SessionLocal
    from models.user import User

    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email or not password:
        return

    from app.api.auth import hash_password

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_admin = True
            user.is_subscription_active = True
            user.hashed_password = hash_password(password)
        else:
            db.add(
                User(
                    email=email,
                    hashed_password=hash_password(password),
                    is_admin=True,
                    is_subscription_active=True,
                )
            )
        db.commit()
        print(f"✅ Admin user synced: {email}")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Admin user sync failed: {e}")
    finally:
        db.close()


def setup_database():
    print("\n--- 🗄️ DATABASE INITIALIZATION ---")

    from models.user import User
    from models.bot import BotInstance
    from models.trade import Trade
    from models.app_config import AppConfig

    registered = list(Base.metadata.tables.keys())
    print(f"📦 SQLAlchemy Registry contains: {registered}")

    if not registered:
        print("❌ ERROR: Still empty. Try importing Base directly from the model's perspective.")
        User.__table__.tometadata(Base.metadata)
        BotInstance.__table__.tometadata(Base.metadata)
        Trade.__table__.tometadata(Base.metadata)
        AppConfig.__table__.tometadata(Base.metadata)
        print(f"📦 Registry after manual push: {list(Base.metadata.tables.keys())}")

    Base.metadata.create_all(bind=engine)
    _migrate_user_billing_columns()
    ensure_admin_user()

    from core.paypal_plan import ensure_plan_on_startup

    ensure_plan_on_startup()

    inspector = inspect(engine)
    print(f"✅ Tables in DB: {inspector.get_table_names()}")
    print("----------------------------------\n")