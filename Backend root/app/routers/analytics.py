from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from ..database import get_db
from ..dependencies import get_current_admin_user
from .. import models
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """
    Get comprehensive analytics for admin dashboard
    All data is computed directly from the database
    """
    
    # ==================== Ticket Statistics ====================
    total_tickets = db.query(models.Ticket).count()
    open_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.open
    ).count()
    in_progress_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.in_progress
    ).count()
    resolved_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.resolved
    ).count()
    closed_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.closed
    ).count()
    
    # Resolution rate
    resolved_closed = resolved_tickets + closed_tickets
    resolution_rate = round((resolved_closed / total_tickets * 100), 2) if total_tickets > 0 else 0
    
    # ==================== Resolution Time Statistics ====================
    # Get tickets with resolution time
    resolved_with_time = db.query(models.Ticket).filter(
        models.Ticket.resolution_time_minutes.isnot(None),
        models.Ticket.resolution_time_minutes > 0
    ).all()
    
    avg_resolution_minutes = 0
    if resolved_with_time:
        total_minutes = sum(t.resolution_time_minutes for t in resolved_with_time)
        avg_resolution_minutes = total_minutes / len(resolved_with_time)
    
    # Fastest resolution
    fastest_resolution = None
    if resolved_with_time:
        fastest = min(resolved_with_time, key=lambda t: t.resolution_time_minutes)
        fastest_resolution = fastest.resolution_time_minutes
    
    # Resolution time breakdown
    resolution_breakdown = {
        "under_1_hour": 0,
        "1_4_hours": 0,
        "4_24_hours": 0,
        "over_24_hours": 0
    }
    
    for ticket in resolved_with_time:
        minutes = ticket.resolution_time_minutes
        if minutes < 60:
            resolution_breakdown["under_1_hour"] += 1
        elif minutes < 240:
            resolution_breakdown["1_4_hours"] += 1
        elif minutes < 1440:
            resolution_breakdown["4_24_hours"] += 1
        else:
            resolution_breakdown["over_24_hours"] += 1
    
    # ==================== Priority Distribution ====================
    priority_distribution = {
        "P1": db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P1).count(),
        "P2": db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P2).count(),
        "P3": db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P3).count(),
        "P4": db.query(models.Ticket).filter(models.Ticket.priority == models.PriorityEnum.P4).count()
    }
    
    # ==================== Category Distribution ====================
    category_results = db.query(
        models.Category.category_name,
        func.count(models.Ticket.ticket_id).label("count")
    ).outerjoin(
        models.Ticket, models.Ticket.category_id == models.Category.category_id
    ).group_by(models.Category.category_id).all()
    
    category_distribution = {}
    category_map = {
        1: "Technical", 2: "Billing", 3: "Account", 
        4: "Feature Request", 5: "General"
    }
    
    for row in category_results:
        if row[0]:
            category_distribution[row[0]] = row[1]
    
    # Add uncategorized tickets
    uncategorized = db.query(models.Ticket).filter(
        models.Ticket.category_id.is_(None)
    ).count()
    if uncategorized > 0:
        category_distribution["Uncategorized"] = uncategorized
    
    # ==================== Weekly Trends (Last 7 Days) ====================
    now = datetime.now()
    weekly_trends = []
    weekly_created = []
    weekly_resolved = []
    
    for i in range(6, -1, -1):
        date = now - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0)
        date_end = date.replace(hour=23, minute=59, second=59)
        
        created = db.query(models.Ticket).filter(
            models.Ticket.created_at >= date_start,
            models.Ticket.created_at <= date_end
        ).count()
        
        resolved = db.query(models.Ticket).filter(
            models.Ticket.resolved_at >= date_start,
            models.Ticket.resolved_at <= date_end
        ).count()
        
        weekly_trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "day": date.strftime("%a"),
            "created": created,
            "resolved": resolved
        })
        weekly_created.append(created)
        weekly_resolved.append(resolved)
    
    # ==================== Peak Hours Analysis ====================
    peak_hours = []
    hour_distribution = {}
    
    for hour in range(24):
        count = db.query(models.Ticket).filter(
            extract('hour', models.Ticket.created_at) == hour
        ).count()
        hour_distribution[f"{hour}:00"] = count
    
    # Get top 5 busiest hours
    top_hours = sorted(hour_distribution.items(), key=lambda x: x[1], reverse=True)[:5]
    for hour, count in top_hours:
        peak_hours.append({"hour": hour, "tickets": count})
    
    # ==================== Agent Performance ====================
    agents = db.query(models.Agent).all()
    agent_performance = []
    
    for agent in agents:
        # Tickets assigned to this agent
        assigned_tickets = db.query(models.Ticket).filter(
            models.Ticket.assigned_agent_id == agent.agent_id
        ).all()
        
        total_assigned = len(assigned_tickets)
        open_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.open)
        resolved_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.resolved)
        closed_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.closed)
        
        # Resolution rate
        resolved_total = resolved_count + closed_count
        resolution_rate_agent = round((resolved_total / total_assigned * 100), 2) if total_assigned > 0 else 0
        
        # Average resolution time for this agent
        agent_resolved_tickets = [t for t in assigned_tickets if t.resolution_time_minutes and t.resolution_time_minutes > 0]
        avg_time = 0
        if agent_resolved_tickets:
            avg_time = sum(t.resolution_time_minutes for t in agent_resolved_tickets) / len(agent_resolved_tickets)
        
        agent_performance.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "email": agent.email,
            "status": agent.status.value if agent.status else "active",
            "assigned_tickets": total_assigned,
            "open_tickets": open_count,
            "resolved_tickets": resolved_count,
            "closed_tickets": closed_count,
            "resolution_rate": resolution_rate_agent,
            "avg_resolution_minutes": round(avg_time, 2)
        })
    
    # ==================== User Statistics ====================
    total_users = db.query(models.User).count()
    
    # New users this week
    week_ago = datetime.now() - timedelta(days=7)
    new_users_this_week = db.query(models.User).filter(
        models.User.created_at >= week_ago
    ).count()
    
    # Active users (users who have created tickets)
    users_with_tickets = db.query(models.Ticket.user_id).distinct().count()
    
    # ==================== FAQ Statistics ====================
    total_faqs = db.query(models.FAQ).count()
    
    # Most used FAQs
    most_used_faqs = db.query(models.FAQ).filter(
        models.FAQ.times_used > 0
    ).order_by(models.FAQ.times_used.desc()).limit(5).all()
    
    faq_list = []
    for faq in most_used_faqs:
        faq_list.append({
            "faq_id": faq.faq_id,
            "question": faq.question[:80] + "..." if len(faq.question) > 80 else faq.question,
            "times_used": faq.times_used
        })
    
    # ==================== AI Metrics ====================
    # Count AI replies
    ai_replies = db.query(models.TicketReply).filter(
        models.TicketReply.sender_type == models.SenderEnum.AI
    ).count()
    
    # Tickets that received AI assistance
    tickets_with_ai = db.query(models.Ticket.ticket_id).distinct().join(
        models.TicketReply
    ).filter(
        models.TicketReply.sender_type == models.SenderEnum.AI
    ).count()
    
    # Tickets auto-resolved by AI (tickets resolved by AI without agent assignment)
    auto_resolved = db.query(models.Ticket).filter(
        models.Ticket.status == models.StatusEnum.resolved,
        models.Ticket.assigned_agent_id.is_(None)
    ).count()
    
    # ==================== Status Distribution ====================
    status_distribution = {
        "Open": open_tickets,
        "In Progress": in_progress_tickets,
        "Resolved": resolved_tickets,
        "Closed": closed_tickets
    }
    
    # ==================== Response Metrics ====================
    # Calculate average first response time (time between ticket creation and first agent reply)
    first_response_times = []
    
    tickets_with_agent_replies = db.query(models.Ticket).join(
        models.TicketReply
    ).filter(
        models.TicketReply.sender_type == models.SenderEnum.agent
    ).all()
    
    for ticket in tickets_with_agent_replies:
        first_agent_reply = db.query(models.TicketReply).filter(
            models.TicketReply.ticket_id == ticket.ticket_id,
            models.TicketReply.sender_type == models.SenderEnum.agent
        ).order_by(models.TicketReply.created_at.asc()).first()
        
        if first_agent_reply and ticket.created_at:
            response_time = (first_agent_reply.created_at - ticket.created_at).total_seconds() / 60
            if response_time > 0:
                first_response_times.append(response_time)
    
    avg_first_response = round(sum(first_response_times) / len(first_response_times), 2) if first_response_times else 0
    
    # ==================== Summary Response ====================
    return {
        "summary": {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "in_progress_tickets": in_progress_tickets,
            "resolved_tickets": resolved_tickets,
            "closed_tickets": closed_tickets,
            "resolution_rate": resolution_rate,
            "avg_resolution_minutes": round(avg_resolution_minutes, 2),
            "avg_resolution_display": f"{round(avg_resolution_minutes / 60, 1)}h" if avg_resolution_minutes > 60 else f"{round(avg_resolution_minutes)}m",
            "fastest_resolution_minutes": round(fastest_resolution, 2) if fastest_resolution else 0,
            "avg_first_response_minutes": avg_first_response
        },
        "distribution": {
            "by_priority": priority_distribution,
            "by_category": category_distribution,
            "by_status": status_distribution
        },
        "resolution_breakdown": resolution_breakdown,
        "trends": {
            "weekly": weekly_trends,
            "weekly_created": weekly_created,
            "weekly_resolved": weekly_resolved
        },
        "peak_hours": peak_hours,
        "hour_distribution": hour_distribution,
        "agent_performance": agent_performance,
        "user_stats": {
            "total_users": total_users,
            "new_users_this_week": new_users_this_week,
            "active_users": users_with_tickets
        },
        "faq_stats": {
            "total_faqs": total_faqs,
            "most_used": faq_list
        },
        "ai_metrics": {
            "total_ai_replies": ai_replies,
            "tickets_with_ai_assistance": tickets_with_ai,
            "auto_resolved_tickets": auto_resolved,
            "ai_assistance_rate": round((tickets_with_ai / total_tickets * 100), 2) if total_tickets > 0 else 0
        }
    }


@router.get("/agent-performance/{agent_id}")
def get_agent_performance_detail(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get detailed performance metrics for a specific agent"""
    
    agent = db.query(models.Agent).filter(models.Agent.agent_id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get all tickets assigned to this agent
    assigned_tickets = db.query(models.Ticket).filter(
        models.Ticket.assigned_agent_id == agent_id
    ).order_by(models.Ticket.created_at.desc()).all()
    
    # Daily performance for last 7 days
    daily_performance = []
    for i in range(6, -1, -1):
        date = datetime.now() - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0)
        date_end = date.replace(hour=23, minute=59, second=59)
        
        resolved = db.query(models.Ticket).filter(
            models.Ticket.assigned_agent_id == agent_id,
            models.Ticket.resolved_at >= date_start,
            models.Ticket.resolved_at <= date_end
        ).count()
        
        daily_performance.append({
            "date": date.strftime("%Y-%m-%d"),
            "resolved": resolved
        })
    
    # Calculate metrics
    total_assigned = len(assigned_tickets)
    resolved_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.resolved)
    closed_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.closed)
    open_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.open)
    in_progress_count = sum(1 for t in assigned_tickets if t.status == models.StatusEnum.in_progress)
    
    # Resolution time
    resolved_tickets = [t for t in assigned_tickets if t.resolution_time_minutes and t.resolution_time_minutes > 0]
    avg_resolution = sum(t.resolution_time_minutes for t in resolved_tickets) / len(resolved_tickets) if resolved_tickets else 0
    
    return {
        "agent": {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "email": agent.email,
            "status": agent.status.value if agent.status else "active"
        },
        "summary": {
            "total_assigned": total_assigned,
            "resolved": resolved_count,
            "closed": closed_count,
            "open": open_count,
            "in_progress": in_progress_count,
            "completion_rate": round(((resolved_count + closed_count) / total_assigned * 100), 2) if total_assigned > 0 else 0,
            "avg_resolution_minutes": round(avg_resolution, 2)
        },
        "daily_performance": daily_performance,
        "recent_tickets": [
            {
                "ticket_id": t.ticket_id,
                "title": t.title,
                "status": t.status.value,
                "priority": t.priority.value,
                "created_at": t.created_at.isoformat(),
                "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None
            }
            for t in assigned_tickets[:10]
        ]
    }


@router.get("/ticket-trends")
def get_ticket_trends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
    days: int = 30
):
    """Get ticket trends for the specified number of days"""
    
    today = datetime.now()
    start_date = today - timedelta(days=days)
    
    trends = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        next_date = date + timedelta(days=1)
        
        created = db.query(models.Ticket).filter(
            models.Ticket.created_at >= date,
            models.Ticket.created_at < next_date
        ).count()
        
        resolved = db.query(models.Ticket).filter(
            models.Ticket.resolved_at >= date,
            models.Ticket.resolved_at < next_date
        ).count()
        
        trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "created": created,
            "resolved": resolved
        })
    
    return trends


@router.get("/category-stats")
def get_category_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Get statistics by category"""
    
    categories = db.query(models.Category).all()
    stats = []
    
    for category in categories:
        ticket_count = db.query(models.Ticket).filter(
            models.Ticket.category_id == category.category_id
        ).count()
        
        resolved_count = db.query(models.Ticket).filter(
            models.Ticket.category_id == category.category_id,
            models.Ticket.status == models.StatusEnum.resolved
        ).count()
        
        avg_resolution = db.query(func.avg(models.Ticket.resolution_time_minutes)).filter(
            models.Ticket.category_id == category.category_id,
            models.Ticket.resolution_time_minutes.isnot(None)
        ).scalar() or 0
        
        stats.append({
            "category_id": category.category_id,
            "category_name": category.category_name,
            "ticket_count": ticket_count,
            "resolved_count": resolved_count,
            "resolution_rate": round((resolved_count / ticket_count * 100), 2) if ticket_count > 0 else 0,
            "avg_resolution_minutes": round(avg_resolution, 2)
        })
    
    return stats