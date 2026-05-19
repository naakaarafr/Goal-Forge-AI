import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = settings.EMAILS_FROM_EMAIL
        self.password = settings.SMTP_PASSWORD # App Password for Gmail

    async def send_email(self, to_email: str, subject: str, body_text: str, body_html: Optional[str] = None):
        """Sends an email using SMTP (Free Tier friendly)."""
        if not self.sender_email or not self.password:
            print(f"Skipping email to {to_email}: SMTP not configured.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.sender_email
        msg["To"] = to_email

        part1 = MIMEText(body_text, "plain")
        msg.attach(part1)
        if body_html:
            part2 = MIMEText(body_html, "html")
            msg.attach(part2)

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.password)
                server.sendmail(self.sender_email, to_email, msg.as_string())
        except Exception as e:
            print(f"Email failed: {e}")
