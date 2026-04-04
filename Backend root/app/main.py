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

# Get frontend URL from environment variable or use default
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://customer-support-ticket-agent.vercel.app")

# CORS configuration - Allow your Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                          # Local development
        "http://localhost:3000",                          # Alternative local
        "https://customer-support-ticket-agent.vercel.app", # Your Vercel frontend
        FRONTEND_URL,                                      # From environment variable
    ],
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
