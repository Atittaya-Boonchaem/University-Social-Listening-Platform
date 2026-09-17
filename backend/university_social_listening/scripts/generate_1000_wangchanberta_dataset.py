# scripts/generate_1000_wangchanberta_dataset.py
"""
University Social Listening Platform — 1,000 Multi-Label Samples Generator for WangchanBERTa
สร้างชุดข้อมูล 1,000 ตัวอย่าง ครอบคลุมทั้ง 8 หมวดหมู่และเคสข้ามหน่วยงาน (Cross-Department) ในบริบท ม.พะเยา
"""
import os
import json
import csv
import random

random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "wangchanberta")
os.makedirs(DATA_DIR, exist_ok=True)

CATEGORIES = [
    {"id": 1, "key": "cat_1_building", "name": "อาคารและสิ่งอำนวยความสะดวก"},
    {"id": 2, "key": "cat_2_network_it", "name": "ระบบเครือข่ายและเทคโนโลยี"},
    {"id": 3, "key": "cat_3_academic", "name": "การเรียนการสอนและวิชาการ"},
    {"id": 4, "key": "cat_4_landscape", "name": "ภูมิทัศน์และความสะอาด"},
    {"id": 5, "key": "cat_5_safety_traffic", "name": "ความปลอดภัยและจราจร"},
    {"id": 6, "key": "cat_6_general_service", "name": "บริการทั่วไปและสวัสดิการ"},
    {"id": 7, "key": "cat_7_transportation", "name": "การเดินทางและระบบขนส่ง"},
    {"id": 8, "key": "cat_8_food_hygiene", "name": "สุขอนามัยและความปลอดภัยทางอาหาร"}
]

LOCATIONS = [
    "ตึก ICT", "อาคารเทคโนโลยีสารสนเทศ", "ตึก EN คณะวิศวกรรมศาสตร์", "ตึก CE", "อาคาร PKY สงวนเสริมศรี",
    "คณะศิลปศาสตร์", "คณะนิติศาสตร์", "คณะแพทยศาสตร์", "คณะพยาบาลศาสตร์", "คณะเภสัชศาสตร์",
    "คณะวิทยาศาสตร์", "คณะเกษตรศาสตร์", "คณะบริหารธุรกิจและนิเทศศาสตร์", "วิทยาลัยการศึกษา",
    "อาคารเรียนรวม CE", "หอพักลุมพินี", "หอใน มพ.", "โรงอาหารกลาง", "โรงอาหารตึกสงวนเสริมศรี",
    "ทางเดิน Skywalk", "ป้ายรถเมล์หน้า ม.", "ป้ายหอใน", "ประตู 1 ม.พะเยา", "ประตู 2 หน้ามอ",
    "ประตู 3 ฝั่งเกษตร", "ลานจอดรถตึก PKY", "อ่างหลวง ม.พะเยา", "สนามกีฬาในร่ม", "กองพัฒนานิสิต DSA"
]

BUILDING_ITEMS = [
    ("เครื่องปรับอากาศห้อง {room} {loc}", "มีน้ำรั่วหยดและไม่เย็นเลย เสียงดังมาก รบกวนเวลาเรียน"),
    ("หลอดไฟในห้องน้ำ{gender} {loc}", "ดับมืดสนิท กระพริบตลอดเวลา ใช้งานไม่ได้"),
    ("สายชำระและก๊อกน้ำ {loc}", "แตกชำรุด น้ำรั่วพุ่งนองเต็มพื้นห้องน้ำ"),
    ("โปรเจกเตอร์และจอแสดงผลห้อง {room} {loc}", "เปิดไม่ติด ภาพกระพริบ ลำโพงไมค์ไม่ดัง อาจารย์สอนไม่ได้"),
    ("กลอนประตูล็อคห้องน้ำ {loc}", "พังหัก ล็อคประตูไม่อยู่ ปิดไม่ได้"),
    ("ลิฟต์โดยสาร {loc}", "ค้างที่ชั้น {floor} ประตูปิดไม่สนิท มีเสียงดังน่ากลัว"),
    ("พัดลมเพดานและปลั๊กไฟห้อง {room} {loc}", "ปลั๊กไฟช็อตมีกลิ่นไหม้ พัดลมหมุนช้ามาก"),
    ("กระจกหน้าต่างห้องบรรยาย {room} {loc}", "แตกชำรุด ลมพัดเศษกระจกอาจตกใส่คนข้างล่าง")
]

IT_ITEMS = [
    ("สัญญาณอินเทอร์เน็ต UP-WiFi {loc}", "หลุดบ่อยมาก เชื่อมต่อไม่ได้เลยตั้งแต่ช่วงบ่าย"),
    ("ระบบเว็บลงทะเบียนเรียน REG UP", "เข้าใช้งานไม่ได้ ขึ้น 504 Gateway Timeout ช่วงเปิดจองวิชาศึกษาทั่วไป"),
    ("ระบบ LMS / D-Learning ม.พะเยา", "หน้าเว็บค้าง ส่งงานการบ้านและควิซออนไลน์ไม่ทัน"),
    ("อินเทอร์เน็ต WiFi หอพัก {loc}", "ช้ามาก ความเร็วตก หมุนไม่หยุด ทำงานวิจัยไม่ได้"),
    ("ระบบอีเมลมหาวิทยาลัยและ Office 365", "ล็อกอินไม่ได้ แจ้งเตือนรหัสผ่านหมดอายุ เข้าใช้งานไม่ได้"),
    ("คอมพิวเตอร์ห้องแล็บ {room} {loc}", "เปิดไม่ติดหลายเครื่อง เมาส์และคีย์บอร์ดเสีย"),
    ("ระบบเช็คชื่อสแกนใบหน้า / สแกนบัตรนิสิต {loc}", "ระบบค้าง ไม่บันทึกการเข้าเรียน"),
    ("ระบบเครือข่ายอินเทอร์เน็ต LAN {loc}", "สายแลนชำรุด สัญญาณไม่เข้าคอมพิวเตอร์")
]

ACADEMIC_ITEMS = [
    ("การขอเปิดรายวิชาเพิ่มเติมสำหรับนิสิตชั้นปีที่ {year}", "วิชาเอกเต็ม ต้องการขอขยายจำนวนรับเพิ่มเพื่อไม่ให้จบช้า"),
    ("ตารางสอบปลายภาควิชา {subj} ชนกัน", "ตารางสอบวิชาบังคับสองวิชาตรงวันและเวลาเดียวกัน ขอทำเรื่องสอบชดเชย"),
    ("การติดต่อขอเอกสารใบรับรองผลการเรียน (Transcript)", "ระบบยังไม่อัปเดตเกรดเทอมล่าสุด ต้องการใช้ยื่นสมัครงาน"),
    ("การทำเรื่องขอผ่อนผันและดรอปรายวิชา (Withdraw)", "อาจารย์ประจำวิชาไม่อนุมัติในระบบ ต้องการสอบถามขั้นตอนที่ถูกต้อง"),
    ("การยื่นคำร้องขอเทียบโอนหน่วยกิตรายวิชา", "เอกสารตกค้างที่คณะ ขอให้เจ้าหน้าที่ช่วยติดตามผล"),
    ("การประกาศคะแนนสอบกลางภาควิชา {subj}", "คะแนนในระบบไม่ตรงกับที่อาจารย์แจ้ง ขอตรวจสอบความถูกต้อง")
]

LANDSCAPE_ITEMS = [
    ("ถังขยะบริเวณ {loc}", "ขยะล้นถัง ส่งกลิ่นเหม็นเน่าเกลื่อนพื้น ไม่มีเจ้าหน้าที่มาเก็บ"),
    ("กิ่งไม้ขนาดใหญ่หักโค่น {loc}", "พาดขวางถนนและทางเท้าหลังพายุฝนตก รถสัญจรลำบาก"),
    ("หญ้ารกสูงมากบริเวณ {loc}", "มีสัตว์มีพิษและงูเลื้อยออกมา อันตรายต่อนิสิตที่เดินผ่าน"),
    ("คราบโคลนและเศษดินหลังฝนตกหนัก {loc}", "ลื่นมาก ถนนเฉอะแฉะ เสี่ยงเกิดอุบัติเหตุลื่นล้ม"),
    ("ซากนกและสัตว์ตาย {loc}", "ส่งกลิ่นเหม็นเน่า แมลงวันตอม อยากให้แม่บ้านช่วยเก็บทำความสะอาด"),
    ("เศษกระจกและขยะแก้วแตกเกลื่อนบนพื้น {loc}", "อันตรายมาก กลัวบาดเท้านิสิตและยางรถมอเตอร์ไซค์รั่ว")
]

SAFETY_ITEMS = [
    ("มีคนร้ายขโมยหมวกกันน็อคและของใต้เบาะรถ {loc}", "โดนขโมยไปหลายคัน อยากให้ตรวจสอบกล้องวงจรปิด"),
    ("สุนัขจรจัดฝูงใหญ่ดุมาก {loc}", "วิ่งไล่กวดรถมอเตอร์ไซค์และเห่านิสิตที่เดินผ่านตอนกลางคืน"),
    ("ไฟส่องสว่างทางเดิน {loc}", "ดับมืดสนิท ทางเปลี่ยวมาก เสี่ยงต่อการเกิดอาชญากรรมและชิงทรัพย์"),
    ("รถจักรยานยนต์ขับเร็วและย้อนศรบริเวณ {loc}", "ขับขี่อันตรายมาก เกือบชนนิสิตข้ามทางม้าลายหลายครั้ง"),
    ("มีบุคคลภายนอกน่าสงสัยเดินวนเวียน {loc}", "ท่าทางไม่น่าไว้วางใจ อยากให้ รปภ. ช่วยตรวจสอบ"),
    ("ลืมกระเป๋าสตางค์และ iPad ไว้ที่ {loc}", "ขอดูกล้องวงจรปิดย้อนหลังเพื่อติดตามทรัพย์สินสูญหาย")
]

SERVICE_ITEMS = [
    ("การยื่นเรื่องขอทุนการศึกษาสำหรับนิสิตขาดแคลนทุนทรัพย์", "ต้องการทราบกำหนดการและเอกสารที่ต้องใช้ส่งกองพัฒนานิสิต"),
    ("การทำบัตรนิสิตใหม่เนื่องจากบัตรเดิมสูญหาย", "ติดต่อขอออกบัตรใหม่ ต้องเตรียมหลักฐานอะไรบ้างและรับบัตรได้ที่ไหน"),
    ("การขอใช้พื้นที่จัดกิจกรรมชมรมและโครงการนิสิต {loc}", "ยื่นหนังสือขออนุมัติสถานที่ล่วงหน้า ต้องติดต่อหน่วยงานใด"),
    ("การขอผ่อนผันการเกณฑ์ทหารสำหรับนิสิตชาย", "ต้องการตรวจสอบรายชื่อและขั้นตอนการยื่นเอกสาร"),
    ("สวัสดิการประกันอุบัติเหตุสำหรับนิสิต", "ประสบอุบัติเหตุเข้ารับการรักษาที่โรงพยาบาล ต้องการทำเรื่องเบิกเคลมประกัน")
]

TRANSPORT_ITEMS = [
    ("รถเมล์ มพ. สาย {bus_line} รอนานมาก", "รอเกิน 45 นาที รถไม่พอ คนยืนเบียดกันจนล้นป้าย {loc}"),
    ("คนขับรถชัตเติลบัส มพ. สาย {bus_line} ขับเร็วและเบรกกระชาก", "ขับขี่อันตรายมาก ผู้โดยสารยืนทรงตัวไม่อยู่"),
    ("รถเมล์มอวิ่งไม่ตรงรอบตารางเวลา", "ช่วงเวลาเร่งด่วนเช้าไม่มีรถวิ่ง นิสิตไปเรียนไม่ทัน"),
    ("รถบัส มพ. ไม่ยอมจอดรับผู้โดยสารที่ป้าย {loc}", "รถว่างแต่ขับผ่านเลยไป ไม่จอดรับคนที่รอ"),
    ("ป้ายรอรถเมล์ {loc} หลังคารั่ว", "ฝนตกแล้วน้ำรั่วลงมา เปียกทั้งที่นั่ง รอรถลำบากมาก")
]

FOOD_ITEMS = [
    ("ร้านอาหารที่ {loc} อาหารไม่สะอาด", "พบแมลงสาบตัวเล็กและเส้นผมปนเปื้อนในจานข้าว"),
    ("อาหารที่ซื้อจากร้านข้าว {loc} บูดเสียและมีกลิ่นเปรี้ยว", "กินเข้าไปแล้วท้องเสีย อาหารไม่สดใหม่"),
    ("สุขอนามัยร้านน้ำและตู้กดน้ำดื่ม {loc}", "มีตะไคร่น้ำและคราบสกปรกเกาะ ไม่มีการล้างทำความสะอาด"),
    ("ร้านค้า {loc} ใช้น้ำมันทอดซ้ำจนเป็นสีดำสนิท", "อาหารมีกลิ่นหืนมาก ส่งผลเสียต่อสุขภาพผู้บริโภค"),
    ("ช้อนส้อมและจานชามที่ {loc} ล้างไม่สะอาด", "มีคราบมันและเศษอาหารติดอยู่ อยากให้ตรวจเข้มงวด")
]

ALL_SINGLE_POOLS = [
    (1, BUILDING_ITEMS),
    (2, IT_ITEMS),
    (3, ACADEMIC_ITEMS),
    (4, LANDSCAPE_ITEMS),
    (5, SAFETY_ITEMS),
    (6, SERVICE_ITEMS),
    (7, TRANSPORT_ITEMS),
    (8, FOOD_ITEMS)
]

def make_single_label_sample(cat_id, template_tuple):
    prefix_tmpl, suffix = template_tuple
    loc = random.choice(LOCATIONS)
    room = f"{random.randint(1, 4)}{random.randint(1, 4)}0{random.randint(1, 4)}"
    floor = random.randint(1, 8)
    gender = random.choice(["ชาย", "หญิง", "รวม"])
    year = random.randint(1, 4)
    subj = random.choice(["GEN001", "001101", "ICT204", "ENG102", "LAW101", "CHM103", "MED201"])
    bus_line = random.choice(["1 (สีม่วง)", "2 (สีเขียว)", "3 (สีแดง)", "4 (สีน้ำเงิน)"])

    prefix = prefix_tmpl.format(loc=loc, room=room, floor=floor, gender=gender, year=year, subj=subj, bus_line=bus_line)
    text = f"{prefix} {suffix}"

    labels = [0] * 8
    labels[cat_id - 1] = 1
    cat_names = [CATEGORIES[cat_id - 1]["name"]]

    return {"text": text, "labels": labels, "category_names": cat_names}

def make_multi_label_sample():
    # Multi-label scenario generator (2 or 3 categories)
    combo_type = random.choice([
        # Combo 7 + 5 + 4: รถเมล์ + อุบัติเหตุ/สุนัข + ซากสัตว์ความสะอาด
        "7_5_4",
        # Combo 1 + 5: อาคารไฟดับ/กลอนพัง + กล้องวงจรปิด/เสี่ยงโดนขโมย
        "1_5",
        # Combo 4 + 8: โรงอาหาร + สุขอนามัย + ขยะล้นเน่า
        "4_8",
        # Combo 2 + 3: ระบบ REG UP ล่ม + ลงทะเบียนวิชาเรียน/ตารางสอบชน
        "2_3",
        # Combo 5 + 7: รถเมล์ขับปาดหน้าจักรยานยนต์ล้ม + จราจรติดขัด
        "5_7",
        # Combo 1 + 4: ฝนตกหลังคารั่ว + น้ำนองพื้นขยะลอย
        "1_4",
        # Combo 1 + 2: ห้องเรียนคอมพิวเตอร์ + ปลั๊กไฟช็อตแอร์ดับและเน็ตหลุด
        "1_2",
        # Combo 5 + 8: โรงอาหารพบแก้วแตกบาดมือนิสิต + อาหารไม่สะอาด
        "5_8"
    ])

    loc = random.choice(LOCATIONS)
    bus = random.choice(["รถเมล์สาย 1", "รถชัตเติลบัส มพ.", "รถสองแถวมอ"])
    room = f"{random.randint(1, 4)}{random.randint(1, 4)}0{random.randint(1, 4)}"

    if combo_type == "7_5_4":
        text = f"{bus} ขับเร็วเฉี่ยวชนสุนัขจรจัดเสียชีวิตบริเวณ {loc} เศษซากสัตว์และคราบเลือดขวางถนน อันตรายและส่งกลิ่นเหม็นมาก"
        cats = [4, 5, 7]
    elif combo_type == "1_5":
        text = f"ไฟส่องสว่างและกลอนประตูห้องน้ำหญิงที่ {loc} พังชำรุด ดับสนิท กล้องวงจรปิดไม่ติด เสี่ยงอันตรายต่อความปลอดภัยของนิสิต"
        cats = [1, 5]
    elif combo_type == "4_8":
        text = f"โรงอาหารบริเวณ {loc} มีถังขยะเศษอาหารเน่าล้น ส่งกลิ่นเหม็นคลุ้งและพบแมลงสาบไต่บนโต๊ะทานข้าว ไม่ถูกสุขอนามัย"
        cats = [4, 8]
    elif combo_type == "2_3":
        text = f"เว็บไซต์ระบบลงทะเบียน Reg UP เกิดขัดข้อง เข้าไม่ได้ ทำให้นิสิตไม่สามารถลงทะเบียนวิชาเรียนและตรวจสอบตารางสอบได้ตามกำหนด"
        cats = [2, 3]
    elif combo_type == "5_7":
        text = f"{bus} ขับเบียดรถมอเตอร์ไซค์ของนิสิตล้มตรงทางโค้ง {loc} ทำให้การจราจรติดขัดยาวและนิสิตได้รับบาดเจ็บ"
        cats = [5, 7]
    elif combo_type == "1_4":
        text = f"ท่อน้ำทิ้งและหลังคาบริเวณ {loc} แตกชำรุด น้ำสกปรกเอ่อล้นพัดพาขยะเกลื่อนพื้น ส่งกลิ่นเหม็นทั่วทางเดิน"
        cats = [1, 4]
    elif combo_type == "1_2":
        text = f"ห้องปฏิบัติการคอมพิวเตอร์ห้อง {room} {loc} ระบบไฟฟ้าขัดข้อง แอร์ดับ และสัญญาณอินเทอร์เน็ต WiFi ใช้งานไม่ได้พร้อมกัน"
        cats = [1, 2]
    else: # 5_8
        text = f"ร้านอาหารที่ {loc} ใช้น้ำมันทอดซ้ำจนดำ และมีเศษแก้วแตกตกอยู่ในถาดอาหาร นิสิตกินแล้วบาดปากและมีอาการท้องเสีย"
        cats = [5, 8]

    labels = [0] * 8
    cat_names = []
    for c in cats:
        labels[c - 1] = 1
        cat_names.append(CATEGORIES[c - 1]["name"])

    return {"text": text, "labels": labels, "category_names": cat_names}

def generate_1000_samples():
    print("Generating 1,000 Multi-label Samples for University of Phayao Domain...")

    dataset = []

    # 1. Single Label Samples (~700 samples: ~88 per category)
    for cat_id, pool in ALL_SINGLE_POOLS:
        for _ in range(88):
            template_tuple = random.choice(pool)
            sample = make_single_label_sample(cat_id, template_tuple)
            dataset.append(sample)

    # 2. Multi-label Samples (~300 samples across combinations)
    for _ in range(300):
        sample = make_multi_label_sample()
        dataset.append(sample)

    # Fill remaining to make exactly 1,000 samples
    while len(dataset) < 1000:
        sample = make_multi_label_sample()
        dataset.append(sample)

    random.shuffle(dataset)

    # Split 85% Train (850) / 15% Test (150)
    train_data = dataset[:850]
    test_data = dataset[850:]

    train_json = os.path.join(DATA_DIR, "train_multilabel.json")
    test_json = os.path.join(DATA_DIR, "test_multilabel.json")
    train_csv = os.path.join(DATA_DIR, "train_multilabel.csv")
    test_csv = os.path.join(DATA_DIR, "test_multilabel.csv")

    with open(train_json, "w", encoding="utf-8") as f:
        json.dump(train_data, f, ensure_ascii=False, indent=2)

    with open(test_json, "w", encoding="utf-8") as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)

    fieldnames = [
        "text", "category_names",
        "cat_1_building", "cat_2_network_it", "cat_3_academic", "cat_4_landscape",
        "cat_5_safety_traffic", "cat_6_general_service", "cat_7_transportation", "cat_8_food_hygiene"
    ]

    def save_csv(data, filepath):
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in data:
                csv_row = {
                    "text": row["text"],
                    "category_names": ", ".join(row.get("category_names", [])),
                    "cat_1_building": row["labels"][0],
                    "cat_2_network_it": row["labels"][1],
                    "cat_3_academic": row["labels"][2],
                    "cat_4_landscape": row["labels"][3],
                    "cat_5_safety_traffic": row["labels"][4],
                    "cat_6_general_service": row["labels"][5],
                    "cat_7_transportation": row["labels"][6],
                    "cat_8_food_hygiene": row["labels"][7],
                }
                writer.writerow(csv_row)

    save_csv(train_data, train_csv)
    save_csv(test_data, test_csv)

    print(f"Generated Total: {len(dataset)} samples")
    print(f"Training Set (850 samples) -> {train_csv} & {train_json}")
    print(f"Testing Set (150 samples) -> {test_csv} & {test_json}")

if __name__ == "__main__":
    generate_1000_samples()
