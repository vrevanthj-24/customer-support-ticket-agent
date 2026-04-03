from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_admin_user

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[schemas.Category])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get all categories"""
    return db.query(models.Category).all()


@router.get("/departments", response_model=List[schemas.Department])
def get_departments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get all departments with names"""
    departments = db.query(models.Department).all()
    
    # Convert to response format with proper naming
    result = []
    for dept in departments:
        result.append({
            "department_id": dept.department_id,
            "name": dept.name,
            "description": dept.description
        })
    
    return result


@router.get("/agents/by-category/{category_id}")
def get_agents_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get agents available for a specific category"""
    category = db.query(models.Category).filter(models.Category.category_id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get agents from the same department
    agents = db.query(models.Agent).filter(
        models.Agent.department_id == category.department_id,
        models.Agent.status == models.AgentStatus.active
    ).all()
    
    # Calculate workload for each agent
    result = []
    for agent in agents:
        workload = db.query(models.Ticket).filter(
            models.Ticket.assigned_agent_id == agent.agent_id,
            models.Ticket.status.in_([models.StatusEnum.open, models.StatusEnum.in_progress])
        ).count()
        
        result.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "email": agent.email,
            "current_workload": workload,
            "max_capacity": agent.max_concurrent_tickets,
            "available": workload < agent.max_concurrent_tickets,
            "department_name": category.department.name if category.department else None
        })
    
    return result