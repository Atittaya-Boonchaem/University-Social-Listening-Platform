"""Inference wrapper for the fine-tuned WangchanBERTa multi-label model."""
import json
import logging
import os
from typing import Any, Dict, List

logger = logging.getLogger(__name__)
_TOKENIZER = None
_MODEL = None
_THRESHOLDS: Dict[str, float] = {}
LABEL_ALIASES = {
    "traffic": ["จราจร", "ขนส่ง", "รถ", "การเดินทาง"],
    "safety": ["ปลอดภัย", "ความปลอดภัย"],
    "cleaning": ["สะอาด", "ความสะอาด", "สุขอนามัย"],
    "building": ["อาคาร", "แจ้งซ่อม", "สิ่งอำนวยความสะดวก"],
    "education": ["การศึกษา", "เรียน", "หลักสูตร"],
    "network": ["เครือข่าย", "อินเทอร์เน็ต", "เทคโนโลยี", "wifi", "wi-fi"],
}

def _model_dir() -> str:
    return os.path.abspath(os.path.expanduser(os.getenv(
        "WANGCHAN_MODEL_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "models", "finetuned_model"),
    )))

def _load() -> bool:
    global _TOKENIZER, _MODEL, _THRESHOLDS
    if _MODEL is not None:
        return True
    directory = _model_dir()
    if not os.path.isfile(os.path.join(directory, "config.json")):
        logger.warning("WangchanBERTa model directory not found: %s", directory)
        return False
    try:
        # Prevent an unrelated TensorFlow installation from being imported by
        # transformers on servers that run PyTorch inference only.
        os.environ.setdefault("USE_TF", "0")
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch
        # tokenizer.json is bundled beside the fine-tuned weights so loading
        # works even when optional protobuf/tiktoken packages are unavailable.
        _TOKENIZER = AutoTokenizer.from_pretrained(directory, local_files_only=True, use_fast=True)
        _MODEL = AutoModelForSequenceClassification.from_pretrained(directory, local_files_only=True)
        _MODEL.to("cuda" if torch.cuda.is_available() else "cpu").eval()
        with open(os.path.join(directory, "thresholds.json"), encoding="utf-8") as file:
            _THRESHOLDS = json.load(file).get("core_thresholds", {})
        return True
    except Exception:
        logger.exception("Unable to load WangchanBERTa")
        _TOKENIZER = _MODEL = None
        return False

def _find_category(label: str, categories: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    aliases = [x.lower() for x in LABEL_ALIASES.get(label, [])]
    for category in categories:
        name = str(category.get("name") or category.get("category_name") or "").lower()
        if any(alias in name for alias in aliases):
            return category
    return None

def classify_with_wangchanberta(text: str, categories_list: List[Dict[str, Any]], threshold: float | None = None) -> Dict[str, Any]:
    if not text or not _load():
        return {"routed_categories": [], "all_scores": [
                    {"category_id": c.get("id", c.get("category_id")),
                     "category_name": c.get("name", c.get("category_name")),
                     "label": None, "score": 0.0, "score_percent": 0.0,
                     "confidence": 0.0, "score_source": "unavailable"} for c in categories_list],
                "top_confidence": 0.0,
                "threshold_used": 0.5, "needs_human_review": True, "model": "unavailable"}
    import torch
    route_threshold = max(0.0, min(1.0, float(threshold))) if threshold is not None else None
    inputs = _TOKENIZER(text, return_tensors="pt", truncation=True, max_length=128)
    inputs = {key: value.to(next(_MODEL.parameters()).device) for key, value in inputs.items()}
    with torch.no_grad():
        probabilities = torch.sigmoid(_MODEL(**inputs).logits)[0].cpu().tolist()
    model_scores, routed = [], []
    for index, score in enumerate(probabilities):
        label = str(_MODEL.config.id2label.get(str(index), _MODEL.config.id2label.get(index, f"class_{index}"))).lower()
        model_threshold = float(_THRESHOLDS.get(label, 0.5))
        effective_threshold = route_threshold if route_threshold is not None else model_threshold
        item = {"label": label, "score": round(float(score), 4), "confidence": round(float(score), 4), "score_percent": round(float(score) * 100, 1), "threshold": effective_threshold}
        model_scores.append(item)
        category = _find_category(label, categories_list)
        if category:
            item.update({"category_id": category.get("id", category.get("category_id")), "category_name": category.get("name", category.get("category_name"))})
        if category and score >= effective_threshold:
            routed.append(item)
    # Always return every active DB category. Categories added after training
    # are represented safely with 0% until the model is retrained with them.
    all_scores = []
    for category in categories_list:
        category_id = category.get("id", category.get("category_id"))
        category_name = category.get("name", category.get("category_name"))
        matched = next((x for x in model_scores if x.get("category_id") == category_id), None)
        if matched:
            all_scores.append(matched)
        else:
            all_scores.append({"category_id": category_id, "category_name": category_name,
                               "label": None, "score": 0.0, "confidence": 0.0, "score_percent": 0.0,
                               "threshold": route_threshold, "score_source": "not_in_model",
                               "needs_retraining": True})
    routed.sort(key=lambda item: item["score"], reverse=True)
    primary = routed[0] if routed else max(all_scores, key=lambda item: item.get("score", 0), default={})
    return {"primary_category_id": primary.get("category_id"), "primary_category_name": primary.get("category_name"),
            "routed_categories": routed, "all_scores": all_scores, "model_scores": model_scores,
            "top_confidence": max(probabilities, default=0.0),
            "threshold_used": route_threshold if route_threshold is not None else 0.5,
            "needs_human_review": not bool(routed), "model": "finetuned_model"}
