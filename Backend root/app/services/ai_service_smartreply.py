# Add this method to your existing AIService class in ai_service.py

async def auto_solve_ticket(self, title: str, description: str) -> dict:
    """
    Checks if ticket is a common solvable issue.
    If yes, returns step-by-step solution.
    If no, returns None (needs human agent).
    """

    # Common issues that AI can solve with steps
    COMMON_ISSUES = [
        "login", "password", "reset", "forgot", "sign in", "cannot access",
        "account locked", "2fa", "two factor", "otp", "verification",
        "email not received", "not receiving email", "spam",
        "how to", "how do i", "where is", "what is", "guide",
        "update profile", "change name", "change email", "change phone",
        "delete account", "deactivate", "subscription", "cancel plan",
        "download", "install", "setup", "configure", "settings",
        "slow", "loading", "cache", "clear", "refresh", "browser",
        "invoice", "receipt", "billing history", "payment method",
    ]

    text = f"{title} {description}".lower()
    is_common = any(kw in text for kw in COMMON_ISSUES)

    if not is_common:
        return {"can_auto_solve": False, "reason": "Complex issue needs human agent"}

    prompt = f"""You are a customer support AI. A customer has submitted this support ticket:

Title: {title}
Description: {description}

This appears to be a common issue you can solve. Provide clear step-by-step instructions.

Return ONLY this JSON:
{{
  "can_solve": true,
  "confidence": 0.85,
  "solution_title": "How to [fix the issue]",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "estimated_time": "2 minutes",
  "additional_note": "Optional extra tip or warning"
}}

If you cannot solve this with steps, return:
{{"can_solve": false, "confidence": 0.0, "reason": "Needs human review"}}

Return ONLY valid JSON."""

    try:
        import httpx, json, re
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                f"{self.base_url}/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "temperature": 0.2,
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

                if result.get("can_solve") and result.get("steps"):
                    return {
                        "can_auto_solve": True,
                        "confidence": result.get("confidence", 0.8),
                        "solution_title": result.get("solution_title", "Here's how to fix this"),
                        "steps": result.get("steps", []),
                        "estimated_time": result.get("estimated_time", "5 minutes"),
                        "additional_note": result.get("additional_note", ""),
                    }
    except Exception as e:
        print(f"[AutoSolve] Error: {e}")

    # Fallback: generate basic steps based on keywords
    return {"can_auto_solve": False, "reason": "AI unavailable"}