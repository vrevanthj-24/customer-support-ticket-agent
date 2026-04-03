"""
Run this from Backend root folder:
  python seed_agents.py

This will:
1. Create 3 named agents in the database
2. Assign them to departments
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path('.env'), override=True)

from app.database import get_db
from app import models

db = next(get_db())

agents_data = [
    {
        "name": "Revanth Vangapandu",
        "email": "vrevanth200524@gmail.com",
        "department_id": 1,  # Technical Support
        "status": models.AgentStatus.active
    },
    {
        "name": "Harshith O",
        "email": "harshithoruganti@gmail.com",
        "department_id": 2,  # Billing
        "status": models.AgentStatus.active
    },
    {
        "name": "Abhishikth Venkat",
        "email": "abhishikthvenkat1010@gmail.com",
        "department_id": 3,  # Account Management
        "status": models.AgentStatus.active
    },
]

print("Creating agents...")
for agent_data in agents_data:
    # Check if already exists
    existing = db.query(models.Agent).filter(
        models.Agent.email == agent_data["email"]
    ).first()

    if existing:
        # Update existing
        existing.name = agent_data["name"]
        existing.department_id = agent_data["department_id"]
        existing.status = agent_data["status"]
        db.commit()
        print(f"  ✅ Updated: {agent_data['name']} ({agent_data['email']})")
    else:
        # Create new
        agent = models.Agent(**agent_data)
        db.add(agent)
        db.commit()
        db.refresh(agent)
        print(f"  ✅ Created: {agent_data['name']} ({agent_data['email']}) → Agent ID: {agent.agent_id}")

# Show all agents
print("\nAll agents in database:")
all_agents = db.query(models.Agent).all()
dept_names = {1: "Technical", 2: "Billing", 3: "Account Mgmt", 4: "General"}
for a in all_agents:
    print(f"  ID:{a.agent_id} | {a.name} | {a.email} | Dept:{dept_names.get(a.department_id,'?')} | {a.status.value}")

print("\nDone! Agents are ready.")
db.close()