# scripts/evaluate_wangchanberta.py
"""
University Social Listening Platform — WangchanBERTa Multi-Label Evaluation & Simulator
ทดสอบวัดผลโมเดล WangchanBERTa จำแนก 8 หมวดหมู่ปัญหา พร้อมทดสอบเคสข้ามหน่วยงาน (Cross-Department Case Study)
"""
import os
import sys
import json
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data", "wangchanberta")
MODEL_DIR = os.path.join(BASE_DIR, "models", "wangchanberta-up-multilabel")

CATEGORIES = [
    {"id": 1, "name": "อาคารและสิ่งอำนวยความสะดวก"},
    {"id": 2, "name": "ระบบเครือข่ายและเทคโนโลยี"},
    {"id": 3, "name": "การเรียนการสอนและวิชาการ"},
    {"id": 4, "name": "ภูมิทัศน์และความสะอาด"},
    {"id": 5, "name": "ความปลอดภัยและจราจร"},
    {"id": 6, "name": "บริการทั่วไปและสวัสดิการ"},
    {"id": 7, "name": "การเดินทางและระบบขนส่ง"},
    {"id": 8, "name": "สุขอนามัยและความปลอดภัยทางอาหาร"}
]

def evaluate():
    print("=" * 70)
    print("[EVALUATION] WangchanBERTa Multi-Label Classification Testing")
    print("=" * 70)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = MODEL_DIR if os.path.exists(MODEL_DIR) else "airesearch/wangchanberta-base-att-spm-uncased"
    print(f"Loading Model: {model_path} (Device: {device.type.upper()})")

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path, num_labels=8).to(device)
    model.eval()

    test_cases = [
        {
            "case": "1. เคสข้าม 3 หน่วยงาน (รถเมล์ชนหมาตายที่ตึก PKY)",
            "text": "รถเมล์มอขับเร็วเฉี่ยวชนสุนัขจรจัดเสียชีวิตกลางถนนหน้าตึก PKY มีคราบเลือดและซากสัตว์ขวางทาง",
            "threshold": 0.50
        },
        {
            "case": "2. เคสข้าม 2 หน่วยงาน (ไฟทางเดินดับ + กล้องวงจรปิดไม่ทำงาน)",
            "text": "ไฟส่องสว่างทางเดินข้างอาคาร CE ดับสนิท กล้องวงจรปิดไม่ทำงาน เสี่ยงอันตรายตอนดึก",
            "threshold": 0.50
        },
        {
            "case": "3. เคสข้าม 2 หน่วยงาน (โรงอาหารสงวนเสริมศรีขยะเน่าล้นถัง)",
            "text": "โรงอาหารสงวนเสริมศรีมีขยะและเศษอาหารเน่าล้นถัง ส่งกลิ่นเหม็นคลุ้งและมีแมลงสาบไต่แถวโต๊ะอาหาร",
            "threshold": 0.50
        },
        {
            "case": "4. เคสเดี่ยว (อินเทอร์เน็ต WiFi หอพักหลุดบ่อย)",
            "text": "สัญญาณ WiFi UP-WiFi ในหอพักลุมพินีหลุดบ่อยมาก เชื่อมต่อไม่ได้เลยตั้งแต่ช่วงหัวค่ำ",
            "threshold": 0.50
        }
    ]

    for tc in test_cases:
        print("\n" + "-" * 70)
        print(f"📌 {tc['case']}")
        print(f"ข้อความ: \"{tc['text']}\"")
        print(f"เกณฑ์ตัดสินใจกระจายงาน (Threshold): {tc['threshold'] * 100:.0f}%")
        print("-" * 70)

        inputs = tokenizer(tc["text"], return_tensors="pt", truncation=True, max_length=128).to(device)
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

        scored_cats = []
        for idx, cat in enumerate(CATEGORIES):
            p = float(probs[idx])
            scored_cats.append({
                "id": cat["id"],
                "name": cat["name"],
                "prob": p,
                "percent": round(p * 100, 1)
            })

        # Sort by confidence
        scored_cats.sort(key=lambda x: x["prob"], reverse=True)

        routed_cats = [c for c in scored_cats if c["prob"] >= tc["threshold"]]

        print("📊 ความน่าจะเป็นของทั้ง 8 หมวดหมู่:")
        for c in scored_cats:
            bar = "█" * int(c["percent"] / 5)
            badge = "🎯 [กระจายงานไปยังแอดมินหมวดนี้]" if c["prob"] >= tc["threshold"] else ""
            print(f"  - หมวด {c['id']}: {c['name']:<30} -> {c['percent']:>5.1f}% {bar} {badge}")

        print(f"\n🚀 สรุปการกระจายงาน (Auto-Routing Result): ส่งต่อให้ {len(routed_cats)} หน่วยงาน")
        for rc in routed_cats:
            print(f"   ✓ {rc['name']} (ความมั่นใจ {rc['percent']}%)")

    print("\n" + "=" * 70)
    print("🎉 การทดสอบเสร็จสมบูรณ์!")
    print("=" * 70)

if __name__ == "__main__":
    evaluate()
