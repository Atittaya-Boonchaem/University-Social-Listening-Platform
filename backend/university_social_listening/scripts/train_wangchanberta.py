# scripts/train_wangchanberta.py
"""
University Social Listening Platform — WangchanBERTa Multi-Label Training Pipeline
เทรนและ Fine-Tune โมเดล WangchanBERTa สำหรับการจำแนกหมวดหมู่ปัญหาแบบ Multi-Label (8 หมวดหมู่พร้อมกัน)
"""
import os
import sys
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data", "wangchanberta")
OUTPUT_MODEL_DIR = os.path.join(BASE_DIR, "models", "wangchanberta-up-multilabel")
os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)

class MultiLabelDataset(Dataset):
    def __init__(self, data, tokenizer, max_len=128):
        self.data = data
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        text = str(item["text"])
        labels = torch.tensor(item["labels"], dtype=torch.float)

        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
            return_tensors="pt"
        )

        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels": labels
        }

def train():
    print("=" * 65)
    print("[WangchanBERTa] Starting Multi-Label Classification Fine-Tuning")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Hardware Acceleration Device: {device.type.upper()}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    # 1. Check & Generate Datasets
    train_path = os.path.join(DATA_DIR, "train_multilabel.json")
    test_path = os.path.join(DATA_DIR, "test_multilabel.json")
    if not os.path.exists(train_path) or not os.path.exists(test_path):
        from scripts.generate_wangchanberta_dataset import export_datasets
        export_datasets()

    with open(train_path, "r", encoding="utf-8") as f:
        train_data = json.load(f)
    with open(test_path, "r", encoding="utf-8") as f:
        test_data = json.load(f)

    print(f"Total Training Samples: {len(train_data)}")
    print(f"Total Testing Samples: {len(test_data)}")

    # 2. Load Tokenizer & Model
    model_name = "airesearch/wangchanberta-base-att-spm-uncased"
    print(f"\nLoading Pretrained Base Model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=8,
        problem_type="multi_label_classification"
    ).to(device)

    # 3. DataLoaders (Optimized for GPU RTX 4050)
    train_dataset = MultiLabelDataset(train_data, tokenizer, max_len=128)
    test_dataset = MultiLabelDataset(test_data, tokenizer, max_len=128)

    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=8, shuffle=False)

    # 4. Optimizer, Loss & Scheduler
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
    epochs = 4
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=int(total_steps * 0.1), num_training_steps=total_steps)

    # 5. Training Loop
    print(f"\nTraining for {epochs} epochs on GPU...")
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            loss = criterion(outputs.logits, labels)
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)
        print(f"Epoch {epoch}/{epochs} | Avg Loss: {avg_loss:.4f}")

    # 6. Save Model
    print(f"\nSaving Fine-Tuned Model to: {OUTPUT_MODEL_DIR}")
    model.save_pretrained(OUTPUT_MODEL_DIR)
    tokenizer.save_pretrained(OUTPUT_MODEL_DIR)
    print("[SUCCESS] WangchanBERTa Multi-Label Model trained and saved successfully!")

if __name__ == "__main__":
    train()
