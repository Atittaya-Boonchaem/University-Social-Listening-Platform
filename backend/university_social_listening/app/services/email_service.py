import smtplib
from email.message import EmailMessage
import os
import logging

logger = logging.getLogger(__name__)


def send_invitation_email(email: str, role: str, category_name: str, token: str):
    smtp_email = os.getenv("SMTP_EMAIL", "artitaya.11244@gmail.com")
    raw_password = os.getenv("SMTP_PASSWORD", "nupd wksj jknn aiks")
    smtp_password = raw_password.replace(" ", "") if raw_password else ""

    if not smtp_email or not smtp_password:
        logger.error("SMTP_EMAIL or SMTP_PASSWORD not set in environment variables.")
        return

    try:
        msg = EmailMessage()
        display_role = role.replace("_", " ").title()
        msg['Subject'] = f'คำเชิญเข้าร่วมเป็นผู้ดูแลระบบ UP Voice ({display_role} Invitation)'
        msg['From'] = f"UP Voice Platform <{smtp_email}>"
        msg['To'] = email

        frontend_url = os.getenv("FRONTEND_URL", "https://university-social-listening-platfor.vercel.app")
        invite_link = f"{frontend_url}/register?token={token}"
        
        category_text = f"manage the <strong>{category_name}</strong> category" if category_name else "access the platform"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f8fafc;
                    color: #334155;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                }}
                .header {{
                    background-color: #4f46e5;
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                }}
                .content {{
                    padding: 40px;
                }}
                .content p {{
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }}
                .cta-container {{
                    text-align: center;
                    margin-top: 32px;
                    margin-bottom: 32px;
                }}
                .btn {{
                    display: inline-block;
                    background-color: #4f46e5;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    padding: 14px 28px;
                    border-radius: 8px;
                    transition: background-color 0.2s ease;
                }}
                .btn:hover {{
                    background-color: #4338ca;
                }}
                .footer {{
                    background-color: #f1f5f9;
                    padding: 24px;
                    text-align: center;
                    font-size: 14px;
                    color: #64748b;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>UP Voice Platform</h1>
                </div>
                <div class="content">
                    <p>เรียน ผู้ได้รับการเสนอชื่อเป็นผู้ดูแลระบบ ({email}),</p>
                    <p>ท่านได้รับคำเชิญเข้าร่วมใช้งานระบบ UP Voice ในบทบาท <strong>{display_role}</strong> เพื่อรับผิดชอบและดูแลหมวดหมู่ {category_text}</p>
                    
                    <div class="cta-container">
                        <a href="{invite_link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 8px;">ยอมรับคำเชิญและตั้งรหัสผ่าน (Accept Invitation)</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #64748b;">หากไม่สามารถคลิกปุ่มได้ สามารถคัดลอกลิงก์ด้านล่างนี้ไปวางในเบราว์เซอร์:<br><a href="{invite_link}" style="color: #4f46e5; word-break: break-all;">{invite_link}</a></p>
                </div>
                <div class="footer">
                    &copy; 2026 UP Voice Platform มหาวิทยาลัยพะเยา. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.set_content(f"ท่านได้รับคำเชิญเข้าร่วม UP Voice Platform: {invite_link}")
        msg.add_alternative(html_content, subtype='html')

        # Try SSL port 465 first, fallback to TLS port 587
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        except Exception as ssl_err:
            logger.warning(f"SSL port 465 failed ({ssl_err}), trying TLS port 587...")
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            
        logger.info(f"Invitation email sent successfully to {email}")

    except Exception as e:
        logger.exception(f"Failed to send email to {email}. Error: {str(e)}")


def test_send_email(target_email: str) -> dict:
    """
    Diagnostic helper to test SMTP connection from local or cloud environment.
    """
    smtp_email = os.getenv("SMTP_EMAIL", "artitaya.11244@gmail.com")
    raw_password = os.getenv("SMTP_PASSWORD", "nupd wksj jknn aiks")
    smtp_password = raw_password.replace(" ", "") if raw_password else ""

    if not smtp_email or not smtp_password:
        return {"success": False, "error": "SMTP_EMAIL or SMTP_PASSWORD not set in environment variables"}

    msg = EmailMessage()
    msg['Subject'] = 'UP Voice Platform - ทดสอบการส่งอีเมล (Test SMTP Connection)'
    msg['From'] = f"UP Voice Platform <{smtp_email}>"
    msg['To'] = target_email
    msg.set_content(f"สวัสดีครับ,\n\nนี่คืออีเมลทดสอบการเชื่อมต่อระบบ SMTP จาก UP Voice Platform ไปยัง {target_email}\nหากได้รับอีเมลนี้ แสดงว่าระบบส่งอีเมลจากเซิร์ฟเวอร์สามารถเชื่อมต่อ Gmail ได้อย่างสมบูรณ์แบบ 100% ครับ")

    logs = []
    # 1. Try SSL port 465
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        logs.append("Sent successfully via SMTP_SSL (port 465)")
        return {"success": True, "method": "SSL_465", "message": f"Email successfully sent to {target_email}", "logs": logs}
    except Exception as e_ssl:
        logs.append(f"Port 465 failed: {str(e_ssl)}")
        # 2. Try TLS port 587
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            logs.append("Sent successfully via SMTP TLS (port 587)")
            return {"success": True, "method": "TLS_587", "message": f"Email successfully sent to {target_email}", "logs": logs}
        except Exception as e_tls:
            logs.append(f"Port 587 failed: {str(e_tls)}")
            return {"success": False, "error": f"Failed via both ports 465 and 587. SSL error: {str(e_ssl)}, TLS error: {str(e_tls)}", "logs": logs}


def send_revocation_email(email: str):
    smtp_email = os.getenv("SMTP_EMAIL", "artitaya.11244@gmail.com")
    raw_password = os.getenv("SMTP_PASSWORD", "nupd wksj jknn aiks")
    smtp_password = raw_password.replace(" ", "") if raw_password else ""

    if not smtp_email or not smtp_password:
        logger.error("SMTP_EMAIL or SMTP_PASSWORD not set in environment variables.")
        return

    try:
        msg = EmailMessage()
        msg['Subject'] = 'Notice: Your UP Voice Admin Access / Invitation has been Revoked'
        msg['From'] = smtp_email
        msg['To'] = email

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f8fafc;
                    color: #334155;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{
                    background-color: #ef4444;
                    color: white;
                    padding: 30px 40px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 22px;
                    font-weight: 700;
                }}
                .content {{
                    padding: 40px;
                }}
                .content p {{
                    font-size: 15px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }}
                .alert-box {{
                    background-color: #fef2f2;
                    border-left: 4px solid #ef4444;
                    padding: 16px;
                    border-radius: 6px;
                    margin: 20px 0;
                    color: #991b1b;
                    font-weight: 500;
                }}
                .footer {{
                    background-color: #f1f5f9;
                    padding: 20px;
                    text-align: center;
                    font-size: 13px;
                    color: #64748b;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>UP Voice Access Status Update</h1>
                </div>
                <div class="content">
                    <p>เรียน ผู้ใช้งาน ({email}),</p>
                    <div class="alert-box">
                        ⚠️ สิทธิ์การเข้าถึง / คำเชิญใช้งานระบบ UP Voice ของคุณถูกยกเลิกหรือหมดอายุ (Session Expired / Access Revoked)
                    </div>
                    <p>ระบบขอแจ้งให้ทราบว่า สิทธิ์การเป็นผู้ดูแลระบบ (Admin) หรือคำเชิญเข้าใช้งานสำหรับอีเมล <strong>{email}</strong> ได้ถูกยกเลิกโดยผู้ดูแลระบบ (Super Admin) เรียบร้อยแล้ว</p>
                    <p>หากมีข้อสงสัยเพิ่มเติม โปรดติดต่อผู้ดูแลระบบมหาวิทยาลัยพะเยา</p>
                </div>
                <div class="footer">
                    &copy; 2026 UP Voice Platform. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """

        msg.set_content(f"Notice: Your invitation/access for {email} has been revoked.")
        msg.add_alternative(html_content, subtype='html')

        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        except Exception as ssl_err:
            logger.warning(f"SSL port 465 failed ({ssl_err}), trying TLS port 587...")
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)

        logger.info(f"Revocation notification email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send revocation email to {email}. Error: {str(e)}")
