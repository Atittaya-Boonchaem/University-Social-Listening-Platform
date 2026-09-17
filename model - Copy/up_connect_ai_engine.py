import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

print("🚀 เริ่มต้นระบบประมวลผล AI สำหรับ UP Connect Platform...")

# -------------------------------------------------------------------------
# สเตปที่ 1: โหลดไฟล์ข้อมูลจริงของคุณ (2,000 รายการ)
# -------------------------------------------------------------------------
print("กำลังโหลดไฟล์ข้อมูล...")
df = pd.read_csv("test_data_up_connect.csv") # หรือชื่อไฟล์ที่คุณใช้จริง

# 🌟 เพิ่มบรรทัดนี้: สร้างรหัส ID อัตโนมัติให้แต่ละแถว (เช่น TICKET_001, TICKET_002, ...)
df['ID'] = [f"TICKET_{i+1:04d}" for i in range(len(df))]

print(f"-> โหลดข้อมูลสำเร็จ จำนวนทั้งหมด {len(df)} รายการ")

# -------------------------------------------------------------------------
# สเตปที่ 2: จำลองฟังก์ชัน Model ที่ 1 (Text Classification & Time Extraction)
# -------------------------------------------------------------------------
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

print("🚀 เริ่มต้นระบบประมวลผล AI สำหรับ UP Connect Platform...")

# 1. โหลดข้อมูลจริงของคุณ (2,000 บรรทัด)
print("กำลังโหลดไฟล์ข้อมูล...")
df = pd.read_csv("test_data_up_connect.csv")
df['ID'] = [f"TICKET_{i+1:04d}" for i in range(len(df))]

# 2. คลังความรู้ (Rule Dictionary) 7 หมวดที่สมบูรณ์ของเรา
category_rules = {
    "หมวดอาคารและสิ่งอำนวยความสะดวก": ["พัง", "ชำรุด", "ประตูพัง", "หลังคารั่ว", "ไฟดับ", "น้ำไม่ไหล", "แอร์ไม่เย็น", "ลิฟต์ค้าง", "หลอดไฟขาด", "แอร์", "ประปา", "ลิฟต์"],
    "หมวดการเดินทางและระบบขนส่ง": ["รถเมล์", "รถเมล์มอ", "รถมอ", "รอรถ", "รอนาน", "รถเต็ม", "ป้ายรถเมล์", "คิวรถ", "ตารางรถ", "สายรถ", "ท่ารถ", "ไม่จอดรับ", "รถไม่มา", "รถติด", "รถเสีย", "รถมอเตอร์ไซค์", "รถเมล์สาย", "รถเมล์ไม่มา", "รถเมล์เสีย", "รถเมล์ติด", "รถเมล์เต็ม"],
    "หมวดเทคโนโลยีสารสนเทศ": ["เน็ตหลุด", "ไวไฟเข้าไม่ได้", "เน็ตช้า", "หลุดบ่อย", "ระบบล่ม", "เข้าเว็บไม่ได้", "ลืมรหัสผ่าน", "ลงทะเบียนไม่ได้", "ระบบ"],
    "หมวดความปลอดภัยและจราจร": ["รถชน", "ขโมย", "อันตราย", "รปภ.", "รถติด", "จอดรถขวาง", "ทางมืด", "เปลี่ยว", "ไม่มีไฟกิ่ง", "รปภ"],
    "หมวดภูมิทัศน์และความสะอาด": ["สกปรก", "ขยะล้น", "เหม็น", "ถังขยะเต็ม", "ไม่ทำความสะอาด", "หญ้ารก", "กิ่งไม้หัก", "ต้นไม้ล้ม", "หมาจรจัด", "ทำความสะอาด"],
    "หมวดการเรียนการสอนและวิชาการ": ["ตารางเรียน", "วันสอบ", "เกรด", "หน่วยกิต", "วิชา", "ดรอปเรียน", "ติดต่ออาจารย์", "ขอสอบชดเชย", "อาจารย์"],
    "หมวดบริการทั่วไป / อื่นๆ": ["ทุนการศึกษา", "กิจกรรม", "บัตรนิสิต", "สอบถามหน่อยครับ", "ขอคำแนะนำ", "อยากทราบว่า", "ของหาย", "หมวกกันน็อคหาย", "หมวกกันน็อกหาย", "ลืมของ", "ตามหาของ"]
}

# 3. ฟังก์ชัน AI Text Analysis ที่ใช้กฎ 7 หมวดจริง + สกัดเวลา
def ai_text_analysis(text):
    if not isinstance(text, str):
        text = str(text)
        
    scores = {cat: 0 for cat in category_rules}
    for category, keywords in category_rules.items():
        for kw in keywords:
            if kw in text:
                scores[category] += 1
                
    max_score = max(scores.values())
    if max_score == 0:
        predicted_category = "หมวดบริการทั่วไป / อื่นๆ"
    else:
        predicted_category = max(scores, key=scores.get)
        
    # สกัดเวลาเกิดเหตุจากบริบทข้อความ (ตามเล่มโครงงาน)
    if "เมื่อวาน" in text:
        extracted_time = "เมื่อวานนี้ (อิงจากบริบทข้อความ)"
    elif "เช้ามืด" in text or "เมื่อเช้า" in text:
        extracted_time = "ช่วงเช้าวันนี้ (อิงจากบริบทข้อความ)"
    else:
        extracted_time = "เวลาปัจจุบันตามระบบ"
        
    return predicted_category, extracted_time

print("-> กำลังประมวลผลจัดหมวดหมู่และสกัดเวลา...")
results = df['Raw_Text'].apply(lambda x: pd.Series(ai_text_analysis(x)))
df['Predicted_Category'] = results[0]
df['Extracted_Incident_Time'] = results[1]

# 4. กระบวนการยุบรวมโพสต์ (Semantic Similarity / Post Aggregation) สำหรับ Zero-Click Ticket
print("-> กำลังคำนวณความคล้ายคลึงเชิงความหมาย เพื่อยุบรวมโพสต์ซ้ำ (Zero-Click Ticket)...")
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(df['Raw_Text'])
similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

threshold = 0.5
assigned_groups = {}
group_id_counter = 1

for i in range(len(df)):
    if i in assigned_groups:
        continue
    current_group = f"TICKET_GROUP_{group_id_counter:03d}"
    assigned_groups[i] = current_group
    
    for j in range(i + 1, len(df)):
        if similarity_matrix[i][j] >= threshold:
            assigned_groups[j] = current_group
            
    group_id_counter += 1

df['Ticket_Group_ID'] = [assigned_groups[i] for i in range(len(df))]

# 5. บันทึกผลลัพธ์
output_file = "up_connect_processed_data.csv"
df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("\n========================================================")
print("📊 รายงานผลการประมวลผลระบบ UP Connect AI Engine (ฉบับสมบูรณ์)")
print("========================================================")
print(df[['ID', 'Raw_Text', 'Predicted_Category', 'Ticket_Group_ID']].head(5))
print("========================================================")
print(f"✅ บันทึกผลลัพธ์ลงไฟล์ '{output_file}' เรียบร้อยแล้ว!")

# -------------------------------------------------------------------------
# สเตปที่ 3: กระบวนการยุบรวมโพสต์ (Semantic Similarity / Post Aggregation)
# -------------------------------------------------------------------------
print("-> กำลังคำนวณความคล้ายคลึงเชิงความหมาย เพื่อยุบรวมโพสต์ซ้ำ (Zero-Click Ticket)...")

vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(df['Raw_Text'])

similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

threshold = 0.4
aggregated_groups = {}
group_id_counter = 1
assigned_groups = {}

for i in range(len(df)):
    if i in assigned_groups:
        continue
    current_group = f"TICKET_GROUP_{group_id_counter:03d}"
    assigned_groups[i] = current_group
    
    for j in range(i + 1, len(df)):
        if similarity_matrix[i][j] >= threshold:
            assigned_groups[j] = current_group
            
    group_id_counter += 1

df['Ticket_Group_ID'] = [assigned_groups[i] for i in range(len(df))]

# -------------------------------------------------------------------------
# สเตปที่ 4: แสดงผลลัพธ์และบันทึกข้อมูลพร้อมส่งต่อ Dashboard
# -------------------------------------------------------------------------
output_file = "up_connect_processed_data.csv"
df.to_csv(output_file, index=False, encoding="utf-8-sig")

print("\n========================================================")
print("📊 รายงานผลการประมวลผลระบบ UP Connect AI Engine")
print("========================================================")
print(df[['ID', 'Raw_Text', 'Predicted_Category', 'Ticket_Group_ID']])
print("========================================================")
print(f"✅ บันทึกผลลัพธ์ลงไฟล์ '{output_file}' เรียบร้อยแล้ว!")