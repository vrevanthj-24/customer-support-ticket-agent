from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_user, get_current_admin_user
from ..services.ai_service import ai_service

router = APIRouter(prefix="/faq", tags=["faq"])

# ==================== Public FAQ Endpoints ====================

@router.get("/", response_model=List[schemas.FAQ])
def get_faq(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get FAQ entries (authenticated users)"""
    query = db.query(models.FAQ)
    
    if category:
        query = query.join(models.Category).filter(models.Category.category_name == category)
    
    if search:
        query = query.filter(
            (models.FAQ.question.contains(search)) | 
            (models.FAQ.answer.contains(search))
        )
    
    return query.order_by(models.FAQ.times_used.desc()).offset(skip).limit(limit).all()

@router.get("/{faq_id}", response_model=schemas.FAQ)
def get_faq_entry(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get single FAQ entry and increment usage count"""
    faq = db.query(models.FAQ).filter(models.FAQ.faq_id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # Increment usage count
    faq.times_used += 1
    db.commit()
    
    return faq

# ==================== Admin FAQ Management ====================

@router.post("/", response_model=schemas.FAQ)
def create_faq(
    faq: schemas.FAQBase,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Create a new FAQ entry (admin only)"""
    # Check if similar FAQ exists
    existing = db.query(models.FAQ).filter(models.FAQ.question == faq.question).first()
    if existing:
        raise HTTPException(status_code=400, detail="FAQ with similar question already exists")
    
    db_faq = models.FAQ(
        question=faq.question,
        answer=faq.answer,
        category_id=category_id
    )
    db.add(db_faq)
    db.commit()
    db.refresh(db_faq)
    return db_faq

@router.put("/{faq_id}", response_model=schemas.FAQ)
def update_faq(
    faq_id: int,
    faq: schemas.FAQBase,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Update FAQ entry (admin only)"""
    db_faq = db.query(models.FAQ).filter(models.FAQ.faq_id == faq_id).first()
    if not db_faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    db_faq.question = faq.question
    db_faq.answer = faq.answer
    if category_id:
        db_faq.category_id = category_id
    
    db.commit()
    db.refresh(db_faq)
    return db_faq

@router.delete("/{faq_id}")
def delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Delete FAQ entry (admin only)"""
    db_faq = db.query(models.FAQ).filter(models.FAQ.faq_id == faq_id).first()
    if not db_faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    db.delete(db_faq)
    db.commit()
    return {"message": "FAQ deleted successfully"}

# ==================== AI FAQ Generation ====================

@router.post("/generate-from-ticket/{ticket_id}")
async def generate_faq_from_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Generate FAQ from a resolved ticket using AI"""
    ticket = db.query(models.Ticket).filter(models.Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get the resolution reply
    resolution_reply = db.query(models.TicketReply).filter(
        models.TicketReply.ticket_id == ticket_id,
        models.TicketReply.sender_type == models.SenderEnum.agent
    ).order_by(models.TicketReply.created_at.desc()).first()
    
    if not resolution_reply:
        raise HTTPException(status_code=400, detail="No resolution found for this ticket")
    
    # Extract FAQ using AI
    faq_data = await ai_service.extract_faq(
        ticket.title,
        ticket.description,
        resolution_reply.message
    )
    
    if not faq_data or not faq_data.get("question"):
        raise HTTPException(status_code=400, detail="Could not generate FAQ from this ticket")
    
    # Check if similar FAQ exists
    existing = db.query(models.FAQ).filter(
        models.FAQ.question == faq_data["question"]
    ).first()
    
    if existing:
        return {
            "message": "Similar FAQ already exists",
            "faq": existing
        }
    
    # Create new FAQ
    new_faq = models.FAQ(
        question=faq_data["question"],
        answer=faq_data["answer"],
        category_id=ticket.category_id,
        created_from_ticket_id=ticket_id
    )
    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)
    
    return {
        "message": "FAQ generated successfully",
        "faq": new_faq
    }
@router.post("/{faq_id}/increment-view")
def increment_faq_view(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Increment FAQ view count"""
    faq = db.query(models.FAQ).filter(models.FAQ.faq_id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    faq.times_used = (faq.times_used or 0) + 1
    db.commit()
    
    return {"message": "View count incremented", "times_used": faq.times_used}

@router.post("/bulk-generate")
async def bulk_generate_faq(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Generate FAQs from recent resolved tickets"""
    resolved_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.resolved,
        models.Ticket.faq_entry == None
    ).order_by(models.Ticket.resolved_at.desc()).limit(limit).all()
    
    generated_faqs = []
    failed_tickets = []
    
    for ticket in resolved_tickets:
        # Get the resolution reply
        resolution_reply = db.query(models.TicketReply).filter(
            models.TicketReply.ticket_id == ticket.ticket_id,
            models.TicketReply.sender_type == models.SenderEnum.agent
        ).order_by(models.TicketReply.created_at.desc()).first()
        
        if resolution_reply:
            faq_data = await ai_service.extract_faq(
                ticket.title,
                ticket.description,
                resolution_reply.message
            )
            
            if faq_data and faq_data.get("question"):
                new_faq = models.FAQ(
                    question=faq_data["question"],
                    answer=faq_data["answer"],
                    category_id=ticket.category_id,
                    created_from_ticket_id=ticket.ticket_id
                )
                db.add(new_faq)
                generated_faqs.append({
                    "ticket_id": ticket.ticket_id,
                    "question": faq_data["question"]
                })
            else:
                failed_tickets.append(ticket.ticket_id)
    
    db.commit()
    
    return {
        "message": f"Generated {len(generated_faqs)} FAQs from {limit} tickets",
        "generated": generated_faqs,
        "failed": failed_tickets
    }