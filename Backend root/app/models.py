from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, TIMESTAMP, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

# ENUMS
class PriorityEnum(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"

class StatusEnum(str, enum.Enum):
    open = "open"
    in_progress = "in-progress"
    resolved = "resolved"
    closed = "closed"

class SenderEnum(str, enum.Enum):
    user = "user"
    agent = "agent"
    AI = "AI"

class AgentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


# ==================== Department Table (NEW) ====================
class Department(Base):
    __tablename__ = "departments"
    
    department_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    agents = relationship("Agent", back_populates="department")
    categories = relationship("Category", back_populates="department")


# ==================== Users Table ====================
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True)
    phone = Column(String(15))
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    tickets = relationship("Ticket", back_populates="user")


# ==================== Categories Table ====================
class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    department = relationship("Department", back_populates="categories")
    subcategories = relationship("SubCategory", back_populates="category")
    tickets = relationship("Ticket", back_populates="category")
    faqs = relationship("FAQ", back_populates="category")


# ==================== SubCategories Table ====================
class SubCategory(Base):
    __tablename__ = "subcategories"

    subcategory_id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"))
    name = Column(String(100))
    description = Column(Text)
    
    category = relationship("Category", back_populates="subcategories")
    tickets = relationship("Ticket", back_populates="subcategory")


# ==================== Agents Table ====================
class Agent(Base):
    __tablename__ = "agents"

    agent_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True)
    expertise_categories = Column(Text, nullable=True)  # Comma-separated category names
    status = Column(Enum(AgentStatus), default=AgentStatus.active)
    max_concurrent_tickets = Column(Integer, default=5)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    department = relationship("Department", back_populates="agents")
    tickets = relationship("Ticket", back_populates="assigned_agent")


# ==================== Tickets Table ====================
class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    title = Column(String(255))
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.subcategory_id"), nullable=True)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.P3)
    status = Column(Enum(StatusEnum), default=StatusEnum.open)
    assigned_agent_id = Column(Integer, ForeignKey("agents.agent_id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, onupdate=func.now())
    resolved_at = Column(TIMESTAMP, nullable=True)
    resolution_time_minutes = Column(Integer, nullable=True)
    
    user = relationship("User", back_populates="tickets")
    category = relationship("Category", back_populates="tickets")
    subcategory = relationship("SubCategory", back_populates="tickets")
    assigned_agent = relationship("Agent", back_populates="tickets")
    replies = relationship("TicketReply", back_populates="ticket")
    faq_entry = relationship("FAQ", back_populates="ticket")


# ==================== Ticket Replies Table ====================
class TicketReply(Base):
    __tablename__ = "ticket_replies"

    reply_id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"))
    sender_type = Column(Enum(SenderEnum))
    message = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    ticket = relationship("Ticket", back_populates="replies")


# ==================== FAQ Table ====================
class FAQ(Base):
    __tablename__ = "faqs"

    faq_id = Column(Integer, primary_key=True, index=True)
    question = Column(Text)
    answer = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    created_from_ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    times_used = Column(Integer, default=0)
    
    category = relationship("Category", back_populates="faqs")
    ticket = relationship("Ticket", back_populates="faq_entry")