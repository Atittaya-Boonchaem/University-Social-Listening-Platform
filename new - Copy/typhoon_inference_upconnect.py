# -*- coding: utf-8 -*-
"""
ทดสอบโมเดลที่เทรนแล้ว: รับข้อความร้องเรียน -> จำแนกหมวดปัญหา
"""
import os

# ย้ายที่เก็บไฟล์ดาวน์โหลดไปที่ไดรฟ์ D: (โปรแกรมจะสร้างโฟลเดอร์ hf_cache ให้เอง)
os.environ["HF_HOME"] = "D:/hf_cache"
if not os.environ.get("HF_TOKEN"):
    raise RuntimeError("Set the HF_TOKEN environment variable before running this script.")

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "scb10x/typhoon2.5-qwen3-4b"
ADAPTER_PATH = "./typhoon-upconnect-final"

# ตรวจสอบว่า GPU รองรับ bfloat16 หรือไม่
use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
print(f"Using compute dtype: {compute_dtype} | bf16 supported: {use_bf16}")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

# โหลดแบบ 4-bit เพื่อประหยัด VRAM (ป้องกัน kernel crash จาก OOM)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=compute_dtype,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,  # <--- [แก้ไข] เพิ่ม 4-bit quantization ป้องกัน OOM
    device_map="auto",
)
# โหลดน้ำหนัก LoRA ที่เราเทรนขึ้นมาแปะบนโมเดลฐาน
model = PeftModel.from_pretrained(model, ADAPTER_PATH)
model.eval()

SYSTEM_PROMPT = (
    "คุณคือระบบจำแนกปัญหาของนิสิต รับข้อความร้องเรียนแล้วตอบเป็น "
    "'label: <เลข>, category: <ชื่อหมวด>' เท่านั้น"
)

def classify(text):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"ข้อความ: {text}"},
    ]
    input_ids = tokenizer.apply_chat_template(
        messages, add_generation_prompt=True, return_tensors="pt"
    ).to(model.device)
    
    with torch.no_grad():
        out = model.generate(
            input_ids,
            max_new_tokens=64,
            do_sample=False,        # ปิดสุ่มเพื่อให้ผลคงที่ตอนทดสอบ
            temperature=None,
            top_p=None,
        )
    return tokenizer.decode(out[0][input_ids.shape[-1]:], skip_special_tokens=True).strip()

# ทดสอบ
tests = [
    "ห้องเรียนตึก ICT แอร์ไม่เย็นเลยร้อนมาก",
    "รถเมล์ภายในมหาลัยมาช้าทุกวันเลยครับ",
    "ไฟฟ้าตึกสงวนดับตลอด ใช้งานไม่ได้",
]
for t in tests:
    print(f"ข้อความ: {t}")
    print(f"ผล: {classify(t)}\n")