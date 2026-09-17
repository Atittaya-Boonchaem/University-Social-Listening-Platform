# scripts/generate_wangchanberta_dataset.py
"""
University Social Listening Platform — WangchanBERTa Multi-Label Dataset Generator
สร้างชุดข้อมูล Multi-label Text Classification (8 หมวดหมู่ปัญหา ม.พะเยา)
พร้อมรองรับการบันทึกเป็นทั้ง JSON และ CSV เพื่อนำไปเปิดใน Excel หรือให้ AI ช่วยสร้างต่อได้ง่าย
"""
import os
import json
import csv

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

# ── ชุดข้อมูลฝึกฝน (Training Dataset): มีทั้ง Single-Label และ Multi-Label (2-3 หมวดหมู่พร้อมกัน) ──
RAW_TRAIN_DATA = [
    # ── Multi-Label Case 1: รถเมล์ + ชนสุนัข + ซากสัตว์ความสะอาด (Cat 7 + Cat 5 + Cat 4) ──
    {
        "text": "รถเมล์มอขับเร็วเฉี่ยวชนสุนัขจรจัดเสียชีวิตกลางถนนหน้าตึก PKY มีคราบเลือดและซากสัตว์ขวางทาง",
        "labels": [0, 0, 0, 1, 1, 0, 1, 0],
        "category_names": ["ภูมิทัศน์และความสะอาด", "ความปลอดภัยและจราจร", "การเดินทางและระบบขนส่ง"]
    },
    {
        "text": "มีอุบัติเหตุรถชัตเติลบัสเฉี่ยวชนน้องหมาตายตรงทางโค้ง ICT เศษซากขวางถนน อันตรายมากและส่งกลิ่น",
        "labels": [0, 0, 0, 1, 1, 0, 1, 0],
        "category_names": ["ภูมิทัศน์และความสะอาด", "ความปลอดภัยและจราจร", "การเดินทางและระบบขนส่ง"]
    },

    # ── Multi-Label Case 2: อาคาร/ไฟดับ + กล้องวงจรปิด/ความปลอดภัย (Cat 1 + Cat 5) ──
    {
        "text": "ไฟส่องสว่างทางเดินข้างอาคาร CE ดับสนิท กล้องวงจรปิดไม่ทำงาน เสี่ยงอันตรายและอาจมีคนดักจี้ชิงทรัพย์",
        "labels": [1, 0, 0, 0, 1, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก", "ความปลอดภัยและจราจร"]
    },
    {
        "anchor": "ประตูห้องน้ำหญิงชั้น 1 ตึกศิลปศาสตร์ชำรุด ล็อคไม่ได้ และไฟดับมืดมาก กลัวคนแอบมอง",
        "text": "ประตูห้องน้ำหญิงชั้น 1 ตึกศิลปศาสตร์ชำรุด ล็อคไม่ได้ และไฟดับมืดมาก กลัวคนแอบมอง",
        "labels": [1, 0, 0, 0, 1, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก", "ความปลอดภัยและจราจร"]
    },

    # ── Multi-Label Case 3: โรงอาหาร + สุขอนามัย + ขยะ/ภูมิทัศน์ (Cat 8 + Cat 4) ──
    {
        "text": "โรงอาหารสงวนเสริมศรีมีขยะและเศษอาหารเน่าล้นถัง ส่งกลิ่นเหม็นคลุ้งและมีแมลงสาบไต่แถวโต๊ะอาหาร",
        "labels": [0, 0, 0, 1, 0, 0, 0, 1],
        "category_names": ["ภูมิทัศน์และความสะอาด", "สุขอนามัยและความปลอดภัยทางอาหาร"]
    },
    {
        "text": "ร้านค้าในโรงอาหารกลางทิ้งน้ำมันพืชใช้แล้วลงท่อระบายน้ำจนอุดตัน น้ำเน่าเอ่อล้นถนนและเหม็นมาก",
        "labels": [0, 0, 0, 1, 0, 0, 0, 1],
        "category_names": ["ภูมิทัศน์และความสะอาด", "สุขอนามัยและความปลอดภัยทางอาหาร"]
    },

    # ── Multi-Label Case 4: ระบบลงทะเบียน + วิชาการ/อาจารย์ (Cat 2 + Cat 3) ──
    {
        "text": "เว็บ Reg UP ล่มช่วงเปิดให้ลงทะเบียนเรียนวิชา GenEd ทำให้ลงวิชาบังคับไม่ทัน ตารางเรียนทับซ้อน",
        "labels": [0, 1, 1, 0, 0, 0, 0, 0],
        "category_names": ["ระบบเครือข่ายและเทคโนโลยี", "การเรียนการสอนและวิชาการ"]
    },
    {
        "text": "ระบบสารสนเทศอาจารย์ส่งเกรดไม่ได้ หน้าจอ Error 500 นิสิตไม่สามารถตรวจสอบเกรดเพื่อขอจบการศึกษาได้",
        "labels": [0, 1, 1, 0, 0, 0, 0, 0],
        "category_names": ["ระบบเครือข่ายและเทคโนโลยี", "การเรียนการสอนและวิชาการ"]
    },

    # ── Multi-Label Case 5: รถเมล์ + จราจรติดขัด/อุบัติเหตุ (Cat 7 + Cat 5) ──
    {
        "text": "รถเมล์มอขับปาดหน้าจักรยานยนต์จนล้มตรงหน้าป้ายหอพัก ทำให้การจราจรติดขัดอย่างหนัก",
        "labels": [0, 0, 0, 0, 1, 0, 1, 0],
        "category_names": ["ความปลอดภัยและจราจร", "การเดินทางและระบบขนส่ง"]
    },

    # ── Single-Label Cases (หมวดเดี่ยวมาตรฐาน) ──
    {
        "text": "เครื่องปรับอากาศห้องบรรยายรวม 3201 ตึก ICT มีน้ำรั่วหยดและไม่เย็นเลย",
        "labels": [1, 0, 0, 0, 0, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก"]
    },
    {
        "text": "ก๊อกน้ำและสายชำระห้องน้ำชายชั้น 3 อาคารวิศวะแตก น้ำไหลนองพื้น",
        "labels": [1, 0, 0, 0, 0, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก"]
    },
    {
        "text": "สัญญาณ WiFi UP-WiFi ในหอพักลุมพินีหลุดบ่อยมาก เชื่อมต่อไม่ได้เลยตั้งแต่ช่วงหัวค่ำ",
        "labels": [0, 1, 0, 0, 0, 0, 0, 0],
        "category_names": ["ระบบเครือข่ายและเทคโนโลยี"]
    },
    {
        "text": "ต้องการขอเอกสารใบรับรองผลการเรียนและทำเรื่องขอเปิดวิชาเรียนเพิ่มเติม",
        "labels": [0, 0, 1, 0, 0, 0, 0, 0],
        "category_names": ["การเรียนการสอนและวิชาการ"]
    },
    {
        "text": "ต้นไม้หักโค่นและมีหญ้ารกร้างสูงมากบริเวณลานจอดรถหลังคณะเกษตร",
        "labels": [0, 0, 0, 1, 0, 0, 0, 0],
        "category_names": ["ภูมิทัศน์และความสะอาด"]
    },
    {
        "text": "มีคนร้ายขโมยหมวกกันน็อคและกรีดเบาะรถจักรยานยนต์ตรงลานจอดข้างตึก PKY",
        "labels": [0, 0, 0, 0, 1, 0, 0, 0],
        "category_names": ["ความปลอดภัยและจราจร"]
    },
    {
        "text": "สอบถามขั้นตอนการขอทุนการศึกษาสำหรับนิสิตขาดแคลนทุนทรัพย์",
        "labels": [0, 0, 0, 0, 0, 1, 0, 0],
        "category_names": ["บริการทั่วไปและสวัสดิการ"]
    },
    {
        "text": "รถเมล์สาย 1 ไม่พอ รอนานเกิน 45 นาที ผู้โดยสารยืนรอจนล้นป้ายหน้ามหาวิทยาลัย",
        "labels": [0, 0, 0, 0, 0, 0, 1, 0],
        "category_names": ["การเดินทางและระบบขนส่ง"]
    },
    {
        "text": "พบแมลงสาบและเศษพลาสติกปนเปื้อนในจานข้าวที่โรงอาหารคณะแพทยศาสตร์",
        "labels": [0, 0, 0, 0, 0, 0, 0, 1],
        "category_names": ["สุขอนามัยและความปลอดภัยทางอาหาร"]
    }
]

# ── ชุดข้อมูลทดสอบ (Test Dataset) ──
RAW_TEST_DATA = [
    {
        "text": "รถบัส มพ. สาย 2 เบรกแตกชนเข้ากับรั้วต้นไม้ข้างทางหน้าตึก ICT และน้ำมันหกเลอะพื้นถนน",
        "labels": [0, 0, 0, 1, 1, 0, 1, 0],
        "category_names": ["ภูมิทัศน์และความสะอาด", "ความปลอดภัยและจราจร", "การเดินทางและระบบขนส่ง"]
    },
    {
        "text": "ไฟห้องน้ำตึกศิลปศาสตร์ดับและกลอนประตูพัง ล็อคไม่ได้ เสี่ยงมีคนบุกรุก",
        "labels": [1, 0, 0, 0, 1, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก", "ความปลอดภัยและจราจร"]
    },
    {
        "text": "อาหารที่โรงอาหารตึกสงวนเสริมศรีบูดและมีกลิ่นเหม็นเน่า ถังขยะข้างร้านไม่เก็บ",
        "labels": [0, 0, 0, 1, 0, 0, 0, 1],
        "category_names": ["ภูมิทัศน์และความสะอาด", "สุขอนามัยและความปลอดภัยทางอาหาร"]
    },
    {
        "text": "เข้าเว็บไซต์ลงทะเบียนเรียน Reg ไม่ได้ และมีปัญหาเรื่องตารางสอบซ้ำซ้อน",
        "labels": [0, 1, 1, 0, 0, 0, 0, 0],
        "category_names": ["ระบบเครือข่ายและเทคโนโลยี", "การเรียนการสอนและวิชาการ"]
    },
    {
        "text": "โปรเจกเตอร์และไมโครโฟนห้อง 1402 ตึก ICT ใช้งานไม่ได้ ลำโพงไม่ดัง",
        "labels": [1, 0, 0, 0, 0, 0, 0, 0],
        "category_names": ["อาคารและสิ่งอำนวยความสะดวก"]
    },
    {
        "text": "รถเมล์มอวิ่งไม่ตรงรอบ ทิ้งผู้โดยสารที่ป้ายหน้ามอ",
        "labels": [0, 0, 0, 0, 0, 0, 1, 0],
        "category_names": ["การเดินทางและระบบขนส่ง"]
    }
]

def export_datasets():
    train_json_path = os.path.join(DATA_DIR, "train_multilabel.json")
    test_json_path = os.path.join(DATA_DIR, "test_multilabel.json")
    train_csv_path = os.path.join(DATA_DIR, "train_multilabel.csv")
    test_csv_path = os.path.join(DATA_DIR, "test_multilabel.csv")

    # 1. Save JSON
    with open(train_json_path, "w", encoding="utf-8") as f:
        json.dump(RAW_TRAIN_DATA, f, ensure_ascii=False, indent=2)

    with open(test_json_path, "w", encoding="utf-8") as f:
        json.dump(RAW_TEST_DATA, f, ensure_ascii=False, indent=2)

    # 2. Save CSV (สำหรับเปิดดูใน Excel / Google Sheets หรือส่งต่อให้ LLM สร้างเพิ่ม)
    fieldnames = ["text", "category_names", "cat_1_building", "cat_2_network_it", "cat_3_academic", "cat_4_landscape", "cat_5_safety_traffic", "cat_6_general_service", "cat_7_transportation", "cat_8_food_hygiene"]

    def write_csv(data, filepath):
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

    write_csv(RAW_TRAIN_DATA, train_csv_path)
    write_csv(RAW_TEST_DATA, test_csv_path)

    print(f"Generated Training Data: {len(RAW_TRAIN_DATA)} samples -> {train_json_path} & {train_csv_path}")
    print(f"Generated Test Data: {len(RAW_TEST_DATA)} samples -> {test_json_path} & {test_csv_path}")

if __name__ == "__main__":
    export_datasets()
