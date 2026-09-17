# scripts/evaluate_typhoon.py
"""
Script สำหรับทดสอบและประเมินผลโมเดลที่ 1: OpenTyphoon 2.5 (LLM)
- ทดสอบ Text Refinement (เกลาภาษาทางการ)
- ทดสอบ Profanity & Toxicity Filtering (กรองคำหยาบ)
- ทดสอบ 5W1H Extraction (สกัดประเด็นโครงสร้าง 5W1H)
- ทดสอบ Category Description Generation
"""
import os
import sys
import time
import json
import requests
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

from app.services.ai_service import (
    get_typhoon_api_key,
    check_profanity,
    generate_category_description
)

api_key = get_typhoon_api_key()

print("=" * 70)
print("🧠 EVALUATING MODEL 1: TYPHOON 2.5 (LLM ENGINE)")
print("=" * 70)
print(f"• API Key Status: {'Configured ✅' if api_key else 'Missing ❌'}")
print(f"• Target Endpoint: https://api.opentyphoon.ai/v1")
print(f"• Model Version: typhoon-v2.5-30b-a3b-instruct\n")

def call_typhoon(prompt: str, max_tokens: int = 250) -> str:
    if not api_key:
        return "[Mock Response: Typhoon API Key not set]"
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    payload = {
        "model": "typhoon-v2.5-30b-a3b-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": max_tokens
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=20)
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"].strip()
        return f"Error HTTP {res.status_code}: {res.text}"
    except Exception as e:
        return f"Exception: {e}"

# Test Cases
test_cases = [
    {
        "type": "Slang & Casual Text -> Formal 5W1H Refinement",
        "raw_text": "แอร์ห้อง 2304 ตึก PKY มพ. ดับสนิท ร้อนตับแตก ช่วยส่งช่างมาดูด่วนนน",
        "expected_profane": False,
    },
    {
        "type": "Profanity & Hate Speech Check",
        "raw_text": "ไอ้เวร รถเมล์ มพ. ขับกากชิบหาย เบียดกูเกือบตกข้างทางตรงประตู 1 สัส",
        "expected_profane": True,
    },
    {
        "type": "Cross-Department Accident Event",
        "raw_text": "เกิดอุบัติเหตุรถเมล์ มพ. ชนสุนัขจรจัดเลือดสาดตรงทางโค้งหน้าตึกสงวนเสริมศรี ขวางทางจราจรมาก",
        "expected_profane": False,
    },
]

passed_tests = 0
total_tests = len(test_cases)

for idx, tc in enumerate(test_cases, 1):
    print(f"--- [TEST {idx}/{total_tests}] {tc['type']} ---")
    print(f"📥 Input Text: \"{tc['raw_text']}\"")
    
    t0 = time.time()
    
    # 1. Test Profanity Check
    is_profane = check_profanity(tc["raw_text"])
    
    # 2. Test Text Refinement & 5W1H via Typhoon
    prompt_5w1h = f"""
    จงสกัดข้อมูล 5W1H (Who, What, Where, When, Why, How) และเกลาภาษาข้อความร้องเรียนต่อไปนี้ให้เป็นภาษาทางการ:
    ข้อความ: "{tc['raw_text']}"
    
    ตอบเป็น JSON โครงสร้างดังนี้:
    {{
       "refined_title": "หัวข้อปัญหาภาษาทางการ",
       "refined_detail": "เนื้อหาภาษาทางการที่สุภาพและครบถ้วน",
       "what": "เกิดอะไรขึ้น",
       "where": "สถานที่เกิดเหตุ",
       "urgency": "LOW/MEDIUM/HIGH"
    }}
    """
    ai_output = call_typhoon(prompt_5w1h, max_tokens=300)
    latency = time.time() - t0
    
    print(f"⏱️ Latency: {latency:.2f}s")
    print(f"🚫 Profanity Detected: {is_profane} (Expected: {tc['expected_profane']})")
    print(f"✨ Typhoon Output:\n{ai_output}")
    
    if is_profane == tc["expected_profane"]:
        print("✅ Status: PASSED\n")
        passed_tests += 1
    else:
        print("⚠️ Status: MISMATCH\n")

print("=" * 70)
print(f"🏆 TYPHOON 2.5 EVALUATION SUMMARY: {passed_tests}/{total_tests} Tests Passed ({(passed_tests/total_tests)*100:.1f}%)")
print("=" * 70)
