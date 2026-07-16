import os
import requests
import logging
import re
from typing import List, Dict

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
    Analyzes the text and suggests the best category_id from the specific categories defined in our database.
    """
    api_key = get_typhoon_api_key()
    
    def _mock_suggest_category():
        logger.info("Using MOCK category suggestion (or falling back due to API failure).")
        text_lower = text.lower()
        def match_cat(keywords, target_cat_keywords):
            if any(w in text_lower for w in keywords):
                for c in categories_list:
                    if any(k in c["name"] for k in target_cat_keywords):
                        return c["id"]
            return None
        res = match_cat(["รถ", "รถเมล์", "ที่จอด", "มอไซ", "วิน", "ขับ", "ติด"], ["รถ", "จราจร"])
        if res: return res
        res = match_cat(["แอร์", "ไฟ", "น้ำ", "ห้องน้ำ", "ตึก", "อาคาร", "ซ่อม", "ประตู", "หน้าต่าง", "พัง", "เน็ต", "wifi", "ชำรุด"], ["อาคาร", "สถานที่", "ซ่อม"])
        if res: return res
        res = match_cat(["ขยะ", "สกปรก", "เหม็น", "เลอะ", "ฝุ่น"], ["สะอาด", "ขยะ"])
        if res: return res
        res = match_cat(["ข้าว", "อาหาร", "กิน", "จาน", "ช้อน", "โรงอาหาร", "น้ำดื่ม", "ร้าน"], ["อาหาร", "โรงอาหาร"])
        if res: return res
        res = match_cat(["เรียน", "เกรด", "อาจารย์", "ลงทะเบียน", "วิชา", "ครู", "สอน", "สอบ", "คะแนน"], ["เรียน", "วิชา", "การศึกษา"])
        if res: return res
        res = match_cat(["หมา", "แมว", "สัตว์", "จรจัด", "งู", "มืด", "น่ากลัว", "ขโมย", "โจร", "ยาม"], ["ปลอดภัย", "รปภ", "สัตว์"])
        if res: return res
        return categories_list[0]["id"] if categories_list else None

    # ── MOCK MODE (Fallback if no API key) ──
    if not api_key:
        return _mock_suggest_category()

    # ── REAL TYPHOON MODE ──
    # Include description and any imported training data
    categories_str_parts = []
    save_dir = os.path.join(os.path.dirname(__file__), "..", "ai_data", "categories")
    for c in categories_list:
        cat_str = f"ID: {c['id']} - ชื่อหมวดหมู่: {c['name']} (คำอธิบาย: {c.get('description', 'ไม่มี')})"
        # Check for training data
        training_path = os.path.join(save_dir, f"{c['id']}_training.csv")
        if os.path.exists(training_path):
            try:
                with open(training_path, "r", encoding="utf-8") as f:
                    samples = [line.strip() for line in f.read().splitlines() if line.strip()][:5] # limit to 5 lines
                if samples:
                    cat_str += f" ตัวอย่างเคสปัญหาที่มักอยู่ในหมวดหมู่นี้: {', '.join(samples)}"
            except Exception:
                pass
        categories_str_parts.append(cat_str)
        
    categories_str = "\n".join(categories_str_parts)
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    
    # Read prompt from file
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "ai_data", "category_prompt.txt")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_template = f.read()
    except FileNotFoundError:
        # Fallback inline prompt if file not found
        prompt_template = """คุณคือผู้ช่วยคัดแยกหมวดหมู่ปัญหาของมหาวิทยาลัยพะเยา (UP Connect) 
จงอ่านรายละเอียดปัญหาต่อไปนี้ แล้วเลือกหมวดหมู่ที่เหมาะสมที่สุด "จากรายการที่กำหนดให้เท่านั้น"

รายการหมวดหมู่ที่มีในระบบของเรา:
{categories_str}

รายละเอียดปัญหาที่นิสิตแจ้งเข้ามา:
"{text}"

ตอบมาเฉพาะตัวเลข ID ของหมวดหมู่ที่ถูกต้องที่สุดเพียงตัวเลขเดียว ห้ามมีตัวอักษรอื่นปนเด็ดขาด"""

    prompt = prompt_template.format(categories_str=categories_str, text=text)
    
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
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            try:
                result = data["choices"][0]["message"]["content"].strip()
                match = re.search(r'\d+', result)
                if match:
                    suggested_id = int(match.group())
                    if any(c["id"] == suggested_id for c in categories_list):
                        return suggested_id
            except (KeyError, IndexError):
                pass
    except Exception as e:
        logger.error(f"AI suggest_category error: {e}")
    
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
        # Mock behavior
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


# ──────────────────────────────────────────────
# Cluster AI Summary (Rule-based template)
# ──────────────────────────────────────────────

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
                new_cluster = ProblemCluster(
                    category_id=problem.category_id,
                    ai_summary=summary,
                    location_label=location,
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
