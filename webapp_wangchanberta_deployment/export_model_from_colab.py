"""Paste this into a final Colab cell after WangchanBERTa training and evaluation."""
from pathlib import Path
import json
import shutil

DEPLOY_DIR = Path("wangchanberta_deployment_model")
DEPLOY_DIR.mkdir(parents=True, exist_ok=True)
CORE_LABELS = ["traffic", "safety", "cleaning", "facilities", "education", "network"]

wang.config.id2label = {index: label for index, label in enumerate(CORE_LABELS)}
wang.config.label2id = {label: index for index, label in enumerate(CORE_LABELS)}
wang.save_pretrained(DEPLOY_DIR, safe_serialization=True)
wang_tokenizer.save_pretrained(DEPLOY_DIR)

contract = {
    "model_name": "WangchanBERTa multi-label complaint classifier",
    "model_version": "fill-in-training-date-and-data-version",
    "core_labels": CORE_LABELS,
    "model_decision_thresholds": {
        label: float(selected["wangchanberta"]) for label in CORE_LABELS
    },
    "review_margin": 0.08,
    "max_length": 128,
    "other_policy": "fallback_when_no_core_label_passes_model_decision_threshold"
}
(DEPLOY_DIR / "model_contract.json").write_text(
    json.dumps(contract, ensure_ascii=False, indent=2), encoding="utf-8"
)

zip_path = shutil.make_archive("wangchanberta_deployment_model", "zip", DEPLOY_DIR)
print("Deployment package:", zip_path)

# In Colab, uncomment to download:
# from google.colab import files
# files.download(zip_path)
