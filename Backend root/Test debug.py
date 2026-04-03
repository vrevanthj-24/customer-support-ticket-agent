"""
Run this from your project root:
  python test_debug.py

It will tell you exactly what's wrong with email and env loading.
"""
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 60)
print("STEP 1: Checking .env file")
print("=" * 60)

env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    print(f"❌ .env file NOT found at: {env_path}")
else:
    print(f"✅ .env found at: {env_path}")
    # Read raw content
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key = line.split("=")[0]
                val = "=".join(line.split("=")[1:])
                # Mask password
                if "PASSWORD" in key or "SECRET" in key:
                    display = val[:4] + "****" if len(val) > 4 else "****"
                else:
                    display = val
                print(f"   {key} = {display}")

print()
print("=" * 60)
print("STEP 2: Loading dotenv and checking os.getenv")
print("=" * 60)

from dotenv import load_dotenv
load_dotenv(dotenv_path=env_path, override=True)

smtp_user = os.getenv("SMTP_USER", "")
smtp_password = os.getenv("SMTP_PASSWORD", "")
smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
smtp_port = os.getenv("SMTP_PORT", "587")

print(f"SMTP_HOST     = {smtp_host}")
print(f"SMTP_PORT     = {smtp_port}")
print(f"SMTP_USER     = {smtp_user}")
print(f"SMTP_PASSWORD = {'SET (' + str(len(smtp_password)) + ' chars)' if smtp_password else 'NOT SET ❌'}")

if not smtp_user:
    print("\n❌ SMTP_USER is empty — check your .env file")
if not smtp_password:
    print("\n❌ SMTP_PASSWORD is empty — check your .env file")
if smtp_user == "your-email@gmail.com":
    print("\n❌ SMTP_USER is still the placeholder value!")
if smtp_password == "your-app-password":
    print("\n❌ SMTP_PASSWORD is still the placeholder value!")

print()
print("=" * 60)
print("STEP 3: Testing SMTP connection")
print("=" * 60)

if smtp_user and smtp_password and smtp_user != "your-email@gmail.com":
    import smtplib
    import ssl
    try:
        print(f"Connecting to {smtp_host}:{smtp_port}...")
        with smtplib.SMTP(smtp_host, int(smtp_port), timeout=10) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            print("✅ TLS handshake successful")
            server.login(smtp_user, smtp_password)
            print("✅ Login successful!")
            print("\n✅ EMAIL IS CONFIGURED CORRECTLY")
            print(f"   Send a test? Sending to {smtp_user}...")
            from email.mime.text import MIMEText
            msg = MIMEText("This is a test email from SupportAI debug script.")
            msg["Subject"] = "SupportAI Test Email ✅"
            msg["From"] = smtp_user
            msg["To"] = smtp_user
            server.send_message(msg)
            print(f"✅ Test email sent to {smtp_user} — check your inbox!")
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ AUTH FAILED: {e}")
        print("\nFix: Use Gmail App Password (not regular password)")
        print("Go to: myaccount.google.com → Security → App passwords")
    except smtplib.SMTPConnectError as e:
        print(f"❌ CONNECTION FAILED: {e}")
        print("\nFix: Check if port 587 is blocked by firewall/antivirus")
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")
else:
    print("⚠️  Skipping SMTP test — credentials not configured")

print()
print("=" * 60)
print("STEP 4: Testing AI triage priority")
print("=" * 60)

try:
    import asyncio
    from app.services.ai_service import ai_service

    async def test_triage():
        result = await ai_service.triage_ticket(
            "URGENT - Cannot access account, system is down",
            "Our entire system is down and we cannot access anything. This is a critical emergency."
        )
        print(f"AI Result: {result}")
        priority = result.get("priority", "NOT_SET")
        print(f"Priority returned: '{priority}'")
        # Check normalization
        p = priority.upper().strip()
        for valid in ["P1", "P2", "P3", "P4"]:
            if p.startswith(valid):
                print(f"✅ Normalized to: {valid}")
                break
        else:
            print(f"❌ Could not normalize '{priority}' — will default to P3")

    asyncio.run(test_triage())
except Exception as e:
    print(f"❌ AI test error: {type(e).__name__}: {e}")

print()
print("=" * 60)
print("DONE")
print("=" * 60)