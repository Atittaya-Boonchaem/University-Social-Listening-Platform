import os
import json
import logging
import re
import requests
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Load Campus Locations
CAMPUS_LOCATIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "ai_data", "campus_locations.json")
try:
    with open(CAMPUS_LOCATIONS_FILE, "r", encoding="utf-8") as f:
        CAMPUS_LOCATIONS = json.load(f)
except Exception as e:
    logger.error(f"Failed to load campus locations: {e}")
    CAMPUS_LOCATIONS = []

def _normalize_text(text: str) -> str:
    """Helper to remove spaces for easier matching if needed, though simple lowercasing/stripping is often enough for Thai."""
    return text.replace(" ", "").strip()

def _check_dictionary(text: str) -> Optional[Dict]:
    """Check if the text contains any known location or its aliases."""
    normalized_text = _normalize_text(text)
    
    for loc in CAMPUS_LOCATIONS:
        # Check canonical name
        if _normalize_text(loc["canonical_name"]) in normalized_text:
            return loc
        
        # Check aliases
        for alias in loc.get("aliases", []):
            if _normalize_text(alias) in normalized_text:
                return loc
                
    return None

def _extract_location_llm(text: str) -> str:
    """Use LLM to extract location string from text if not found in dictionary."""
    api_key = os.getenv("TYPHOON_API_KEY", "")
    
    if not api_key:
        return "ไม่ทราบพิกัด (LLM Mock)"
        
    url = "https://api.opentyphoon.ai/v1/chat/completions"
    prompt = f"""
    คุณคือ AI ช่วยสกัดชื่อสถานที่จากข้อความภาษาไทย
    จงดึง "ชื่อสถานที่" ที่ปรากฏในข้อความต่อไปนี้ หากมีหลายสถานที่ให้เลือกสถานที่ที่น่าจะเป็นจุดเกิดเหตุมากที่สุด
    ตอบกลับเฉพาะชื่อสถานที่เท่านั้น ห้ามมีคำอธิบายเพิ่มเติม หากไม่พบสถานที่เลยให้ตอบว่า "ไม่พบสถานที่"
    
    ข้อความ: {text}
    """
    try:
        payload = {
            "model": "typhoon-v2.5-30b-a3b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 50
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            result = data["choices"][0]["message"]["content"].strip()
            if result == "ไม่พบสถานที่":
                return ""
            return result
    except Exception as e:
        logger.error(f"LLM location extraction failed: {e}")
    
    return ""

def _geocode_external(location_name: str) -> Optional[Dict]:
    """Use Nominatim (OpenStreetMap) to geocode external locations."""
    if not location_name:
        return None
        
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": location_name,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "UniversitySocialListeningApp/1.0"
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return {
                    "latitude": float(data[0]["lat"]),
                    "longitude": float(data[0]["lon"])
                }
    except Exception as e:
        logger.error(f"Geocoding failed for {location_name}: {e}")
        
    return None

def extract_location_pipeline(text: str) -> Dict:
    """
    Main pipeline for extracting and geocoding locations from text.
    1. Dictionary Match
    2. LLM/NER Fallback
    3. Geocoding for external
    """
    # 1. Check Dictionary First
    dict_match = _check_dictionary(text)
    if dict_match:
        return {
            "location_name": dict_match["canonical_name"],
            "latitude": dict_match.get("latitude"),
            "longitude": dict_match.get("longitude"),
            "is_internal": True,
            "confidence": 1.0,
            "needs_confirmation": False
        }
        
    # 2. LLM/NER Fallback
    extracted_name = _extract_location_llm(text)
    if not extracted_name:
        return {
            "location_name": "ไม่ระบุพิกัด",
            "latitude": None,
            "longitude": None,
            "is_internal": False,
            "confidence": 0.0,
            "needs_confirmation": True
        }
        
    # 3. Standardize / Re-check dictionary with LLM output
    # Just in case LLM cleaned it up to match a dictionary entry
    dict_match_again = _check_dictionary(extracted_name)
    if dict_match_again:
        return {
            "location_name": dict_match_again["canonical_name"],
            "latitude": dict_match_again.get("latitude"),
            "longitude": dict_match_again.get("longitude"),
            "is_internal": True,
            "confidence": 0.9,
            "needs_confirmation": False
        }
        
    # 4. Geocode External Location
    geo_result = _geocode_external(f"{extracted_name} พะเยา") # Append context if needed, or just extracted_name
    
    if geo_result:
        return {
            "location_name": extracted_name,
            "latitude": geo_result["latitude"],
            "longitude": geo_result["longitude"],
            "is_internal": False,
            "confidence": 0.7, # Lower confidence for external geocoding
            "needs_confirmation": True # External locations should probably be confirmed
        }
        
    # Fallback if geocoding fails
    return {
        "location_name": extracted_name,
        "latitude": None,
        "longitude": None,
        "is_internal": False,
        "confidence": 0.5,
        "needs_confirmation": True
    }
