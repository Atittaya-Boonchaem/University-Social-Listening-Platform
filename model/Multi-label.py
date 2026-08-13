# -*- coding: utf-8 -*-
import sys
import io
import pandas as pd

# บังคับหน้าต่าง Terminal ให้รองรับภาษาไทยแบบ UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 110)
print(" UP Connect: AI Chatbot Agent (ระบบสะสมข้อมูลและสนทนาต่อเนื่องแบบเรียลไทม์)")
print("=" * 110)

# 1. โหลดข้อมูลสถานที่และพิกัดทั้งหมดจากไฟล์ 'พิกัด.csv' (ครบ 45 สถานที่)
location_database = {}
try:
    df_loc = pd.read_csv("พิกัด.csv", encoding='utf-8-sig')
    print(f" โหลดไฟล์ 'พิกัด.csv' สำเร็จ! ฐานข้อมูลสถานที่พร้อมใช้งาน {len(df_loc)} แห่ง")
    
    for _, row in df_loc.iterrows():
        b_name = str(row['name']).strip()
        lat = float(row['latitude'])
        lng = float(row['longitude'])
        
        aliases = [b_name.lower(), b_name]
        b_lower = b_name.lower()
        if "เทคโนโลยีสารสนเทศและการสื่อสาร" in b_name:
            aliases.extend(["ict", "ไอซีที", "คณะไอซีที", "ตึกไอซีที"])
        elif "เรียนรวม" in b_name:
            aliases.extend(["ce", "ตึกเรียนรวม", "อาคารเรียนรวม"])
        elif "ภักดี" in b_name:
            aliases.extend(["pky", "ภักดี", "ตึกพัชรกิตติยาภา"])
        elif "หอสมุด" in b_name or "บรรณสาร" in b_name:
            aliases.extend(["ห้องสมุด", "หอสมุด", "library", "lib"])
        elif "วิทยาศาสตร์" in b_name:
            aliases.extend(["ตึกวิทย์", "คณะวิทย์"])

        location_database[b_name.lower()] = {
            "name": b_name,
            "latitude": lat,
            "longitude": lng,
            "aliases": list(set(aliases))
        }
    print(f" ระบบพร้อมจำแนกสถานที่ทั้งหมดในมหาวิทยาลัย\n")
    print("=" * 110)

except Exception as e:
    print(f" เกิดข้อผิดพลาดในการโหลดไฟล์ 'พิกัด.csv': {e}")
    sys.exit()

# 2. กำหนด 7 หมวดหมู่หลัก (Single-label)
category_keywords = {
    "หมวดอาคารและสิ่งอำนวยความสะดวก": ["พัง", "ชำรุด", "ประตูพัง", "หลังคารั่ว", "ไฟดับ", "น้ำไม่ไหล", "แอร์ไม่เย็น", "ลิฟต์ค้าง", "หลอดไฟขาด", "แอร์", "ประปา", "ลิฟต์", "ไฟฟ้าดับ", "คอมพิวเตอร์", "มืด", "ไฟไม่ติด", "ซ่อม"],
    "หมวดการเดินทางและระบบขนส่ง": ["รถเมล์", "รถเมล์มอ", "รมอ", "รอรถ", "รอนาน", "รถเต็ม", "ป้ายรถเมล์", "คิวรถ", "ตารางรถ", "สายรถ", "ท่ารถ", "ไม่จอดรับ", "รถไม่มา", "รถติด", "รถเสีย", "รถวิ่ง"],
    "หมวดเทคโนโลยีสารสนเทศ": ["เน็ตหลุด", "ไวไฟเข้าไม่ได้", "เน็ตช้า", "หลุดบ่อย", "ระบบล่ม", "เข้าเว็บไม่ได้", "ลืมรหัสผ่าน", "ลงทะเบียนไม่ได้", "ระบบ", "อินเทอร์เน็ต"],
    "หมวดความปลอดภัยและจราจร": ["รถชน", "ของหาย", "ขโมย", "อันตราย", "รปภ.", "หมวกกันน็อคหาย", "รถติด", "จอดรถขวาง", "ทางมืด", "เปลี่ยว", "ไม่มีไฟกิ่ง", "รปภ"],
    "หมวดภูมิทัศน์และความสะอาด": ["สกปรก", "ขยะล้น", "เหม็น", "ถังขยะเต็ม", "ไม่ทำความสะอาด", "หญ้ารก", "กิ่งไม้หัก", "ต้นไม้ล้ม", "หมาจรจัด", "ทำความสะอาด", "ขยะ"],
    "หมวดการเรียนการสอนและวิชาการ": ["ตารางเรียน", "วันสอบ", "เกรด", "หน่วยกิต", "วิชา", "ดรอปเรียน", "ติดต่ออาจารย์", "ขอสอบชดเชย", "อาจารย์"],
    "หมวดบริการทั่วไป / อื่นๆ": ["ทุนการศึกษา", "กิจกรรม", "บัตรนิสิต", "สอบถามหน่อยครับ", "ขอคำแนะนำ", "อยากทราบว่า", "ลืมของ", "ตามหาของ", "เสียงดัง"]
}

# 3. ตัวแปรสำหรับจำสถานะการสนทนาปัจจุบัน (Session Memory)
current_session = {
    "problem_text": "",
    "location": "ไม่ระบุสถานที่",
    "latitude": 0.0,
    "longitude": 0.0,
    "time": ""
}

def extract_location(text):
    text_lower = text.lower()
    for loc_key, loc_info in location_database.items():
        for alias in loc_info["aliases"]:
            if alias in text_lower:
                if len(alias) > 2 or alias in ["ce", "pky", "ict", "lib"]:
                    return loc_info["name"], loc_info["latitude"], loc_info["longitude"]
    return None, 0.0, 0.0

def extract_time(text):
    time_keywords = ["เวลา", "น.", "ตอน", "ช่วง", "เช้า", "บ่าย", "เย็น", "ดึก", "เมื่อวาน", "วันนี้", "วันที่", ":", "นาฬิกา"]
    for t in time_keywords:
        if t in text:
            return text
    # ตรวจสอบตัวเลขบอกเวลาเบื้องต้น (เช่น 8:00, 13.00)
    if any(char.isdigit() for char in text):
        return text
    return None

# 4. ฟังก์ชัน AI Agent แบบสะสมข้อมูล (Stateful Agent)
def up_connect_ai_agent(user_chat_text: str):
    global current_session
    text_lower = user_chat_text.lower()
    
    # ถ้ายังไม่มีข้อมูลปัญหา ให้บันทึกปัญหาจากข้อความนี้
    if not current_session["problem_text"]:
        current_session["problem_text"] = user_chat_text

    # พยายามสกัดสถานที่จากข้อความที่ผู้ใช้พิมพ์เข้ามาล่าสุด
    loc_name, lat, lng = extract_location(user_chat_text)
    if loc_name:
        current_session["location"] = loc_name
        current_session["latitude"] = lat
        current_session["longitude"] = lng

    # พยายามสกัดเวลาจากข้อความที่ผู้ใช้พิมพ์เข้ามาล่าสุด
    time_val = extract_time(user_chat_text)
    if time_val and not current_session["time"]:
        current_session["time"] = user_chat_text

    # ตรวจสอบว่าข้อมูลยังขาดอะไรอยู่บ้าง
    missing_items = []
    
    # เช็คว่ามีปัญหาหรือยัง
    has_problem = len(current_session["problem_text"].strip()) > 0
    # เช็คว่ามีสถานที่หรือยัง
    has_location = current_session["location"] != "ไม่ระบุสถานที่"
    # เช็คว่ามีเวลาหรือยัง
    has_time = len(current_session["time"].strip()) > 0

    if not has_location:
        missing_items.append("สถานที่หรือตึกคณะ")
    if not has_time:
        missing_items.append("ช่วงเวลาหรือวันที่เกิดเหตุ")

    # ถ้าข้อมูลยังไม่ครบ ให้ AI ตอบกลับเพื่อขอข้อมูลที่ขาด
    if len(missing_items) > 0:
        missing_str = " และ ".join(missing_items)
        return {
            "status": "incomplete",
            "reply_message": f" แชทบอท UP Connect: รับทราบปัญหาเรื่อง **\"{current_session['problem_text']}\"** แล้วค่ะ แต่รบกวนแจ้ง **{missing_str}** เพิ่มเติมหน่อยนะคะ เพื่อให้ระบบระบุพิกัดและส่งเรื่องได้อย่างถูกต้องค่ะ"
        }

    # --- ข้อมูลครบถ้วนแล้ว ทำการรวมประโยคและวิเคราะห์ ---
    full_combined_text = f"{current_session['problem_text']} เกิดขึ้นที่ {current_session['location']} เวลา {current_session['time']}"
    
    # วิเคราะห์หมวดหมู่ปัญหาจากประโย็ครวม
    scores = {cat: 0 for cat in category_keywords}
    matched_kws = []
    for category, keywords in category_keywords.items():
        for kw in keywords:
            if kw in full_combined_text.lower():
                scores[category] += 1
                matched_kws.append(kw)
                
    max_score = max(scores.values())
    if max_score > 0:
        best_cats = [cat for cat, score in scores.items() if score == max_score]
        selected_category = best_cats[0]
    else:
        selected_category = "หมวดบริการทั่วไป / อื่นๆ"

    # บันทึกผลสำเร็จ แล้วรีเซ็ต Session เตรียมรับเรื่องใหม่
    completed_result = {
        "status": "complete",
        "category": selected_category,
        "matched_keywords": list(set(matched_kws)),
        "location": current_session["location"],
        "latitude": current_session["latitude"],
        "longitude": current_session["longitude"],
        "time": current_session["time"],
        "summary_text": full_combined_text,
        "reply_message": " แชทบอท UP Connect: ได้รับข้อมูลครบถ้วนสมบูรณ์แล้วค่ะ! ระบบกำลังบันทึกใบงานและส่งต่อให้เจ้าหน้าที่..."
    }

    # รีเซ็ตค่าสำหรับเคสถัดไป
    current_session = {"problem_text": "", "location": "ไม่ระบุสถานที่", "latitude": 0.0, "longitude": 0.0, "time": ""}
    return completed_result

# 5. ส่วนสำหรับพิมพ์ทดสอบพูดคุยกับแชทบอทแบบต่อเนื่อง
print(" [พร้อมทดสอบ] พิมพ์แชทโต้ตอบต่อเนื่องลงใน Terminal ได้เลย (พิมพ์ 'exit' เพื่อออก)")
print("-" * 110)

while True:
    try:
        user_input = input("\n นิสิตพิมพ์แชท: ")
        
        if user_input.lower() == 'exit':
            print(" ออกจากระบบทดสอบแล้ว")
            break
            
        if not user_input.strip():
            continue

        result = up_connect_ai_agent(user_input)

        print("-" * 110)
        print(result["reply_message"])
        
        if result["status"] == "complete":
            print(f" [ประโยครวมที่ระบบปะติดปะต่อให้]: \"{result['summary_text']}\"")
            print(f" [AI Backend - หมวดหมู่เดี่ยว]: ติ๊กช่อง ==> **{result['category']}**")
            print(f" คีย์เวิร์ดปัญหาที่สกัดได้ : {result['matched_keywords']}")
            print(f" [AI Backend - ตำแหน่ง/พิกัด] : สถานที่: {result['location']} | พิกัด GPS: ({result['latitude']}, {result['longitude']})")
        print("=" * 110)

    except KeyboardInterrupt:
        print("\n ออกจากระบบทดสอบแล้ว")
        break