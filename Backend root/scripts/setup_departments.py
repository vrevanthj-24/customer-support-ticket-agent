import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app import models

def setup_departments_and_agents():
    db = SessionLocal()
    
    # Create departments
    departments = [
        {"name": "Technical Support", "description": "Handles technical issues, bugs, errors, API problems"},
        {"name": "Billing Support", "description": "Handles payment issues, refunds, invoices, subscriptions"},
        {"name": "Account Management", "description": "Handles account issues, profile updates, security"},
        {"name": "Product Support", "description": "Handles feature requests, product feedback, enhancements"},
        {"name": "General Support", "description": "Handles general inquiries and other issues"}
    ]
    
    dept_objects = {}
    for dept in departments:
        existing = db.query(models.Department).filter(models.Department.name == dept["name"]).first()
        if not existing:
            new_dept = models.Department(name=dept["name"], description=dept["description"])
            db.add(new_dept)
            db.flush()
            dept_objects[dept["name"]] = new_dept
            print(f"✓ Created department: {dept['name']}")
        else:
            dept_objects[dept["name"]] = existing
            print(f"✓ Department exists: {dept['name']}")
    
    # Map categories to departments
    category_dept_map = {
        "Technical": "Technical Support",
        "Billing": "Billing Support",
        "Account": "Account Management",
        "Feature Request": "Product Support",
        "General": "General Support"
    }
    
    # Update categories with department_id
    categories = db.query(models.Category).all()
    for cat in categories:
        dept_name = category_dept_map.get(cat.category_name)
        if dept_name and dept_name in dept_objects:
            cat.department_id = dept_objects[dept_name].department_id
            print(f"✓ Mapped category '{cat.category_name}' to department '{dept_name}'")
    
    db.commit()
    
    # Create sample agents with expertise
    agents_data = [
        {"name": "John Technical", "email": "john.tech@support.com", "department": "Technical Support", "expertise": ["Technical", "General"]},
        {"name": "Sarah Billing", "email": "sarah.billing@support.com", "department": "Billing Support", "expertise": ["Billing", "General"]},
        {"name": "Mike Accounts", "email": "mike.accounts@support.com", "department": "Account Management", "expertise": ["Account", "General"]},
        {"name": "Lisa Product", "email": "lisa.product@support.com", "department": "Product Support", "expertise": ["Feature Request", "General"]},
        {"name": "David Support", "email": "david.support@support.com", "department": "General Support", "expertise": ["General"]}
    ]
    
    for agent_data in agents_data:
        dept = dept_objects.get(agent_data["department"])
        if dept:
            existing = db.query(models.Agent).filter(models.Agent.email == agent_data["email"]).first()
            if not existing:
                new_agent = models.Agent(
                    name=agent_data["name"],
                    email=agent_data["email"],
                    department_id=dept.department_id,
                    expertise_categories=",".join(agent_data["expertise"]),
                    status=models.AgentStatus.active,
                    max_concurrent_tickets=5
                )
                db.add(new_agent)
                print(f"✓ Created agent: {agent_data['name']} ({agent_data['department']})")
            else:
                print(f"✓ Agent exists: {agent_data['name']}")
    
    db.commit()
    print("\n✅ Department and agent setup complete!")
    db.close()

if __name__ == "__main__":
    setup_departments_and_agents()