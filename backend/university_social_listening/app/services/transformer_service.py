# app/services/transformer_service.py
"""
Transformer Engine for UP Connect:
- Model 2: WangchanBERTa (Thai Contextual Multi-label Text Classification - 768 dim)
- Model 3: Sentence-BERT / SBERT (Semantic Dense Vectors & Zero-Click Duplicate Aggregation)
"""

import os
import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Global singletons to avoid reloading on every request
_SBERT_MODEL = None
_WANGCHANBERTA_TOKENIZER = None
_WANGCHANBERTA_MODEL = None
_CATEGORY_PROTOTYPES_WANGCHANBERTA = None

# Reference intent anchors for each category in UP
CATEGORY_ANCHORS = {
    1: "อาคารและสิ่งอำนวยความสะดวก ชำรุด เสียหาย ประตู หน้าต่าง แอร์ไม่เย็น ไฟฟ้าดับ ลิฟต์ค้าง น้ำไม่ไหล ท่อแตก หลอดไฟขาด พัดลมเสีย ในตึก อาคารเรียน ห้องน้ำ",
    2: "ระบบเครือข่ายและเทคโนโลยี อินเทอร์เน็ต ไวไฟ หลุดบ่อย เชื่อมต่อไม่ได้ เน็ตช้า ระบบเว็บล่ม ลืมรหัสผ่าน โปรแกรมคอมพิวเตอร์ ระบบลงทะเบียน",
    3: "การเรียนการสอนและวิชาการ ตารางเรียน วันสอบ วิชา ตารางสอบชนกัน ประกาศเกรด หน่วยกิต ดรอปเรียน ติดต่ออาจารย์ประจำวิชา ขอสอบชดเชย",
    4: "ภูมิทัศน์และความสะอาด สกปรก ขยะล้น ถังขยะเต็ม ไม่กวาดขยะ กลิ่นเหม็น คราบเลือด กลิ่นเน่า หญ้ารก กิ่งไม้หัก ซากสัตว์ตาย แม่บ้านทำความสะอาด",
    5: "ความปลอดภัยและจราจร อุบัติเหตุ รถชน ชนสุนัข ของหาย ขโมย โดนกรีดเบาะ รถติด จอดรถขวางทาง ทางมืด ไม่มีไฟส่องสว่าง รปภ. กล้องวงจรปิด",
    6: "บริการทั่วไปและสวัสดิการ กิจกรรม ทุนการศึกษา บัตรนิสิต เอกสาร รับรอง สวัสดิการ ขอคำแนะนำ สอบถามข้อมูล หอพักมหาวิทยาลัย",
    7: "การเดินทางและระบบขนส่ง รถเมล์มอ รถบัส ขมส ขนส่งมวลชน รอรถเมล์นาน รถไม่พอ รถขับเร็ว ป้ายรถเมล์ ไม่จอดรับ ส่งผู้โดยสาร ท่ารถ วิ่งรอบมอ",
    8: "สุขอนามัยและความปลอดภัยทางอาหาร โรงอาหาร อาหารไม่สะอาด พบแมลงสาบ เส้นผม อาหารบูด ท้องเสีย สุขอนามัยร้านค้า ร้านอาหารสงวนเสริมศรี"
}


def get_sbert_model():
    """
    Lazy-loads Model 3: Sentence-BERT (Fine-tuned UP Model or paraphrase-multilingual-MiniLM-L12-v2).
    """
    global _SBERT_MODEL
    if _SBERT_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tuned_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "sbert-up-finetuned")
            model_target = tuned_path if os.path.exists(tuned_path) else "paraphrase-multilingual-MiniLM-L12-v2"
            logger.info(f"Loading Model 3: Sentence-BERT ({model_target}) on {device}...")
            _SBERT_MODEL = SentenceTransformer(model_target, device=device)
            logger.info(f"Sentence-BERT loaded successfully from {model_target}!")
        except Exception as e:
            logger.error(f"Failed to load Sentence-BERT: {e}")
            _SBERT_MODEL = None
    return _SBERT_MODEL


def compute_post_embeddings(texts: List[str]) -> Optional[np.ndarray]:
    """
    Model 3: Converts a list of post descriptions into SBERT vector embeddings.
    """
    model = get_sbert_model()
    if model is None or not texts:
        return None
    try:
        embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings
    except Exception as e:
        logger.error(f"Error computing SBERT embeddings: {e}")
        return None


def compute_cosine_similarity(text_a: str, text_b: str) -> float:
    """
    Model 3: Computes semantic similarity between two texts using SBERT.
    Returns cosine similarity score between 0.0 and 1.0.
    """
    model = get_sbert_model()
    if model is None or not text_a or not text_b:
        return 0.0
    try:
        emb = model.encode([text_a, text_b], convert_to_numpy=True, normalize_embeddings=True)
        similarity = float(np.dot(emb[0], emb[1]))
        return max(0.0, min(1.0, similarity))
    except Exception as e:
        logger.error(f"Error computing cosine similarity: {e}")
        return 0.0


def get_wangchanberta_model():
    """
    Lazy-loads Model 2: WangchanBERTa (Fine-tuned Multi-Label Model or airesearch/wangchanberta-base-att-spm-uncased).
    """
    global _WANGCHANBERTA_TOKENIZER, _WANGCHANBERTA_MODEL
    if _WANGCHANBERTA_MODEL is None:
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModel
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tuned_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "wangchanberta-up-multilabel")
            local_path = r"d:\UP\min_app\new - Copy\wangchanberta_problem_classifier"
            
            selected_path = None
            if os.path.exists(local_path):
                selected_path = local_path
            elif os.path.exists(tuned_path):
                selected_path = tuned_path

            if selected_path:
                logger.info(f"Loading Model 2: Fine-Tuned WangchanBERTa from {selected_path} on {device}...")
                _WANGCHANBERTA_TOKENIZER = AutoTokenizer.from_pretrained(selected_path)
                _WANGCHANBERTA_MODEL = AutoModelForSequenceClassification.from_pretrained(selected_path).to(device)
            else:
                logger.info(f"Loading Model 2: Base WangchanBERTa on {device}...")
                _WANGCHANBERTA_TOKENIZER = AutoTokenizer.from_pretrained("airesearch/wangchanberta-base-att-spm-uncased")
                _WANGCHANBERTA_MODEL = AutoModel.from_pretrained("airesearch/wangchanberta-base-att-spm-uncased").to(device)
                
            _WANGCHANBERTA_MODEL.eval()
            logger.info("WangchanBERTa loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load WangchanBERTa: {e}")
            _WANGCHANBERTA_MODEL = None
    return _WANGCHANBERTA_TOKENIZER, _WANGCHANBERTA_MODEL


def extract_wangchanberta_features(text: str) -> Optional[np.ndarray]:
    """
    Model 2: Extracts deep Thai contextual representation using WangchanBERTa (768 dimensions).
    """
    tokenizer, model = get_wangchanberta_model()
    if tokenizer is None or model is None or not text:
        return None
    try:
        import torch
        device = next(model.parameters()).device
        inputs = tokenizer(str(text), return_tensors="pt", truncation=True, max_length=256).to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            # Mean pooling over token embeddings
            cls_rep = outputs.last_hidden_state.mean(dim=1).squeeze().cpu().numpy()
            norm = np.linalg.norm(cls_rep)
            if norm > 0:
                cls_rep = cls_rep / norm
            return cls_rep
    except Exception as e:
        logger.error(f"Error extracting WangchanBERTa features: {e}")
        return None


def get_category_prototypes_wangchanberta() -> Dict[int, np.ndarray]:
    """
    Precomputes or caches WangchanBERTa embedding vectors for each category anchor.
    """
    global _CATEGORY_PROTOTYPES_WANGCHANBERTA
    if _CATEGORY_PROTOTYPES_WANGCHANBERTA is None:
        prototypes = {}
        for cat_id, anchor_text in CATEGORY_ANCHORS.items():
            feat = extract_wangchanberta_features(anchor_text)
            if feat is not None:
                prototypes[cat_id] = feat
        _CATEGORY_PROTOTYPES_WANGCHANBERTA = prototypes
    return _CATEGORY_PROTOTYPES_WANGCHANBERTA


def classify_with_wangchanberta(text: str, categories_list: List[Dict], threshold: float = 0.70) -> Dict[str, Any]:
    """
    Model 2: Multi-label classification using WangchanBERTa contextual representations.
    Returns:
      {
        "primary_category_id": int,
        "primary_category_name": str,
        "top_confidence": float,
        "routed_categories": list,
        "all_scores": list,
        "threshold_used": float
      }
    """
    if not text:
        cat = categories_list[0] if categories_list else {"category_id": 6, "category_name": "บริการทั่วไป / อื่นๆ"}
        return {
            "primary_category_id": cat["category_id"],
            "primary_category_name": cat["category_name"],
            "top_confidence": 0.50,
            "routed_categories": [cat],
            "all_scores": [],
            "threshold_used": threshold
        }

    # Build standard dictionary for categories
    cat_items = []
    for c in categories_list:
        cid = c.get("id") or c.get("category_id")
        cname = c.get("name") or c.get("category_name") or f"หมวดหมู่ที่ {cid}"
        cdesc = c.get("description") or ""
        cat_items.append({
            "category_id": int(cid),
            "category_name": str(cname),
            "description": str(cdesc)
        })

    tokenizer, model = get_wangchanberta_model()
    scores_dict = {}

    def clean_name(n):
        return (
            str(n)
            .replace("หมวด", "")
            .replace("หมู่", "")
            .replace("และ", "")
            .replace(" ", "")
            .replace("/", "")
            .lower()
        )

    # If Fine-Tuned Sequence Classification model is available, use direct Sigmoid Multi-Label inference
    if tokenizer is not None and model is not None and hasattr(model, "classifier"):
        try:
            import torch
            device = next(model.parameters()).device
            inputs = tokenizer(str(text), return_tensors="pt", truncation=True, max_length=128).to(device)
            with torch.no_grad():
                logits = model(**inputs).logits
                probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

            # Map model output labels (id2label) to active DB categories
            id2label = getattr(model.config, "id2label", {})
            for idx, prob in enumerate(probs):
                label_name = id2label.get(idx) or id2label.get(str(idx)) or f"Class_{idx}"
                clean_lbl = clean_name(label_name)
                
                # Match with DB category
                matched_cat = None
                for c in cat_items:
                    clean_c = clean_name(c["category_name"])
                    if clean_lbl in clean_c or clean_c in clean_lbl:
                        matched_cat = c
                        break
                    # Special alias matching (e.g., เทคโนโลยี vs ระบบเครือข่าย)
                    if "เทคโนโลยี" in clean_lbl and ("เครือข่าย" in clean_c or "ไอที" in clean_c or "เทคโนโลยี" in clean_c):
                        matched_cat = c
                        break
                
                if matched_cat:
                    cid = matched_cat["category_id"]
                    scores_dict[cid] = {
                        "category_id": cid,
                        "category_name": matched_cat["category_name"],
                        "confidence": round(float(prob), 4),
                        "score_percent": int(round(float(prob) * 100))
                    }
        except Exception as e:
            logger.warning(f"Direct sequence classification inference failed, falling back: {e}")

    # For ALL categories (especially new dynamic ones not in the 7 trained classes, e.g. สาธารณสุข):
    # Perform contextual keyword & description matching
    text_lower = str(text).lower()
    import re
    from app.services.ai_service import CATEGORY_INTENT_MAP

    for c in cat_items:
        cid = c["category_id"]
        cname = c["category_name"]
        cdesc = c["description"]
        
        match_score = 0.0
        
        # 1. Direct keywords from name
        name_words = [w for w in re.split(r'[\s,/\-\+]+', cname) if len(w) >= 2]
        for nw in name_words:
            if nw.lower() in text_lower:
                match_score += 4.0

        # 2. Keywords from category description/prompt
        if cdesc:
            desc_words = [w.strip() for w in re.split(r'[\s,./\-\(\)]+', cdesc) if len(w.strip()) >= 2]
            for dw in desc_words:
                if dw.lower() in text_lower:
                    match_score += 2.5

        # 3. Known high-priority phrases from CATEGORY_INTENT_MAP
        intent_info = CATEGORY_INTENT_MAP.get(cid, {})
        for phrase in intent_info.get("high_priority", []):
            if phrase.lower() in text_lower:
                match_score += 5.0
        for kw in intent_info.get("keywords", []):
            if kw.lower() in text_lower:
                match_score += 2.0

        if match_score >= 2.0:
            boosted = min(0.98, 0.72 + (match_score / (match_score + 2.0)) * 0.26)
            existing = scores_dict.get(cid)
            if existing:
                combined = max(existing["confidence"], round(boosted, 4))
                scores_dict[cid]["confidence"] = combined
                scores_dict[cid]["score_percent"] = int(round(combined * 100))
            else:
                scores_dict[cid] = {
                    "category_id": cid,
                    "category_name": cname,
                    "confidence": round(boosted, 4),
                    "score_percent": int(round(boosted * 100))
                }
        else:
            if cid in scores_dict and match_score == 0 and cid != 6:
                # Dampen ungrounded model predictions on short text if zero domain keywords match
                dampened = round(scores_dict[cid]["confidence"] * 0.55, 4)
                scores_dict[cid]["confidence"] = dampened
                scores_dict[cid]["score_percent"] = int(round(dampened * 100))
            elif cid not in scores_dict:
                scores_dict[cid] = {
                    "category_id": cid,
                    "category_name": cname,
                    "confidence": 0.05,
                    "score_percent": 5
                }

    scores = list(scores_dict.values())
    scores.sort(key=lambda x: x["confidence"], reverse=True)

    top_item = scores[0] if scores else {
        "category_id": 6, 
        "category_name": "บริการทั่วไป / อื่นๆ", 
        "confidence": 0.50, 
        "score_percent": 50
    }
    routed = [s for s in scores if s["confidence"] >= threshold and s["confidence"] >= 0.30]
    if not routed and scores:
        routed = [top_item]

    return {
        "primary_category_id": top_item["category_id"],
        "primary_category_name": top_item["category_name"],
        "top_confidence": top_item["confidence"],
        "routed_categories": routed,
        "all_scores": scores,
        "threshold_used": threshold
    }

    for cat_id, cat_name in cat_map.items():
        # Baseline WangchanBERTa semantic similarity
        sim = 0.0
        if text_feat is not None and cat_id in prototypes:
            sim = float(np.dot(text_feat, prototypes[cat_id]))
            # Scale from typical cosine range [0.3, 0.9] to probability [0.0, 1.0]
            sim = max(0.0, min(1.0, (sim - 0.25) / 0.55))

        # Domain Intent Booster
        from app.services.ai_service import CATEGORY_INTENT_MAP
        intent_info = CATEGORY_INTENT_MAP.get(cat_id, {})
        high_kws = intent_info.get("high_priority", [])
        general_kws = intent_info.get("keywords", [])

        kw_score = 0.0
        for kw in high_kws:
            if kw.lower() in text_lower:
                kw_score += 0.45
        for kw in general_kws:
            if kw.lower() in text_lower:
                kw_score += 0.20

        # Combined multi-label confidence score (WangchanBERTa context + domain intent)
        if kw_score > 0:
            final_score = min(0.98, max(sim * 0.40 + kw_score * 0.60, kw_score))
        else:
            final_score = min(0.95, sim)

        if final_score < 0.08:
            final_score = 0.02

        scores.append({
            "category_id": cat_id,
            "category_name": cat_name,
            "confidence": round(final_score, 4),
            "score_percent": int(round(final_score * 100))
        })

    scores.sort(key=lambda x: x["confidence"], reverse=True)

    top_item = scores[0] if scores else {
        "category_id": 6,
        "category_name": "บริการทั่วไป / อื่นๆ",
        "confidence": 0.50,
        "score_percent": 50
    }

    # Routed categories: all categories meeting the configured threshold
    routed = [s for s in scores if s["confidence"] >= threshold and s["confidence"] >= 0.30]
    if not routed and scores:
        routed = [top_item]

    return {
        "primary_category_id": top_item["category_id"],
        "primary_category_name": top_item["category_name"],
        "top_confidence": top_item["confidence"],
        "routed_categories": routed,
        "all_scores": scores,
        "threshold_used": threshold
    }
