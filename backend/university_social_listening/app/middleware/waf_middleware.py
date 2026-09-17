# app/middleware/waf_middleware.py
"""
Web Application Firewall (WAF) & Intrusion Detection System (IDS) Middleware
ตรวจสอบทราฟฟิก HTTP ทุกคำขอเพื่อสกัดกั้น SQL Injection, Cross-Site Scripting (XSS) และ Malicious Payloads
พร้อมฝัง HTTP Security Headers ป้องกัน Clickjacking และ MIME-sniffing
"""
import re
import json
import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("WAF_SECURITY")

# ── SQL Injection & XSS Signatures ──────────────────────────────
SQLI_PATTERNS = [
    r"(?i)\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from|update\s+.*\s+set)\b",
    r"(?i)('\s*(or|and)\s*'?\d+'?\s*=\s*'?\d+)",
    r"(?i)('\s*(or|and)\s*['\"].*['\"]\s*=\s*['\"])",
    r"(?i)(--|\#|\/\*).*$",
    r"(?i)\b(information_schema|sys\.tables|pg_catalog|sqlite_master)\b",
    r"(?i)\b(benchmark\s*\(|sleep\s*\(|waitfor\s+delay)\b",
]

XSS_PATTERNS = [
    r"(?i)<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
    r"(?i)javascript\s*:\s*.*",
    r"(?i)on(load|click|mouseover|error|focus|submit)\s*=",
    r"(?i)<(iframe|embed|object|svg\s+onload)\b",
    r"(?i)eval\s*\(",
]

COMPILED_SQLI = [re.compile(p, re.IGNORECASE) for p in SQLI_PATTERNS]
COMPILED_XSS = [re.compile(p, re.IGNORECASE) for p in XSS_PATTERNS]

# In-memory IDS Security Event Store
IDS_SECURITY_ALERTS = []
MAX_ALERT_HISTORY = 200


def record_ids_alert(threat_type: str, ip: str, path: str, payload_snippet: str, method: str):
    """บันทึกเหตุการณ์การตรวจจับการบุกรุก (IDS Alert)"""
    import datetime
    alert = {
        "alert_id": f"IDS-{len(IDS_SECURITY_ALERTS) + 1:04d}",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "threat_type": threat_type,
        "severity": "CRITICAL" if "SQL Injection" in threat_type else "HIGH",
        "ip_address": ip,
        "method": method,
        "path": path,
        "blocked": True,
        "payload_snippet": payload_snippet[:200] if payload_snippet else "N/A"
    }
    IDS_SECURITY_ALERTS.insert(0, alert)
    if len(IDS_SECURITY_ALERTS) > MAX_ALERT_HISTORY:
        IDS_SECURITY_ALERTS.pop()
    logger.warning(f"[WAF/IDS BLOCKED] {threat_type} from IP: {ip} on {method} {path}")


def inspect_text_for_threats(text: str) -> Optional[str]:
    """สแกนข้อความเพื่อหา SQLi หรือ XSS"""
    if not text:
        return None
    for pattern in COMPILED_SQLI:
        if pattern.search(text):
            return "SQL Injection (SQLi) Attempt"
    for pattern in COMPILED_XSS:
        if pattern.search(text):
            return "Cross-Site Scripting (XSS) Attempt"
    return None


class WAFSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Extract Client IP
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "127.0.0.1")
        )

        # Skip scanning for static docs or swagger assets
        path = request.url.path
        if path in ["/docs", "/redoc", "/openapi.json"] or path.startswith("/uploads/"):
            response = await call_next(request)
            return self._attach_security_headers(response)

        # 2. Inspect Query Parameters (Decode URL encoding first)
        import urllib.parse
        raw_query = str(request.url.query)
        decoded_query = urllib.parse.unquote_plus(raw_query)
        
        threat = inspect_text_for_threats(decoded_query) or inspect_text_for_threats(raw_query)
        if threat:
            record_ids_alert(threat, client_ip, path, decoded_query, request.method)
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "message": f"WAF Security Violation: {threat} detected in request URL parameters",
                    "code": "SECURITY_WAF_BLOCKED",
                    "ip_address": client_ip,
                }
            )

        # 3. Process Request
        response: Response = await call_next(request)

        # 4. Attach OWASP Recommended Security Headers
        return self._attach_security_headers(response)

    def _attach_security_headers(self, response: Response) -> Response:
        """ฝัง Security Headers ป้องกันการโจมตีทางเว็บ"""
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        return response
