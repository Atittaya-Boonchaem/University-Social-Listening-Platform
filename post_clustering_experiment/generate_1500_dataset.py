# -*- coding: utf-8 -*-
"""
Script สร้าง Dataset 1,500 คู่ ครอบคลุม 7 หมวดหมู่หลักของ ม.พะเยา ตามโครงสร้างจริง
1. หมวดภูมิทัศน์และความสะอาด
2. หมวดอาคารและสิ่งอำนวยความสะดวก
3. หมวดความปลอดภัยและจราจร
4. หมวดการเรียนการสอนและวิชาการ
5. หมวดบริการทั่วไป / อื่นๆ
6. หมวดการเดินทางและระบบขนส่ง
7. หมวดเทคโนโลยีสารสนเทศ
"""
import csv
import random
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
random.seed(42)

OUT_DIR = r"d:\UP\min_app\post_clustering_experiment"
os.makedirs(OUT_DIR, exist_ok=True)

locations = [
    ("ตึก ICT", "ตึกเทคโนโลยีสารสนเทศและการสื่อสาร", "คณะไอซีที", "อาคาร ICT"),
    ("ตึก CE", "ตึกเรียนรวม", "อาคารเรียนรวม CE", "อาคารเรียนรวม"),
    ("ตึก PKY", "ตึกพัชรกิตติยาภา", "อาคารภักดี", "ตึกภักดี"),
    ("หอสมุด", "ห้องสมุดกลาง", "สำนักบรรณสาร", "อาคารหอสมุด"),
    ("ตึกสงวนเสริมศรี", "ศูนย์อาหารสงวน", "โรงอาหารสงวน", "อาคารสงวน"),
    ("ตึกวิทย์", "ตึกวิทยาศาสตร์", "คณะวิทยาศาสตร์", "อาคารคณะวิทย์"),
    ("หอพักนิสิต UP DORM", "หอพักในมอ", "หอใน", "โซนหอพัก มพ."),
    ("ลานจอดรถหน้ามอ", "ประตู 1 ม.พะเยา", "ประตูทางเข้าหน้ามอ", "ป้ายรถเมล์หน้ามอ"),
    ("ตึกคณะบริหาร", "คณะวิทยาการจัดการ", "อาคารเรียนบริหาร", "ตึกบิสิเนส"),
    ("ตึกคณะนิติศาสตร์", "คณะนิติ", "อาคารเรียนนิติศาสตร์", "ตึกนิติ")
]

rooms = ["1101", "1201", "1202", "1301", "1305", "2101", "2201", "2203", "3101", "3202", "CE01", "CE05", "CE07", "PKY01", "PKY02"]
floors = ["1", "2", "3", "4"]
buses = ["1", "2", "3", "มอ"]

categories_data = [
    {
        "name": "หมวดภูมิทัศน์และความสะอาด",
        "templates": [
            ("ถังขยะบริเวณ {loc} ล้น ส่งกลิ่นเหม็นรบกวน", "ขยะล้นถังขยะตรง {loc} เหม็นมาก ไม่มีใครมาเก็บ"),
            ("มีซากสัตว์ตายส่งกลิ่นเหม็นเน่าที่ {loc}", "พบซากนกตายบริเวณ {loc} เริ่มส่งกลิ่น ช่วยส่งแม่บ้านมาเก็บที"),
            ("หญ้าขึ้นสูงรกมากข้างทางเดินไป {loc} กลัวงู", "บริเวณทางเดินไป {loc} หญ้ารกมาก ช่วยตัดหญ้าทีครับ"),
            ("กิ่งไม้ขนาดใหญ่หักหล่นขวางถนนตรง {loc}", "มีต้นไม้ล้มทับทางเดินข้าง {loc} สัญจรลำบากมาก"),
            ("ห้องน้ำหญิง {loc} สกปรกมาก ไม่มีแม่บ้านดูแล", "{loc} ห้องน้ำสกปรก พื้นแฉะและส่งกลิ่นเหม็น"),
            ("เศษขยะเกลื่อนกลาดรอบโต๊ะม้าหินอ่อน {loc}", "บริเวณที่นั่งเล่น {loc} ขยะเต็มโต๊ะ ไม่มีคนกวาด")
        ]
    },
    {
        "name": "หมวดอาคารและสิ่งอำนวยความสะดวก",
        "templates": [
            ("แอร์ห้อง {room} {loc} เสีย ไม่เย็นเลย ร้อนมาก", "ห้อง {room} {loc} แอร์พัง มีแต่ลมร้อน นั่งเรียนไม่ได้"),
            ("ห้องน้ำชั้น {floor} {loc} น้ำไม่ไหล ชักโครกกดไม่ลง", "{loc} ชั้น {floor} ห้องน้ำน้ำหยุดไหล สกปรกมาก"),
            ("ลิฟต์ {loc} ประตูค้าง เปิดไม่ออก", "ลิฟต์โดยสารที่ {loc} ชำรุด กดแล้วไม่ขยับ ประตูเปิดไม่ได้"),
            ("หลอดไฟในห้องเรียน {room} {loc} ขาด มืดมาก", "ไฟเพดานห้อง {room} {loc} ดับ มองกระดานไม่เห็น"),
            ("หลังคารั่วตรงทางเดิน {loc} น้ำเจิ่งนอง", "ฝนตกแล้วน้ำรั่วลงมาจากเพดาน {loc} พื้นลื่นมาก"),
            ("ปลั๊กไฟห้อง {room} {loc} ช็อต มีควันขึ้น", "{loc} ห้อง {room} ปลั๊กไฟระเบิด เสียบชาร์จไม่ได้"),
            ("ประตูห้องน้ำชาย {loc} ลูกบิดพัง ล็อคไม่ได้", "ลูกบิดประตูห้องน้ำ {loc} หลุด ล็อคไม่ได้ช่วยซ่อมที"),
            ("ก๊อกน้ำอ่างล้างมือ {loc} หัก น้ำพุ่งกระเด็น", "อ่างล้างหน้า {loc} ท่อน้ำแตก น้ำนองเต็มพื้น")
        ]
    },
    {
        "name": "หมวดความปลอดภัยและจราจร",
        "templates": [
            ("ไฟกิ่งส่องสว่างทางเดินไป {loc} ดับ มืดและเปลี่ยวมาก", "เสาไฟทางเดินตรง {loc} ไม่ติด มืดมากกลัวอันตราย"),
            ("มีรถจอดซ้อนคันขวางทางออกตรง {loc}", "รถยนต์จอดขวางทางเลี้ยวบริเวณ {loc} ขับผ่านไม่ได้เลย"),
            ("หมวกกันน็อคหายที่ลานจอดรถ {loc}", "จอดมอเตอร์ไซค์ไว้ที่ {loc} หมวกกันน็อคโดนขโมยไปครับ"),
            ("พบสุนัขจรจัดดุวิ่งไล่กวดนิสิตบริเวณ {loc}", "หมาจรจัดตรง {loc} ดุมาก เห่าและวิ่งไล่รถมอเตอร์ไซค์"),
            ("เกิดอุบัติเหตุรถเฉี่ยวชนกันตรงทางแยก {loc}", "รถมอเตอร์ไซค์ชนกันบริเวณ {loc} มีผู้ได้รับบาดเจ็บ"),
            ("กล้องวงจรปิดบริเวณ {loc} ดับ เสียมาหลายวัน", "กล้อง CCTV ตรง {loc} ใช้งานไม่ได้ อยากขอเปิดดูของหาย")
        ]
    },
    {
        "name": "หมวดการเรียนการสอนและวิชาการ",
        "templates": [
            ("ตารางเรียนวิชาบังคับชนกันสองวิชา แก้ไขยังไงได้บ้าง", "ตารางเรียนชนกันครับ เข้าระบบแล้วเลือกเวลาทับซ้อนกัน"),
            ("ตารางสอบปลายภาคชนกันในวันเดียวกันสองวิชา", "วันสอบปลายภาคเวลาตรงกันสองรายวิชา ขอสอบชดเชยได้ไหม"),
            ("อาจารย์ไม่เข้าสอนตามตารางเรียนและไม่แจ้งล่วงหน้า", "คลาสเรียนวันนี้อาจารย์ไม่มาสอน นิสิตมารอเต็มห้อง"),
            ("ขอเปิดเซคชั่นเพิ่มวิชาศึกษาทั่วไป นิสิตยังลงไม่ครบ", "วิชาบังคับเซคเต็มทุกเซค ขอเปิดเพิ่มอีกเซคได้ไหมครับ"),
            ("ระบบบันทึกเกรดมีปัญหา เกรดยังไม่ออกสักวิชา", "ประกาศเกรดยังไม่ขึ้นในระบบเลยครับ ติดต่อฝ่ายทะเบียนไม่ได้"),
            ("ต้องการขอดรอปรายวิชา ติดต่อทำเรื่องที่ไหนครับ", "ยื่นคำร้องขอถอนรายวิชาล่าช้า ต้องให้อาจารย์ท่านไหนเซ็น")
        ]
    },
    {
        "name": "หมวดบริการทั่วไป / อื่นๆ",
        "templates": [
            ("สอบถามเรื่องการยื่นกู้ กยศ. และส่งเอกสารทุนการศึกษา", "เอกสารทุนการศึกษา มพ. ส่งได้ถึงวันไหนครับ"),
            ("บัตรนิสิตหาย ต้องการทำบัตรใหม่ต้องเตรียมอะไรบ้าง", "ทำบัตรประจำตัวนิสิตใหม่ ติดต่อสำนักทะเบียนห้องไหนครับ"),
            ("ขอนับชั่วโมงกิจกรรมจิตอาสา กดยื่นในระบบแล้วยังไม่อนุมัติ", "ชั่วโมงกิจกรรมสะสมไม่ขึ้นในระบบ UP Pass ติดต่อใคร"),
            ("ลืมกระเป๋าสตางค์ไว้ที่ {loc} มีใครเก็บได้บ้างครับ", "ตามหาของหาย ลืมไอแพดไว้ที่ {loc} ช่วยดูกล้องให้ที"),
            ("ขอใบรับรองสถานภาพนิสิตภาษาอังกฤษ ใช้เวลากี่วันได้", "ยื่นขอหนังสือรับรองการเป็นนิสิตผ่านช่องทางออนไลน์ยังไง")
        ]
    },
    {
        "name": "หมวดการเดินทางและระบบขนส่ง",
        "templates": [
            ("รถเมล์ มพ. สาย {bus} รอนานเกิน 45 นาทีแล้วไม่มา", "รอรถเมล์มอสาย {bus} นานมาก รถขาดช่วง นิสิตไปเรียนไม่ทัน"),
            ("คนขับรถเมล์ มพ. สาย {bus} ขับเร็วและหวาดเสียวมาก", "รถเมล์มอสาย {bus} ขับปาดซ้ายปาดขวา เบรกแรง กลัวอันตราย"),
            ("รถเมล์ มพ. ไม่จอดรับนิสิตที่ป้าย {loc}", "ป้าย {loc} รถเมล์มอขับเลยไป ไม่ยอมจอดรับผู้โดยสาร"),
            ("คิวต่อแถวรอรถเมล์มอที่ {loc} แน่นมาก รถมีไม่เพียงพอ", "นิสิตต่อคิวรอรถเมล์ตรง {loc} ยาวล้นออกมานอกฟุตบาท"),
            ("ป้ายรถเมล์บริเวณ {loc} ไม่มีหลังคาบังแดดบังฝน", "จุดรอรถเมล์มอตรง {loc} ฝนตกเปียกหมด ไม่มีศาลาพักคอย")
        ]
    },
    {
        "name": "หมวดเทคโนโลยีสารสนเทศ",
        "templates": [
            ("สัญญาณ WiFi UP-WiFi ที่ {loc} หลุดบ่อยมาก ช้ามาก", "เน็ต UP-WiFi ที่ {loc} ช้ามาก สัญญาณหลุดตลอดเวลา"),
            ("ระบบลงทะเบียนเรียน Reg ล่ม เข้าสู่ระบบไม่ได้ตั้งแต่เช้า", "เว็บ reg.up.ac.th ล่ม กดเลือกวิชาไม่ได้เลยครับ"),
            ("ลืมรหัสผ่าน UP Mail ขอยื่นรีเซ็ตรหัสผ่านเมลองค์กร", "เข้าอีเมลมหาวิทยาลัยไม่ได้ จำรหัสผ่านไม่ได้ครับ"),
            ("อินเทอร์เน็ตที่ {loc} ใช้งานไม่ได้เลย สัญญาณกากบาท", "เน็ตตึก {loc} ดับทั้งตึก เชื่อมต่อสัญญาณไม่ได้"),
            ("เข้าใช้งานระบบ UP Pass ไม่ได้ ล็อกอินแล้วเด้งออก", "แอปพลิเคชัน UP Pass เข้าไม่ได้ ขึ้น error ตลอดเวลา")
        ]
    }
]

prefixes = [
    "แจ้งเรื่องครับ: ", "ขอร้องเรียนค่ะ ", "ช่วยตรวจสอบหน่อยครับ ", "ด่วนมาก! ",
    "รบกวนเจ้าหน้าที่ครับ ", "นิสิตเดือดร้อนมากค่ะ ", "แอดมินครับ ", "ช่วยประสานงานทีครับ ", ""
]
suffixes = [
    " รบกวนเจ้าหน้าที่แก้ไขด่วนครับ", " เดือดร้อนมากค่ะ ขอบคุณค่ะ", " ขอบคุณครับ",
    " ช่วยตรวจสอบทีครับ", " เป็นแบบนี้มาหลายวันแล้วครับ", " ปล่อยไว้นานแล้ว", ""
]

# Target: 750 duplicates (~107 per category)
dup_pairs = []
for cat_info in categories_data:
    cat_name = cat_info["name"]
    templates = cat_info["templates"]
    cat_dups = []
    while len(cat_dups) < 107:
        t1, t2 = random.choice(templates)
        loc_tuple = random.choice(locations)
        loc1 = loc_tuple[0]
        loc2 = random.choice(loc_tuple)
        room = random.choice(rooms)
        floor = random.choice(floors)
        bus = random.choice(buses)
        
        s1 = t1.format(loc=loc1, room=room, floor=floor, bus=bus)
        s2 = t2.format(loc=loc2, room=room, floor=floor, bus=bus)
        
        s1_full = random.choice(prefixes) + s1 + random.choice(suffixes)
        s2_full = random.choice(prefixes) + s2 + random.choice(suffixes)
        
        score = round(random.uniform(0.78, 0.98), 2)
        cat_dups.append((s1_full.strip(), s2_full.strip(), 1, score, cat_name))
    dup_pairs.extend(cat_dups)

# Trim/pad to exactly 750
dup_pairs = dup_pairs[:750]

# Target: 750 non-duplicates
# Split into: 350 same-category different location/issue, and 400 across-categories
non_dup_pairs = []

# Part A: Same category different issue/room (hard negatives)
while len(non_dup_pairs) < 350:
    cat_info = random.choice(categories_data)
    cat_name = cat_info["name"]
    templates = cat_info["templates"]
    
    # Pick 2 different templates in same category
    t1 = random.choice(templates)[0]
    t2 = random.choice(templates)[1]
    
    loc1 = random.choice(locations)[0]
    loc2 = random.choice(locations)[0]
    room1 = random.choice(rooms)
    room2 = random.choice([r for r in rooms if r != room1])
    floor1 = random.choice(floors)
    floor2 = random.choice([f for f in floors if f != floor1])
    bus1 = random.choice(buses)
    bus2 = random.choice([b for b in buses if b != bus1])
    
    s1 = t1.format(loc=loc1, room=room1, floor=floor1, bus=bus1)
    s2 = t2.format(loc=loc2, room=room2, floor=floor2, bus=bus2)
    
    s1_full = random.choice(prefixes) + s1 + random.choice(suffixes)
    s2_full = random.choice(prefixes) + s2 + random.choice(suffixes)
    score = round(random.uniform(0.18, 0.42), 2)
    
    non_dup_pairs.append((s1_full.strip(), s2_full.strip(), 0, score, f"{cat_name} (ต่างประเด็น)"))

# Part B: Completely different categories
while len(non_dup_pairs) < 750:
    cat1_info = random.choice(categories_data)
    cat2_info = random.choice([c for c in categories_data if c["name"] != cat1_info["name"]])
    
    t1 = random.choice(cat1_info["templates"])[0]
    t2 = random.choice(cat2_info["templates"])[1]
    
    loc1 = random.choice(locations)[0]
    loc2 = random.choice(locations)[0]
    room = random.choice(rooms)
    floor = random.choice(floors)
    bus = random.choice(buses)
    
    s1 = t1.format(loc=loc1, room=room, floor=floor, bus=bus)
    s2 = t2.format(loc=loc2, room=room, floor=floor, bus=bus)
    
    s1_full = random.choice(prefixes) + s1 + random.choice(suffixes)
    s2_full = random.choice(prefixes) + s2 + random.choice(suffixes)
    score = round(random.uniform(0.02, 0.20), 2)
    
    non_dup_pairs.append((s1_full.strip(), s2_full.strip(), 0, score, "ต่างหมวดหมู่"))

all_1500_pairs = dup_pairs + non_dup_pairs
random.shuffle(all_1500_pairs)

dataset_file = os.path.join(OUT_DIR, "dataset_duplicate_pairs.csv")
train_file = os.path.join(OUT_DIR, "train.csv")
test_file = os.path.join(OUT_DIR, "test.csv")

headers = ["pair_id", "sentence1", "sentence2", "is_duplicate", "similarity_score", "category"]

with open(dataset_file, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    for idx, (s1, s2, is_dup, score, cat) in enumerate(all_1500_pairs, 1):
        writer.writerow([idx, s1, s2, is_dup, score, cat])

# Split 75% Train (1125), 25% Test (375)
split_idx = int(len(all_1500_pairs) * 0.75)
train_rows = all_1500_pairs[:split_idx]
test_rows = all_1500_pairs[split_idx:]

with open(train_file, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    for idx, (s1, s2, is_dup, score, cat) in enumerate(train_rows, 1):
        writer.writerow([idx, s1, s2, is_dup, score, cat])

with open(test_file, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    for idx, (s1, s2, is_dup, score, cat) in enumerate(test_rows, 1):
        writer.writerow([idx, s1, s2, is_dup, score, cat])

print(f"✅ สร้างชุดข้อมูลสำเร็จครบทั้ง 7 หมวดหมู่: {len(all_1500_pairs)} คู่")
for cat_info in categories_data:
    cat_name = cat_info["name"]
    count_in_dup = sum(1 for p in dup_pairs if p[4] == cat_name)
    print(f" - {cat_name}: {count_in_dup} คู่")
print(f"\n📁 บันทึกไฟล์ลงที่: {OUT_DIR}")
