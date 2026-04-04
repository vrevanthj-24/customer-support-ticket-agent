from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import engine, Base
from .routers import auth, tickets, agents, faq, users, analytics, categories

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Customer Support Ticket System",
    version="1.0.0",
    description="AI-powered ticket management system"
)

# Get allowed origins from environment variable (comma-separated)
# Example: "https://customer-support-ticket-agent.vercel.app,https://customer-support-ticket-agent-git-main-vrevanthj-24s-projects.vercel.app"
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS_LIST = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]

# Default allowed origins for local development
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Add common Vercel URLs
VERCEL_URLS = [
    "https://customer-support-ticket-agent.vercel.app",
    "https://customer-support-ticket-agent-git-main-vrevanthj-24s-projects.vercel.app",
    "https://*.vercel.app",  # Wildcard for all Vercel subdomains
]

# Combine all origins
ALLOWED_ORIGINS = DEFAULT_ORIGINS + VERCEL_URLS + ALLOWED_ORIGINS_LIST

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(agents.router)
app.include_router(faq.router)
app.include_router(users.router)
app.include_router(analytics.router)
app.include_router(categories.router)

@app.get("/")
async def root():
    return {
        "message": "AI Customer Support Ticket System API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
