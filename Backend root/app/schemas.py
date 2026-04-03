from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from enum import Enum


class PriorityEnum(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class StatusEnum(str, Enum):
    open = "open"
    in_progress = "in-progress"
    resolved = "resolved"
    closed = "closed"


class SenderEnum(str, Enum):
    user = "user"
    agent = "agent"
    AI = "AI"


class AgentStatus(str, Enum):
    active = "active"
    inactive = "inactive"


# ==================== User Schemas ====================
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class User(UserBase):
    user_id: int
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Agent Schemas ====================
class AgentBase(BaseModel):
    name: str
    email: EmailStr
    department_id: int


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    status: Optional[AgentStatus] = None


class Agent(AgentBase):
    agent_id: int
    status: AgentStatus = AgentStatus.active
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Token Schemas ====================
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# ==================== Category Schemas ====================
class CategoryBase(BaseModel):
    category_name: str
    description: Optional[str] = None


class Category(CategoryBase):
    category_id: int

    class Config:
        from_attributes = True


# ==================== SubCategory Schemas ====================
class SubCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class SubCategory(SubCategoryBase):
    subcategory_id: int
    category_id: int

    class Config:
        from_attributes = True


# ==================== Department Schemas ====================
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class Department(DepartmentBase):
    department_id: int

    class Config:
        from_attributes = True


# ==================== Ticket Schemas ====================
class TicketBase(BaseModel):
    title: str
    description: str


class TicketCreate(BaseModel):
    title: str
    description: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[StatusEnum] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    assigned_agent_id: Optional[int] = None


class Ticket(TicketBase):
    ticket_id: int
    user_id: Optional[int] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    category_name: Optional[str] = None  # Added for frontend display
    subcategory_name: Optional[str] = None  # Added for frontend display
    assigned_agent_name: Optional[str] = None  # Added for frontend display
    priority: PriorityEnum = PriorityEnum.P3
    status: StatusEnum = StatusEnum.open
    assigned_agent_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_time_minutes: Optional[float] = None

    class Config:
        from_attributes = True


# ==================== Reply Schemas ====================
class ReplyBase(BaseModel):
    message: str


class ReplyCreate(ReplyBase):
    ticket_id: int
    sender_type: SenderEnum


class Reply(ReplyBase):
    reply_id: int
    ticket_id: int
    sender_type: SenderEnum
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== FAQ Schemas ====================
class FAQBase(BaseModel):
    question: str
    answer: str


class FAQ(FAQBase):
    faq_id: int
    category_id: Optional[int] = None
    created_from_ticket_id: Optional[int] = None
    times_used: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== AI Schemas ====================
class AITriageResponse(BaseModel):
    category: str
    subcategory: Optional[str] = None
    priority: str
    sentiment: str
    suggested_department: str


class AIReplyResponse(BaseModel):
    suggested_reply: str
    confidence_score: float
    is_faq_based: bool = False
    faq_id: Optional[int] = None


class AIRequest(BaseModel):
    message: str
    ticket_id: Optional[int] = None
    context: Optional[str] = None


class AIResponse(BaseModel):
    response: str
    suggested_actions: Optional[List[str]] = None


# ==================== Analytics Schemas ====================
class TicketAnalytics(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    avg_resolution_time_minutes: Optional[float] = None
    category_distribution: dict = {}
    priority_distribution: dict = {}
    ai_suggestion_acceptance_rate: float = 0.0


# ==================== Category Distribution Schemas ====================
class CategoryDistribution(BaseModel):
    category_name: str
    ticket_count: int
    percentage: float


class AgentPerformance(BaseModel):
    agent_id: int
    agent_name: str
    tickets_resolved: int
    avg_resolution_time: float
    satisfaction_rate: float

class Agent(AgentBase):
    agent_id: int
    department_id: Optional[int] = None
    department_name: Optional[str] = None  # Add this line
    expertise_categories: Optional[str] = None
    status: AgentStatus = AgentStatus.active
    max_concurrent_tickets: int = 5
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DailyStats(BaseModel):
    date: str
    tickets_created: int
    tickets_resolved: int
    avg_response_time: float

# Add these to your schemas.py

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str