import os
import re
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="UP AI Chat Only", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TYPHOON_API_KEY = os.getenv("TYPHOON_API_KEY", "")
TYPHOON_MODEL = os.getenv(
    "TYPHOON_MODEL",
    "typhoon-v2.5-30b-a3b-instruct",
)
TYPHOON_URL = "https://api.opentyphoon.ai/v1/chat/completions"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def clean(value: Any) -> str:
    return str(value or "").strip()


def all_user_text(messages: List[ChatMessage]) -> str:
    return " ".join(
        clean(m.content) for m in messages if m.role == "user"
    ).strip()


def is_room_problem(text: str) -> bool:
    return bool(re.search(
        r"(ห้องเรียน|เก้าอี้|โต๊ะ|กระดาน|แอร์|เครื่องปรับอากาศ|"
        r"คอม(?:พิวเตอร์)?|โปรเจคเตอร์|ปลั๊ก|ไมค์|ลำโพง|ไฟดับ|ไฟไม่ติด)",
        text,
        re.I,
    ))


def has_room_number(text: str) -> bool:
    return bool(re.search(
        r"(ห้อง(?:เรียน)?\s*[A-Za-zก-๙]*\s*\d+[A-Za-z]?|"
        r"\b[A-Za-z]{1,4}[-_\s]?\d{3,4}\b)",
        text,
        re.I,
    ))


def has_building(text: str) -> bool:
    # Accept explicit building/faculty names. Generic "อาคาร" or "คณะ"
    # without a name does not count.
    return bool(re.search(
        r"(อาคาร\s*[A-Za-zก-๙0-9.-]{2,}|"
        r"คณะ\s*[A-Za-zก-๙0-9.-]{2,}|"
        r"\bICT\b|ไอซีที|อาคารเรียนรวม|เรียนรวม|"
        r"อาคารบรรยายรวม|บรรยายรวม|สงวนเสริมศรี|อาคารสงวน|"
        r"วิทยาศาสตร์|วิศวกรรมศาสตร์|วิศวะ|หอสมุด|"
        r"ศูนย์บรรณสาร|อธิการบดี|พญางำเมือง|โรงพยาบาล|"
        r"ศูนย์การแพทย์|สาธิต|เภสัช|พยาบาล|ทันตแพทย|"
        r"สหเวช|นิติศาสตร์|ศิลปศาสตร์|วิทยาการจัดการ|เกษตร)",
        text,
        re.I,
    ))


def extract_rule_facts(messages: List[ChatMessage]) -> Dict[str, str]:
    text = all_user_text(messages)
    lower = text.lower()

    if "เก้าอี้" in lower and "เสียงดัง" in lower:
        what = "เก้าอี้บางตัวมีเสียงดังขณะใช้งาน"
    elif "ไฟดับ" in lower:
        what = "ไฟดับ"
    elif "ไฟไม่ติด" in lower:
        what = "ไฟ/แสงสว่างไม่ทำงาน"
    elif "แอร์" in lower and "ไม่เย็น" in lower:
        what = "เครื่องปรับอากาศไม่เย็น"
    elif any(k in lower for k in ["เน็ต", "wifi", "ไวไฟ"]):
        what = "Wi-Fi / อินเทอร์เน็ตใช้งานไม่ได้"
    elif "รถเมล์" in lower and ("ไม่มี" in lower or "ไม่มา" in lower):
        what = "บริการรถเมล์ มพ. ไม่เพียงพอหรือรถไม่มาตามจุดที่รอ"
    else:
        # Do not invent a description. Keep the user's first issue statement.
        users = [clean(m.content) for m in messages if m.role == "user" and clean(m.content)]
        what = users[0][:160] if users else ""

    room_match = re.search(
        r"(ห้อง(?:เรียน)?\s*[A-Za-zก-๙]*\s*\d+[A-Za-z]?|\b[A-Za-z]{1,4}[-_\s]?\d{3,4}\b)",
        text,
        re.I,
    )
    room = room_match.group(0).strip() if room_match else ""

    building = ""
    known_buildings = [
        ("อาคารเรียนรวม", "อาคารเรียนรวม"),
        ("เรียนรวม", "อาคารเรียนรวม"),
        ("อาคารบรรยายรวม", "อาคารบรรยายรวม"),
        ("บรรยายรวม", "อาคารบรรยายรวม"),
        ("สงวนเสริมศรี", "อาคารสงวนเสริมศรี"),
        ("อาคารสงวน", "อาคารสงวน"),
        ("ict", "อาคาร ICT"),
        ("ไอซีที", "อาคาร ICT"),
        ("วิทยาศาสตร์", "คณะวิทยาศาสตร์"),
        ("วิศวกรรมศาสตร์", "คณะวิศวกรรมศาสตร์"),
        ("วิศวะ", "คณะวิศวกรรมศาสตร์"),
        ("หอสมุด", "หอสมุด"),
    ]
    for key, value in known_buildings:
        if key in lower:
            building = value
            break

    impact = "รบกวนการเรียนการสอน" if "รบกวนการเรียนการสอน" in lower else ""

    return {
        "what": what,
        "building": building,
        "room": room,
        "impact": impact,
    }


def validate_facts(facts: Dict[str, str], text: str) -> List[str]:
    missing: List[str] = []

    if not facts.get("what"):
        missing.append("what")

    if is_room_problem(text):
        if not facts.get("building") and not has_building(text):
            missing.append("building")
        if not facts.get("room") and not has_room_number(text):
            missing.append("room")
    else:
        if not (facts.get("building") or has_building(text) or facts.get("room") or has_room_number(text)):
            missing.append("where")

    return missing


def fallback_followup(facts: Dict[str, str], missing: List[str], text: str) -> str:
    if "what" in missing:
        return "ขอรายละเอียดปัญหาที่พบเพิ่มเติมครับ ว่าเกิดอะไรขึ้นหรือมีอาการอย่างไรบ้าง?"

    if "building" in missing and "room" in missing:
        return (
            "รับทราบปัญหาแล้วครับ แต่ตอนนี้ยังระบุจุดเกิดเหตุไม่ได้ชัดเจน "
            "ขอชื่อคณะ/อาคาร และหมายเลขห้องที่เกิดปัญหาด้วยครับ "
            "เช่น อาคาร ICT ห้อง 1102"
        )

    if "building" in missing:
        return (
            "รับทราบหมายเลขห้องแล้วครับ ขอชื่อคณะหรืออาคารของห้องนี้เพิ่มเติมด้วยครับ "
            "เช่น อาคาร ICT หรืออาคารเรียนรวม เพื่อให้ระบุตำแหน่งได้ชัดเจน"
        )

    if "room" in missing:
        return (
            "รับทราบชื่อคณะ/อาคารแล้วครับ ขอหมายเลขห้องที่เกิดปัญหาเพิ่มเติมด้วยครับ "
            "เช่น ห้อง 1102 เพื่อให้ระบุจุดเกิดเหตุได้แน่นอน"
        )

    if "where" in missing:
        return "ขอระบุสถานที่เกิดเหตุให้ชัดเจนเพิ่มเติมครับ เช่น ชื่อคณะ/อาคาร ชั้น ห้อง หรือจุดสังเกต"

    return "ขอรายละเอียดเพิ่มเติมอีกเล็กน้อยครับ"


def typhoon_chat(messages: List[ChatMessage], system_prompt: str) -> Optional[Dict[str, Any]]:
    if not TYPHOON_API_KEY:
        return None

    payload_messages = [{"role": "system", "content": system_prompt}]
    payload_messages += [
        {"role": m.role, "content": m.content} for m in messages
    ]

    try:
        response = requests.post(
            TYPHOON_URL,
            headers={
                "Authorization": f"Bearer {TYPHOON_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": TYPHOON_MODEL,
                "messages": payload_messages,
                "temperature": 0.0,
                "max_tokens": 500,
                "response_format": {"type": "json_object"},
            },
            timeout=20,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        import json
        return json.loads(content)
    except Exception:
        return None


def build_ai_facts(messages: List[ChatMessage]) -> Dict[str, str]:
    system_prompt = """
คุณเป็นตัวช่วยรวบรวมข้อมูลแจ้งปัญหาในมหาวิทยาลัยพะเยา

อ่านบทสนทนาทั้งหมดและสกัดเฉพาะข้อเท็จจริงที่ผู้ใช้บอก
ห้ามเดา ห้ามเติมข้อมูล

ต้องคืน JSON:
{
  "what": "",
  "building": "",
  "room": "",
  "impact": ""
}

กฎ:
- "ห้องเรียน" ไม่ถือว่าเป็นเลขห้อง
- ต้องแยก building กับ room
- ถ้าเจอ "ห้อง 1102" ให้ room = "ห้อง 1102"
- ถ้าเจอ "อาคาร ICT" ให้ building = "อาคาร ICT"
- ถ้ายังไม่รู้ให้เป็น ""
- ห้ามสร้างคำอธิบายแบบยาว
"""
    result = typhoon_chat(messages, system_prompt)
    if isinstance(result, dict):
        return {
            "what": clean(result.get("what")),
            "building": clean(result.get("building")),
            "room": clean(result.get("room")),
            "impact": clean(result.get("impact")),
        }
    return extract_rule_facts(messages)


def synthesize(facts: Dict[str, str]) -> str:
    parts = [f"พบปัญหา{facts['what']}"]

    location = " ".join(
        p for p in [facts.get("building"), facts.get("room")] if p
    )
    if location:
        parts.append(f"ณ {location}")

    if facts.get("impact"):
        parts.append(f"ส่งผล{facts['impact']}")

    return " ".join(parts) + " จึงขอแจ้งเจ้าหน้าที่เข้าตรวจสอบและแก้ไข"


@app.get("/")
def root():
    return {"ok": True, "service": "UP AI Chat Only"}


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "typhoon_configured": bool(TYPHOON_API_KEY),
        "model": TYPHOON_MODEL,
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    messages = request.messages
    text = all_user_text(messages)

    if not text:
        return {
            "success": True,
            "data": {
                "reply": "สวัสดีครับ แจ้งปัญหาที่พบได้เลยครับ",
                "ready_for_ticket": False,
                "is_complete": False,
                "missing_fields": ["what", "building", "room"],
                "extracted_data": {},
            },
        }

    facts = build_ai_facts(messages)
    missing = validate_facts(facts, text)

    if missing:
        return {
            "success": True,
            "data": {
                "reply": fallback_followup(facts, missing, text),
                "ready_for_ticket": False,
                "is_complete": False,
                "missing_fields": missing,
                "extracted_data": {
                    "what": facts["what"],
                    "building": facts["building"],
                    "room": facts["room"],
                    "impact": facts["impact"],
                    # IMPORTANT: description stays empty until complete.
                    "description": "",
                },
            },
        }

    description = synthesize(facts)

    return {
        "success": True,
        "data": {
            "reply": (
                "ขอบคุณครับ ตอนนี้ข้อมูลเพียงพอแล้ว "
                "ผมรวบรวมรายละเอียดปัญหาให้เรียบร้อยแล้วครับ"
            ),
            "ready_for_ticket": True,
            "is_complete": True,
            "missing_fields": [],
            "extracted_data": {
                "what": facts["what"],
                "building": facts["building"],
                "room": facts["room"],
                "impact": facts["impact"],
                "location": " ".join(
                    p for p in [facts["building"], facts["room"]] if p
                ),
                "description": description,
                "title": facts["what"],
            },
        },
    }
