# -*- coding: utf-8 -*-
"""
Full Autonomous Experiment Runner: Post Similarity & Clustering Evaluation (ม.พะเยา)
Generates evaluation tables, metrics, and plots in results/ directory.
"""
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from scipy.cluster.hierarchy import dendrogram, linkage
from sentence_transformers import SentenceTransformer, util
import torch

BASE_DIR = r"d:\UP\min_app\post_clustering_experiment"
RESULTS_DIR = os.path.join(BASE_DIR, "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

# Configure plot fonts
plt.rcParams['font.sans-serif'] = ['Tahoma', 'Angsana New', 'Leelawadee UI', 'DejaVu Sans', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

device = "cuda" if torch.cuda.is_available() else "cpu"
print("=" * 70)
print("🚀 STARTING POST SIMILARITY & ZERO-CLICK CLUSTERING EXPERIMENT")
print(f"✅ Device: {device.upper()} | PyTorch: {torch.__version__}")
print("=" * 70)

# 1. Load dataset
data_file = os.path.join(BASE_DIR, "dataset_duplicate_pairs.csv")
df = pd.read_csv(data_file, encoding="utf-8-sig")
print(f"📊 Total Dataset Pairs: {len(df)}")
print(f" - Duplicate Pairs: {(df['is_duplicate'] == 1).sum()}")
print(f" - Non-Duplicate Pairs: {(df['is_duplicate'] == 0).sum()}")

# 2. Load SBERT Model
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
print(f"\n🧠 Loading Model: {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME, device=device)

# 3. Compute Embeddings & Cosine Similarities
print("⚡ Computing embeddings and cosine similarities...")
emb1 = model.encode(df["sentence1"].tolist(), convert_to_tensor=True, show_progress_bar=False)
emb2 = model.encode(df["sentence2"].tolist(), convert_to_tensor=True, show_progress_bar=False)
cosine_sims = util.cos_sim(emb1, emb2).diagonal().cpu().numpy()

df["predicted_similarity"] = np.round(cosine_sims, 4)
df["predicted_percent"] = np.round(cosine_sims * 100, 1)

# 4. Threshold Benchmark
print("\n" + "=" * 70)
print("📈 BENCHMARKING THRESHOLDS (0.50 to 0.85):")
print("=" * 70)
thresholds = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]
benchmark_results = []
y_true = df["is_duplicate"].values

for th in thresholds:
    y_pred = (df["predicted_similarity"].values >= th).astype(int)
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    benchmark_results.append({
        "Threshold": f"{int(th*100)}%",
        "Accuracy": round(acc * 100, 2),
        "Precision": round(prec * 100, 2),
        "Recall": round(rec * 100, 2),
        "F1-Score": round(f1 * 100, 2)
    })
    print(f"  Threshold {int(th*100)}% | Accuracy: {acc*100:.2f}% | Precision: {prec*100:.2f}% | Recall: {rec*100:.2f}% | F1: {f1*100:.2f}%")

bench_df = pd.DataFrame(benchmark_results)
bench_df.to_csv(os.path.join(RESULTS_DIR, "benchmark_thresholds.csv"), index=False, encoding="utf-8-sig")

# 5. Export Plots
# Plot 1: Similarity Distribution
plt.figure(figsize=(10, 5))
sns.histplot(data=df, x="predicted_percent", hue="is_duplicate", kde=True, bins=25, palette=["#e74c3c", "#2ecc71"])
plt.axvline(70, color="blue", linestyle="--", linewidth=2, label="Threshold 70%")
plt.title("Distribution of Semantic Similarity Scores (Duplicate vs Non-Duplicate)", fontsize=13, fontweight='bold')
plt.xlabel("Similarity Score (%)")
plt.ylabel("Count")
plt.legend(["Threshold 70%", "Duplicate (Same Issue)", "Non-Duplicate (Different Issues)"])
plt.grid(alpha=0.3)
plt.tight_layout()
dist_plot = os.path.join(RESULTS_DIR, "plot_similarity_distribution.png")
plt.savefig(dist_plot, dpi=300)
plt.close()
print(f"\n🖼️ Saved: {dist_plot}")

# Plot 2: Confusion Matrix at Threshold 70%
y_pred_70 = (df["predicted_similarity"].values >= 0.70).astype(int)
cm = confusion_matrix(y_true, y_pred_70)

plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Purples', cbar=False,
            xticklabels=['Non-Duplicate', 'Duplicate'],
            yticklabels=['Non-Duplicate', 'Duplicate'])
plt.title("Confusion Matrix (Threshold = 70%)", fontsize=12, fontweight='bold')
plt.xlabel("Predicted Label")
plt.ylabel("True Label")
plt.tight_layout()
cm_plot = os.path.join(RESULTS_DIR, "plot_confusion_matrix.png")
plt.savefig(cm_plot, dpi=300)
plt.close()
print(f"🖼️ Saved: {cm_plot}")

# Plot 3: Dendrogram Clustering Demo
sample_posts = [
    "แอร์ห้อง ICT 1201 เสีย ไม่เย็นเลย ร้อนมาก",
    "ห้อง 1201 ตึกไอซีที แอร์ไม่ทำงาน",
    "แอร์ห้อง 1201 ไอซีที มีแต่ลมร้อน",
    "รถเมล์ มพ. สาย 1 รอนานมาก ไม่ยอมมาสักที",
    "รอรถเมล์มอสาย 1 หน้ามอนานเกิน 40 นาทีแล้ว",
    "คนขับรถเมล์มอสาย 1 ขับเร็วอันตราย",
    "ห้องน้ำชั้น 2 ตึก CE น้ำไม่ไหล",
    "ตึกเรียนรวมชั้น 2 ห้องน้ำไม่มีน้ำใช้ กดชักโครกไม่ได้",
    "ไวไฟ UP-WiFi ที่ตึก ICT หลุดบ่อยมาก",
    "เน็ตมอตึกไอซีทีช้ามาก โหลดเว็บไม่ขึ้น"
]
sample_embeddings = model.encode(sample_posts)
linkage_matrix = linkage(sample_embeddings, method='average', metric='cosine')

plt.figure(figsize=(12, 6))
dendrogram(
    linkage_matrix,
    labels=[f"P{i+1}: {p[:28]}..." for i, p in enumerate(sample_posts)],
    orientation='left',
    color_threshold=0.30
)
plt.axvline(0.30, color='red', linestyle='--', label='Cluster Cutoff (Dist=0.30, Sim=70%)')
plt.title("Dendrogram: Zero-Click Duplicate Post Clustering (ม.พะเยา)", fontsize=13, fontweight='bold')
plt.xlabel("Cosine Distance (1 - Similarity)")
plt.legend()
plt.tight_layout()
dendro_plot = os.path.join(RESULTS_DIR, "plot_clustering_tree.png")
plt.savefig(dendro_plot, dpi=300)
plt.close()
print(f"🖼️ Saved: {dendro_plot}")

print("\n" + "=" * 70)
print("🎉 EXPERIMENT COMPLETED 100%!")
print(f"📁 All files ready in: {BASE_DIR}")
print("=" * 70)
