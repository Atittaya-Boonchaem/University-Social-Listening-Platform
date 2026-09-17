# scripts/train_sbert.py
"""
University Social Listening Platform — SBERT Fine-Tuning Script
ทำการ Fine-Tune โมเดล Sentence-BERT (SBERT) บนชุดข้อมูลปัญหา 1,000 ตัวอย่างบริบทมหาวิทยาลัยพะเยา (UP Domain)
"""
import os
import sys
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import torch
from torch.utils.data import DataLoader
from sentence_transformers import SentenceTransformer, InputExample, losses, evaluation

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data", "sbert")
OUTPUT_MODEL_DIR = os.path.join(BASE_DIR, "models", "sbert-up-finetuned")
os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)

def train_sbert():
    print("=" * 65)
    print("[SBERT] Starting SBERT Fine-Tuning on 1,000 University Domain Pairs")
    print("=" * 65)

    # 1. Device check
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Hardware Acceleration Device: {device.upper()}")
    if device == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    # 2. Generate datasets if not existing
    train_path = os.path.join(DATA_DIR, "train_pairs.json")
    test_path = os.path.join(DATA_DIR, "test_pairs.json")
    if not os.path.exists(train_path) or not os.path.exists(test_path):
        print("Generating 1,000 training dataset pairs...")
        from scripts.generate_1000_sbert_dataset import generate_1000_sbert_pairs
        generate_1000_sbert_pairs()

    with open(train_path, "r", encoding="utf-8") as f:
        raw_train = json.load(f)
    with open(test_path, "r", encoding="utf-8") as f:
        raw_test = json.load(f)

    # 3. Prepare Training InputExamples
    train_examples = []
    for item in raw_train:
        if "text_a" in item and "text_b" in item:
            train_examples.append(InputExample(
                texts=[item["text_a"], item["text_b"]],
                label=float(item.get("score", 0.95))
            ))
        elif "anchor" in item:
            train_examples.append(InputExample(
                texts=[item["anchor"], item["positive"]],
                label=float(item.get("score", 0.95))
            ))
            train_examples.append(InputExample(
                texts=[item["anchor"], item["negative"]],
                label=0.05
            ))

    print(f"Total Training Pairs (Positive + Hard Negative): {len(train_examples)}")
    print(f"Total Testing Pairs: {len(raw_test)}")

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)

    # 4. Load Base Model
    base_model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    print(f"\nLoading Base Pretrained Model: {base_model_name}")
    model = SentenceTransformer(base_model_name, device=device)

    # 5. Define Loss Function (CosineSimilarityLoss)
    train_loss = losses.CosineSimilarityLoss(model=model)

    # 6. Prepare Evaluator with Test Pairs
    sentences1 = [item.get("text_a", item.get("anchor", "")) for item in raw_test]
    sentences2 = [item.get("text_b", item.get("positive", "")) for item in raw_test]
    scores = [float(item.get("score", item.get("label", 0.95))) for item in raw_test]

    evaluator = evaluation.EmbeddingSimilarityEvaluator(
        sentences1=sentences1,
        sentences2=sentences2,
        scores=scores,
        name="up-test-eval"
    )

    # 7. Evaluate Baseline (Pre-training)
    print("\n--- Baseline Evaluation (Before Fine-Tuning) ---")
    base_score = evaluator(model, output_path=None)
    if isinstance(base_score, dict):
        print(f"Baseline Metrics: {json.dumps(base_score, indent=2)}")
    else:
        print(f"Baseline Score: {base_score:.4f}")

    # 8. Train the model
    num_epochs = 4
    warmup_steps = int(len(train_dataloader) * num_epochs * 0.1)
    print(f"\nTraining for {num_epochs} epochs on GPU (Warmup steps: {warmup_steps})...")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=num_epochs,
        evaluation_steps=20,
        warmup_steps=warmup_steps,
        output_path=OUTPUT_MODEL_DIR,
        show_progress_bar=False
    )

    # 9. Evaluate Fine-Tuned Model
    print("\n--- Evaluation After Fine-Tuning ---")
    tuned_score = evaluator(model, output_path=None)
    if isinstance(tuned_score, dict):
        print(f"Fine-Tuned Metrics: {json.dumps(tuned_score, indent=2)}")
    else:
        print(f"Fine-Tuned Score: {tuned_score:.4f}")

    # Save final model
    model.save(OUTPUT_MODEL_DIR)
    print(f"[SUCCESS] SBERT Model weights saved successfully to: {OUTPUT_MODEL_DIR}")

if __name__ == "__main__":
    train_sbert()
