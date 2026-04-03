import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from datetime import datetime
import os
from pathlib import Path
from dotenv import load_dotenv
import re

# ── Find and load .env from Backend root ─────────────────
_this_file = Path(__file__).resolve()

_env_candidates = [
    _this_file.parent.parent.parent / ".env",           # app/services/../../.. = Backend root
    _this_file.parent.parent.parent.parent / ".env",
    _this_file.parent.parent / ".env",
    Path("Backend root/.env"),
    Path(".env"),
]

for _candidate in _env_candidates:
    if _candidate.exists():
        load_dotenv(dotenv_path=_candidate, override=True)
        print(f"[EmailService] ✅ .env loaded from: {_candidate.resolve()}")
        break
else:
    print(f"[EmailService] ❌ .env NOT found in any of: {[str(c) for c in _env_candidates]}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "").strip()
        self.smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        self.from_email = os.getenv("FROM_EMAIL", "").strip() or self.smtp_user
        self.from_name = os.getenv("FROM_NAME", "Customer Support Team")
        logger.info(f"[EmailService] user='{self.smtp_user}' pass={'SET' if self.smtp_password else '❌ NOT SET'}")

    def _create_message(self, to_email, subject, html_content, text_content=None):
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = to_email
        if text_content:
            message.attach(MIMEText(text_content, "plain"))
        else:
            message.attach(MIMEText(re.sub(r'<[^>]+>', '', html_content), "plain"))
        message.attach(MIMEText(html_content, "html"))
        return message

    def _send_email(self, to_email, subject, html_content, text_content=None):
        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "").strip()

        if not smtp_user or not smtp_password:
            logger.error("❌ Email NOT sent — SMTP_USER or SMTP_PASSWORD empty")
            return False
        if smtp_user in ("your-email@gmail.com", "your_gmail@gmail.com"):
            logger.error("❌ Email NOT sent — placeholder SMTP_USER in .env")
            return False
        if smtp_password in ("your-app-password", "your_16_char_app_password_here"):
            logger.error("❌ Email NOT sent — placeholder SMTP_PASSWORD in .env")
            return False

        try:
            msg = self._create_message(to_email, subject, html_content, text_content)
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            logger.info(f"✅ Email sent → {to_email} | {subject}")
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("❌ SMTP Auth failed — use Gmail App Password not regular password")
            return False
        except Exception as e:
            logger.error(f"❌ Email error: {type(e).__name__}: {e}")
            return False

    def send_ticket_confirmation(self, ticket: Dict[str, Any], user_email: str) -> bool:
        priority = str(ticket.get('priority', 'P3'))
        category = ticket.get('category', 'General')
        subcategory = ticket.get('subcategory', 'General Query')
        
        if '.' in priority:
            priority = priority.split('.')[-1]
        bg = {'P1':'#fee2e2','P2':'#ffedd5','P3':'#fef9c3','P4':'#dcfce7'}.get(priority,'#fef9c3')
        tc = {'P1':'#991b1b','P2':'#9a3412','P3':'#854d0e','P4':'#166534'}.get(priority,'#854d0e')
        
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}}
.hdr{{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0}}
.body{{background:#f9fafb;padding:30px;border-radius:0 0 12px 12px}}
.box{{background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #2563eb}}
.badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:{bg};color:{tc}}}
.cat-badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:#f3f4f6;color:#374151;margin-right:8px}}
.btn{{display:inline-block;background:#2563eb;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold}}
</style></head><body>
<div class="hdr"><h1>✅ Ticket Created</h1><p>Your support request has been received</p></div>
<div class="body">
<h2>Hello {ticket.get('name','Customer')},</h2>
<p>We've automatically analyzed your issue and categorized it:</p>
<div class="box">
<p><strong>Ticket ID:</strong> #{ticket.get('ticket_id')}</p>
<p><strong>Subject:</strong> {ticket.get('title')}</p>
<p><strong>Category:</strong> <span class="cat-badge">{category}</span> → {subcategory}</p>
<p><strong>Priority:</strong> <span class="badge">{priority}</span></p>
<p><strong>Created:</strong> {ticket.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M'))}</p>
<p><strong>Description:</strong><br>{ticket.get('description','')}</p>
</div>
<a href="http://localhost:5173/customer/tickets/{ticket.get('ticket_id')}" class="btn">View Your Ticket →</a>
</div></body></html>"""
        return self._send_email(user_email, f"✅ Ticket #{ticket.get('ticket_id')} Created!", html)

    def send_ticket_resolution(self, ticket: Dict[str, Any], user_email: str, resolution: str) -> bool:
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}}
.hdr{{background:linear-gradient(135deg,#059669,#047857);color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0}}
.body{{background:#f9fafb;padding:30px;border-radius:0 0 12px 12px}}
.box{{background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #059669}}
.btn{{display:inline-block;background:#059669;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold}}
</style></head><body>
<div class="hdr"><h1>🎉 Ticket Resolved!</h1></div>
<div class="body">
<h2>Hello {ticket.get('name','Customer')},</h2>
<p>Your support ticket has been resolved!</p>
<div class="box">
<p><strong>Ticket ID:</strong> #{ticket.get('ticket_id')}</p>
<p><strong>Subject:</strong> {ticket.get('title')}</p>
<p><strong>Resolved On:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<p><strong>Resolution:</strong><br>{resolution}</p>
</div>
<p>If this didn't resolve your issue, please open a new ticket.</p>
<a href="http://localhost:5173/customer/tickets" class="btn">View All Tickets →</a>
<p style="margin-top:24px">Thank you for using SupportAI! 😊</p>
</div></body></html>"""
        return self._send_email(user_email, f"🎉 Ticket #{ticket.get('ticket_id')} Resolved — Thank you!", html)

    def send_ticket_update(self, ticket: Dict[str, Any], user_email: str, update_message: str) -> bool:
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}}
.hdr{{background:#2563eb;color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0}}
.body{{background:#f9fafb;padding:30px;border-radius:0 0 12px 12px}}
.box{{background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #2563eb}}
.btn{{display:inline-block;background:#2563eb;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold}}
</style></head><body>
<div class="hdr"><h1>💬 New Reply on Your Ticket</h1></div>
<div class="body">
<h2>Hello {ticket.get('name','Customer')},</h2>
<p>New update on Ticket #{ticket.get('ticket_id')}:</p>
<div class="box"><p>{update_message}</p></div>
<a href="http://localhost:5173/customer/tickets/{ticket.get('ticket_id')}" class="btn">View & Reply →</a>
</div></body></html>"""
        return self._send_email(user_email, f"💬 New reply on Ticket #{ticket.get('ticket_id')}", html)

    def send_agent_assignment(self, ticket: Dict[str, Any], agent: Dict[str, Any], agent_email: str) -> bool:
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}}
.hdr{{background:#7c3aed;color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0}}
.body{{background:#f9fafb;padding:30px;border-radius:0 0 12px 12px}}
.box{{background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #7c3aed}}
.btn{{display:inline-block;background:#7c3aed;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold}}
</style></head><body>
<div class="hdr"><h1>📋 New Ticket Assigned</h1></div>
<div class="body">
<h2>Hello {agent.get('name')},</h2>
<div class="box">
<p><strong>Ticket ID:</strong> #{ticket.get('ticket_id')}</p>
<p><strong>Title:</strong> {ticket.get('title')}</p>
<p><strong>Priority:</strong> {ticket.get('priority','P3')}</p>
</div>
<a href="http://localhost:5173/admin/tickets/{ticket.get('ticket_id')}" class="btn">View Ticket →</a>
</div></body></html>"""
        return self._send_email(agent_email, f"📋 Ticket assigned: #{ticket.get('ticket_id')}", html)

    def send_welcome_email(self, user_name: str, user_email: str) -> bool:
        html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px}}
.hdr{{background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:30px;text-align:center;border-radius:12px 12px 0 0}}
.body{{background:#f9fafb;padding:30px;border-radius:0 0 12px 12px}}
.btn{{display:inline-block;background:#2563eb;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold}}
</style></head><body>
<div class="hdr"><h1>👋 Welcome to SupportAI!</h1></div>
<div class="body">
<h2>Hello {user_name},</h2>
<p>Welcome! You can now submit tickets, chat with AI, and track your issues in real time.</p>
<a href="http://localhost:5173/customer/dashboard" class="btn">Get Started →</a>
</div></body></html>"""
        return self._send_email(user_email, "👋 Welcome to SupportAI!", html)

    def send_password_reset(self, user_name: str, user_email: str, reset_link: str) -> bool:
        """Send password reset email"""
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Password Reset</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .warning {{ background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .button {{ display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello {user_name},</h2>
                <p>We received a request to reset your password for your SupportAI account.</p>
                <p>Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>
                <div class="warning">
                    <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                </div>
                <p>For security reasons, never share this link with anyone.</p>
            </div>
            <div class="footer">
                <p>SupportAI Customer Support System</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """
        
        subject = "🔐 Reset Your SupportAI Password"
        return self._send_email(user_email, subject, html_content)


email_service = EmailService()