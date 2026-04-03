from pydantic_settings import BaseSettings
import urllib.parse
import os

class Settings(BaseSettings):
    # Database configuration
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "Rev2005@!!")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "ai_support_db")
    DATABASE_URL: str = None
    
    @property
    def effective_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # AI Service Configuration
    LLAMA_BASE_URL: str = os.getenv("LLAMA_BASE_URL", "https://aimodels.jadeglobal.com:8082/ollama/api")
    LLAMA_MODEL: str = os.getenv("LLAMA_MODEL", "deepseek-coder:6.7b")
    
    # AI System Prompt
    AI_SYSTEM_PROMPT: str = """You are a friendly, helpful customer support AI for small businesses and startups.

YOUR ROLE:
- Help small business owners with their day-to-day operational issues
- Assist with account management, billing, technical problems, and general inquiries
- Provide step-by-step solutions in simple, non-technical language
- Be empathetic and understanding of small business challenges
- NEVER say you're specialized in programming or computer science
- NEVER refuse to answer business-related questions
- ALWAYS focus on practical business solutions

For ANY business-related question, provide helpful, actionable steps."""
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()