from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_user, get_current_admin_user
from ..services.email_service import email_service
from ..services.ai_service import ai_service
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])

# ── Issues AI can solve without agent (Small Business Focus) ────
SELF_SERVICE_KEYWORDS = [
    "login", "password", "forgot password", "reset password", "sign in",
    "how to", "how do i", "how can i", "where is", "what is",
    "update profile", "change email", "change name", "change phone",
    "business name", "company name", "update business",
    "invoice", "receipt", "billing history",
    "delete account", "deactivate account",
    "not receiving email", "verification email", "otp",
    "2fa", "two factor", "enable notifications",
    "clear cache", "refresh", "logout", "log out",
    "add team member", "invite employee", "staff access",
]

# ── Issues that MUST go to a human agent immediately ─────
CRITICAL_KEYWORDS = [
    "data loss", "data breach", "hacked", "security breach",
    "production down", "system down", "service outage", "outage",
    "payment charged twice", "duplicate charge", "wrong amount charged",
    "cannot access anything", "entire system", "nothing works",
    "urgent", "emergency", "critical", "immediately",
    "can't process orders", "store down", "business stopped",
]

# ── Department mapping for categories ────────────────────
CATEGORY_DEPARTMENT_MAP = {
    "Technical": "Technical Support",
    "Billing": "Billing Support", 
    "Account": "Account Management",
    "Feature Request": "Product Support",
    "General": "General Support"
}


def is_self_service(title: str, description: str) -> bool:
    """Returns True if this is a common issue AI can solve with steps."""
    text = f"{title} {description}".lower()
    if any(kw in text for kw in CRITICAL_KEYWORDS):
        return False
    return any(kw in text for kw in SELF_SERVICE_KEYWORDS)


def normalize_priority(priority_str: str) -> str:
    if not priority_str:
        return "P3"
    p = str(priority_str).upper().strip()
    for valid in ["P1", "P2", "P3", "P4"]:
        if p.startswith(valid):
            return valid
    match = re.search(r'[1-4]', p)
    if match:
        return f"P{match.group()}"
    return "P3"


def find_best_agent_for_category(db: Session, category_name: str, priority: str) -> Optional[models.Agent]:
    """
    Find the best agent for a given category based on:
    1. Department match
    2. Expertise match
    3. Current workload (least assigned tickets)
    4. Priority handling capability
    """
    # Get department for this category
    department_name = CATEGORY_DEPARTMENT_MAP.get(category_name, "General Support")
    
    # Find department
    department = db.query(models.Department).filter(
        models.Department.name == department_name
    ).first()
    
    if department:
        # Get agents from the same department
        agents = db.query(models.Agent).filter(
            models.Agent.department_id == department.department_id,
            models.Agent.status == models.AgentStatus.active
        ).all()
    else:
        # Fallback: get all active agents
        agents = db.query(models.Agent).filter(
            models.Agent.status == models.AgentStatus.active
        ).all()
    
    if not agents:
        return None
    
    # Calculate workload and score for each agent
    agent_scores = []
    for agent in agents:
        # Count open and in-progress tickets
        workload = db.query(models.Ticket).filter(
            models.Ticket.assigned_agent_id == agent.agent_id,
            models.Ticket.status.in_([models.StatusEnum.open, models.StatusEnum.in_progress])
        ).count()
        
        # Check expertise match
        expertise_score = 0
        if agent.expertise_categories:
            expertise_list = [e.strip() for e in agent.expertise_categories.split(",")]
            if category_name in expertise_list:
                expertise_score = 10
        
        # Priority weight: P1/P2 tickets need agents with lower workload
        priority_weight = 2 if priority in ["P1", "P2"] else 1
        
        # Calculate score (lower is better)
        score = (workload * priority_weight) - expertise_score
        
        agent_scores.append({
            "agent": agent,
            "score": max(score, 0),
            "workload": workload
        })
    
    # Find agent with lowest score
    best = min(agent_scores, key=lambda x: x["score"])
    best_agent = best["agent"]
    
    logger.info(f"Selected agent {best_agent.name} for category '{category_name}' (workload: {best['workload']}, score: {best['score']})")
    return best_agent


def auto_assign_agent_by_category(db: Session, ticket: models.Ticket, category_name: str, priority: str) -> Optional[models.Agent]:
    """Auto-assign ticket to best agent based on category and priority"""
    
    best_agent = find_best_agent_for_category(db, category_name, priority)
    
    if best_agent:
        ticket.assigned_agent_id = best_agent.agent_id
        ticket.status = models.StatusEnum.in_progress
        db.commit()
        logger.info(f"Ticket #{ticket.ticket_id} assigned to {best_agent.name} (Department: {category_name})")
        return best_agent
    
    return None


@router.post("/", response_model=schemas.Ticket)
async def create_ticket(
    ticket: schemas.TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Smart ticket creation pipeline with auto-categorization and category-based agent assignment
    """
    
    # Store category and subcategory names for response
    category_name = "General"
    subcategory_name = "General Query"
    
    # Step 1: Auto-categorize the ticket
    try:
        categorization = await ai_service.categorize_ticket(ticket.title, ticket.description)
        category_name = categorization.get("category", "General")
        subcategory_name = categorization.get("subcategory", "General Query")
        
        logger.info(f"Auto-categorized: {category_name} → {subcategory_name} (confidence: {categorization.get('confidence', 0)})")
        
        # Find or create category
        category = db.query(models.Category).filter(
            models.Category.category_name.ilike(f"%{category_name}%")
        ).first()
        if not category:
            category = models.Category(
                category_name=category_name,
                description=f"Auto-created by AI categorization"
            )
            db.add(category)
            db.flush()
        
        # Find or create subcategory
        subcategory = db.query(models.SubCategory).filter(
            models.SubCategory.category_id == category.category_id,
            models.SubCategory.name.ilike(f"%{subcategory_name}%")
        ).first()
        if not subcategory and subcategory_name != "General Query":
            subcategory = models.SubCategory(
                category_id=category.category_id,
                name=subcategory_name,
                description=f"Auto-created by AI categorization"
            )
            db.add(subcategory)
            db.flush()
        
        category_id = category.category_id
        subcategory_id = subcategory.subcategory_id if subcategory else None
        
    except Exception as e:
        logger.error(f"Categorization failed: {e}")
        category_id = None
        subcategory_id = None

    # Step 2: Get AI triage for priority
    try:
        triage = await ai_service.triage_ticket(ticket.title, ticket.description)
        priority_str = normalize_priority(triage.get("priority", "P3"))
        
        priority_map = {
            "P1": models.PriorityEnum.P1,
            "P2": models.PriorityEnum.P2,
            "P3": models.PriorityEnum.P3,
            "P4": models.PriorityEnum.P4,
        }
        priority_enum = priority_map.get(priority_str, models.PriorityEnum.P3)
        
    except Exception as e:
        logger.error(f"Priority triage failed: {e}")
        priority_enum = models.PriorityEnum.P3
        priority_str = "P3"
    
    # Step 3: Save ticket
    db_ticket = models.Ticket(
        user_id=current_user.user_id,
        title=ticket.title,
        description=ticket.description,
        category_id=category_id,
        subcategory_id=subcategory_id,
        status=models.StatusEnum.open,
        priority=priority_enum
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    # Store category names on the ticket object for response
    db_ticket.category_name = category_name
    db_ticket.subcategory_name = subcategory_name
    
    logger.info(f"Ticket #{db_ticket.ticket_id} created by user {current_user.user_id} with priority {priority_str}")

    # Step 4: Determine if self-service or needs agent
    self_service = is_self_service(ticket.title, ticket.description)
    logger.info(f"Ticket #{db_ticket.ticket_id} → self_service={self_service}")

    assigned_agent = None
    ai_solution_sent = False

    # Step 5: Handle based on self-service or priority
    try:
        # Override: self-service issues are never P1
        if self_service and priority_str == "P1":
            priority_str = "P2"
            db_ticket.priority = models.PriorityEnum.P2
            db.commit()

        # PATH A: Self-service → AI gives solution steps immediately (no agent assigned yet)
        if self_service:
            try:
                solution = await ai_service.auto_solve_ticket(ticket.title, ticket.description)
                if solution.get("can_auto_solve") and solution.get("steps"):
                    steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(solution["steps"])])
                    ai_message = (
                        f"👋 Hi! I've analyzed your issue and here's how to fix it:\n\n"
                        f"{solution.get('solution_title', 'Solution')}\n"
                        f"⏱️ Estimated time: {solution.get('estimated_time', '5 minutes')}\n\n"
                        f"{steps_text}\n\n"
                        f"{'💡 ' + solution['additional_note'] if solution.get('additional_note') else ''}\n\n"
                        f"---\n"
                        f"✅ Did these steps solve your issue?\n"
                        f"• If YES — click 'Issue Resolved' below\n"
                        f"• If NO — click 'Still Need Help' to connect with an agent"
                    )
                    db.add(models.TicketReply(
                        ticket_id=db_ticket.ticket_id,
                        sender_type=models.SenderEnum.AI,
                        message=ai_message
                    ))
                    db.commit()
                    ai_solution_sent = True
                    logger.info(f"AI solution sent for #{db_ticket.ticket_id}")
                else:
                    # AI couldn't solve, assign to agent
                    self_service = False
                    assigned_agent = auto_assign_agent_by_category(db, db_ticket, category_name, priority_str)
            except Exception as e:
                logger.error(f"Auto-solve error: {e}")
                self_service = False
                assigned_agent = auto_assign_agent_by_category(db, db_ticket, category_name, priority_str)

        # PATH B: Complex/critical or non-self-service → auto-assign to agent based on category
        if not self_service and (priority_str in ("P1", "P2") or not ai_solution_sent):
            assigned_agent = auto_assign_agent_by_category(db, db_ticket, category_name, priority_str)
            
            if assigned_agent:
                escalation_msg = (
                    f"🚨 AUTO-ESCALATED ({priority_str})\n\n"
                    f"This ticket has been automatically assigned to {assigned_agent.name} "
                    f"from the {category_name} department for immediate attention.\n\n"
                    f"Expected response time: {'1 hour' if priority_str == 'P1' else '4 hours'}"
                )
                db.add(models.TicketReply(
                    ticket_id=db_ticket.ticket_id,
                    sender_type=models.SenderEnum.AI,
                    message=escalation_msg
                ))
                db.commit()
                logger.info(f"Ticket #{db_ticket.ticket_id} escalated to {assigned_agent.name}")

    except Exception as e:
        logger.error(f"Assignment error for #{db_ticket.ticket_id}: {e}")

    # Step 6: Send confirmation email
    ticket_dict = {
        "ticket_id": db_ticket.ticket_id,
        "title": db_ticket.title,
        "description": db_ticket.description,
        "priority": priority_str,
        "name": current_user.name,
        "category": category_name,
        "subcategory": subcategory_name,
        "created_at": db_ticket.created_at.strftime("%Y-%m-%d %H:%M") if db_ticket.created_at else "",
        "assigned_agent": assigned_agent.name if assigned_agent else None,
        "ai_solution_sent": ai_solution_sent,
    }
    background_tasks.add_task(
        email_service.send_ticket_confirmation,
        ticket_dict,
        current_user.email
    )

    # Step 7: Notify agent if assigned
    if assigned_agent:
        background_tasks.add_task(
            email_service.send_agent_assignment,
            {
                "ticket_id": db_ticket.ticket_id,
                "title": db_ticket.title,
                "priority": priority_str,
                "customer_name": current_user.name
            },
            {"name": assigned_agent.name, "email": assigned_agent.email},
            assigned_agent.email
        )

    return db_ticket


@router.get("/analytics")
def get_ticket_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    from sqlalchemy import func
    total = db.query(models.Ticket).count()
    open_t = db.query(models.Ticket).filter(models.Ticket.status == models.StatusEnum.open).count()
    in_prog = db.query(models.Ticket).filter(models.Ticket.status == models.StatusEnum.in_progress).count()
    resolved = db.query(models.Ticket).filter(models.Ticket.status == models.StatusEnum.resolved).count()
    closed = db.query(models.Ticket).filter(models.Ticket.status == models.StatusEnum.closed).count()
    p1 = db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P1).count()
    p2 = db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P2).count()
    p3 = db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P3).count()
    p4 = db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P4).count()

    cat_rows = db.query(
        models.Category.category_name,
        func.count(models.Ticket.ticket_id)
    ).outerjoin(
        models.Ticket,
        models.Ticket.category_id == models.Category.category_id
    ).group_by(models.Category.category_id).all()
    category_dist = {row[0]: row[1] for row in cat_rows if row[0]}

    avg_res = db.query(func.avg(models.Ticket.resolution_time_minutes)).filter(
        models.Ticket.resolution_time_minutes.isnot(None)
    ).scalar()

    return {
        "total_tickets": total,
        "open_tickets": open_t,
        "in_progress_tickets": in_prog,
        "resolved_tickets": resolved,
        "closed_tickets": closed,
        "priority_distribution": {"P1": p1, "P2": p2, "P3": p3, "P4": p4},
        "category_distribution": category_dist,
        "avg_resolution_time_minutes": round(avg_res, 2) if avg_res else 0,
    }


@router.get("/", response_model=List[schemas.Ticket])
def get_tickets(
    skip: int = 0, limit: int = 100, status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Ticket)
    if not current_user.is_admin:
        query = query.filter(models.Ticket.user_id == current_user.user_id)
    if status:
        query = query.filter(models.Ticket.status == status)
    
    tickets = query.order_by(models.Ticket.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add category and agent names for display
    for ticket in tickets:
        if ticket.category_id:
            category = db.query(models.Category).filter(models.Category.category_id == ticket.category_id).first()
            ticket.category_name = category.category_name if category else None
        if ticket.subcategory_id:
            subcategory = db.query(models.SubCategory).filter(models.SubCategory.subcategory_id == ticket.subcategory_id).first()
            ticket.subcategory_name = subcategory.name if subcategory else None
        if ticket.assigned_agent_id:
            agent = db.query(models.Agent).filter(models.Agent.agent_id == ticket.assigned_agent_id).first()
            ticket.assigned_agent_name = agent.name if agent else None
    
    return tickets


@router.get("/{ticket_id}", response_model=schemas.Ticket)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_admin and ticket.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Add category and agent names
    if ticket.category_id:
        category = db.query(models.Category).filter(models.Category.category_id == ticket.category_id).first()
        ticket.category_name = category.category_name if category else None
    if ticket.subcategory_id:
        subcategory = db.query(models.SubCategory).filter(models.SubCategory.subcategory_id == ticket.subcategory_id).first()
        ticket.subcategory_name = subcategory.name if subcategory else None
    if ticket.assigned_agent_id:
        agent = db.query(models.Agent).filter(models.Agent.agent_id == ticket.assigned_agent_id).first()
        ticket.assigned_agent_name = agent.name if agent else None
    
    return ticket


@router.put("/{ticket_id}", response_model=schemas.Ticket)
def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_admin and ticket.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in ticket_update.dict(exclude_unset=True).items():
        setattr(ticket, field, value)

    if ticket_update.status in ["resolved", "closed"]:
        ticket.resolved_at = datetime.now()
        if ticket.created_at:
            ticket.resolution_time_minutes = (datetime.now() - ticket.created_at).total_seconds() / 60

    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
    return {"message": "Ticket deleted"}


@router.post("/{ticket_id}/replies", response_model=schemas.Reply)
def add_reply(
    ticket_id: int,
    reply: schemas.ReplyCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db_reply = models.TicketReply(
        ticket_id=ticket_id,
        sender_type=reply.sender_type,
        message=reply.message
    )
    db.add(db_reply)
    db.commit()
    db.refresh(db_reply)

    if (reply.sender_type != models.SenderEnum.user and ticket.user and ticket.user.email):
        background_tasks.add_task(
            email_service.send_ticket_update,
            {
                "ticket_id": ticket.ticket_id,
                "title": ticket.title,
                "name": ticket.user.name if ticket.user else "Customer"
            },
            ticket.user.email,
            reply.message[:200]
        )
    return db_reply


@router.get("/{ticket_id}/replies", response_model=List[schemas.Reply])
def get_replies(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not current_user.is_admin and ticket.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.TicketReply).filter(
        models.TicketReply.ticket_id == ticket_id
    ).order_by(models.TicketReply.created_at.asc()).all()


@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a ticket (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Also delete associated replies
    db.query(models.TicketReply).filter(models.TicketReply.ticket_id == ticket_id).delete()
    
    db.delete(ticket)
    db.commit()
    return {"message": "Ticket deleted successfully"}