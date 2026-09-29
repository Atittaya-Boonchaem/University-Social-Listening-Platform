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
        assigned_dept = category_name if category_name else "ระบบภาพรวม (Global Administrator)"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>UP Voice Platform - คำเชิญเข้าร่วมระบบ</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', Helvetica, Arial, sans-serif;
                    background-color: #f3f4f6;
                    color: #1f2937;
                    margin: 0;
                    padding: 0;
                }}
                .wrapper {{
                    width: 100%;
                    background-color: #f3f4f6;
                    padding: 40px 15px;
                }}
                .card {{
                    max-width: 580px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(52, 8, 102, 0.12), 0 8px 10px -6px rgba(52, 8, 102, 0.08);
                    border: 1px solid #e9d5ff;
                }}
                .header {{
                    background: linear-gradient(135deg, #1e0836 0%, #340866 50%, #4c1d95 100%);
                    color: white;
                    padding: 36px 32px;
                    text-align: center;
                }}
                .logo-badge {{
                    display: inline-block;
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 6px 14px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #fed65b;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                }}
                .header h1 {{
                    margin: 0 0 6px 0;
                    font-size: 26px;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    color: #ffffff;
                }}
                .header p {{
                    margin: 0;
                    font-size: 13px;
                    color: #e9d5ff;
                    font-weight: 400;
                }}
                .body {{
                    padding: 32px;
                }}
                .greeting {{
                    font-size: 16px;
                    font-weight: 700;
                    color: #1e1b4b;
                    margin-bottom: 12px;
                }}
                .intro {{
                    font-size: 14px;
                    line-height: 1.7;
                    color: #4b5563;
                    margin-bottom: 24px;
                }}
                .info-box {{
                    background: #faf5ff;
                    border: 1px solid #e9d5ff;
                    border-left: 5px solid #7c3aed;
                    border-radius: 12px;
                    padding: 18px 20px;
                    margin-bottom: 28px;
                }}
                .info-row {{
                    display: flex;
                    margin-bottom: 8px;
                    font-size: 13px;
                }}
                .info-label {{
                    color: #6b7280;
                    width: 140px;
                    flex-shrink: 0;
                    font-weight: 600;
                }}
                .info-value {{
                    color: #1f2937;
                    font-weight: 700;
                }}
                .cta-box {{
                    text-align: center;
                    margin: 32px 0;
                }}
                .btn {{
                    display: inline-block;
                    background: linear-gradient(135deg, #340866 0%, #6d28d9 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    font-weight: 700;
                    font-size: 15px;
                    padding: 16px 36px;
                    border-radius: 12px;
                    box-shadow: 0 6px 20px rgba(109, 40, 217, 0.35);
                }}
                .note-box {{
                    background-color: #f9fafb;
                    border: 1px dashed #d1d5db;
                    border-radius: 10px;
                    padding: 14px;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.6;
                    word-break: break-all;
                }}
                .footer {{
                    background-color: #f9fafb;
                    border-top: 1px solid #f3f4f6;
                    padding: 24px;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="card">
                    <div class="header">
                        <div class="logo-badge">มหาวิทยาลัยพะเยา • UNIVERSITY OF PHAYAO</div>
                        <h1>UP Voice Platform</h1>
                        <p>ระบบรับเรื่องร้องเรียนและรับฟังเสียงนิสิตบุคลากร มหาวิทยาลัยพะเยา</p>
                    </div>
                    <div class="body">
                        <div class="greeting">เรียน ผู้ดูแลระบบ ({email}),</div>
                        <div class="intro">
                            คุณได้รับคำเชิญเข้าร่วมเป็นผู้ดูแลระบบในแพลตฟอร์ม <strong>UP Voice</strong> เพื่อร่วมดูแลและบริหารจัดการข้อร้องเรียนของมหาวิทยาลัยพะเยาให้รวดเร็วและมีประสิทธิภาพยิ่งขึ้น
                        </div>

                        <div class="info-box">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600; width: 150px;">สิทธิ์การใช้งาน:</td>
                                    <td style="padding: 6px 0; font-size: 14px; color: #4c1d95; font-weight: 700;">{display_role}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600;">หมวดหมู่ที่รับผิดชอบ:</td>
                                    <td style="padding: 6px 0; font-size: 14px; color: #1e1b4b; font-weight: 700;">{assigned_dept}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; font-size: 13px; color: #6b7280; font-weight: 600;">อายุของคำเชิญ:</td>
                                    <td style="padding: 6px 0; font-size: 13px; color: #059669; font-weight: 600;">7 วัน นับจากวันที่ได้รับ</td>
                                </tr>
                            </table>
                        </div>

                        <div class="cta-box">
                            <a href="{invite_link}" class="btn">
                                ยอมรับคำเชิญและตั้งรหัสผ่าน &rarr;
                            </a>
                        </div>

                        <div class="note-box">
                            <strong>หากไม่สามารถคลิกปุ่มด้านบนได้</strong> กรุณาคัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์ของคุณ:<br>
                            <a href="{invite_link}" style="color: #6d28d9; text-decoration: underline;">{invite_link}</a>
                        </div>
                    </div>
                    <div class="footer">
                        อีเมลนี้ถูกส่งโดยระบบอัตโนมัติของ UP Voice Platform มหาวิทยาลัยพะเยา<br>
                        &copy; 2026 University of Phayao. All rights reserved.
                    </div>
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
