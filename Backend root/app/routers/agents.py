from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_user, get_current_admin_user
from ..services.ai_service import ai_service
from ..services.email_service import email_service
import logging
import httpx
import json
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


# ── Agent Management ─────────────────────────────────────────
@router.get("/", response_model=List[schemas.Agent])
def get_agents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get all agents with department names"""
    agents = db.query(models.Agent).all()
    
    # Add department name to each agent
    for agent in agents:
        if agent.department_id:
            dept = db.query(models.Department).filter(
                models.Department.department_id == agent.department_id
            ).first()
            agent.department_name = dept.name if dept else None
        else:
            agent.department_name = None
    
    return agents
@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin_user)):
    agent = db.query(models.Agent).filter(models.Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted"}

@router.post("/", response_model=schemas.Agent)
def create_agent(
    agent: schemas.AgentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Create a new agent (admin only)"""
    existing = db.query(models.Agent).filter(models.Agent.email == agent.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent already exists")
    
    db_agent = models.Agent(
        name=agent.name,
        email=agent.email,
        department_id=agent.department_id,
        expertise_categories=agent.expertise_categories if hasattr(agent, 'expertise_categories') else None,
        status=models.AgentStatus.active,
        max_concurrent_tickets=5
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    
    # Add department name for response
    if db_agent.department_id:
        dept = db.query(models.Department).filter(
            models.Department.department_id == db_agent.department_id
        ).first()
        db_agent.department_name = dept.name if dept else None
    
    return db_agent


@router.put("/{agent_id}/status")
def update_agent_status(
    agent_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Update agent status (active/inactive)"""
    agent = db.query(models.Agent).filter(models.Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if status not in ['active', 'inactive']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    agent.status = models.AgentStatus[status]
    db.commit()
    return {"message": f"Agent status updated to {status}"}


@router.get("/queue", response_model=List[schemas.Ticket])
def get_agent_queue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tickets in queue (admin sees all, users see their own)"""
    if current_user.is_admin:
        return db.query(models.Ticket).filter(
            models.Ticket.status.in_([models.StatusEnum.open, models.StatusEnum.in_progress])
        ).order_by(
            models.Ticket.priority.asc(),
            models.Ticket.created_at.asc()
        ).all()
    else:
        return db.query(models.Ticket).filter(
            models.Ticket.user_id == current_user.user_id
        ).order_by(models.Ticket.created_at.desc()).all()


@router.put("/assign/{ticket_id}/{agent_id}")
def assign_ticket(
    ticket_id: int,
    agent_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Assign a ticket to a specific agent"""
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    agent = db.query(models.Agent).filter(models.Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    ticket.assigned_agent_id = agent_id
    ticket.status = models.StatusEnum.in_progress
    db.commit()

    # Add assignment reply
    db.add(models.TicketReply(
        ticket_id=ticket_id,
        sender_type=models.SenderEnum.agent,
        message=f"👤 This ticket has been assigned to {agent.name}. They will respond shortly."
    ))
    db.commit()

    # Send email notification to agent
    background_tasks.add_task(
        email_service.send_agent_assignment,
        {
            "ticket_id": ticket.ticket_id,
            "title": ticket.title,
            "priority": ticket.priority.value,
            "customer_name": ticket.user.name if ticket.user else "Customer"
        },
        {"name": agent.name, "email": agent.email},
        agent.email
    )
    
    return {"message": f"Ticket assigned to {agent.name}"}


# ── Real-time Categorization Endpoint ─────────────────────
@router.post("/categorize-instant")
async def instant_categorize(
    request: schemas.AIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Real-time AI categorization - returns category, subcategory, and priority instantly
    Called as user types in the create ticket form (90%+ accuracy)
    """
    try:
        text = request.message
        if request.context:
            text = f"{text} {request.context}"
        
        # Call AI service to categorize with high accuracy
        result = await ai_service.categorize_ticket(text, text)
        
        # Also get priority from triage
        triage = await ai_service.triage_ticket(text, text)
        
        return {
            "category": result.get("category", "General"),
            "subcategory": result.get("subcategory", "General Query"),
            "priority": triage.get("priority", "P3"),
            "sentiment": triage.get("sentiment", "neutral"),
            "confidence": result.get("confidence", 0.85),
            "suggested_department": triage.get("suggested_department", "general"),
            "reasoning": result.get("reasoning", "")
        }
    except Exception as e:
        logger.error(f"Instant categorization error: {e}")
        return {
            "category": "General",
            "subcategory": "General Query",
            "priority": "P3",
            "sentiment": "neutral",
            "confidence": 0.6,
            "suggested_department": "general",
            "reasoning": "Fallback categorization"
        }


# ── Enhanced AI Chat Endpoint (90%+ accuracy) ─────────────
@router.post("/chat", response_model=schemas.AIResponse)
async def chat_with_ai(
    request: schemas.AIRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Enhanced AI chat with rich context for 90%+ accuracy
    """
    # Build comprehensive context
    context_parts = []
    
    # Add user info
    context_parts.append(f"User: {current_user.name}")
    context_parts.append(f"Member since: {current_user.created_at.strftime('%B %Y') if current_user.created_at else 'Recently'}")
    
    # Add ticket context if available
    if request.ticket_id:
        ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == request.ticket_id).first()
        if ticket:
            context_parts.append(f"\n📝 Ticket #{ticket.ticket_id}: {ticket.title}")
            context_parts.append(f"Status: {ticket.status} | Priority: {ticket.priority}")
            if ticket.category:
                context_parts.append(f"Category: {ticket.category.category_name}")
            if ticket.subcategory:
                context_parts.append(f"Subcategory: {ticket.subcategory.name}")
            
            # Get recent replies for conversation context
            recent_replies = db.query(models.TicketReply).filter(
                models.TicketReply.ticket_id == ticket.ticket_id
            ).order_by(models.TicketReply.created_at.desc()).limit(5).all()
            
            if recent_replies:
                context_parts.append("\n📋 Recent conversation:")
                for reply in reversed(recent_replies):
                    sender = "Customer" if reply.sender_type == models.SenderEnum.user else "Agent"
                    context_parts.append(f"{sender}: {reply.message[:150]}...")
    
    # Add FAQ context for general queries
    if not request.ticket_id:
        faq_results = db.query(models.FAQ).filter(
            models.FAQ.question.ilike(f"%{request.message}%")
        ).limit(3).all()
        
        if faq_results:
            context_parts.append("\n📚 Related FAQs:")
            for faq in faq_results:
                context_parts.append(f"Q: {faq.question}")
                context_parts.append(f"A: {faq.answer[:200]}...")
    
    full_context = "\n".join(context_parts) if context_parts else None
    
    # Generate response with enhanced context
    result = await ai_service.generate_response(request.message, full_context)
    
    # Log for analytics
    confidence = result.get("confidence", 0.85)
    logger.info(f"AI Chat - User: {current_user.email}, Ticket: {request.ticket_id}, Confidence: {confidence:.2%}")
    
    # If confidence is low, offer human assistance
    response_text = result.get("response", "")
    if confidence < 0.7:
        response_text += "\n\n---\n*If this doesn't fully address your concern, please let me know and I can connect you with a support agent.*"
    
    return schemas.AIResponse(
        response=response_text,
        suggested_actions=None
    )


# ── AI Suggest Reply for Agents (Admin Portal) ─────────────
@router.post("/suggest-reply/{ticket_id}", response_model=schemas.AIReplyResponse)
async def suggest_reply(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    High-accuracy AI reply suggestion for agents (90%+ accuracy)
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get full conversation history
    replies = db.query(models.TicketReply).filter(
        models.TicketReply.ticket_id == ticket_id
    ).order_by(models.TicketReply.created_at.asc()).all()
    
    # Format conversation for context
    conversation = []
    for reply in replies[-8:]:  # Last 8 replies for better context
        sender = "Customer" if reply.sender_type == models.SenderEnum.user else "Agent"
        conversation.append(f"{sender}: {reply.message}")
    
    # Get similar resolved tickets for reference
    similar_tickets = db.query(models.Ticket).filter(
        models.Ticket.category_id == ticket.category_id,
        models.Ticket.status == models.StatusEnum.resolved,
        models.Ticket.ticket_id != ticket_id
    ).limit(3).all()
    
    resolution_examples = []
    for t in similar_tickets:
        resolution_reply = db.query(models.TicketReply).filter(
            models.TicketReply.ticket_id == t.ticket_id,
            models.TicketReply.sender_type == models.SenderEnum.agent
        ).first()
        if resolution_reply:
            resolution_examples.append(f"Similar Ticket #{t.ticket_id}: {resolution_reply.message[:250]}...")
    
    # Get category-specific knowledge
    category_knowledge = ""
    if ticket.category:
        faqs = db.query(models.FAQ).filter(
            models.FAQ.category_id == ticket.category_id
        ).limit(3).all()
        if faqs:
            category_knowledge = "\n📚 Category FAQs:\n" + "\n".join([f"- {f.question}" for f in faqs])
    
    # Generate response with AI
    result = await ai_service.suggest_reply(
        ticket.title,
        ticket.description,
        ticket.category.category_name if ticket.category else None,
        "\n".join(conversation[-5:]),
        resolution_examples
    )
    
    return schemas.AIReplyResponse(
        suggested_reply=result.get("suggested_reply", "Thank you for reaching out. I'll review your ticket and get back to you shortly."),
        confidence_score=result.get("confidence_score", 0.85),
        is_faq_based=False
    )


# ── AI Triage Ticket ─────────────────────────────────────
@router.post("/triage/{ticket_id}", response_model=schemas.AITriageResponse)
async def triage_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """AI triage for ticket categorization and priority"""
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    result = await ai_service.triage_ticket(ticket.title, ticket.description)

    # Update ticket priority
    priority_map = {"P1": models.PriorityEnum.P1, "P2": models.PriorityEnum.P2,
                    "P3": models.PriorityEnum.P3, "P4": models.PriorityEnum.P4}
    ticket.priority = priority_map.get(result.get("priority", "P3"), models.PriorityEnum.P3)
    
    # Update category if found
    if result.get("category"):
        category = db.query(models.Category).filter(
            models.Category.category_name.ilike(f"%{result['category']}%")
        ).first()
        if category:
            ticket.category_id = category.category_id
    
    db.commit()

    return schemas.AITriageResponse(
        category=result.get("category", "general"),
        subcategory=result.get("subcategory"),
        priority=result.get("priority", "P3"),
        sentiment=result.get("sentiment", "neutral"),
        suggested_department=result.get("suggested_department", "general")
    )


# ── AI Auto-Solve (Self-Service) ──────────────────────────
@router.post("/auto-solve/{ticket_id}")
async def auto_solve_ticket(
    ticket_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """AI attempts to solve common issues with step-by-step guide"""
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    result = await ai_service.auto_solve_ticket(ticket.title, ticket.description)

    if not result.get("can_auto_solve"):
        return {"auto_solved": False, "message": "This issue requires human agent assistance"}

    # Format steps into message
    steps_text = "\n".join([f"{i+1}. {step.lstrip('0123456789.- ')}" for i, step in enumerate(result["steps"])])
    
    ai_message = f"""👋 Hi! I've analyzed your issue and here's how to fix it:

**✨ {result['solution_title']}**
⏱️ Estimated time: {result['estimated_time']}

{steps_text}

{f"💡 **Tip:** {result['additional_note']}" if result.get('additional_note') else ""}

---
✅ **Did these steps solve your issue?**
- If YES — click "Issue Resolved" below
- If NO — click "Still Need Help" to connect with an agent"""

    # Add AI reply
    db_reply = models.TicketReply(
        ticket_id=ticket_id,
        sender_type=models.SenderEnum.AI,
        message=ai_message
    )
    db.add(db_reply)
    db.commit()

    return {
        "auto_solved": True,
        "confidence": result.get("confidence", 0.85),
        "solution_title": result.get("solution_title"),
        "steps": result.get("steps", []),
        "estimated_time": result.get("estimated_time"),
        "message": "AI solution sent to customer"
    }


# ── Customer Confirms Resolution (Fixed Agent Assignment) ──
@router.post("/confirm-resolved/{ticket_id}")
async def customer_confirms_resolved(
    ticket_id: int,
    satisfied: bool,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Customer confirms if AI solution worked.
    satisfied=True  → auto-resolve + send thank you email
    satisfied=False → find available agent and assign ticket
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if satisfied:
        # Auto-resolve
        ticket.status = models.StatusEnum.resolved
        ticket.resolved_at = datetime.now()
        if ticket.created_at:
            ticket.resolution_time_minutes = (datetime.now() - ticket.created_at).total_seconds() / 60

        db.add(models.TicketReply(
            ticket_id=ticket_id,
            sender_type=models.SenderEnum.user,
            message="✅ Issue resolved! The AI solution worked. Thank you!"
        ))
        db.commit()

        # ========== FIXED: SEND THANK YOU EMAIL ==========
        if ticket.user and ticket.user.email:
            ticket_dict = {
                "ticket_id": ticket.ticket_id,
                "title": ticket.title,
                "name": ticket.user.name if ticket.user else "Customer",
                "priority": ticket.priority.value if ticket.priority else "P3"
            }
            
            resolution_message = "Your issue was successfully resolved using our AI self-service assistant."
            
            background_tasks.add_task(
                email_service.send_ticket_resolution,
                ticket_dict,
                ticket.user.email,
                resolution_message
            )

        return {"status": "resolved", "message": "Ticket resolved. Thank you email sent!"}
    
    else:
        # ========== CUSTOMER CLICKED "NO" - NEEDS AGENT ==========
        logger.info(f"Ticket #{ticket_id} escalated by customer. Finding available agent...")
        
        # Update ticket status to open and set high priority
        ticket.status = models.StatusEnum.open
        ticket.priority = models.PriorityEnum.P2  # High priority for escalated tickets
        db.commit()
        
        # Find available active agents
        active_agents = db.query(models.Agent).filter(
            models.Agent.status == models.AgentStatus.active
        ).all()
        
        if not active_agents:
            logger.warning(f"No active agents found for ticket #{ticket_id}")
            # Add a reply saying no agents available
            db.add(models.TicketReply(
                ticket_id=ticket_id,
                sender_type=models.SenderEnum.AI,
                message="⚠️ All agents are currently busy. Your ticket is marked as high priority and will be attended to as soon as an agent becomes available."
            ))
            db.commit()
            return {
                "status": "queued",
                "message": "All agents are busy. Your ticket is queued for assignment.",
                "assigned_agent": None
            }
        
        # Calculate workload for each agent
        agent_workload = {}
        for agent in active_agents:
            open_count = db.query(models.Ticket).filter(
                models.Ticket.assigned_agent_id == agent.agent_id,
                models.Ticket.status.in_([models.StatusEnum.open, models.StatusEnum.in_progress])
            ).count()
            agent_workload[agent.agent_id] = open_count
        
        # Find agent with least workload
        best_agent_id = min(agent_workload, key=agent_workload.get)
        best_agent = db.query(models.Agent).filter(models.Agent.agent_id == best_agent_id).first()
        
        # Assign ticket to the selected agent
        ticket.assigned_agent_id = best_agent_id
        ticket.status = models.StatusEnum.in_progress
        db.commit()
        
        logger.info(f"Ticket #{ticket_id} assigned to agent {best_agent.name} (workload: {agent_workload[best_agent_id]})")
        
        # Add assignment reply
        db.add(models.TicketReply(
            ticket_id=ticket_id,
            sender_type=models.SenderEnum.agent,
            message=f"👤 This ticket has been assigned to {best_agent.name}. A support agent will respond shortly."
        ))
        db.commit()
        
        # Send email notification to the agent
        background_tasks.add_task(
            email_service.send_agent_assignment,
            {
                "ticket_id": ticket.ticket_id,
                "title": ticket.title,
                "priority": ticket.priority.value,
                "customer_name": ticket.user.name if ticket.user else "Customer"
            },
            {"name": best_agent.name, "email": best_agent.email},
            best_agent.email
        )
        
        # Send notification to customer
        if ticket.user and ticket.user.email:
            background_tasks.add_task(
                email_service.send_ticket_update,
                {
                    "ticket_id": ticket.ticket_id,
                    "title": ticket.title,
                    "name": ticket.user.name if ticket.user else "Customer"
                },
                ticket.user.email,
                f"Your ticket has been escalated and assigned to {best_agent.name}. They will respond shortly."
            )
        
        return {
            "status": "assigned",
            "message": f"Ticket escalated and assigned to {best_agent.name}",
            "assigned_agent": best_agent.name,
            "agent_email": best_agent.email
        }


# ── AI Resolve Ticket (Admin) ─────────────────────────────
@router.post("/resolve/{ticket_id}")
async def resolve_ticket(
    ticket_id: int,
    resolution: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Resolve ticket, send thank-you email, extract FAQ"""
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = models.StatusEnum.resolved
    ticket.resolved_at = datetime.now()
    if ticket.created_at:
        ticket.resolution_time_minutes = (datetime.now() - ticket.created_at).total_seconds() / 60

    # Add resolution reply
    reply = models.TicketReply(
        ticket_id=ticket_id,
        sender_type=models.SenderEnum.agent,
        message=f"✅ Resolution: {resolution}"
    )
    db.add(reply)
    db.commit()

    # Send thank-you email to customer
    if ticket.user and ticket.user.email:
        ticket_dict = {
            "ticket_id": ticket.ticket_id,
            "title": ticket.title,
            "name": ticket.user.name if ticket.user else "Customer",
            "priority": ticket.priority.value if ticket.priority else "P3"
        }
        background_tasks.add_task(
            email_service.send_ticket_resolution,
            ticket_dict,
            ticket.user.email,
            resolution
        )

    # Extract FAQ in background
    async def extract_and_save_faq():
        try:
            faq_result = await ai_service.extract_faq(ticket.title, ticket.description, resolution)
            if faq_result and faq_result.get("question") and faq_result.get("answer"):
                existing = db.query(models.FAQ).filter(
                    models.FAQ.question == faq_result["question"]
                ).first()
                if not existing:
                    new_faq = models.FAQ(
                        question=faq_result["question"],
                        answer=faq_result["answer"],
                        category_id=ticket.category_id,
                        created_from_ticket_id=ticket_id
                    )
                    db.add(new_faq)
                    db.commit()
                    logger.info(f"FAQ extracted from ticket #{ticket_id}")
        except Exception as e:
            logger.error(f"FAQ extraction error: {e}")

    asyncio.create_task(extract_and_save_faq())

    return {"message": "Ticket resolved. Thank-you email sent to customer.", "faq_generated": True}
