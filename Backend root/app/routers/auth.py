from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import os
from .. import schemas, models, auth
from ..database import get_db
from ..config import settings
from ..services.email_service import email_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

# Store reset tokens (in production, use Redis or database table)
reset_tokens = {}


@router.post("/forgot-password")
async def forgot_password(
    request: schemas.ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    
    print(f"[DEBUG] Forgot password request for email: {request.email}")
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    # For security, don't reveal if email exists
    if not user:
        print(f"[DEBUG] User not found: {request.email}")
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    print(f"[DEBUG] User found: {user.email}, Name: {user.name}")
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    
    # Store token
    reset_tokens[token] = {"email": user.email, "expires": expires, "user_id": user.user_id}
    print(f"[DEBUG] Token generated: {token[:20]}...")
    
    # Get frontend URL from env or use localhost
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    print(f"[DEBUG] Reset link: {reset_link}")
    
    # Send reset email
    background_tasks.add_task(
        email_service.send_password_reset,
        user.name,
        user.email,
        reset_link
    )
    
    logger.info(f"Password reset email sent to {user.email}")
    print(f"[DEBUG] Email task added to background")
    
    return {"message": "If an account exists with this email, you will receive a password reset link."}


@router.post("/reset-password")
async def reset_password(
    request: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    
    # Verify token exists and is valid
    token_data = reset_tokens.get(request.token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if datetime.utcnow() > token_data["expires"]:
        # Remove expired token
        del reset_tokens[request.token]
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Find user
    user = db.query(models.User).filter(models.User.email == token_data["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    user.hashed_password = auth.get_password_hash(request.new_password)
    db.commit()
    
    # Remove used token
    del reset_tokens[request.token]
    
    logger.info(f"Password reset successful for {user.email}")
    
    return {"message": "Password has been reset successfully. You can now login with your new password."}


@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password
    hashed_password = auth.get_password_hash(user.password)
    
    # Create new user
    db_user = models.User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password,
        is_active=True,
        is_admin=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.options("/forgot-password")
async def forgot_password_options():
    """Handle CORS preflight requests"""
    return {"message": "OK"}


@router.options("/reset-password")
async def reset_password_options():
    """Handle CORS preflight requests"""
    return {"message": "OK"}