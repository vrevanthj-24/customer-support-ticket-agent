from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import schemas, models, auth
from ..database import get_db
from ..dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/users", tags=["users"])

# ==================== User Management ====================

@router.get("/", response_model=List[schemas.User])
def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get all users (admin only)"""
    query = db.query(models.User)
    
    if search:
        query = query.filter(
            (models.User.name.contains(search)) |
            (models.User.email.contains(search))
        )
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user by ID"""
    # Check if user has permission
    if not current_user.is_admin and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user information"""
    # Check if user has permission
    if not current_user.is_admin and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    if "name" in update_data:
        user.name = update_data["name"]
    if "phone" in update_data:
        user.phone = update_data["phone"]
    
    # Only admin can update role
    if current_user.is_admin and "is_admin" in update_data:
        user.is_admin = update_data["is_admin"]
    if current_user.is_admin and "is_active" in update_data:
        user.is_active = update_data["is_active"]
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    if current_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has tickets
    tickets = db.query(models.Ticket).filter(models.Ticket.user_id == user_id).count()
    if tickets > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete user with {tickets} existing tickets"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# ==================== Profile Management ====================

@router.get("/me", response_model=schemas.User)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's profile"""
    return current_user

@router.put("/me", response_model=schemas.User)
def update_current_user(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's profile"""
    if user_update.name:
        current_user.name = user_update.name
    if user_update.phone:
        current_user.phone = user_update.phone
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/change-password")
def change_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Change current user's password"""
    if not auth.verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = auth.get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

# ==================== User Stats ====================

@router.get("/stats/me")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's statistics"""
    tickets = db.query(models.Ticket).filter(models.Ticket.user_id == current_user.user_id).all()
    
    return {
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t.status == models.StatusEnum.open]),
        "resolved_tickets": len([t for t in tickets if t.status == models.StatusEnum.resolved]),
        "avg_response_time": 45,  # Mock data
        "member_since": current_user.created_at
    }

# ==================== Admin Analytics ====================

@router.get("/analytics/summary")
def get_user_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get user analytics (admin only)"""
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    admin_users = db.query(models.User).filter(models.User.is_admin == True).count()
    
    # Users with tickets
    users_with_tickets = db.query(models.Ticket.user_id).distinct().count()
    
    # New users this week
    from datetime import datetime, timedelta
    week_ago = datetime.now() - timedelta(days=7)
    new_users = db.query(models.User).filter(models.User.created_at >= week_ago).count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_users": admin_users,
        "users_with_tickets": users_with_tickets,
        "new_users_this_week": new_users,
        "inactive_users": total_users - active_users
    }
@router.post("/forgot-password")
def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Don't reveal that user doesn't exist
        return {"message": "If the email exists, a reset link will be sent"}
    
    # Generate reset token (implement this)
    reset_token = generate_password_reset_token(user.email)
    
    # Send password reset email
    import asyncio
    asyncio.create_task(
        email_service.send_password_reset(user.name, user.email, reset_token)
    )
    
    return {"message": "Password reset email sent"}