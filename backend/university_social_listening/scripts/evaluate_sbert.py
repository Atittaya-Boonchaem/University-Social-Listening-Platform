# scripts/evaluate_sbert.py
"""
University Social Listening Platform — SBERT Evaluation & Testing Script
ทดสอบวัดความแม่นยำ (Evaluation) ของโมเดล SBERT บนชุดทดสอบ 150 คู่ปัญหาภาษาไทย
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
from sentence_transformers import SentenceTransformer, util

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data", "sbert")
TUNED_MODEL_DIR = os.path.join(BASE_DIR, "models", "sbert-up-finetuned")

def evaluate():
    print("=" * 65)
    print("[EVALUATION] SBERT Duplicate Detection Performance Testing")
    print("=" * 65)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Check if fine-tuned model exists, otherwise use base
    model_path = TUNED_MODEL_DIR if os.path.exists(TUNED_MODEL_DIR) else "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    print(f"Loading Model: {model_path} (Device: {device.upper()})")
    model = SentenceTransformer(model_path, device=device)

    test_path = os.path.join(DATA_DIR, "test_pairs.json")
    if not os.path.exists(test_path):
        from scripts.generate_1000_sbert_dataset import generate_1000_sbert_pairs
        generate_1000_sbert_pairs()

    with open(test_path, "r", encoding="utf-8") as f:
        test_pairs = json.load(f)

    print(f"\nRunning tests on {len(test_pairs)} test pairs with Threshold = 0.70:")
    print("-" * 65)

    correct = 0
    total = len(test_pairs)

    for idx, item in enumerate(test_pairs, 1):
        text_a = item.get("text_a", item.get("anchor", ""))
        text_b = item.get("text_b", item.get("positive", ""))
        actual_score = float(item.get("score", item.get("label", 0.95)))

        emb1 = model.encode(text_a, convert_to_tensor=True)
        emb2 = model.encode(text_b, convert_to_tensor=True)
        sim = float(util.cos_sim(emb1, emb2)[0][0])

        is_duplicate_pred = sim >= 0.70
        is_duplicate_actual = actual_score >= 0.50
        is_correct = (is_duplicate_pred == is_duplicate_actual)

        if is_correct:
            correct += 1
            status = "[PASS]"
        else:
            status = "[FAIL]"

        pair_type = "DUPLICATE" if is_duplicate_actual else "DIFFERENT"
        if idx <= 10 or idx % 20 == 0 or not is_correct:
            print(f"{status} Test #{idx} ({pair_type}) | Cosine Sim: {sim:.4f} (Expected: {actual_score:.2f})")
            print(f"   A: \"{text_a}\"")
            print(f"   B: \"{text_b}\"")
            print()

    accuracy = (correct / total) * 100
    print("=" * 65)
    print(f"[RESULTS] Final Evaluation: {correct}/{total} Passed ({accuracy:.2f}% Accuracy)")
    print("=" * 65)

if __name__ == "__main__":
    evaluate()
