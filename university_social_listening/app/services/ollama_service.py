# app/services/ollama_service.py
import requests
import json
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class OllamaService:
    """
    ✅ ตรวจสอบคำหยาบและวิเคราะห์ข้อความด้วย Ollama LLM
    
    ฟังก์ชัน:
    1. categorize_problem - จัดหมวดหมู่ปัญหา
    2. check_toxic_content - ตรวจสอบคำหยาบ
    3. extract_time_context - สกัดเวลาเกิดเหตุจากบริบท
    """
    
    def __init__(self, ollama_host: str = "http://localhost:11434", model_name: str = "neural-chat"):
        self.ollama_host = ollama_host
        self.model_name = model_name
        self.base_url = f"{ollama_host}/api"
        self.timeout = 60
        
        # Thai toxic words dictionary
        self.thai_toxic_keywords = {
            'โง่': 'ความโง่',
            'ห่วย': 'ความไม่ดี',
            'ขี้': 'การดูหมิ่น',
            'มึง': 'การดูหมิ่น',
            'เงี่ยว': 'ลักษณะไม่สุภาพ',
            'สัส': 'การดูหมิ่น',
            'ควย': 'คำหยาบคาย',
            'แม่ง': 'คำหยาบคาย',
        }
        
        # English toxic words
        self.english_toxic_keywords = [
            'stupid', 'dumb', 'idiot', 'asshole', 'bastard',
            'damn', 'hell', 'crap', 'sucks', 'hate', 'kill'
        ]
    
    async def check_health(self) -> bool:
        """ตรวจสอบว่า Ollama ทำงาน"""
        try:
            response = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Ollama health check failed: {str(e)}")
            return False
    
    def categorize_problem(self, title: str, description: str) -> Dict:
        """
        จัดหมวดหมู่ปัญหา
        
        Categories:
        - อาคารสถานที่
        - ความสะอาด
        - ความปลอดภัย
        - สาธารณูปโภค
        - ปัญหาสังคม
        - อื่น ๆ
        """
        prompt = f"""
        Classify this problem into one of these Thai categories:
        - อาคารสถานที่ (Building/Infrastructure)
        - ความสะอาด (Cleanliness)
        - ความปลอดภัย (Safety)
        - สาธารณูปโภค (Utilities)
        - ปัญหาสังคม (Social Issues)
        - อื่น ๆ (Others)
        
        Problem Title: {title}
        Problem Description: {description}
        
        Response ONLY with the category name in Thai. Nothing else.
        """
        
        try:
            response = requests.post(
                f"{self.base_url}/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.3
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                category = result.get('response', '').strip()
                logger.info(f"✅ Problem categorized as: {category}")
                
                return {
                    "success": True,
                    "category": category,
                    "confidence": 0.85
                }
            else:
                logger.error(f"❌ Ollama categorization failed: {response.status_code}")
                return {
                    "success": False,
                    "category": "อื่น ๆ",
                    "confidence": 0.0
                }
        except Exception as e:
            logger.error(f"❌ Categorization error: {str(e)}")
            return {
                "success": False,
                "category": "อื่น ๆ",
                "confidence": 0.0
            }
    
    def check_toxic_content(self, text: str) -> Dict:
        """
        ✅ ตรวจสอบคำหยาบ
        
        Returns:
        {
            "is_toxic": bool,
            "score": 0.0-1.0,
            "keywords": list,
            "recommendation": "APPROVE" | "FLAG" | "REVIEW"
        }
        """
        toxic_score = 0.0
        found_keywords = []
        
        # 1️⃣ Keyword matching (ตัวแรก - เร็ว)
        text_lower = text.lower()
        
        # Check Thai keywords
        for thai_word, category in self.thai_toxic_keywords.items():
            if thai_word in text_lower:
                found_keywords.append(thai_word)
                toxic_score += 0.15
        
        # Check English keywords
        for eng_word in self.english_toxic_keywords:
            if eng_word in text_lower:
                found_keywords.append(eng_word)
                toxic_score += 0.15
        
        # 2️⃣ Use Ollama for context analysis
        if found_keywords or len(text) > 200:
            ollama_score = self._ollama_toxicity_check(text)
            toxic_score = min(1.0, toxic_score + (ollama_score * 0.5))
        
        # 3️⃣ Determine recommendation
        if toxic_score >= 0.7:
            recommendation = "FLAG"  # ❌ Block or require review
        elif toxic_score >= 0.4:
            recommendation = "REVIEW"  # ⚠️ Manual review
        else:
            recommendation = "APPROVE"  # ✅ Approve
        
        logger.info(f"🔍 Toxicity check: score={toxic_score:.2f}, keywords={found_keywords}, action={recommendation}")
        
        return {
            "is_toxic": toxic_score >= 0.4,
            "score": min(1.0, toxic_score),
            "keywords": found_keywords,
            "recommendation": recommendation
        }
    
    def _ollama_toxicity_check(self, text: str) -> float:
        """ใช้ Ollama ตรวจสอบระดับ toxicity"""
        prompt = f"""
        Analyze if this text contains toxic, rude, or offensive language.
        Rate on scale 0-1 where:
        0 = Not toxic at all
        0.5 = Somewhat rude
        1.0 = Highly toxic/offensive
        
        Text: {text}
        
        Response ONLY with a number between 0 and 1. Nothing else.
        """
        
        try:
            response = requests.post(
                f"{self.base_url}/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.1
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                score_str = result.get('response', '0.0').strip()
                # Extract float from response
                score = float(re.findall(r'\d+\.?\d*', score_str)[0] or 0)
                return min(1.0, max(0.0, score))
            else:
                return 0.0
        except Exception as e:
            logger.error(f"❌ Ollama toxicity check error: {str(e)}")
            return 0.0
    
    def extract_time_context(self, text: str) -> Dict:
        """
        สกัดเวลาเกิดเหตุจากบริบทข้อความ
        
        เช่น: "เมื่อเช้า", "เมื่อวานอันเมื่อ", "ช่วงเที่ยงคืน"
        """
        prompt = f"""
        Extract the time context when the incident happened from this text.
        Return in format: "HH:MM" or "time_description" if specific time is not clear.
        
        Text: {text}
        
        Response ONLY with the time or time description. If no time context, respond "unknown".
        """
        
        try:
            response = requests.post(
                f"{self.base_url}/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.2
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                time_context = result.get('response', 'unknown').strip()
                return {
                    "success": True,
                    "time_context": time_context
                }
            else:
                return {
                    "success": False,
                    "time_context": "unknown"
                }
        except Exception as e:
            logger.error(f"❌ Time extraction error: {str(e)}")
            return {
                "success": False,
                "time_context": "unknown"
            }
    
    async def analyze_problem_full(self, title: str, description: str) -> Dict:
        """
        🔍 วิเคราะห์ปัญหาแบบสมบูรณ์
        ตรวจสอบทั้ง category, toxicity, และ time context
        """
        full_text = f"{title}. {description}"
        
        category_result = self.categorize_problem(title, description)
        toxicity_result = self.check_toxic_content(full_text)
        time_result = self.extract_time_context(full_text)
        
        return {
            "category": category_result,
            "toxicity": toxicity_result,
            "time_context": time_result,
            "analysis_timestamp": datetime.utcnow().isoformat()
        }

# ========================================
# Utility function for FastAPI dependency
# ========================================
async def get_ollama_service() -> OllamaService:
    """Dependency injection for OllamaService"""
    service = OllamaService()
    # ตรวจสอบ Ollama ทำงาน
    is_healthy = await service.check_health()
    if not is_healthy:
        logger.warning("⚠️ Ollama service is not responding")
    return service
