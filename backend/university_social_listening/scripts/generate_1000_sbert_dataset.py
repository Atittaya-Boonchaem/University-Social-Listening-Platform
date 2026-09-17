# scripts/generate_1000_sbert_dataset.py
"""
University Social Listening Platform — 1,000 Pairs Dataset Generator for Sentence-BERT (SBERT)
สร้างชุดข้อมูล 1,000 คู่ประโยค (Pairs) สำหรับ Fine-Tuning และ Test โมเดล SBERT
รองรับทั้ง Positive Pairs (Duplicate ซ้ำกันจริง 0.90 - 1.0) และ Hard Negative Pairs (ปัญหาคนละเรื่องในตึกเดียวกัน 0.0 - 0.20)
"""
import os
import json
import csv
import random

random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sbert")
os.makedirs(DATA_DIR, exist_ok=True)

LOCATIONS = [
    ("ตึก ICT", "อาคารเทคโนโลยีสารสนเทศและการสื่อสาร"),
    ("ตึก EN", "อาคารคณะวิศวกรรมศาสตร์"),
    ("ตึก CE", "อาคารเรียนรวม CE"),
    ("ตึก PKY", "อาคารสงวนเสริมศรี"),
    ("คณะศิลปศาสตร์", "ตึกศิลปศาสตร์"),
    ("คณะนิติศาสตร์", "ตึกนิติศาสตร์"),
    ("คณะแพทยศาสตร์", "ตึกแพทย์"),
    ("คณะพยาบาลศาสตร์", "ตึกพยาบาล"),
    ("คณะเภสัชศาสตร์", "ตึกเภสัช"),
    ("คณะวิทยาศาสตร์", "ตึกวิทย์"),
    ("คณะเกษตรศาสตร์", "ตึกเกษตร"),
    ("หอพักลุมพินี", "หอพักใน มพ."),
    ("โรงอาหารกลาง", "โรงอาหารใหญ่"),
    ("โรงอาหารสงวนเสริมศรี", "โรงอาหาร PKY"),
    ("ทางเดิน Skywalk", "สะพานสกายวอล์ค"),
    ("ป้ายรถเมล์หน้า ม.", "ป้ายรถบัสหน้ามหาวิทยาลัยพะเยา"),
    ("ป้ายหอพักใน", "ป้ายรอรถหอใน มพ."),
    ("ประตู 1 ม.พะเยา", "ประตูหน้ามอ"),
    ("กองพัฒนานิสิต DSA", "ตึกกิจกรรมนิสิต DSA")
]

# ── Templates สำหรับสร้างคู่ข้อความปัญหาที่เป็นเรื่องเดียวกัน (Positive Duplicate Pairs: 0.90 - 1.0) ──
POSITIVE_PAIR_TEMPLATES = [
    # แอร์ / เครื่องปรับอากาศ
    (
        "แอร์ห้อง {room} {loc_a} มีน้ำรั่วหยดและไม่เย็นเลย ร้อนมาก",
        "เครื่องปรับอากาศห้อง {room} {loc_b} น้ำหยดลงพื้น แอร์ไม่ฉ่ำเลย นั่งเรียนไม่ได้",
        0.95
    ),
    # หลอดไฟ / ไฟฟ้าดับ
    (
        "ไฟในห้องน้ำหญิง {loc_a} ดับสนิท มืดมาก มองไม่เห็นทาง",
        "หลอดไฟห้องน้ำหญิง {loc_b} ขาด เสีย มืดตึ๊ดตื๋อ เข้าใช้งานไม่ได้",
        0.96
    ),
    # สายชำระ / ก๊อกน้ำ
    (
        "สายชำระและก๊อกน้ำห้องน้ำชั้น {floor} {loc_a} แตก น้ำไหลนองเต็มพื้น",
        "สายฉีดก้นกับก๊อกน้ำชำรุด น้ำรั่วท่วมห้องน้ำชั้น {floor} {loc_b}",
        0.95
    ),
    # สัญญาณ UP-WiFi
    (
        "สัญญาณอินเทอร์เน็ต UP-WiFi {loc_a} หลุดบ่อยมาก เชื่อมต่อไม่ได้เลย",
        "เน็ตไวไฟ UP-WiFi ที่ {loc_b} ต่อไม่ติด หลุดทุก 5 นาที ทำงานไม่ได้",
        0.96
    ),
    # ระบบ REG UP
    (
        "เว็บลงทะเบียนเรียน Reg UP ล่ม เข้าสู่ระบบไม่ได้ หน้าจอขึ้น 504 Gateway Timeout",
        "ระบบ REG ม.พะเยา ค้าง เข้าเช็คผลการเรียนและลงทะเบียนวิชาไม่ได้เลย",
        0.94
    ),
    # โปรเจกเตอร์ / จอคอม
    (
        "โปรเจกเตอร์ห้อง {room} {loc_a} เปิดไม่ติด ภาพไม่ขึ้นจอ อาจารย์สอนไม่ได้",
        "เครื่องฉายโปรเจกเตอร์ห้องเรียน {room} {loc_b} พัง จอภาพมืดสนิท",
        0.95
    ),
    # รถเมล์ มพ. รอนาน
    (
        "รถเมล์มอสาย {bus} รอนานมากเกิน 45 นาที รถไม่พอ นิสิตยืนล้นป้าย {loc_a}",
        "รอรถบัส มพ. สาย {bus} ที่ {loc_b} นานมาก คนเบียดกันแน่น รถขาดระยะ",
        0.95
    ),
    # รถเมล์ขับเร็ว / อันตราย
    (
        "คนขับรถชัตเติลบัสสาย {bus} ขับเร็วและเบรกกระชากแรงมากตรง {loc_a}",
        "รถเมล์ มพ. สาย {bus} ซิ่งเร็ว เบรกกะทันหัน ผู้โดยสารเกือบหัวทิ่มแถว {loc_b}",
        0.94
    ),
    # ขยะล้นถัง / ส่งกลิ่น
    (
        "ถังขยะหน้า {loc_a} ขยะล้นถัง ส่งกลิ่นเหม็นเน่า ไม่มีเจ้าหน้าที่มาเก็บ",
        "ขยะเน่าล้นถังขยะบริเวณ {loc_b} เหม็นคลุ้งมาก เกลื่อนเต็มพื้น",
        0.96
    ),
    # อาหารไม่สะอาด / พบสิ่งแปลกปลอม
    (
        "พบแมลงสาบและสิ่งสกปรกปนเปื้อนในจานข้าวที่ {loc_a}",
        "เจอแมลงสาบตัวเล็กในอาหารร้านข้าวที่ {loc_b} สกปรกมาก ไม่ถูกสุขอนามัย",
        0.97
    ),
    # สุนัขจรจัดดุ / ไล่กวด
    (
        "สุนัขจรจัดฝูงใหญ่ดุมาก วิ่งไล่กวดรถมอเตอร์ไซค์ตรง {loc_a}",
        "หมาจรจัดตรง {loc_b} ดุ วิ่งไล่เห่านิสิตที่เดินผ่านตอนกลางคืน",
        0.95
    ),
    # ขโมยของ / กรีดเบาะ
    (
        "มีคนร้ายกรีดเบาะรถและขโมยหมวกกันน็อคตรงลานจอด {loc_a}",
        "โดนขโมยหมวกกันน็อคและเบาะรถจักรยานยนต์โดนกรีดที่ลานจอดรถ {loc_b}",
        0.96
    ),
    # กิ่งไม้หักขวางถนน
    (
        "กิ่งไม้ใหญ่หักโค่นพาดขวางถนนตรง {loc_a} รถสัญจรไม่ได้",
        "ต้นไม้ล้มขวางทางจราจรบริเวณ {loc_b} รถผ่านไม่ได้ การจราจรติดขัด",
        0.95
    ),
    # ลิฟต์โดยสารค้าง
    (
        "ลิฟต์โดยสาร {loc_a} ค้างที่ชั้น {floor} ประตูปิดไม่สนิท น่ากลัวมาก",
        "ลิฟต์ {loc_b} เสีย ติดค้างอยู่ที่ชั้น {floor} กดปุ่มเปิดไม่ไป",
        0.95
    )
]

# ── Templates สำหรับสร้างคู่ข้อความคนละเรื่องกัน (Hard Negatives: 0.0 - 0.15) ──
HARD_NEGATIVE_TEMPLATES = [
    # อยู่ตึกเดียวกัน แต่คนละปัญหา (เช่น แอร์ vs ห้องน้ำ)
    (
        "แอร์ห้อง {room} {loc_a} มีน้ำรั่วหยดและไม่เย็นเลย",
        "สายชำระห้องน้ำหญิงชั้น {floor} {loc_a} แตก น้ำนองพื้น",
        0.05
    ),
    # อยู่ตึกเดียวกัน แต่แอร์คนละห้อง
    (
        "เครื่องปรับอากาศห้อง {room_1} {loc_a} เสีย ไม่เย็น",
        "เครื่องปรับอากาศห้อง {room_2} {loc_a} เสีย ไม่เย็น",
        0.15
    ),
    # ตึกเดียวกัน เรื่องไฟ vs เรื่องขยะ
    (
        "หลอดไฟทางเดินหน้า {loc_a} ดับสนิท มืดมาก",
        "ถังขยะหน้า {loc_a} ขยะล้นถัง ส่งกลิ่นเหม็นเน่า",
        0.08
    ),
    # เรื่องรถเมล์ vs เรื่องอาหาร
    (
        "รถเมล์มอสาย {bus} รอนานมาก ไม่ยอมจอดรับที่ป้าย",
        "อาหารที่โรงอาหาร {loc_a} มีรสเปรี้ยวบูด กินแล้วท้องเสีย",
        0.02
    ),
    # เรื่อง WiFi vs หมาจรจัด
    (
        "สัญญาณเน็ต UP-WiFi {loc_a} หลุดบ่อย เล่นไม่ได้",
        "สุนัขจรจัดดุมาก วิ่งไล่กวดนิสิตตรง {loc_a}",
        0.03
    ),
    # เรื่องตารางสอบ vs ลิฟต์พัง
    (
        "ตารางสอบปลายภาควิชา GEN001 ชนกัน ขอทำเรื่องสอบซ้ำ",
        "ลิฟต์โดยสาร {loc_a} ค้างที่ชั้น {floor} ใช้งานไม่ได้",
        0.01
    ),
    # เรื่องทุนการศึกษา vs ขโมยหมวกกันน็อค
    (
        "สอบถามขั้นตอนการขอทุนการศึกษานิสิตขาดแคลนทุนทรัพย์",
        "มีคนร้ายขโมยหมวกกันน็อคตรงลานจอดรถ {loc_a}",
        0.01
    ),
    # น้ำประปาไหลช้า vs สกายวอล์คลื่น
    (
        "ก๊อกน้ำและท่อประปาที่ {loc_a} ไหลช้ามาก มีสีขุ่นเหลือง",
        "ทางเดิน Skywalk ลื่นมากหลังฝนตก มีนิสิตลื่นล้มหลายคน",
        0.06
    )
]

def generate_1000_sbert_pairs():
    print("Generating 1,000 SBERT Semantic Pairs for University of Phayao Domain...")

    dataset = []

    # 1. Generate Positive Pairs (Duplicates ~ 550 pairs)
    for _ in range(550):
        tmpl = random.choice(POSITIVE_PAIR_TEMPLATES)
        text_a_tmpl, text_b_tmpl, base_score = tmpl
        loc_pair = random.choice(LOCATIONS)
        loc_a, loc_b = loc_pair
        room = f"{random.randint(1, 4)}{random.randint(1, 4)}0{random.randint(1, 4)}"
        floor = random.randint(1, 8)
        bus = random.choice(["1 (สีม่วง)", "2 (สีเขียว)", "3 (สีแดง)", "4 (สีน้ำเงิน)"])

        text_a = text_a_tmpl.format(loc_a=loc_a, loc_b=loc_b, room=room, floor=floor, bus=bus)
        text_b = text_b_tmpl.format(loc_a=loc_a, loc_b=loc_b, room=room, floor=floor, bus=bus)
        score = round(base_score + random.uniform(-0.03, 0.03), 4)
        score = min(1.0, max(0.85, score))

        dataset.append({
            "text_a": text_a,
            "text_b": text_b,
            "score": score,
            "label_type": "DUPLICATE"
        })

    # 2. Generate Hard Negatives & Cross-Category Negatives (~ 450 pairs)
    for _ in range(450):
        tmpl = random.choice(HARD_NEGATIVE_TEMPLATES)
        text_a_tmpl, text_b_tmpl, base_score = tmpl
        loc_pair = random.choice(LOCATIONS)
        loc_a, _ = loc_pair
        room = f"{random.randint(1, 4)}{random.randint(1, 4)}0{random.randint(1, 4)}"
        room_1 = f"1{random.randint(1, 4)}0{random.randint(1, 4)}"
        room_2 = f"3{random.randint(1, 4)}0{random.randint(1, 4)}"
        floor = random.randint(1, 8)
        bus = random.choice(["1", "2", "3", "4"])

        text_a = text_a_tmpl.format(loc_a=loc_a, room=room, room_1=room_1, room_2=room_2, floor=floor, bus=bus)
        text_b = text_b_tmpl.format(loc_a=loc_a, room=room, room_1=room_1, room_2=room_2, floor=floor, bus=bus)
        score = round(base_score + random.uniform(-0.02, 0.03), 4)
        score = max(0.0, min(0.20, score))

        dataset.append({
            "text_a": text_a,
            "text_b": text_b,
            "score": score,
            "label_type": "DIFFERENT"
        })

    # Ensure exactly 1,000 samples
    dataset = dataset[:1000]
    random.shuffle(dataset)

    # Split 85% Train (850 pairs) / 15% Test (150 pairs)
    train_data = dataset[:850]
    test_data = dataset[850:]

    train_json = os.path.join(DATA_DIR, "train_pairs.json")
    test_json = os.path.join(DATA_DIR, "test_pairs.json")
    train_csv = os.path.join(DATA_DIR, "train_pairs.csv")
    test_csv = os.path.join(DATA_DIR, "test_pairs.csv")

    with open(train_json, "w", encoding="utf-8") as f:
        json.dump(train_data, f, ensure_ascii=False, indent=2)

    with open(test_json, "w", encoding="utf-8") as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)

    fieldnames = ["text_a", "text_b", "score", "label_type"]

    def save_csv(data, filepath):
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in data:
                writer.writerow(row)

    save_csv(train_data, train_csv)
    save_csv(test_data, test_csv)

    print(f"Generated Total: {len(dataset)} SBERT Pairs")
    print(f"Training Set (850 pairs) -> {train_csv} & {train_json}")
    print(f"Testing Set (150 pairs) -> {test_csv} & {test_json}")

if __name__ == "__main__":
    generate_1000_sbert_pairs()
