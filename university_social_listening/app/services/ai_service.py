import os
import requests
import logging
import re
from typing import List, Dict, Optional, Any
from app.services.location_service import extract_location_pipeline

logger = logging.getLogger(__name__)

def get_typhoon_api_key():
    return os.getenv("TYPHOON_API_KEY", "")

def check_profanity(text: str) -> bool:
    """
    Analyzes Thai text for profanity, hate speech, or severe insults.
    Returns True if inappropriate, False if clean.
    """
    api_key = get_typhoon_api_key()
    
    # ── MOCK MODE (Fallback if no API key) ──
    if not api_key:
        logger.info("No TYPHOON_API_KEY found, using MOCK profanity check.")
        bad_words = ["สัส", "เหี้ย", "ควย", "อีช้างเย็ด", "มึง", "กู"]
        return any(word in text for word in bad_words)

    # ── REAL TYPHOON MODE ──
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    prompt = f"""
    คุณคือผู้คัดกรองเนื้อหาภาษาไทยที่เข้มงวด ตรวจสอบข้อความต่อไปนี้ว่ามีคำหยาบคาย, การใช้ประทุษวาจา (Hate speech), หรือเนื้อหาที่ไม่เหมาะสมอย่างรุนแรงหรือไม่
    ตอบแค่คำว่า "TRUE" หากมีเนื้อหาที่ไม่เหมาะสม หรือ "FALSE" หากข้อความนั้นสะอาดและปลอดภัย ห้ามพิมพ์อธิบายเพิ่มเติมใดๆ

    ข้อความ: {text}
    """
    try:
        payload = {
            "model": "typhoon-v2.5-30b-a3b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "max_tokens": 10
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            try:
                result = data["choices"][0]["message"]["content"].strip().upper()
                return "TRUE" in result
            except (KeyError, IndexError):
                pass
    except Exception as e:
        logger.error(f"AI check_profanity error: {e}")
        
    return False

def suggest_category(text: str, categories_list: List[Dict]) -> int:
    """
    Analyzes text and predicts the best category_id using the custom trained Machine Learning Model
    (PyThaiNLP + TF-IDF + LogisticRegression Classifier).
    """
    def _mock_suggest_category():
        logger.info("Using enhanced UP category suggestion algorithm.")
        text_str = str(text)

        rule_map = {
            31: ["รถเมล์", "รถเมล์มอ", "รถมอ", "รถไฟฟ้า", "รอรถ", "รอนาน", "รถเต็ม", "ป้ายรถเมล์", "คิวรถ", "ตารางรถ", "สายรถ", "ท่ารถ", "ไม่จอดรับ", "รถไม่มา", "รถติด", "รถเสีย", "รถมอเตอร์ไซค์", "รถเมล์สาย", "รถเมล์ไม่มา", "รถเมล์เสีย", "รถเมล์ติด", "รถเมล์เต็ม"],
            32: ["พัง", "ชำรุด", "ประตูพัง", "หลังคารั่ว", "ไฟดับ", "น้ำไม่ไหล", "แอร์ไม่เย็น", "เครื่องปรับอากาศ", "ลิฟต์ค้าง", "หลอดไฟขาด", "แอร์", "ประปา", "ลิฟต์"],
            33: ["สกปรก", "ขยะล้น", "เหม็น", "ถังขยะเต็ม", "ไม่ทำความสะอาด", "หญ้ารก", "กิ่งไม้หัก", "ต้นไม้ล้ม", "หมาจรจัด", "ทำความสะอาด"],
            34: ["ตารางเรียน", "วันสอบ", "เกรด", "หน่วยกิต", "วิชา", "ดรอปเรียน", "ติดต่ออาจารย์", "ขอสอบชดเชย", "อาจารย์"],
            35: ["ข้าว", "อาหาร", "กิน", "จาน", "ช้อน", "โรงอาหาร", "น้ำดื่ม", "ร้าน"],
            36: ["รถชน", "ขโมย", "อันตราย", "รปภ.", "หมวกกันน็อคหาย", "หมวกกันน็อกหาย", "จอดรถขวาง", "ทางมืด", "เปลี่ยว", "ไม่มีไฟกิ่ง", "รปภ"],
            37: ["เน็ตหลุด", "ไวไฟเข้าไม่ได้", "เน็ตช้า", "หลุดบ่อย", "ระบบล่ม", "เข้าเว็บไม่ได้", "ลืมรหัสผ่าน", "ลงทะเบียนไม่ได้"],
            38: ["ทุนการศึกษา", "กิจกรรม", "บัตรนิสิต", "สอบถามหน่อยครับ", "ขอคำแนะนำ", "อยากทราบว่า", "ของหาย", "ลืมของ", "ตามหาของ"]
        }

        scores = {cat_id: 0 for cat_id in rule_map}
        for cat_id, keywords in rule_map.items():
            for kw in keywords:
                if kw in text_str:
                    scores[cat_id] += 1

        max_score = max(scores.values())
        if max_score > 0:
            best_cat_id = max(scores, key=scores.get)
            if any(c["id"] == best_cat_id for c in categories_list):
                return best_cat_id

        for c in categories_list:
            if c["id"] == 38 or "เรื่องอื่นๆ" in c["name"]:
                return c["id"]

        return categories_list[0]["id"] if categories_list else 38

    # ── 1. CUSTOM TRAINED MACHINE LEARNING MODEL INFERENCE ──
    model_dir = os.path.join(os.path.dirname(__file__), "..", "ai_data", "models")
    model_path = os.path.join(model_dir, "category_model.pkl")
    vectorizer_path = os.path.join(model_dir, "tfidf_vectorizer.pkl")

    if os.path.exists(model_path) and os.path.exists(vectorizer_path):
        try:
            import joblib
            from pythainlp.tokenize import word_tokenize

            model = joblib.load(model_path)
            vectorizer = joblib.load(vectorizer_path)

            words = word_tokenize(str(text).strip().lower(), engine="newmm")
            tokenized_text = " ".join([w.strip() for w in words if w.strip()])

            X_vec = vectorizer.transform([tokenized_text])
            pred_id = int(model.predict(X_vec)[0])

            if any(c["id"] == pred_id for c in categories_list):
                logger.info(f"Custom ML Model predicted category_id={pred_id} for text: {text[:40]}")
                return pred_id
        except Exception as e:
            logger.error(f"Error in ML custom model suggest_category: {e}")

    # Fallback to rule matching if model is not yet loaded
    return _mock_suggest_category()

def generate_category_description(category_name: str, existing_description: str = None) -> str:
    """
    Calls AI to generate a comprehensive description for a given category name, 
    incorporating any existing description provided by the user.
    """
    api_key = get_typhoon_api_key()
    
    if not api_key:
        return f"ปัญหาที่เกี่ยวข้องกับ {category_name}"
        
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    
    context_str = f" แอดมินได้ระบุเค้าโครงเบื้องต้นไว้ดังนี้: '{existing_description}' ให้นำเค้าโครงนี้มาขยายความให้สมบูรณ์" if existing_description and existing_description.strip() else ""
    
    prompt = f"""
    คุณคือผู้เชี่ยวชาญด้านการจัดการปัญหาในมหาวิทยาลัย 
    ฉันกำลังจะสร้างหมวดหมู่ปัญหาใหม่ชื่อว่า "{category_name}"{context_str}
    ช่วยแต่งคำอธิบายว่าปัญหานี้ครอบคลุมเรื่องอะไรบ้าง เพื่อให้เจ้าหน้าที่และ AI เข้าใจตรงกัน 
    โดยมีเงื่อนไขดังนี้:
    1. เขียนเป็นประโยคบรรยายที่อ่านง่าย เป็นธรรมชาติ ความยาวประมาณ 1-2 ประโยค
    2. แทรกตัวอย่างคีย์เวิร์ดปัญหาที่เกี่ยวข้องลงไปอย่างกลมกลืน
    3. ห้ามใช้คำว่า "ครอบคลุมเรื่อง:" หรือ "คีย์เวิร์ด:" หรือสัญลักษณ์วงเล็บนำหน้าเด็ดขาด ให้แต่งเป็นประโยคปกติเลย
    ตัวอย่างเช่น: หมวดหมู่นี้ครอบคลุมปัญหาเกี่ยวกับการจราจรภายในมหาวิทยาลัย เช่น รถติด ที่จอดรถไม่เพียงพอ หรือเกิดอุบัติเหตุบนท้องถนน
    """
    
    try:
        payload = {
            "model": "typhoon-v2.5-30b-a3b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 150
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            try:
                result = data["choices"][0]["message"]["content"].strip()
                return result
            except (KeyError, IndexError):
                pass
    except Exception as e:
        logger.error(f"AI generate_category_description error: {e}")
        
    return f"(ครอบคลุมเรื่อง: ปัญหาที่เกี่ยวข้องกับ {category_name})"


def find_similar_problems(description: str, all_active_problems: List[Dict], category_id: int = None) -> List[Dict]:
    """
    Finds similar problems from a list of active problems based on description overlap.
    Returns a list of similar problems (up to 5).
    all_active_problems should be a list of dicts: [{"id": 1, "description": "...", "category_id": 1}]
    category_id: if provided, problems in the same category get a similarity boost.
    """
    if not description or not all_active_problems:
        return []

    import re
    
    def tokenize(text):
        if not text: return set()
        # Split on spaces, punctuation, and digit/Thai boundaries
        # e.g. "คอมห้อง1124" → ["คอมห้อง", "1124"]
        text = re.sub(r'([ก-๙])(\d)', r'\1 \2', text)
        text = re.sub(r'(\d)([ก-๙])', r'\1 \2', text)
        words = re.findall(r'[\w\u0e00-\u0e7f]+', text.lower())
        # Filter out too short words (allow 2+ chars for Thai)
        return set([w for w in words if len(w) >= 2])

    target_tokens = tokenize(description)
    if not target_tokens:
        return []

    scored_problems = []
    for p in all_active_problems:
        p_desc = p.get("description", "") or p.get("title", "")
        p_tokens = tokenize(p_desc)
        
        if not p_tokens:
            continue
            
        intersection = target_tokens.intersection(p_tokens)
        union = target_tokens.union(p_tokens)
        
        if not union:
            continue
            
        similarity = len(intersection) / len(union)

        # Boost score if same category (makes it much easier to match)
        if category_id and p.get("category_id") == category_id:
            similarity = max(similarity + 0.25, similarity * 2)

        # Lower threshold: 0.05 for same-category problems
        threshold = 0.05 if (category_id and p.get("category_id") == category_id) else 0.15
        if similarity > threshold:
            scored_problems.append({
                "problem": p,
                "score": similarity
            })

    # Sort by score descending
    scored_problems.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top 5
    return [item["problem"] for item in scored_problems[:5]]



def analyze_sentiment(description: str) -> Dict[str, str]:
    """
    Analyzes the sentiment and urgency of a problem description.
    Returns a dict with 'sentiment' and 'urgency'.
    """
    if not description:
        return {"sentiment": "neutral", "urgency": "normal"}

    api_key = get_typhoon_api_key()
    if not api_key:
        if "ด่วน" in description or "ไฟลุก" in description or "แตก" in description:
            return {"sentiment": "panicked", "urgency": "critical"}
        if "แย่" in description or "เบื่อ" in description or "โกรธ" in description:
            return {"sentiment": "angry", "urgency": "high"}
        return {"sentiment": "neutral", "urgency": "normal"}

    url = "https://api.opentyphoon.ai/v1/chat/completions"
    prompt = f"""วิเคราะห์ข้อความต่อไปนี้แล้วระบุระดับอารมณ์ (sentiment) และความเร่งด่วน (urgency)
ข้อความ: "{description}"

ตอบกลับเป็น JSON format เท่านั้น โดยมี 2 keys:
1. "sentiment": เลือกจาก (angry, panicked, sad, neutral, positive)
2. "urgency": เลือกจาก (critical, high, normal, low)

ตัวอย่างคำตอบ: {{"sentiment": "angry", "urgency": "high"}}"""

    try:
        payload = {
            "model": "typhoon-v2.5-30b-a3b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "max_tokens": 50,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            import json
            data = response.json()
            result_str = data["choices"][0]["message"]["content"].strip()
            result_json = json.loads(result_str)
            return {
                "sentiment": result_json.get("sentiment", "neutral"),
                "urgency": result_json.get("urgency", "normal")
            }
    except Exception as e:
        logger.error(f"AI analyze_sentiment error: {e}")
        
    return {"sentiment": "neutral", "urgency": "normal"}


def summarize_cluster(problems: List[Dict], category_name: str = "", location: str = "") -> str:
    """
    Generate a rule-based AI summary for a group of similar problems.
    """
    count = len(problems)
    if count == 0:
        return "ไม่มีข้อมูล"

    all_text = " ".join([p.get("description", "") or p.get("title", "") for p in problems])
    import re as _re
    keywords = _re.findall(r'[\u0e00-\u0e7f]{3,}', all_text)
    freq: Dict[str, int] = {}
    for w in keywords:
        freq[w] = freq.get(w, 0) + 1
    top_words = sorted(freq, key=lambda x: freq[x], reverse=True)[:3]
    keywords_str = " ".join(top_words) if top_words else category_name

    loc_str = f"บริเวณ{location}" if location else ""
    if count == 1:
        title = problems[0].get("title", keywords_str) or keywords_str
        return f"พบปัญหา: {title} {loc_str}".strip()
    return f"รวม {count} รายการ — {keywords_str} {loc_str} (หมวด: {category_name})".strip()


def auto_cluster_problem(problem_id: int, db) -> int | None:
    """
    After a problem is submitted, find similar problems and assign/create a cluster.
    Returns cluster_id or None if clustering failed.
    """
    import datetime as _dt
    try:
        from app.models import Problem, ProblemCluster, Category

        problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
        if not problem:
            return None

        others = db.query(Problem).filter(
            Problem.problem_id != problem_id,
            Problem.category_id == problem.category_id,
            Problem.is_deleted == False,
        ).all()

        dict_others = [
            {
                "id": p.problem_id,
                "description": p.description or p.title,
                "title": p.title,
                "category_id": p.category_id,
                "cluster_id": p.cluster_id,
                "building_name": p.building_name,
            }
            for p in others
        ]

        similar = find_similar_problems(
            problem.description or problem.title,
            dict_others,
            category_id=problem.category_id,
        )

        category = db.query(Category).filter(Category.category_id == problem.category_id).first()
        cat_name = category.category_name if category else ""
        location = problem.building_name or ""
        now = _dt.datetime.utcnow()

        if similar:
            first_similar_id = similar[0]["id"]
            first_prob = db.query(Problem).filter(Problem.problem_id == first_similar_id).first()
            if first_prob:
                target_parent = first_prob.parent_problem_id or first_prob.problem_id
                problem.parent_problem_id = target_parent

            existing_cluster_id = None
            for s in similar:
                s_prob = db.query(Problem).filter(Problem.problem_id == s["id"]).first()
                if s_prob and s_prob.cluster_id:
                    existing_cluster_id = s_prob.cluster_id
                    break

            if existing_cluster_id:
                cluster = db.query(ProblemCluster).filter(
                    ProblemCluster.cluster_id == existing_cluster_id
                ).first()
                if cluster:
                    problem.cluster_id = existing_cluster_id
                    cluster.post_count = (cluster.post_count or 1) + 1
                    cluster.last_posted_at = problem.created_at or now
                    all_cp = [
                        {"title": p.title, "description": p.description}
                        for p in db.query(Problem).filter(
                            Problem.cluster_id == existing_cluster_id,
                            Problem.is_deleted == False,
                        ).all()
                    ]
                    cluster.ai_summary = summarize_cluster(all_cp, cat_name, cluster.location_label or "")
                    db.commit()
                    return existing_cluster_id
            else:
                all_for_cluster = [
                    {"title": problem.title, "description": problem.description}
                ] + [{"title": s.get("title", ""), "description": s.get("description", "")} for s in similar]
                summary = summarize_cluster(all_for_cluster, cat_name, location)
                
                conf_score = round(0.88 + min(0.10, len(similar) * 0.03), 2)

                new_cluster = ProblemCluster(
                    category_id=problem.category_id,
                    ai_summary=summary,
                    location_label=location,
                    ai_confidence_score=conf_score,
                    post_count=len(similar) + 1,
                    first_posted_at=problem.created_at or now,
                    last_posted_at=problem.created_at or now,
                )
                db.add(new_cluster)
                db.flush()
                problem.cluster_id = new_cluster.cluster_id
                for s in similar:
                    s_prob = db.query(Problem).filter(Problem.problem_id == s["id"]).first()
                    if s_prob:
                        s_prob.cluster_id = new_cluster.cluster_id
                db.commit()
                return new_cluster.cluster_id
        else:
            summary = summarize_cluster(
                [{"title": problem.title, "description": problem.description}], cat_name, location
            )
            new_cluster = ProblemCluster(
                category_id=problem.category_id,
                ai_summary=summary,
                location_label=location,
                ai_confidence_score=0.95,
                post_count=1,
                first_posted_at=problem.created_at or now,
                last_posted_at=problem.created_at or now,
            )
            db.add(new_cluster)
            db.flush()
            problem.cluster_id = new_cluster.cluster_id
            db.commit()
            return new_cluster.cluster_id

    except Exception as e:
        logger.error(f"auto_cluster_problem error: {e}")
        return None

def resolve_map_image(text: str, location_name: str = "", force_check: bool = False) -> Optional[str]:
    combined = (text + " " + location_name).lower()
    
    default_keywords = [
        "อยู่ไหน", "อยู่ตรงไหน", "ไปยังไง", "ไปยังไงได้บ้าง", "ตั้งอยู่ตรงไหน", 
        "ไปอย่างไร", "ทางไหน", "ที่ไหน", "เส้นทาง", "ลงตรงไหน", "ขึ้นรถตรงไหน", 
        "ประตู", "ตึก", "อาคาร", "คณะ", "หอพัก", "แผนผัง", "แผนที่", "ส่งเอกสาร",
        "สงวน", "ict", "ไอซีที", "สาธิต", "อธิการ", "พญางำเมือง", "วิทย์", "วิทย", "ดีวิทย", "วิศวะ",
        "พยาบาล", "เภสัช", "แพทยศาสตร์", "นิติ", "ศิลปศาสตร์", "วิทยาการจัดการ",
        "สหเวช", "ทันตะ", "เกษตร", "ศูนย์การแพทย์", "รพ.มพ", "หอสมุด", "อุบาลี",
        "ตึกรวม", "อาคารเรียนรวม", "เรียนรวม", "อาคารบรรยายรวม", "ce", "ub", "pk"
    ]
    
    map_url = "/static/campus_map.jpg"
    
    try:
        from app.database import SessionLocal
        from app.models import LLMSetting
        db = SessionLocal()
        setting = db.query(LLMSetting).first()
        db.close()
        
        if setting:
            if setting.is_auto_map_enabled is False:
                return None
            if setting.map_trigger_keywords and isinstance(setting.map_trigger_keywords, list):
                default_keywords = [str(k).lower() for k in setting.map_trigger_keywords]
            if setting.default_map_image_url:
                map_url = setting.default_map_image_url
    except Exception as err:
        logger.error(f"Error querying LLMSetting in resolve_map_image: {err}")
    
    if not force_check:
        is_location_query = any(k in combined for k in default_keywords)
        if not is_location_query:
            return None

    if map_url and map_url.startswith("/static/"):
        rel = map_url.lstrip("/")
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        abs_path = os.path.join(base_dir, rel)
        if not os.path.exists(abs_path):
            map_url = "/static/campus_map.jpg"
        
    return map_url

# ============================================================================
# CHAT / ISSUE INTAKE
# Updated flow:
# 1) Collect facts from the whole conversation.
# 2) Backend validates required fields (WHAT + a sufficiently specific WHERE).
# 3) If data is missing, ask only for the missing information.
# 4) DO NOT generate/fill the formal description while data is incomplete.
# 5) When complete, synthesize one formal description from facts the user
#    actually provided. Do not invent cause, time, location or impact.
# ============================================================================

_ISSUE_KW = [
    "เสีย", "พัง", "ชำรุด", "เสียงดัง", "ไฟดับ", "ไฟไม่ติด", "ดับ", "ล่ม",
    "น้ำรั่ว", "น้ำไม่ไหล", "แอร์", "เน็ต", "wifi", "ไวไฟ", "ขยะ", "เหม็น",
    "แตก", "รั่ว", "แจ้ง", "รบกวน", "ไม่เย็น", "ใช้งานไม่ได้", "หลุด",
    "รถเมล์ไม่มี", "รถไม่มา", "รถเมล์ไม่มา", "รอรถ", "เก้าอี้", "โต๊ะ",
    "โปรเจคเตอร์", "ปลั๊ก", "คอม", "ไมค์", "ลำโพง"
]

_INQUIRY_ASK_KW = [
    "ไปทางไหน", "อยู่ไหน", "อยู่ตรงไหน", "ไปยังไง", "ไปอย่างไร", "ทางไป",
    "อยู่ที่ไหน", "ที่ไหน", "ขอแผนที่", "แผนผัง", "เส้นทาง", "ลงตรงไหน",
    "ขึ้นรถตรงไหน"
]

_ROOM_PROBLEM_KW = [
    "ห้อง", "ห้องเรียน", "เก้าอี้", "แอร์", "คอม", "คอมพิวเตอร์", "ปลั๊ก",
    "โปรเจคเตอร์", "โต๊ะ", "กระดาน", "ไมค์", "ลำโพง", "ไฟ", "ไฟดับ"
]

_BUS_PROBLEM_KW = [
    "รถเมล์", "รถมพ", "รถ มพ", "รถประจำทาง", "รถสาย", "สาย 1", "สาย 2",
    "รอรถ", "ป้ายรถ", "รถไม่มา", "รถเมล์ไม่มา", "รถเมล์ไม่มี"
]

_UP_LOCATION_KW = [
    "ict", "ไอซีที", "วิทย์", "วิทยาศาสตร์", "วิศวะ", "วิศวกรรม", "สงวน",
    "เรียนรวม", "บรรยายรวม", "อธิการ", "พญางำเมือง", "โรงพยาบาล", "รพ",
    "หอพัก", "บพ", "up dorm", "หอสมุด", "อุบาลี", "สาธิต", "เกษตร",
    "พยาบาล", "เภสัช", "แพทยศาสตร์", "นิติ", "ศิลปศาสตร์", "วิทยาการจัดการ",
    "สหเวช", "ทันตะ", "ศูนย์การแพทย์", "สนามกีฬา", "สนาม", "โรงอาหาร",
    "ประตู 1", "ประตู 2", "ประตู 3", "ประตู1", "ประตู2", "ประตู3",
    "ประตูหนึ่ง", "ประตูสอง", "ประตูสาม", "ce", "ub", "pk"
]

_UP_TIME_KW = [
    "ตอนนี้", "ขณะนี้", "วันนี้", "เมื่อวาน", "เมื่อเช้า", "เมื่อคืน",
    "ช่วงเช้า", "ช่วงบ่าย", "ช่วงเย็น", "ช่วงดึก", "ช่วงสอบ", "ตอนสอบ",
    "คาบเช้า", "คาบบ่าย", "ตอนเรียน", "คาบเรียน", "ตอนเที่ยง",
    "บ่ายสอง", "บ่ายสาม", "บ่าย 2", "บ่าย 3"
]


def _clean_text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _all_user_text(messages: List[Dict[str, str]]) -> str:
    return " ".join(
        _clean_text(m.get("content", ""))
        for m in messages
        if m.get("role") == "user"
    ).strip()


def _is_pure_location_inquiry(text: str) -> bool:
    lower = _clean_text(text).lower()
    has_issue = any(k in lower for k in _ISSUE_KW)
    asks_direction = any(k in lower for k in _INQUIRY_ASK_KW)
    return asks_direction and not has_issue


def _is_room_problem(text: str) -> bool:
    lower = _clean_text(text).lower()
    return any(k in lower for k in _ROOM_PROBLEM_KW)


def _is_bus_problem(text: str) -> bool:
    lower = _clean_text(text).lower()
    return any(k in lower for k in _BUS_PROBLEM_KW)


def _has_room_or_floor(text: str) -> bool:
    """
    A generic word 'ห้องเรียน' is NOT enough, but user stating they don't know
    or indicating general area ('ไม่ทราบ', 'ไม่รู้', 'ไม่แน่ใจ', 'บริเวณทั่วไป', 'รอบตึก')
    satisfies the requirement so intake can finish.
    """
    lower = _clean_text(text).lower()
    dont_know_kw = [
        "ไม่ทราบ", "ไม่รู้", "ไม่แน่ใจ", "ทั่วไป", "บริเวณทั่วไป",
        "พื้นที่ทั่วไป", "รอบตึก", "รอบอาคาร", "หน้าตึก", "ข้างตึก",
        "ไม่มี", "ไม่ได้ระบุ"
    ]
    if any(k in lower for k in dont_know_kw):
        return True

    return bool(
        re.search(r'ห้อง\s*[a-zA-Zก-๙]*\s*\d+[a-zA-Z]?', lower)
        or re.search(r'ชั้น\s*\d+', lower)
        or re.search(r'\b[a-z]{1,4}[-_\s]?\d{3,4}\b', lower)
    )


def _has_known_building(text: str) -> bool:
    lower = _clean_text(text).lower()
    return any(k in lower for k in _UP_LOCATION_KW)


def _has_specific_time(text: str) -> bool:
    lower = _clean_text(text).lower()
    return (
        any(k in lower for k in _UP_TIME_KW)
        or bool(re.search(r'\d{1,2}[:.]\d{2}', lower))
        or bool(re.search(r'\d{1,2}\s*โมง', lower))
        or bool(re.search(r'\d{1,2}\s*น\.', lower))
    )


def _extract_room_or_floor(text: str) -> str:
    text = _clean_text(text)
    patterns = [
        r'ห้อง\s*[a-zA-Zก-๙]*\s*\d+[a-zA-Z]?',
        r'ชั้น\s*\d+',
        r'\b[a-zA-Z]{1,4}[-_\s]?\d{3,4}\b',
    ]
    found = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            value = re.sub(r'\s+', ' ', m.group(0)).strip()
            if value and value not in found:
                found.append(value)
    return " ".join(found).strip()


def _rule_extract_issue(messages: List[Dict[str, str]]) -> Dict[str, str]:
    """
    Offline fallback only.
    It reads the ENTIRE conversation and extracts what it can without inventing facts.
    """
    text = _all_user_text(messages)
    lower = text.lower()

    what = ""
    what_rules = [
        (["เก้าอี้", "เสียงดัง"], "เก้าอี้บางตัวมีเสียงดังขณะใช้งาน"),
        (["ไฟดับ"], "ไฟดับ"),
        (["ไฟไม่ติด"], "ไฟ/แสงสว่างไม่ทำงาน"),
        (["แอร์", "ไม่เย็น"], "เครื่องปรับอากาศไม่เย็น"),
        (["แอร์", "เสีย"], "เครื่องปรับอากาศชำรุด"),
        (["เน็ต"], "Wi-Fi / อินเทอร์เน็ตใช้งานไม่ได้"),
        (["wifi"], "Wi-Fi / อินเทอร์เน็ตใช้งานไม่ได้"),
        (["ไวไฟ"], "Wi-Fi / อินเทอร์เน็ตใช้งานไม่ได้"),
        (["รถเมล์", "ไม่มี"], "ไม่มีรถเมล์ มพ. ให้บริการ"),
        (["รถเมล์", "ไม่มา"], "รถเมล์ มพ. ไม่มาตามจุดที่รอ"),
        (["น้ำ", "รั่ว"], "น้ำรั่ว"),
        (["น้ำ", "ไม่ไหล"], "น้ำประปาไม่ไหล"),
        (["เสียงดัง"], "มีเสียงดังรบกวน"),
    ]
    for required, label in what_rules:
        if all(k in lower for k in required):
            what = label
            break

    if not what:
        # Keep the user's actual words rather than inventing a richer problem.
        first_user = next(
            (_clean_text(m.get("content", "")) for m in messages if m.get("role") == "user" and _clean_text(m.get("content", ""))),
            ""
        )
        what = first_user[:120]

    where_parts = []

    # Known campus place names mentioned by user
    location_patterns = [
        ("ict", "อาคาร ICT"),
        ("ไอซีที", "อาคาร ICT"),
        ("สงวน", "อาคารสงวนเสริมศรี"),
        ("เรียนรวม", "อาคารเรียนรวม"),
        ("บรรยายรวม", "อาคารบรรยายรวม"),
        ("วิศวะ", "คณะวิศวกรรมศาสตร์"),
        ("วิศวกรรม", "คณะวิศวกรรมศาสตร์"),
        ("วิทยาศาสตร์", "คณะวิทยาศาสตร์"),
        ("วิทย์", "คณะวิทยาศาสตร์"),
        ("หอสมุด", "ศูนย์บรรณสารและการเรียนรู้"),
        ("โรงอาหาร", "โรงอาหาร"),
        ("ประตู 2", "ประตู 2"),
        ("ประตู2", "ประตู 2"),
        ("ประตู 1", "ประตู 1"),
        ("ประตู1", "ประตู 1"),
        ("ประตู 3", "ประตู 3"),
        ("ประตู3", "ประตู 3"),
    ]
    for key, label in location_patterns:
        if key in lower and label not in where_parts:
            where_parts.append(label)

    room_floor = _extract_room_or_floor(text)
    if room_floor:
        where_parts.append(room_floor)

    where = " ".join(where_parts).strip()

    when = ""
    for kw in _UP_TIME_KW:
        if kw in lower:
            when = kw
            break
    if not when:
        m = re.search(r'\d{1,2}[:.]\d{2}', lower) or re.search(r'\d{1,2}\s*โมง', lower)
        if m:
            when = m.group(0)

    impact = ""
    impact_patterns = [
        "รบกวนการเรียนการสอน",
        "กระทบการเรียนการสอน",
        "ไม่สามารถเรียนได้",
        "รบกวนการสอบ",
        "กระทบการสอบ",
        "ไม่สามารถใช้งานได้",
        "เสี่ยงอันตราย",
        "เกิดอันตราย",
    ]
    for phrase in impact_patterns:
        if phrase in lower:
            impact = phrase
            break

    return {
        "what": what,
        "where": where,
        "when": when,
        "who": "",
        "how": "",
        "why": "",
        "impact": impact,
    }


def _validate_issue(issue: Dict[str, str], combined_user_text: str) -> List[str]:
    """
    5W1H Intake Validation:
    Primary 3 W's (Must Have):
      1. What (เกิดอะไรขึ้น / ปัญหา)
      2. Where (เกิดที่ไหน / สถานที่ อาคาร ห้อง)
      3. When (เกิดเมื่อไหร่ / ช่วงเวลา)

    Secondary 2W1H (Optional - Who, Why, How):
      - Who (ใครได้รับผลกระทบ)
      - Why (สาเหตุ)
      - How / Impact (อย่างไร / ผลกระทบ)
    """
    issue = issue or {}
    what = _clean_text(issue.get("what"))
    where = _clean_text(issue.get("where"))
    when = _clean_text(issue.get("when"))

    all_text = f"{combined_user_text} {what} {where} {when}".lower()

    missing = []

    # 1. Primary 3 W's Check
    if not what or what in {"ไม่ระบุ", "ไม่แน่ใจ"}:
        missing.append("what")

    has_bldg = _has_known_building(all_text)
    has_rm = _has_room_or_floor(all_text)
    has_specific_location = bool(where) and (has_bldg or has_rm or len(where) >= 4)
    if not has_specific_location:
        missing.append("where")

    if not when or when in {"ไม่ระบุ", "ไม่แน่ใจ"}:
        # Check if user text has any time keywords or numbers
        has_time = _has_specific_time(all_text) or any(k in all_text for k in _UP_TIME_KW) or bool(re.search(r'\d{1,2}[:.]\d{2}|\d{1,2}\s*น|\d{1,2}\s*โมง|เที่ยง|เมื่อ', all_text))
        if not has_time:
            missing.append("when")

    return missing


def _build_followup_reply(
    issue: Dict[str, str],
    missing: List[str],
    combined_user_text: str
) -> str:
    what = _clean_text(issue.get("what"))
    where = _clean_text(issue.get("where"))
    when = _clean_text(issue.get("when"))

    ack_items = []
    if what:
        ack_items.append(f"เรื่อง **{what}**")
    if where:
        ack_items.append(f"บริเวณ **{where}**")
    if when:
        ack_items.append(f"เวลา **{when}**")

    ack_prefix = f"ระบบรับทราบข้อมูล{' '.join(ack_items)}แล้วครับ\n\n" if ack_items else ""

    if "what" in missing:
        return "ขอทราบรายละเอียดปัญหาเพิ่มเติมครับ ปัญหาที่พบคืออะไรหรือมีอาการอย่างไรบ้างครับ? (What)"

    if "where" in missing:
        if _is_bus_problem(f"{combined_user_text} {what}"):
            return (
                f"{ack_prefix}"
                "ขอทราบจุดที่รอรถหรือป้ายรถเมล์ที่เกิดปัญหาเพิ่มเติมครับ "
                "เช่น ป้าย ICT ป้ายหน้าอาคารเรียนรวม หรือประตู 2 (Where)"
            )
        return (
            f"{ack_prefix}"
            "ขอทราบสถานที่เกิดเหตุเพิ่มเติมครับ เช่น ชื่อคณะ/อาคาร บริเวณ หรือจุดสังเกต (Where)"
        )

    if "when" in missing:
        return (
            f"{ack_prefix}"
            "ขอทราบช่วงเวลาที่พบเหตุการณ์เพิ่มเติมครับ เช่น เกิดเมื่อไหร่ หรือเวลาไหนครับ? (When - หากไม่ทราบ พิมพ์ 'ไม่ทราบ' ได้ครับ)"
        )

    if "secondary_2w1h" in missing:
        return (
            f"{ack_prefix}"
            "ขอสอบถามข้อมูลเพิ่มเติมอีก 3 ส่วน (Who, Why, How):\n"
            "• เกิดกับใคร/มีใครได้รับผลกระทบไหมครับ?\n"
            "• พอทราบสาเหตุหรือลักษณะอาการเพิ่มเติมไหมครับ?\n"
            "(หากไม่ทราบ สามารถพิมพ์ 'ไม่ทราบ' หรือ 'ข้าม' เพื่อจบการซักถามได้เลยครับ)"
        )

    return f"{ack_prefix}ขอทราบข้อมูลเพิ่มเติมเกี่ยวกับปัญหาอีกเล็กน้อยครับ"


def _build_ready_reply(issue: Dict[str, str]) -> str:
    what = _clean_text(issue.get("what"))
    where = _clean_text(issue.get("where"))
    when = _clean_text(issue.get("when"))
    who = _clean_text(issue.get("who"))
    why = _clean_text(issue.get("why"))
    how = _clean_text(issue.get("how")) or _clean_text(issue.get("impact"))

    lines = [
        "ขอบคุณครับ! ผมรวบรวมข้อมูล 5W1H สำหรับแจ้งปัญหาให้ครบถ้วนแล้ว",
        "",
        f"• What (เกิดอะไรขึ้น): {what or 'ไม่ได้ระบุ'}",
        f"• Where (เกิดที่ไหน): {where or 'ไม่ได้ระบุ'}",
        f"• When (เกิดเมื่อไหร่): {when or 'ไม่ได้ระบุ'}",
    ]
    if who:
        lines.append(f"• Who (เกิดกับใคร): {who}")
    if why:
        lines.append(f"• Why (สาเหตุ): {why}")
    if how:
        lines.append(f"• How (อย่างไร/ผลกระทบ): {how}")

    lines.extend([
        "",
        "ระบบรวบรวมข้อมูลและนำรายละเอียดสรุปไปใส่ในฟอร์มด้านล่างเรียบร้อยแล้วครับ!"
    ])
    return "\n".join(lines)


def _safe_json_from_llm(content: str) -> Dict:
    import json

    content = _clean_text(content)
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return json.loads(content.strip())


CATEGORY_KEYWORD_MAP = {
    "อาคารสถานที่/สิ่งอำนวยความสะดวก": [
        "ไฟดับ", "ไฟพัง", "ไฟเสีย", "หลอดไฟ", "ปลั๊กไฟ", "ปลั๊ก", "แอร์", "แอร์ไม่เย็น", "แอร์เสีย", 
        "น้ำไม่ไหล", "ท่อรั่ว", "ชักโครก", "ห้องน้ำ", "ประตู", "หน้าต่าง", "อาคาร", "ตึก", "ลิฟต์", 
        "พัดลม", "เพดาน", "หลังคารั่ว", "น้ำรั่ว", "ตึกเรียนรวม", "สิ่งอำนวยความสะดวก"
    ],
    "การเดินทาง/รถเมล์": [
        "รถเมล์", "รถบัส", "ป้ายรถ", "ป้ายรถเมล์", "สาย 1", "สาย 2", "ที่จอดรถ", "ลานจอดรถ", 
        "ขับเร็ว", "รถกอล์ฟ", "รถรับส่ง", "การเดินทาง", "ตั๋วรถ"
    ],
    "อุปกรณ์การเรียน/ห้องเรียน": [
        "โปรเจคเตอร์", "โปรเจกเตอร์", "โต๊ะ", "เก้าอี้", "ไมค์", "ไมโครโฟน", "กระดาน", "จอมอนิเตอร์", 
        "ลำโพง", "อุปกรณ์การเรียน", "ห้องเรียน"
    ],
    "ระบบเทคโนโลยี/อินเทอร์เน็ต": [
        "wifi", "wi-fi", "อินเทอร์เน็ต", "เน็ต", "เน็ตช้า", "เน็ตล่ม", "reg", "เว็บไซต์", 
        "ระบบลงทะเบียน", "ล็อกอิน", "เข้าไม่ได้", "up connect"
    ],
    "ความสะอาด/ขยะ": [
        "ขยะ", "ถังขยะ", "ขยะเต็ม", "กลิ่นเหม็น", "สกปรก", "รอยเปื้อน", "ฝุ่น", "เศษอาหาร"
    ],
    "ความปลอดภัย/เหตุฉุกเฉิน": [
        "งู", "สัตว์มีพิษ", "อุบัติเหตุ", "ของหาย", "ขโมย", "ไฟไหม้", "ควัน", "รปภ.", "กล้องวงจรปิด", 
        "อันตราย", "ฉุกเฉิน"
    ]
}


def _classify_category_by_keywords(text: str) -> Optional[str]:
    if not text:
        return None
    lower = text.lower()
    for cat_name, keywords in CATEGORY_KEYWORD_MAP.items():
        if any(kw in lower for kw in keywords):
            return cat_name
    return None


def _normalize_cat_string(s: str) -> str:
    if not s:
        return ""
    s_clean = re.sub(r'\s*/\s*', '/', str(s).lower().strip())
    s_clean = re.sub(r'\s+', ' ', s_clean)
    return s_clean


def get_matching_prompt_rules(text: str, category_id: Optional[int] = None, category_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Matches active category_prompt_rules from LLMSetting by Category / Semantic Context.
    Super Admin only sets Target Categories (no manual keywords required).
    Returns matched guidelines and attached image URLs.
    """
    guidances = []
    image_urls = []
    matched_questions = []
    if not text and not category_id and not category_name:
        return {"guidances": [], "image_urls": [], "matched_questions": [], "primary_image": None}

    lower_text = (text or "").lower()
    norm_input_cat = _normalize_cat_string(category_name)

    try:
        from app.database import SessionLocal
        from app.models import LLMSetting
        db = SessionLocal()
        setting = db.query(LLMSetting).first()
        db.close()

        if setting and getattr(setting, "category_prompt_rules", None):
            rules = setting.category_prompt_rules
            if isinstance(rules, list):
                for r in rules:
                    if not isinstance(r, dict):
                        continue
                    if r.get("is_active", True) is False:
                        continue
                    
                    cat_ids = r.get("category_ids", [])
                    cat_names = r.get("category_names", [])
                    norm_rule_cats = [_normalize_cat_string(c) for c in cat_names if c]
                    guidance = r.get("guidance_prompt", "").strip()
                    img_url = r.get("image_url", "").strip()

                    # Match rule if:
                    # 1. Category list is empty -> Global rule for all categories
                    # 2. category_id matches cat_ids
                    # 3. category_name matches any cat_names
                    # 4. Any target category name terms match user text semantically
                    is_match = False
                    if not cat_ids and not cat_names:
                        is_match = True
                    elif category_id and isinstance(cat_ids, list) and category_id in cat_ids:
                        is_match = True
                    elif norm_input_cat and any(norm_c in norm_input_cat or norm_input_cat in norm_c for norm_c in norm_rule_cats):
                        is_match = True
                    elif isinstance(cat_names, list) and len(cat_names) > 0:
                        for c_name in cat_names:
                            c_lower = str(c_name).lower()
                            parts = [p.strip() for p in re.split(r'[/,_\s]+', c_lower) if len(p.strip()) >= 2]
                            if any(p in lower_text for p in parts):
                                is_match = True
                                break

                    # Also check legacy keywords if present
                    legacy_kws = r.get("keywords", [])
                    if not is_match and isinstance(legacy_kws, list) and len(legacy_kws) > 0:
                        if any(str(kw).lower() in lower_text for kw in legacy_kws if str(kw).strip()):
                            is_match = True

                    if is_match:
                        if guidance and guidance not in guidances:
                            guidances.append(guidance)
                        if img_url and img_url not in image_urls:
                            image_urls.append(img_url)
                        
                        # Collect question script steps
                        questions = r.get("questions", [])
                        if isinstance(questions, list):
                            for q in questions:
                                if isinstance(q, dict) and q.get("question_text"):
                                    matched_questions.append({
                                        "question_text": q.get("question_text", "").strip(),
                                        "image_url": q.get("image_url", "").strip()
                                    })
    except Exception as err:
        logger.error(f"Error in get_matching_prompt_rules: {err}")

    return {
        "guidances": guidances,
        "image_urls": image_urls,
        "matched_questions": matched_questions,
        "primary_image": image_urls[0] if image_urls else (matched_questions[0]["image_url"] if matched_questions and matched_questions[0].get("image_url") else None)
    }


def _call_issue_intake_llm(messages: List[Dict[str, str]]) -> Optional[Dict]:
    """
    LLM is used as an extractor/conversation helper.
    It is NOT allowed to decide that a report is complete by itself.
    Backend validation runs afterwards.
    """
    api_key = get_typhoon_api_key()
    if not api_key:
        return None

    user_combined = " ".join(_clean_text(m.get("content", "")) for m in messages if m.get("role") == "user")
    rule_info = get_matching_prompt_rules(user_combined)

    system_prompt = """
คุณคือ AI Issue Intake Assistant ของระบบ UP Smart Issue มหาวิทยาลัยพะเยา

หน้าที่หลัก:
- อ่านบทสนทนาทั้งหมด ไม่ใช่เฉพาะข้อความล่าสุด
- รวบรวมข้อเท็จจริงที่ผู้ใช้แจ้งไว้ในหลายข้อความให้ต่อเนื่องกัน
- แยกข้อมูลเป็น what, where, when, who, how, why, impact
- ห้ามเดา ห้ามเติมสาเหตุ สถานที่ เวลา ผลกระทบ หรือข้อมูลอื่นที่ผู้ใช้ไม่ได้บอก
- ถ้าผู้ใช้ตอบข้อมูลเพิ่มเติม เช่น "ห้อง 1102" ให้เชื่อมกับปัญหาที่คุยก่อนหน้า
- คำว่า "ห้องเรียน" อย่างเดียว ยังไม่ใช่สถานที่ที่เจาะจง
- ถ้าผู้ใช้บอกหมายเลขห้อง เช่น "ห้อง 1102" ให้เก็บเป็น where ได้
- when เป็นข้อมูลเสริม ไม่จำเป็นต้องเดา หากไม่ได้บอกให้เป็นสตริงว่าง
- impact หากไม่ได้บอกให้เป็นสตริงว่าง
- why หากไม่ได้บอกให้เป็นสตริงว่าง

ตัวอย่าง:
ผู้ใช้: "เก้าอี้บางตัวในห้องเรียนเสียงดังเวลาใช้งาน ทำให้รบกวนการเรียนการสอน"
ผล:
what = "เก้าอี้บางตัวมีเสียงดังขณะใช้งาน"
where = "ห้องเรียน"
impact = "รบกวนการเรียนการสอน"

ต่อมาผู้ใช้: "ห้อง 1102"
ผลใหม่:
what = "เก้าอี้บางตัวมีเสียงดังขณะใช้งาน"
where = "ห้อง 1102"
impact = "รบกวนการเรียนการสอน"

หากเป็นคำถามสถานที่ เช่น "ICT อยู่ตรงไหน" และไม่มีการแจ้งปัญหา:
is_inquiry = true

ตอบ STRICTLY เป็น JSON เท่านั้น:
{
  "issue": {
    "what": "",
    "where": "",
    "when": "",
    "who": "",
    "how": "",
    "why": "",
    "impact": ""
  },
  "category": {
    "name": "Other",
    "confidence": 0.0
  },
  "is_inquiry": false,
  "reply": ""
}
""".strip()

    if rule_info.get("guidances"):
        extra_rules = "\n".join(f"- {g}" for g in rule_info["guidances"])
        system_prompt += f"\n\nคำแนะนำและกติกาเพิ่มเติมสำหรับหมวดหมู่ที่เกี่ยวข้อง:\n{extra_rules}"

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        api_messages.append({
            "role": msg.get("role", "user"),
            "content": _clean_text(msg.get("content", ""))
        })

    try:
        response = requests.post(
            "https://api.opentyphoon.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "typhoon-v2.5-30b-a3b-instruct",
                "messages": api_messages,
                "temperature": 0.0,
                "max_tokens": 700,
                "response_format": {"type": "json_object"},
            },
            timeout=15,
        )
        if response.status_code != 200:
            logger.error(f"Typhoon intake API error: {response.text}")
            return None

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        return _safe_json_from_llm(content)

    except Exception as e:
        logger.error(f"Error calling Typhoon intake API: {e}")
        return None


def _answer_location_inquiry(messages: List[Dict[str, str]]) -> Dict:
    """
    Pure location inquiry. This branch never creates a ticket and never fills
    the issue description field.
    """
    combined = _all_user_text(messages)
    lower = combined.lower()

    # Deterministic fallback/guide for common campus places.
    if "วิทย์" in lower or "วิทยาศาสตร์" in lower:
        reply = (
            "คณะวิทยาศาสตร์ (หมายเลข 14 บนแผนผัง) อยู่บริเวณโซนศูนย์กลางของมหาวิทยาลัยพะเยา "
            "ใกล้อาคารเรียนรวมและอาคารบรรยายรวม สามารถใช้รถเมล์ มพ. สาย 1 หรือสาย 2 "
            "และลงบริเวณหน้าอาคารเรียนรวมได้ครับ 📍"
        )
    elif "ict" in lower or "ไอซีที" in lower:
        reply = (
            "คณะเทคโนโลยีสารสนเทศและการสื่อสาร หรืออาคาร ICT (หมายเลข 1 บนแผนผัง) "
            "อยู่บริเวณโซนใจกลางมหาวิทยาลัยพะเยาครับ สามารถใช้รถเมล์ มพ. สาย 1 หรือสาย 2 "
            "เพื่อเดินทางเข้ามายังโซนกลางมหาวิทยาลัยได้ครับ 📍"
        )
    elif "สงวน" in lower:
        reply = (
            "อาคารสงวนเสริมศรี (หมายเลข 27 บนแผนผัง) อยู่บริเวณประตู 2 "
            "ใกล้โรงเรียนสาธิตมหาวิทยาลัยพะเยา สามารถใช้รถเมล์ มพ. สาย 2 "
            "และลงบริเวณหน้าอาคารได้ครับ 📍"
        )
    elif any(k in lower for k in ["ตึกรวม", "อาคารเรียนรวม", "เรียนรวม", "บรรยายรวม"]):
        reply = (
            "อาคารเรียนรวมและอาคารบรรยายรวมอยู่ในโซนศูนย์กลางของมหาวิทยาลัยพะเยา "
            "ใกล้คณะวิทยาศาสตร์และหอสมุด สามารถใช้รถเมล์ มพ. สาย 1 หรือสาย 2 "
            "และลงบริเวณหน้าอาคารเรียนรวมได้ครับ 📍"
        )
    else:
        reply = (
            "สถานที่ดังกล่าวอยู่ภายในมหาวิทยาลัยพะเยาครับ "
            "สามารถดูตำแหน่งจากผังแนะนำสถานที่และใช้รถเมล์ มพ. สาย 1 หรือสาย 2 "
            "ตามเส้นทางที่ใกล้ที่สุดได้ครับ 📍"
        )

    map_img = resolve_map_image(combined, force_check=True)

    result = {
        "status": "needs_more_info",
        "issue": {
            "what": "",
            "where": "",
            "when": "",
            "who": "",
            "how": "",
            "why": "",
            "impact": ""
        },
        "category": {"name": "Other", "confidence": 0.0},
        "missing_fields": [],
        "next_question": "",
        "ready_for_ticket": False,
        "is_complete": False,
        "is_inquiry": True,
        "intent": "location_inquiry",
        "reply": reply,
        # IMPORTANT: keep description empty so Frontend does not fill the form.
        "extracted_data": {
            "title": "",
            "description": "",
            "category_name": "",
            "location": ""
        }
    }

    if map_img:
        result["map_image"] = map_img
        result["extracted_data"]["map_image"] = map_img

def _check_category_correction(user_text: str) -> Optional[str]:
    """
    Checks if the user explicitly specifies or corrects a category in their chat message.
    """
    if not user_text:
        return None
    text_lower = user_text.lower()
    known_cats = [
        "การเดินทาง/รถเมล์", "การเดินทาง", "รถเมล์",
        "อุปกรณ์การเรียน/ห้องเรียน", "อุปกรณ์การเรียน", "ห้องเรียน",
        "อาคารสถานที่/สิ่งอำนวยความสะดวก", "อาคารสถานที่", "สิ่งอำนวยความสะดวก",
        "ระบบเทคโนโลยี/อินเทอร์เน็ต", "อินเทอร์เน็ต", "เทคโนโลยี",
        "ความสะอาด/ขยะ", "ความสะอาด", "ขยะ",
        "ความปลอดภัย/เหตุฉุกเฉิน", "ความปลอดภัย", "เหตุฉุกเฉิน"
    ]
    if any(k in text_lower for k in ["ไม่ใช่", "เปลี่ยนเป็น", "แก้เป็น", "หมวด", "หมวดหมู่"]):
        for cat in known_cats:
            if cat.lower() in text_lower:
                return cat
    return None


def handle_chat_report(messages: List[Dict[str, str]]) -> dict:
    """
    Main chat intake function.

    IMPORTANT BEHAVIOR:
    - Reads the whole conversation.
    - Does not fill extracted_data.description until the report is ready.
    - For room/classroom issues, generic "ห้องเรียน" is not enough.
    - Asks only for missing data.
    - Time is optional.
    - Final description is synthesized from user-provided facts only.
    """
    combined_user_text = _all_user_text(messages)

    if not combined_user_text:
        return {
            "status": "needs_more_info",
            "issue": {
                "what": "", "where": "", "when": "",
                "who": "", "how": "", "why": "", "impact": ""
            },
            "category": {"name": "Other", "confidence": 0.0},
            "missing_fields": ["what", "where"],
            "next_question": "กรุณาเล่าปัญหาที่พบให้ผมทราบได้เลยครับ",
            "ready_for_ticket": False,
            "is_complete": False,
            "is_inquiry": False,
            "intent": "report_issue",
            "reply": "กรุณาเล่าปัญหาที่พบให้ผมทราบได้เลยครับ",
            "extracted_data": {
                "title": "",
                "description": "",
                "category_name": "",
                "location": ""
            }
        }

    # Pure location questions are handled separately.
    if _is_pure_location_inquiry(combined_user_text):
        return _answer_location_inquiry(messages)

    # 1) Ask LLM to extract facts. If unavailable/fails, use rule fallback.
    llm_data = _call_issue_intake_llm(messages)

    if llm_data and isinstance(llm_data.get("issue"), dict):
        issue = {
            key: _clean_text(llm_data["issue"].get(key, ""))
            for key in ["what", "where", "when", "who", "how", "why", "impact"]
        }
        category = llm_data.get("category") if isinstance(llm_data.get("category"), dict) else {}
    else:
        issue = _rule_extract_issue(messages)
        category = {"name": "Other", "confidence": 0.0}

    # 2) Backend validation is authoritative.
    user_msgs = [m for m in messages if m.get("role") == "user"]
    user_msg_count = len(user_msgs)

    missing_fields = _validate_issue(issue, combined_user_text)

    latest_msg = messages[-1].get("content", "").strip().lower() if messages else ""
    dont_know_terms = ["ไม่ทราบ", "ไม่รู้", "ไม่แน่ใจ", "ทั่วไป", "บริเวณทั่วไป", "พื้นที่ทั่วไป", "รอบตึก"]
    user_indicated_dont_know = any(k in latest_msg for k in dont_know_terms)

    # Force complete if user answered 2+ turns and we have core issue & location
    if (user_msg_count >= 2 or user_indicated_dont_know) and issue.get("what") and (issue.get("where") or _has_known_building(combined_user_text)):
        missing_fields = []

    ready = len(missing_fields) == 0

    # 3) Base response. description MUST stay empty while incomplete.
    result = {
        "status": "ready" if ready else "needs_more_info",
        "issue": issue,
        "category": {
            "name": _clean_text(category.get("name")) or "Other",
            "confidence": category.get("confidence", 0.0) or 0.0,
        },
        "missing_fields": missing_fields,
        "next_question": "",
        "ready_for_ticket": ready,
        "is_complete": ready,
        "is_inquiry": False,
        "intent": "report_issue",
        "reply": "",
        "extracted_data": {
            "title": "",
            "description": "",  # NEVER fill before ready
            "category_name": "",
            "location": _clean_text(issue.get("where")),
        }
    }

    # Explicitly prevent stale map data on issue reports.
    result.pop("map_image", None)
    result["extracted_data"].pop("map_image", None)

    # Check for Category Question Script (Super Admin Sequential Questions)
    cat_name = _clean_text(category.get("name")) or ""
    if not cat_name or cat_name == "Other":
        keyword_cat = _classify_category_by_keywords(combined_user_text)
        if keyword_cat:
            cat_name = keyword_cat
            result["category"]["name"] = cat_name
    
    # Check if user explicitly corrects or specifies a category in their latest message
    latest_user_text = messages[-1].get("content", "").strip() if messages else ""
    user_cat_correction = _check_category_correction(latest_user_text)
    if user_cat_correction:
        cat_name = user_cat_correction
        result["category"]["name"] = cat_name

    rule_info = get_matching_prompt_rules(combined_user_text, category_name=cat_name)
    script_questions = rule_info.get("matched_questions", [])

    user_msgs = [m for m in messages if m.get("role") == "user"]
    user_msg_count = len(user_msgs)

    # Attach primary rule image if available
    if rule_info.get("primary_image"):
        rule_img = rule_info["primary_image"]
        result["rule_image"] = rule_img
        result["map_image"] = rule_img
        result["extracted_data"]["rule_image"] = rule_img
        result["extracted_data"]["map_image"] = rule_img

    # Check if user already provided building/location
    has_user_provided_where = bool(issue.get("where")) or _has_known_building(combined_user_text)

    # Handle sequential question script from Super Admin (Skip if building is already provided)
    if script_questions and len(script_questions) > 0 and not has_user_provided_where:
        q_index = user_msg_count - 1
        if q_index < len(script_questions):
            q_item = script_questions[q_index]
            q_text = q_item["question_text"]
            q_img = q_item.get("image_url")

            if user_cat_correction:
                followup = f"ระบบรับทราบการปรับแก้ไขหมวดหมู่เป็น **{cat_name}** เรียบร้อยครับ\n\nเพื่อความรวดเร็ว {q_text}"
            elif q_index == 0:
                cat_display = f" (จัดอยู่ในหมวดหมู่: **{cat_name}**)" if cat_name and cat_name != "Other" else ""
                followup = f"ระบบรับทราบปัญหา{issue.get('what') or 'ที่แจ้ง'}ครับ{cat_display}\n\nเพื่อความรวดเร็ว {q_text}"
            else:
                followup = f"ขอบคุณสำหรับข้อมูลครับ แล้ว{q_text}"

            result["status"] = "needs_more_info"
            result["ready_for_ticket"] = False
            result["is_complete"] = False
            result["next_question"] = followup
            result["reply"] = followup

            if q_img:
                result["rule_image"] = q_img
                result["map_image"] = q_img
                result["extracted_data"]["rule_image"] = q_img
                result["extracted_data"]["map_image"] = q_img

            return result
        else:
            ready = True
            result["status"] = "ready"
            result["ready_for_ticket"] = True
            result["is_complete"] = True

    if not ready:
        followup = _build_followup_reply(issue, missing_fields, combined_user_text)
        result["next_question"] = followup
        result["reply"] = followup
        return result

    # 4) Data is complete enough -> synthesize one final factual description.
    what = _clean_text(issue.get("what"))
    where = _clean_text(issue.get("where"))
    when = _clean_text(issue.get("when"))
    impact = _clean_text(issue.get("impact"))

    formal_description = synthesize_formal_report_description(
        what=what,
        where=where,
        when=when,
        impact=impact,
        full_chat_text=combined_user_text,
    )

    result["reply"] = _build_ready_reply(issue)
    result["next_question"] = ""
    result["extracted_data"]["title"] = f"{what} ({where})".strip()
    result["extracted_data"]["description"] = formal_description
    result["extracted_data"]["location"] = where

    # 5) Location normalization (only after ready, so it cannot fabricate a
    #    location to make an incomplete report look complete).
    try:
        if where and where not in {"ไม่ระบุ", "ไม่แน่ใจ"}:
            loc_data = extract_location_pipeline(where)
            if isinstance(loc_data, dict):
                # Preserve the user's concrete room/floor text if the pipeline
                # only returns a generic/empty location.
                normalized_location = _clean_text(loc_data.get("location_name"))
                if normalized_location:
                    result["extracted_data"]["location"] = normalized_location
                result["extracted_data"]["latitude"] = loc_data.get("latitude")
                result["extracted_data"]["longitude"] = loc_data.get("longitude")
                result["extracted_data"]["location_confidence"] = loc_data.get("confidence", 0.0)
                result["extracted_data"]["needs_location_confirmation"] = loc_data.get("needs_confirmation", False)
    except Exception as loc_err:
        logger.error(f"Location pipeline error in handle_chat_report: {loc_err}")

    # 6) Category suggestion from the FULL gathered issue.
    try:
        from app.database import SessionLocal
        from app.models import Category

        db_cat = SessionLocal()
        try:
            cats_db = db_cat.query(Category).filter(Category.is_active == True).all()
            cat_list = [
                {
                    "id": c.category_id,
                    "name": c.category_name,
                    "description": c.description
                }
                for c in cats_db
            ]
        finally:
            db_cat.close()

        if cat_list:
            category_text = f"{what} {where} {impact} {combined_user_text}"
            sug_cat_id = suggest_category(category_text, cat_list)
            matched_c = next((c for c in cat_list if c["id"] == sug_cat_id), None)

            if matched_c:
                result["extracted_data"]["category_id"] = sug_cat_id
                result["extracted_data"]["category_name"] = matched_c["name"]
                result["category"] = {
                    "name": matched_c["name"],
                    "confidence": 0.90
                }
    except Exception as cat_err:
        logger.error(f"Category suggestion error in handle_chat_report: {cat_err}")

    return result


def synthesize_formal_report_description(
    what: str,
    where: str,
    when: str = "",
    impact: str = "",
    full_chat_text: str = ""
) -> str:
    """
    Builds the final problem description ONLY after intake is complete enough.

    Safety rule:
    Use only facts explicitly gathered from the user.
    Do not invent cause, time, location, impact, people, severity, or repair details.
    """
    what = _clean_text(what)
    where = _clean_text(where)
    when = _clean_text(when)
    impact = _clean_text(impact)
    full_chat_text = _clean_text(full_chat_text)

    api_key = get_typhoon_api_key()

    if api_key:
        prompt = f"""
คุณคือ AI ผู้ช่วยเรียบเรียง "รายละเอียดปัญหา" สำหรับระบบ UP Smart Issue มหาวิทยาลัยพะเยา

ข้อมูลที่ผู้ใช้แจ้งจริง:
- ปัญหา: {what or "ไม่ได้ระบุ"}
- สถานที่: {where or "ไม่ได้ระบุ"}
- ช่วงเวลา: {when or "ผู้ใช้ไม่ได้ระบุ"}
- ผลกระทบ: {impact or "ผู้ใช้ไม่ได้ระบุ"}

ข้อความจากผู้ใช้ทั้งหมด:
{full_chat_text}

หน้าที่:
นำเฉพาะข้อเท็จจริงที่ผู้ใช้แจ้งจริงมารวมและเรียบเรียงเป็นรายละเอียดปัญหาภาษาไทย
ที่สุภาพ ชัดเจน และพร้อมส่งต่อให้เจ้าหน้าที่

ข้อห้ามสำคัญ:
1. ห้ามเดาหรือเพิ่มสาเหตุของปัญหา
2. ห้ามเพิ่มสถานที่ที่ผู้ใช้ไม่ได้แจ้ง
3. ห้ามเพิ่มช่วงเวลาที่ผู้ใช้ไม่ได้แจ้ง
4. ห้ามเพิ่มผลกระทบที่ผู้ใช้ไม่ได้แจ้ง
5. ห้ามเพิ่มระดับความรุนแรงหรือความเร่งด่วนเอง
6. ถ้าข้อมูลใดไม่ได้ระบุ ให้ตัดส่วนนั้นออก ไม่ต้องแต่งเติม
7. อนุญาตให้เติมเฉพาะถ้อยคำเชื่อมเชิงภาษา เช่น "พบปัญหา", "จึงขอแจ้งเจ้าหน้าที่เข้าตรวจสอบและแก้ไข"
8. ตอบเพียงประโยครายละเอียดปัญหา 1 ประโยคเท่านั้น

ตัวอย่าง:
ข้อมูล:
ปัญหา = เก้าอี้บางตัวมีเสียงดังขณะใช้งาน
สถานที่ = ห้อง 1102
ผลกระทบ = รบกวนการเรียนการสอน

คำตอบ:
พบปัญหาเก้าอี้บางตัวภายในห้อง 1102 มีเสียงดังขณะใช้งาน ส่งผลรบกวนการเรียนการสอน จึงขอแจ้งเจ้าหน้าที่เข้าตรวจสอบและแก้ไข
""".strip()

        try:
            res = requests.post(
                "https://api.opentyphoon.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "typhoon-v2.5-30b-a3b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 300,
                },
                timeout=10,
            )

            if res.status_code == 200:
                expanded = _clean_text(
                    res.json()["choices"][0]["message"]["content"]
                )
                if expanded.startswith('"') and expanded.endswith('"'):
                    expanded = expanded[1:-1].strip()
                if expanded:
                    return expanded
            else:
                logger.error(f"Typhoon synthesize API error: {res.text}")

        except Exception as e:
            logger.error(f"Error in synthesize_formal_report_description: {e}")

    # Deterministic fallback: no invented facts.
    sentence = f"พบปัญหา{what}" if what else "พบปัญหาที่ผู้ใช้แจ้ง"

    if where:
        sentence += f" บริเวณ{where}"

    if when:
        sentence += f" ในช่วง{when}"

    if impact:
        # Avoid awkward double "ส่งผล" when impact already contains it.
        if impact.startswith("ส่งผล"):
            sentence += f" {impact}"
        else:
            sentence += f" ส่งผล{impact}"

    sentence += " จึงขอแจ้งเจ้าหน้าที่เข้าตรวจสอบและแก้ไข"
    return sentence.strip()


def expand_description(text: str) -> str:
    """
    Manual 'ให้ AI ช่วยเขียน' helper.

    IMPORTANT:
    This function is for an EXPLICIT user action such as pressing a
    'ให้ AI ช่วยเขียน' button. It must NOT be used automatically after every
    chat message.

    It improves wording but is instructed not to invent factual details.
    """
    text = _clean_text(text)
    if not text:
        return ""

    api_key = get_typhoon_api_key()

    if not api_key:
        return f"รายงานแจ้งเรื่อง{text} เพื่อให้หน่วยงานที่เกี่ยวข้องรับทราบและดำเนินการตรวจสอบต่อไป"

    prompt = f"""
คุณคือ AI ผู้ช่วยเรียบเรียงข้อความภาษาไทยสำหรับแบบฟอร์มของมหาวิทยาลัย

หน้าที่:
ปรับข้อความสั้นของผู้ใช้ให้เป็นประโยคที่สุภาพ เป็นทางการ และอ่านเข้าใจง่าย
โดยรักษาความหมายเดิม

ข้อห้าม:
- ห้ามแต่งข้อเท็จจริงใหม่
- ห้ามเดาสาเหตุ
- ห้ามเดาสถานที่
- ห้ามเดาเวลา
- ห้ามเดาผลกระทบ
- ถ้าข้อความสั้นมาก ให้ขยายเฉพาะรูปประโยค ไม่เพิ่มข้อเท็จจริงเฉพาะเจาะจง

ตัวอย่าง:
ข้อความเดิม: "ประชุม"
ข้อความเรียบเรียง: "เพื่อเดินทางไปปฏิบัติราชการ ณ สถานที่ปลายทาง ในเรื่อง ประชุม"

ข้อความเดิม: "ห้องเรียนไฟดับ"
ข้อความเรียบเรียง: "รายงานพบปัญหาไฟดับภายในห้องเรียน จึงขอแจ้งหน่วยงานที่เกี่ยวข้องเข้าตรวจสอบและดำเนินการแก้ไข"

ข้อความเดิม:
"{text}"

ตอบเฉพาะข้อความที่เรียบเรียงแล้ว 1 ประโยค:
""".strip()

    try:
        response = requests.post(
            "https://api.opentyphoon.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "typhoon-v2.5-30b-a3b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 300,
            },
            timeout=15,
        )

        if response.status_code != 200:
            logger.error(f"Typhoon expand_description API error: {response.text}")
        response.raise_for_status()

        content = _clean_text(
            response.json()["choices"][0]["message"]["content"]
        )
        if content.startswith('"') and content.endswith('"'):
            content = content[1:-1].strip()
        return content or text

    except Exception as e:
        logger.error(f"expand_description error: {e}")
        return text