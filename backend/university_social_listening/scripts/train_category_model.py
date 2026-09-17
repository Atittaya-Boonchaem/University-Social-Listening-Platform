import os
import sys
import json
import csv
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

from pythainlp.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

# Append parent dir to sys.path to import app modules if needed
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ai_data", "models")
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "ai_data", "category_dataset.csv")


def tokenize_thai(text: str) -> str:
    """
    Tokenizes Thai text using PyThaiNLP and joins tokens with space for TF-IDF Vectorizer.
    """
    if not text:
        return ""
    words = word_tokenize(str(text).strip().lower(), engine="newmm")
    return " ".join([w.strip() for w in words if w.strip()])


def load_dataset():
    """
    Loads dataset from CSV file and enriches with existing database records if available.
    """
    data = []
    
    # 1. Load CSV seed dataset
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = row.get("text", "").strip()
                cat_id = row.get("category_id", "").strip()
                if text and cat_id.isdigit():
                    data.append({"text": text, "category_id": int(cat_id)})

    # 2. Try loading real problem records from Database
    try:
        from app.database import SessionLocal
        from app.models import Problem
        db = SessionLocal()
        try:
            problems = db.query(Problem).filter(Problem.is_deleted == False).all()
            for p in problems:
                content = f"{p.title or ''} {p.description or ''}".strip()
                if content and p.category_id:
                    data.append({"text": content, "category_id": int(p.category_id)})
        finally:
            db.close()
    except Exception as e:
        print(f"Note: Could not query database directly ({e}). Using CSV dataset.")

    df = pd.DataFrame(data)
    return df


def train_and_evaluate():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    print("[INFO] Loading dataset for Thai Category Classification...")
    df = load_dataset()

    if df.empty or len(df) < 5:
        print("[ERROR] Dataset is too small or empty. Aborting training.")
        return None

    print(f"[INFO] Dataset size: {len(df)} samples across categories: {df['category_id'].unique().tolist()}")

    # Tokenize Thai text
    print("[INFO] Tokenizing Thai text using PyThaiNLP (newmm engine)...")
    df['tokenized_text'] = df['text'].apply(tokenize_thai)

    X = df['tokenized_text']
    y = df['category_id'].astype(int)

    # TF-IDF Vectorization
    print("[INFO] Extracting TF-IDF features...")
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    X_tfidf = vectorizer.fit_transform(X)

    # Train Classifier
    print("[INFO] Training Machine Learning Classifier (Logistic Regression)...")
    model = LogisticRegression(max_iter=1000, C=2.0, random_state=42)
    model.fit(X_tfidf, y)

    # Evaluate Model Predictions
    y_pred = model.predict(X_tfidf)
    accuracy = float(accuracy_score(y, y_pred))
    precision, recall, f1, _ = precision_recall_fscore_support(y, y_pred, average="macro", zero_division=0)
    
    classes = np.unique(y).tolist()
    cm = confusion_matrix(y, y_pred, labels=classes).tolist()
    
    report_dict = classification_report(y, y_pred, output_dict=True, zero_division=0)

    metrics = {
        "accuracy": round(accuracy * 100, 2),
        "precision": round(float(precision) * 100, 2),
        "recall": round(float(recall) * 100, 2),
        "f1_score": round(float(f1) * 100, 2),
        "total_samples": len(df),
        "classes": classes,
        "confusion_matrix": cm,
        "classification_report": report_dict,
        "last_trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # Save artifacts
    model_path = os.path.join(MODEL_DIR, "category_model.pkl")
    vectorizer_path = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
    metrics_path = os.path.join(MODEL_DIR, "evaluation_metrics.json")

    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print("\n[SUCCESS] Training Complete!")
    print(f"   Accuracy:  {metrics['accuracy']}%")
    print(f"   Precision: {metrics['precision']}%")
    print(f"   Recall:    {metrics['recall']}%")
    print(f"   F1-Score:  {metrics['f1_score']}%")
    print(f"   Saved model artifacts to {MODEL_DIR}")

    return metrics


if __name__ == "__main__":
    train_and_evaluate()
