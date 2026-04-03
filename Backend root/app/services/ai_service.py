import httpx
import json
import re
from typing import Optional, Dict, Any, List
from ..config import settings

class AIService:
    def __init__(self):
        self.base_url = settings.LLAMA_BASE_URL
        self.model = settings.LLAMA_MODEL

    async def generate_response(self, prompt: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Generate a customer support response for small businesses"""
        
        # SMALL BUSINESS CUSTOMER SUPPORT SYSTEM PROMPT
        system_prompt = """You are a friendly, helpful customer support AI for small businesses and startups.

YOUR ROLE:
- Help small business owners with their day-to-day operational issues
- Assist with account management, billing, technical problems, and general inquiries
- Provide step-by-step solutions in simple, non-technical language
- Be empathetic and understanding of small business challenges
- NEVER say you're specialized in programming or computer science
- NEVER refuse to answer business-related questions
- ALWAYS focus on practical business solutions

EXAMPLES OF QUESTIONS YOU ANSWER:
- "How do I update my business name on my account?"
- "My payment was declined even though I have funds"
- "How do I add another team member to my account?"
- "The website is loading slowly for my customers"
- "I need an invoice for my tax records"

Response Guidelines:
1. Be warm and professional
2. Use simple, clear language
3. Provide numbered steps when applicable
4. Include estimated time for solutions
5. End with a confirmation question
6. Never mention AI, programming, or computer science specialization

For ANY business-related question, provide helpful, actionable steps. If you cannot help, suggest contacting support@ or checking the FAQ."""

        full_prompt = f"""{system_prompt}

Customer Question: {prompt}

{f'Context: {context}' if context else ''}

Provide a helpful response for this small business owner:"""
        
        try:
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "model": self.model,
                        "prompt": full_prompt,
                        "stream": False,
                        "temperature": 0.5,
                        "max_tokens": 600,
                        "top_p": 0.9,
                        "frequency_penalty": 0.3,
                        "presence_penalty": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    reply = data.get("response", "")
                    
                    # Clean up any unwanted AI references
                    reply = self._clean_response(reply)
                    
                    return {
                        "success": True,
                        "response": reply,
                        "model": self.model,
                        "confidence": 0.92
                    }
                else:
                    return {
                        "success": False,
                        "error": f"API returned status {response.status_code}",
                        "response": self._get_business_fallback(prompt),
                        "confidence": 0.7
                    }
                    
        except Exception as e:
            print(f"AI Service Error: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": self._get_business_fallback(prompt),
                "confidence": 0.6
            }
    
    def _clean_response(self, response: str) -> str:
        """Remove any unwanted AI/programming references"""
        unwanted_patterns = [
            r"I'm sorry, but as an AI developed by Deepseek[^\n]*",
            r"I specialize in computer science[^\n]*",
            r"programming-related queries[^\n]*",
            r"outside my area of expertise[^\n]*",
            r"I am an AI[^\n]*",
            r"as an AI language model[^\n]*",
            r"I don't have the ability to[^\n]*",
        ]
        
        for pattern in unwanted_patterns:
            response = re.sub(pattern, "", response, flags=re.IGNORECASE)
        
        # Clean up extra newlines
        response = re.sub(r'\n\s*\n', '\n\n', response)
        
        return response.strip()
    
    def _get_business_fallback(self, prompt: str) -> str:
        """Return a business-friendly fallback response"""
        
        prompt_lower = prompt.lower()
        
        if "business name" in prompt_lower or "update name" in prompt_lower or "change name" in prompt_lower:
            return """Hi there! I'd be happy to help you update your business name.

Here's how to update your business name:

1. Log into your account dashboard
2. Click on 'Settings' or 'Business Profile' in the menu
3. Select 'Profile Information'
4. Click the 'Edit' button next to your business name
5. Enter your new business name
6. Scroll down and click 'Save Changes'

⏱️ This should take about 2-3 minutes.

💡 Your invoices and account communications will now show your new business name.

✅ Did this help resolve your issue?
- If YES — click 'Issue Resolved'
- If NO — click 'Still Need Help' to connect with an agent"""
        
        elif "payment" in prompt_lower or "card" in prompt_lower or "billing" in prompt_lower:
            return """I understand you're having a payment issue. Let me help you resolve this.

Please try these steps:

1. Check that your card has sufficient funds
2. Verify your card hasn't expired
3. Confirm your billing address matches your card statement
4. Try using a different payment method if available
5. Contact your bank to check for any blocks

⏱️ Estimated time: 5-10 minutes

💡 If the issue continues, our billing team can investigate further.

✅ Did these steps resolve your issue?"""
        
        elif "login" in prompt_lower or "password" in prompt_lower or "sign in" in prompt_lower:
            return """I can help you regain access to your account.

Here's what to do:

1. Click 'Forgot Password' on the login page
2. Enter your registered email address
3. Check your inbox for a password reset link
4. Click the link and create a new password
5. Log in with your new credentials

⏱️ This usually takes 3-5 minutes.

💡 Check your spam folder if you don't see the email within a few minutes.

✅ Were you able to reset your password?"""
        
        elif "team" in prompt_lower or "employee" in prompt_lower or "staff" in prompt_lower:
            return """I'd be happy to help you add team members to your account.

Steps to add a team member:

1. Log into your admin dashboard
2. Navigate to 'Team Management' or 'Users'
3. Click 'Invite Team Member'
4. Enter their name and email address
5. Select their permission level
6. Send the invitation

⏱️ Estimated time: 5 minutes

💡 The new team member will receive an email with setup instructions.

✅ Would you like more details about permission levels?"""
        
        else:
            return """Thank you for reaching out to our support team. I'm here to help with your business needs.

Could you please provide me with a bit more detail about your issue? This will help me give you the most accurate assistance.

In the meantime, you might find answers in our FAQ section or knowledge base.

I look forward to helping you resolve this!"""

    async def categorize_ticket(self, title: str, description: str) -> Dict[str, Any]:
        """Small business ticket categorization"""
        
        prompt = f"""Categorize this small business support ticket:

Ticket Title: {title}
Ticket Description: {description}

Categories:
- Technical: Website/app problems, errors, performance issues, integration failures
- Billing: Payment issues, refunds, invoices, subscription problems
- Account: Login issues, password reset, profile updates, team management
- Feature Request: New features, enhancements, product suggestions
- General: Other business inquiries, feedback, complaints

Return ONLY valid JSON:
{{
  "category": "Technical|Billing|Account|Feature Request|General",
  "subcategory": "specific issue type",
  "confidence": 0.95
}}"""

        try:
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "temperature": 0.1
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    raw = data.get("response", "{}")
                    try:
                        result = json.loads(raw)
                    except:
                        match = re.search(r'\{.*\}', raw, re.DOTALL)
                        result = json.loads(match.group()) if match else {}
                    
                    valid_categories = ["Technical", "Billing", "Account", "Feature Request", "General"]
                    category = result.get("category", "General")
                    if category not in valid_categories:
                        category = "General"
                    
                    return {
                        "category": category,
                        "subcategory": result.get("subcategory", "General Inquiry"),
                        "confidence": min(max(result.get("confidence", 0.85), 0.5), 0.99),
                        "reasoning": result.get("reasoning", "")
                    }
        except Exception as e:
            print(f"AI Categorization Error: {e}")
        
        return {
            "category": "General",
            "subcategory": "General Inquiry",
            "confidence": 0.7,
            "reasoning": "Fallback categorization"
        }

    async def triage_ticket(self, title: str, description: str) -> Dict[str, Any]:
        """Small business ticket triage with priority"""
        
        prompt = f"""Perform ticket triage for this small business support ticket:

Ticket Title: {title}
Ticket Description: {description}

Priority Guidelines:
- P1 (Critical): Business down, can't process orders, data loss, security breach
- P2 (High): Major feature broken, widespread issue, blocked workflow
- P3 (Medium): Minor bug, individual issue, general inquiry
- P4 (Low): Suggestion, question, nice-to-have enhancement

Sentiment Analysis:
- negative: frustrated, angry, urgent, complaining about business impact
- neutral: factual, informative, standard inquiry
- positive: satisfied, appreciative, complimentary

Return ONLY valid JSON:
{{
  "priority": "P1|P2|P3|P4",
  "sentiment": "negative|neutral|positive",
  "urgency_score": 1-10,
  "reasoning": "brief explanation",
  "suggested_department": "billing|technical_support|account_management|product|general"
}}"""

        try:
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "temperature": 0.2
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    raw = data.get("response", "{}")
                    try:
                        result = json.loads(raw)
                    except:
                        match = re.search(r'\{.*\}', raw, re.DOTALL)
                        result = json.loads(match.group()) if match else {}
                    
                    valid_priorities = ["P1", "P2", "P3", "P4"]
                    priority = result.get("priority", "P3")
                    if priority not in valid_priorities:
                        priority = "P3"
                    
                    return {
                        "priority": priority,
                        "sentiment": result.get("sentiment", "neutral"),
                        "urgency_score": min(max(result.get("urgency_score", 5), 1), 10),
                        "reasoning": result.get("reasoning", ""),
                        "suggested_department": result.get("suggested_department", "general")
                    }
        except Exception as e:
            print(f"AI Triage Error: {e}")
        
        return {
            "priority": "P3",
            "sentiment": "neutral",
            "urgency_score": 5,
            "reasoning": "Fallback triage",
            "suggested_department": "general"
        }

    async def suggest_reply(self, title: str, description: str, category: Optional[str] = None, 
                           context: Optional[str] = None, previous_replies: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate helpful reply suggestions for small business support"""
        
        context_section = ""
        if previous_replies and len(previous_replies) > 0:
            context_section = "\nPrevious Conversation:\n" + "\n".join([f"- {r[:200]}..." for r in previous_replies[-3:]])
        
        prompt = f"""You are a customer support agent for small businesses. Generate a helpful, professional reply.

Ticket Details:
- Title: {title}
- Description: {description}
- Category: {category or "General"}{context_section}

Response Guidelines:
1. Be warm and understanding of small business challenges
2. Provide specific, actionable solutions
3. Use simple, clear language (no technical jargon)
4. Include estimated time for resolution
5. Offer to escalate if needed
6. End with next steps

Return ONLY the reply text, no JSON, no markdown except bullet points."""

        try:
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "temperature": 0.4,
                        "max_tokens": 500
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    reply = data.get("response", "").strip()
                    reply = self._clean_response(reply)
                    return {
                        "success": True,
                        "suggested_reply": reply,
                        "confidence_score": 0.88
                    }
        except Exception as e:
            print(f"AI Reply Error: {e}")
        
        # Business-friendly fallback
        fallback_replies = {
            "Technical": "Thank you for letting us know about this technical issue. I understand how frustrating this can be for your business.\n\nLet me help you troubleshoot:\n\n1. Clear your browser cache and cookies\n2. Try using a different browser\n3. Restart your device\n4. Check if you're on the latest version\n\nIf these steps don't resolve the issue, please share any error messages you're seeing and I'll escalate this to our technical team.",
            "Billing": "Thank you for reaching out about your billing concern. I understand this is important for your business records.\n\nLet me help you:\n\n1. Check your payment method is up to date\n2. Verify the transaction in your bank statement\n3. Share the transaction ID with us\n\nOur billing team will investigate and get back to you within 24 hours.",
            "Account": "I'll help you with your account issue right away.\n\nPlease try these steps:\n\n1. Use the 'Forgot Password' link to reset\n2. Check your email for a verification link\n3. Ensure your account is active\n\nIf you need immediate assistance, please reply and I'll connect you with an account specialist.",
            "Feature Request": "Thank you for your suggestion! We appreciate feedback from small business owners like you. Our product team reviews all feature requests and prioritizes based on user demand. I've logged this request for consideration.",
            "General": "Thank you for contacting support. I'm reviewing your inquiry and will provide a detailed response shortly. In the meantime, please check our FAQ section for immediate answers."
        }
        
        return {
            "success": False,
            "suggested_reply": fallback_replies.get(category or "General", fallback_replies["General"]),
            "confidence_score": 0.75
        }

    async def auto_solve_ticket(self, title: str, description: str) -> Dict[str, Any]:
        """Auto-solve common small business issues with step-by-step guide"""
        
        text = f"{title} {description}".lower()
        
        # Business-focused common issues
        common_issues = {
            "business_name": ["business name", "company name", "update name", "change name"],
            "payment": ["payment", "card", "charge", "transaction", "declined"],
            "login": ["login", "sign in", "access account", "can't log in"],
            "team": ["add team", "employee", "staff", "team member", "invite"],
            "invoice": ["invoice", "receipt", "bill", "tax document"],
            "slow": ["slow", "lag", "freeze", "loading", "performance"]
        }
        
        detected = None
        for issue, keywords in common_issues.items():
            if any(kw in text for kw in keywords):
                detected = issue
                break
        
        if not detected:
            return {"can_auto_solve": False, "reason": "This issue needs a human agent"}
        
        # Business-friendly solution templates
        solutions = {
            "business_name": {
                "title": "How to update your business name",
                "steps": [
                    "Log into your account dashboard",
                    "Click on 'Settings' or 'Business Profile'",
                    "Select 'Profile Information'",
                    "Click the 'Edit' button next to your business name",
                    "Enter your new business name",
                    "Scroll down and click 'Save Changes'"
                ],
                "time": "2-3 minutes",
                "tip": "Your invoices and account communications will now show your new business name."
            },
            "payment": {
                "title": "How to resolve payment issues",
                "steps": [
                    "Verify your card has sufficient funds",
                    "Check that your card hasn't expired",
                    "Confirm your billing address matches your card statement",
                    "Try using a different payment method",
                    "Contact your bank to check for any blocks"
                ],
                "time": "5-10 minutes",
                "tip": "If the issue continues, our billing team can help investigate further."
            },
            "login": {
                "title": "How to regain account access",
                "steps": [
                    "Click 'Forgot Password' on the login page",
                    "Enter your registered email address",
                    "Check your inbox for a password reset link",
                    "Click the link and create a new password",
                    "Log in with your new credentials"
                ],
                "time": "3-5 minutes",
                "tip": "Check your spam folder if you don't see the email within a few minutes."
            },
            "team": {
                "title": "How to add team members",
                "steps": [
                    "Log into your admin dashboard",
                    "Navigate to 'Team Management' or 'Users'",
                    "Click 'Invite Team Member'",
                    "Enter their name and email address",
                    "Select their permission level",
                    "Send the invitation"
                ],
                "time": "5 minutes",
                "tip": "The new team member will receive an email with setup instructions."
            }
        }
        
        solution = solutions.get(detected, {
            "title": "How to resolve this issue",
            "steps": [
                "Log into your account dashboard",
                "Navigate to the relevant section",
                "Review your current settings",
                "Make the necessary changes",
                "Save and confirm the update"
            ],
            "time": "5-10 minutes",
            "tip": "If you need more specific help, please reply with additional details."
        })
        
        return {
            "can_auto_solve": True,
            "confidence": 0.88,
            "solution_title": solution["title"],
            "steps": [f"{i+1}. {step}" for i, step in enumerate(solution["steps"])],
            "estimated_time": solution["time"],
            "additional_note": solution["tip"]
        }

    async def extract_faq(self, title: str, description: str, resolution: str) -> Optional[Dict[str, str]]:
        """Extract FAQ from resolved small business tickets"""
        
        prompt = f"""Create a helpful FAQ from this resolved support ticket.

Ticket Title: {title}
Issue: {description}
Resolution: {resolution}

Create a clear FAQ entry for other small business owners:
- Question: What would a small business owner ask?
- Answer: Clear, step-by-step solution in plain language

Return ONLY valid JSON:
{{
  "question": "concise customer question",
  "answer": "detailed step-by-step answer"
}}"""

        try:
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "temperature": 0.3
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    raw = data.get("response", "{}")
                    try:
                        result = json.loads(raw)
                    except:
                        match = re.search(r'\{.*\}', raw, re.DOTALL)
                        result = json.loads(match.group()) if match else {}
                    
                    if result.get("question") and result.get("answer"):
                        return {
                            "question": result["question"],
                            "answer": result["answer"]
                        }
        except Exception as e:
            print(f"FAQ Extraction Error: {e}")
        
        # Simple fallback FAQ
        return {
            "question": title if len(title) < 100 else title[:100] + "...",
            "answer": resolution if len(resolution) < 500 else resolution[:500] + "..."
        }

# Create singleton instance
ai_service = AIService()