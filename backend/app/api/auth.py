import os
import sys
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel

# --- PATH CONFIGURATION ---
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# --- INTERNAL IMPORTS ---
from database import get_db, engine, Base
from models.user import User 

# --- SCHEMAS (Matches React JSON) ---
class UserAuth(BaseModel):
    email: str
    password: str

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("JWT_SECRET", "your-super-hidden-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Pointing to the login endpoint for documentation purposes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(tags=["Authentication"])

# --- HELPERS ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DEPENDENCY ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- ENDPOINTS ---

@router.post("/register")
async def register(auth_data: UserAuth, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        user_exists = db.query(User).filter(User.email == auth_data.email).first()
        if user_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="This email is already registered."
            )

    except OperationalError:
        # DB FIX: If columns are missing, recreate tables
        print("Database schema mismatch. Syncing...")
        Base.metadata.create_all(bind=engine)
        db.rollback()
        user_exists = None

    try:
        new_user = User(
            email=auth_data.email,
            hashed_password=hash_password(auth_data.password),
            is_subscription_active=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User created successfully!"}

    except Exception as e:
        db.rollback()
        print(f"Registration Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Could not complete registration. Ensure database is updated."
        )

@router.post("/login")
async def login(auth_data: UserAuth, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == auth_data.email).first()
        
        if not user or not verify_password(auth_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        print(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Account Not Found")
    
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "is_subscription_active": current_user.is_subscription_active,
        "unpaid_fees": current_user.unpaid_fees,
        "billing_model": current_user.billing_model,
        "subscription_expires_at": current_user.subscription_expires_at,
        "stripe_customer_id": current_user.stripe_customer_id
    }

