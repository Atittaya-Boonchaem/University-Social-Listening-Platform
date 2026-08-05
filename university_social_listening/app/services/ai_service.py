import os
import requests
import logging
import re
from typing import List, Dict, Optional
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
    Analyzes the text and suggests the best category_id from the specific categories defined in our database.
    """
    api_key = get_typhoon_api_key()
    
    def _mock_suggest_category():
        logger.info("Using enhanced UP category suggestion algorithm.")
        text_lower = text.lower()

        # 1. อาคารสถานที่ / สิ่งอำนวยความสะดวก (Category ID 32)
        build_kw = ["แอร์", "ไฟ", "ไฟฟ้า", "ไฟดับ", "น้ำ", "ท่อ", "ห้องน้ำ", "ตึก", "อาคาร", "ซ่อม", "ประตู", "หน้าต่าง", "พัง", "ชำรุด", "ปลั๊ก", "ดับ", "ช็อต", "ce", "pk", "ub", "ict"]
        if any(w in text_lower for w in build_kw) and not any(w in text_lower for w in ["เน็ต", "wifi", "ไวไฟ"]):
            for c in categories_list:
                if c["id"] == 32 or "อาคาร" in c["name"]:
                    return c["id"]

        # 2. ระบบเครือข่าย / Wi-Fi UP Connect (Category ID 37)
        net_kw = ["เน็ต", "wifi", "ไวไฟ", "ล่ม", "ระบบ", "web", "เว็บ", "อินเทอร์เน็ต"]
        if any(w in text_lower for w in net_kw):
            for c in categories_list:
                if c["id"] == 37 or "เครือข่าย" in c["name"] or "wi-fi" in c["name"].lower():
                    return c["id"]

        # 3. การเดินทาง / รถเมล์มพ. (Category ID 31)
        travel_kw = ["รถ", "รถเมล์", "ขส", "ที่จอด", "มอไซ", "วิน", "ขับ", "จราจร", "สองแถว", "สาย 1", "สาย 2"]
        if any(w in text_lower for w in travel_kw):
            for c in categories_list:
                if c["id"] == 31 or "การเดินทาง" in c["name"] or "รถ" in c["name"]:
                    return c["id"]

        # 4. ความสะอาด / สิ่งแวดล้อม (Category ID 33)
        clean_kw = ["ขยะ", "สกปรก", "เหม็น", "เลอะ", "ฝุ่น", "ถังขยะ"]
        if any(w in text_lower for w in clean_kw):
            for c in categories_list:
                if c["id"] == 33 or "ความสะอาด" in c["name"]:
                    return c["id"]

        # 5. การเรียนการสอน / การลงทะเบียน Reg UP (Category ID 34)
        reg_kw = ["เรียน", "เกรด", "อาจารย์", "ลงทะเบียน", "วิชา", "ครู", "สอน", "สอบ", "คะแนน", "reg"]
        if any(w in text_lower for w in reg_kw):
            for c in categories_list:
                if c["id"] == 34 or "เรียน" in c["name"] or "ลงทะเบียน" in c["name"]:
                    return c["id"]

        # 6. โรงอาหาร / ร้านค้าบริการ (Category ID 35)
        food_kw = ["ข้าว", "อาหาร", "กิน", "จาน", "ช้อน", "โรงอาหาร", "น้ำดื่ม", "ร้าน"]
        if any(w in text_lower for w in food_kw):
            for c in categories_list:
                if c["id"] == 35 or "อาหาร" in c["name"]:
                    return c["id"]

        # 7. ความปลอดภัย / รปภ. / สัตว์ในบริเวณมพ. (Category ID 36)
        sec_kw = ["หมา", "แมว", "สัตว์", "จรจัด", "งู", "มืด", "น่ากลัว", "ขโมย", "โจร", "ยาม", "รปภ"]
        if any(w in text_lower for w in sec_kw):
            for c in categories_list:
                if c["id"] == 36 or "ปลอดภัย" in c["name"] or "รปภ" in c["name"]:
                    return c["id"]

        for c in categories_list:
            if c["id"] == 38 or "เรื่องอื่นๆ" in c["name"]:
                return c["id"]

        return categories_list[0]["id"] if categories_list else 38

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

def resolve_map_image(text: str, location_name: str = "") -> Optional[str]:
    combined = (text + " " + location_name).lower()
    
    default_keywords = [
        "อยู่ไหน", "อยู่ตรงไหน", "ไปยังไง", "ไปยังไงได้บ้าง", "ตั้งอยู่ตรงไหน", 
        "ไปอย่างไร", "ทางไหน", "ที่ไหน", "เส้นทาง", "ลงตรงไหน", "ขึ้นรถตรงไหน", 
        "ประตู", "ตึก", "อาคาร", "คณะ", "หอพัก", "แผนผัง", "แผนที่", "ส่งเอกสาร",
        "สงวน", "ict", "ไอซีที", "สาธิต", "อธิการ", "พญางำเมือง", "วิทย์", "วิศวะ",
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
    
    is_location_query = any(k in combined for k in default_keywords)
    if not is_location_query:
        return None
        
    return map_url

def handle_chat_report(messages: List[Dict[str, str]]) -> dict:
    """
    Analyzes a chat conversation for reporting a problem or responding to inquiries about campus locations.
    Determines if enough information is gathered, asks follow-up questions if not,
    or extracts the problem data if complete. Also attaches location map images when needed.
    """
    user_messages = [m.get("content", "") for m in messages if m.get("role") == "user"]
    combined_user_text = " ".join(user_messages)

    api_key = get_typhoon_api_key()
    
    # Fallback/Mock mode when no API key is available
    if not api_key:
        map_img = resolve_map_image(combined_user_text)
        is_inquiry = map_img is not None or any(k in combined_user_text for k in ["ไปยังไง", "อยู่ตรงไหน", "อยู่ที่ไหน", "ทางไหน", "ที่ไหน", "ตึกรวม", "เรียนรวม"])
        
        if "วิทย์" in combined_user_text:
            reply_msg = "คณะวิทยาศาสตร์ (หมายเลข 14 บนแผนผัง) ตั้งอยู่ที่โซนศูนย์กลางของมหาวิทยาลัยพะเยา ใกล้กับอาคารเรียนรวมและอาคารบรรยายรวม สามารถเดินทางมาได้โดยใช้รถเมล์ มพ. สาย 1 หรือสาย 2 ลงที่ป้ายหน้าอาคารบรรยายรวม แล้วเดินต่อไปยังคณะวิทยาศาสตร์ได้เลยครับ 📍"
        elif "ict" in combined_user_text.lower() or "ไอซีที" in combined_user_text:
            reply_msg = "คณะเทคโนโลยีสารสนเทศและการสื่อสาร (หมายเลข 1 บนแผนผัง) ตั้งอยู่โซนใจกลางมหาวิทยาลัยพะเยาครับ สามารถเดินทางมาโดยเริ่มจากประตู 2 แล้วนั่งรถเมล์ มพ. สาย 1 หรือ สาย 2 เข้ามายังโซนกลาง campus จะพบตึก ICT อยู่ทางด้านขวาของเส้นทางหลักครับ 📍"
        elif "สงวน" in combined_user_text:
            reply_msg = "อาคารสงวนเสริมศรี (หมายเลข 27 บนแผนผัง) ตั้งอยู่บริเวณประตู 2 มหาวิทยาลัยพะเยา ใกล้กับโรงเรียนสาธิตมหาวิทยาลัยพะเยา สามารถนั่งรถเมล์ มพ. สาย 2 ลงหน้าอาคารสงวนเสริมศรี ได้เลยครับ 📍"
        elif any(k in combined_user_text for k in ["ตึกรวม", "อาคารเรียนรวม", "เรียนรวม", "บรรยายรวม"]):
            reply_msg = "อาคารเรียนรวมและอาคารบรรยายรวม (โซนศูนย์กลาง ใกล้หมายเลข 14 บนแผนผัง) ตั้งอยู่ใจกลางมหาวิทยาลัยพะเยา ใกล้กับคณะวิทยาศาสตร์และหอสมุด สามารถนั่งรถเมล์ มพ. สาย 1 หรือ สาย 2 มาลงป้ายหน้าอาคารเรียนรวมได้เลยครับ 📍"
        else:
            reply_msg = "ขอบคุณสำหรับข้อมูลครับ ระบบได้ปักพิกัดและเตรียมนำข้อมูลลงในแบบฟอร์มให้เรียบร้อยแล้วครับ 🎉" if not is_inquiry else "สถานที่ดังกล่าวตั้งอยู่ในบริเวณมหาวิทยาลัยพะเยา สามารถเดินทางโดยนั่งรถเมล์ มพ. สาย 1 หรือ สาย 2 ตามผังแนะนำสถานที่ได้เลยครับ 📍"
            
        res = {
            "is_complete": True,
            "is_inquiry": is_inquiry,
            "reply": reply_msg,
            "extracted_data": {
                "title": combined_user_text[:40] if len(combined_user_text) > 40 else combined_user_text,
                "description": combined_user_text,
                "category_name": "การเดินทาง / รถเมล์มพ.",
                "location": "คณะวิทยาศาสตร์" if "วิทย์" in combined_user_text else ("อาคารเรียนรวม (ตึกรวม)" if any(k in combined_user_text for k in ["ตึกรวม", "เรียนรวม"]) else ("คณะเทคโนโลยีสารสนเทศและการสื่อสาร" if ("ict" in combined_user_text.lower() or "ไอซีที" in combined_user_text) else ("อาคารสงวนเสริมศรี" if "สงวน" in combined_user_text else "บริเวณภายในมหาวิทยาลัยพะเยา")))
            }
        }
        if map_img:
            res["map_image"] = map_img
            res["extracted_data"]["map_image"] = map_img
        return res

    from app.database import SessionLocal
    from app.models import LLMSetting
    
    db = SessionLocal()
    setting = db.query(LLMSetting).first()
    db.close()
    
    persona = setting.chatbot_persona if setting and setting.chatbot_persona else "คุณคือผู้ช่วย AI UP Connect ประจำมหาวิทยาลัยพะเยา ที่เป็นมิตร สุภาพ มีไหวพริบ คอยแนะนำเส้นทาง สถานที่ และช่วยรับเรื่องแจ้งปัญหา"
    
    system_prompt = f"""{persona}
คุณคือผู้ช่วยปัญญาประดิษฐ์ระบบ UP Connect ของมหาวิทยาลัยพะเยา (University of Phayao)

**คู่มือผังแนะนำสถานที่ 29 จุดในมหาวิทยาลัยพะเยา (Official 29 UP Campus Map Guide):**
1. คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ตึก ICT / ไอซีที) - โซนใจกลาง มพ.
2. หอประชุมพญางำเมือง - โซนบริหาร
3. อาคารสำนักงานอธิการบดี - โซนบริหาร
4. ศูนย์การแพทย์และโรงพยาบาล มหาวิทยาลัยพะเยา - โซนหน้า มพ.
5. คณะทันตแพทยศาสตร์
6. คณะพลังงานและสิ่งแวดล้อม
7. คณะวิศวกรรมศาสตร์
8. คณะสหเวชศาสตร์
9. คณะเภสัชศาสตร์
10. คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์
11. คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ
12. คณะแพทยศาสตร์
13. คณะพยาบาลศาสตร์
14. คณะวิทยาศาสตร์ (ตึกวิทย์ / อาคารเรียนรวม / ตึกรวม / อาคารบรรยายรวม) - โซนศูนย์กลาง ใกล้อาคารเรียนรวมและอาคารบรรยายรวม
15. คณะวิทยาศาสตร์การแพทย์
16. คณะศิลปศาสตร์
17. ศูนย์บรรณสารและการเรียนรู้ (หอสมุด)
18. อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์
19. คณะนิติศาสตร์
20. คณะวิทยาการจัดการและสารสนเทศศาสตร์
21. วิทยาลัยการศึกษา
22. ศูนย์หนังสืออุบลพัธ
23. คณะรัฐศาสตร์และสังคมศาสตร์
24. หอนิสิต UP Dorm
25. หอนิสิต (บพ. 1-18)
26. สนามกีฬา
27. อาคารสงวนเสริมศรี (ประตู 2 / ที่ส่งเอกสาร) - บริเวณประตู 2 ใกล้โรงเรียนสาธิตฯ
28. โรงเรียนสาธิตมหาวิทยาลัยพะเยา - บริเวณประตู 2
29. พระพุทธภุชการักษ์

**การจำแนกประเภทและการตอบคำถาม:**
- **หากผู้ใช้ถามสถานที่ / เส้นทาง / การไปส่งเอกสาร / ถามหาตึก อาคาร คณะ / ถามว่าตึกรวม, ตึกวิทย์, ตึกสงวน ไปทางไหน (FAQ / Inquiry)**:
  - ตอบคำถามและแนะนำเส้นทางอย่างเป็นมิตร สุภาพ เป็นธรรมชาติ ละเอียด และแม่นยำภาษาไทยตามคู่มือด้านบน (ระบุหมายเลขบนแผนผัง สายรถเมล์ มพ. สาย 1 หรือ สาย 2 และจุดลงรถ)
  - ตั้งค่า `"is_inquiry": true` และ `"is_complete": true`
- **หากผู้ใช้แจ้งปัญหา/เหตุชำรุด/ร้องเรียน (Problem Report)**:
  - ถามข้อมูลเพิ่มกรณีข้อมูลยังไม่ครบ หรือสรุปข้อมูลเข้าแบบฟอร์มกรณีข้อมูลครบถ้วน
  - ตั้งค่า `"is_inquiry": false`

Respond STRICTLY with a valid JSON object:
{{
  "is_complete": boolean,
  "is_inquiry": boolean,
  "reply": "string (คำตอบภาษาไทยที่เป็นมิตร สุภาพ ชัดเจน ละเอียด และแนะนำเส้นทางพร้อมระบุหมายเลขสถานที่บนผังแผนที่ 29 จุดได้เป็นธรรมชาติ)",
  "extracted_data": {{
    "title": "string (หัวข้อเรื่องหรือคำถาม)",
    "description": "string (รายละเอียดเรื่องหรือคำถาม)",
    "category_name": "string (หมวดหมู่ปัญหา เช่น การเดินทาง / รถเมล์มพ. หรือ อาคารสถานที่)",
    "location": "string (สถานที่เจาะจง เช่น คณะวิทยาศาสตร์)"
  }}
}}"""

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        api_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "typhoon-v2.5-30b-a3b-instruct",
        "messages": api_messages,
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=15)
        if response.status_code != 200:
            logger.error(f"Typhoon API error: {response.text}")
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        import json
        
        # Clean markdown code block if present
        content = content.strip()
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
            
        parsed_data = json.loads(content)
        
        # Location Pipeline & Category Suggestion
        if parsed_data.get("extracted_data"):
            ext = parsed_data["extracted_data"]
            loc_str = ext.get("location", "")
            if loc_str and loc_str != "ไม่ระบุ":
                loc_data = extract_location_pipeline(loc_str)
                ext["location"] = loc_data["location_name"]
                ext["latitude"] = loc_data.get("latitude")
                ext["longitude"] = loc_data.get("longitude")
                ext["location_confidence"] = loc_data.get("confidence", 0.0)
                ext["needs_location_confirmation"] = loc_data.get("needs_confirmation", False)

            desc_text = f"{ext.get('title', '')} {ext.get('description', '')} {loc_str}"
            try:
                from app.database import SessionLocal
                from app.models import Category
                db_cat = SessionLocal()
                cats_db = db_cat.query(Category).filter(Category.is_active == True).all()
                cat_list = [{"id": c.category_id, "name": c.category_name, "description": c.description} for c in cats_db]
                db_cat.close()
                sug_cat_id = suggest_category(desc_text, cat_list)
                if sug_cat_id:
                    matched_c = next((c for c in cat_list if c["id"] == sug_cat_id), None)
                    ext["category_id"] = sug_cat_id
                    if matched_c:
                        ext["category_name"] = matched_c["name"]
            except Exception as cat_err:
                logger.error(f"Error suggesting category in chat: {cat_err}")

        # Detect location inquiry keywords in user text or AI reply
        combined_check = (combined_user_text + " " + parsed_data.get("reply", "")).lower()
        LOCATION_KW = [
            "ไปทางไหน", "อยู่ไหน", "อยู่ตรงไหน", "ไปยังไง", "ทางไป",
            "ตึก", "อาคาร", "คณะ", "เรียนรวม", "บรรยายรวม",
            "วิทย์", "สงวน", "ict", "ไอซีที", "อุบาลี", "หอสมุด",
            "แผนที่", "แผนผัง", "โรงพยาบาล", "หอพัก", "โรงอาหาร"
        ]
        is_loc_q = any(kw in combined_check for kw in LOCATION_KW)

        if is_loc_q or parsed_data.get("is_inquiry") or parsed_data.get("intent") == "location_inquiry":
            map_img_url = "/static/campus_map.jpg"
            parsed_data["map_image"] = map_img_url
            parsed_data["is_inquiry"] = True
            parsed_data["intent"] = "location_inquiry"
            parsed_data["is_complete"] = False
            if "extracted_data" in parsed_data and parsed_data["extracted_data"]:
                parsed_data["extracted_data"]["map_image"] = map_img_url

        return parsed_data
        
    except Exception as e:
        logger.error(f"Error in handle_chat_report: {e}")
        map_img = resolve_map_image(combined_user_text)
        fallback_res = {
            "is_complete": False,
            "reply": "ขออภัยครับ ระบบเกิดข้อผิดพลาดในการประมวลผล แต่ได้พยายามค้นหาข้อมูลสถานที่ให้ท่านเรียบร้อยแล้ว",
            "extracted_data": None
        }
        if map_img:
            fallback_res["map_image"] = map_img
        return fallback_res

def expand_description(text: str) -> str:
    """
    Expands a brief problem description using AI.
    """
    api_key = get_typhoon_api_key()
    if not api_key:
        return text + " (รายละเอียดเพิ่มเติมจาก AI... ระบบไม่สามารถเข้าถึง API ได้)"

    prompt = f"Please expand the following short problem description into a more formal, polite, and detailed report suitable for a university issue tracking system. Output ONLY the expanded Thai text.\n\nShort text: {text}"

    url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "typhoon-v2.5-30b-a3b-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
        "max_tokens": 1024,
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=15)
        if response.status_code != 200:
            logger.error(f"Typhoon API error: {response.text}")
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        return content.strip()
    except Exception as e:
        logger.error(f"expand_description error: {e}")
        return text
