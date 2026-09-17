from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="UP Connect AI Backend API")

# 1. คลังความรู้ 7 หมวด (Rule-based Dictionary ของเรา)
category_rules = {
    "หมวดอาคารและสิ่งอำนวยความสะดวก": ["พัง", "ชำรุด", "ประตูพัง", "หลังคารั่ว", "ไฟดับ", "น้ำไม่ไหล", "แอร์ไม่เย็น", "ลิฟต์ค้าง", "หลอดไฟขาด", "แอร์", "ประปา", "ลิฟต์"],
    "หมวดการเดินทางและระบบขนส่ง": ["รถเมล์", "รถเมล์มอ", "รถมอ", "รอรถ", "รอนาน", "รถเต็ม", "ป้ายรถเมล์", "คิวรถ", "ตารางรถ", "สายรถ", "ท่ารถ", "ไม่จอดรับ", "รถไม่มา", "รถติด", "รถเสีย", "รถมอเตอร์ไซค์"],
    "หมวดเทคโนโลยีสารสนเทศ": ["เน็ตหลุด", "ไวไฟเข้าไม่ได้", "เน็ตช้า", "หลุดบ่อย", "ระบบล่ม", "เข้าเว็บไม่ได้", "ลืมรหัสผ่าน", "ลงทะเบียนไม่ได้", "ระบบ"],
    "หมวดความปลอดภัยและจราจร": ["รถชน", "ขโมย", "อันตราย", "รปภ.", "รถติด", "จอดรถขวาง", "ทางมืด", "เปลี่ยว", "ไม่มีไฟกิ่ง", "รปภ"],
    "หมวดภูมิทัศน์และความสะอาด": ["สกปรก", "ขยะล้น", "เหม็น", "ถังขยะเต็ม", "ไม่ทำความสะอาด", "หญ้ารก", "กิ่งไม้หัก", "ต้นไม้ล้ม", "หมาจรจัด", "ทำความสะอาด"],
    "หมวดการเรียนการสอนและวิชาการ": ["ตารางเรียน", "วันสอบ", "เกรด", "หน่วยกิต", "วิชา", "ดรอปเรียน", "ติดต่ออาจารย์", "ขอสอบชดเชย", "อาจารย์"],
    "หมวดบริการทั่วไป / อื่นๆ": ["ทุนการศึกษา", "กิจกรรม", "บัตรนิสิต", "สอบถามหน่อยครับ", "ขอคำแนะนำ", "อยากทราบว่า", "ของหาย", "หมวกกันน็อคหาย", "ลืมของ", "ตามหาของ"]
}

# กำหนดรูปแบบข้อมูลที่แอปจะต้องส่งเข้ามา (Request Body)
class ComplaintRequest(BaseModel):
    raw_text: str

# 2. ฟังก์ชัน AI วิเคราะห์หมวดหมู่และสกัดเวลา
def ai_analyze(text):
    scores = {cat: 0 for cat in category_rules}
    for category, keywords in category_rules.items():
        for kw in keywords:
            if kw in text:
                scores[category] += 1
                
    max_score = max(scores.values())
    predicted_category = "หมวดบริการทั่วไป / อื่นๆ" if max_score == 0 else max(scores, key=scores.get)
    
    # สกัดเวลาเกิดเหตุจากบริบทข้อความ
    if "เมื่อวาน" in text:
        extracted_time = "เมื่อวานนี้"
    elif "เช้ามืด" in text or "เมื่อเช้า" in text:
        extracted_time = "ช่วงเช้าวันนี้"
    else:
        extracted_time = "เวลาปัจจุบันตามระบบ"
        
    return predicted_category, extracted_time

# 3. สร้าง Endpoint สำหรับรับข้อความจากแอป (ทำงานแบบ Real-time)
@app.post("/api/submit-complaint")
def submit_complaint(data: ComplaintRequest):
    text = data.raw_text
    
    # รัน AI วิเคราะห์
    category, inc_time = ai_analyze(text)
    
    # ส่งผลลัพธ์กลับไปให้แอปพลิเคชันทันที
    return {
        "status": "success",
        "message": "ประมวลผลข้อร้องเรียนสำเร็จ",
        "data": {
            "raw_text": text,
            "predicted_category": category,
            "extracted_incident_time": inc_time,
            "ticket_group_id": "TICKET_GROUP_AUTO" # สามารถนำไปเทียบกับฐานข้อมูลเพื่อยุบรวมโพสต์ได้
        }
    }