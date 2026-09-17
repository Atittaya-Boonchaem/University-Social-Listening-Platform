# -*- coding: utf-8 -*-
"""
Fine-tune Typhoon 2.5 สำหรับจำแนกหมวดปัญหานิสิต (UP Connect)
- ใช้ dataset: dataset.json (รูปแบบ input/output)
- วิธี: LoRA Supervised Fine-Tuning (SFT) แบบเดียวกับที่ Typhoon paper ใช้ในส่วน post-training
- รันบน Google Colab (GPU T4/A100) หรือเครื่องที่มีการ์ดจอ
"""

import os
# ย้ายที่เก็บไฟล์ดาวน์โหลดไปที่ไดรฟ์ D:
os.environ["HF_HOME"] = "D:/hf_cache"
if not os.environ.get("HF_TOKEN"):
    raise RuntimeError("Set the HF_TOKEN environment variable before running this script.")

import json
import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# ============================================================
# 1. เตรียม dataset: แปลง input/output -> รูปแบบแชต
# ============================================================
DATASET_PATH = r"d:\model\new\dataset.json"

with open(DATASET_PATH, encoding="utf-8") as f:
    raw = json.load(f)

# กำหนดบทบาทของ AI (system prompt) ให้ทำหน้าที่จำแนกปัญหา
SYSTEM_PROMPT = (
    "คุณคือระบบจำแนกปัญหาของนิสิต รับข้อความร้องเรียนแล้วตอบเป็น "
    "'label: <เลข>, category: <ชื่อหมวด>' เท่านั้น"
)

def to_chat(example):
    """แปลงแต่ละตัวอย่างเป็นข้อความสนทนา (system/user/assistant)"""
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": example["input"]},
            {"role": "assistant", "content": example["output"]},
        ]
    }

ds = Dataset.from_list(raw).map(to_chat)
# แบ่ง train/validation 90/10
split = ds.train_test_split(test_size=0.1, seed=42)
train_ds, eval_ds = split["train"], split["test"]
print(f"train={len(train_ds)} eval={len(eval_ds)}")

from transformers import BitsAndBytesConfig
from peft import prepare_model_for_kbit_training # เพิ่มบรรทัดนี้ด้านบนสุดของไฟล์ร่วมกับ peft อื่นๆ

# ============================================================
# 2. โหลด Typhoon 2.5 แบบบีบอัด (4-bit) และตั้งค่า LoRA
# ============================================================
MODEL_ID = "scb10x/typhoon2.5-qwen3-4b"

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.padding_side = "right" 
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# ตรวจสอบว่า GPU รองรับ bfloat16 หรือไม่ (จำเป็นสำหรับ Windows)
use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
print(f"Using compute dtype: {compute_dtype} | bf16 supported: {use_bf16}")

# ตั้งค่าการบีบอัด 4-bit เพื่อประหยัด RAM
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=compute_dtype,  # <--- ใช้ dtype ที่ตรวจสอบแล้ว
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,  # <--- ใช้งานการบีบอัดตรงนี้
    device_map="auto",
)

# เตรียมโมเดลที่ถูกบีบอัดให้พร้อมเทรน
model = prepare_model_for_kbit_training(model)

# LoRA: ฝึกเพียงส่วนย่อยของโมเดล
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ============================================================
# 3. ตั้งค่าการเทรน
# ============================================================
training_args = TrainingArguments(
    output_dir="./typhoon-upconnect",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    logging_steps=5,
    eval_strategy="steps",
    eval_steps=10,
    save_strategy="steps",
    save_steps=20,
    bf16=use_bf16,   # ใช้ bf16 เฉพาะเมื่อ GPU รองรับ (A100/H100)
    fp16=not use_bf16,  # ใช้ fp16 บน GPU ทั่วไป (RTX, GTX)
)

# นำมาวางแทนที่ตรงนี้ทั้งหมด 👇
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=eval_ds,
    processing_class=tokenizer,
)

# ============================================================
# 4. เริ่มเทรน
# ============================================================
trainer.train()

# ============================================================
# 5. บันทึก LoRA adapter
# ============================================================
trainer.save_model("./typhoon-upconnect-final")
tokenizer.save_pretrained("./typhoon-upconnect-final")
print("เทรนเสร็จแล้ว! โมเดลถูกบันทึกที่ ./typhoon-upconnect-final")