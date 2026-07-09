import requests
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3"

def check_profanity(text: str) -> bool:
    """
    Analyzes Thai text for profanity, hate speech, or severe insults.
    Returns True if inappropriate, False if clean.
    """
    prompt = f"""
You are a strict Thai content moderator. Your task is to analyze the following text for profanity, hate speech, severe insults, or inappropriate content.
Respond ONLY with "TRUE" if the text contains inappropriate content, or "FALSE" if it is clean. Do not include any other words or explanations.

Text: {text}
"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": DEFAULT_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.0
            },
            timeout=10
        )
        if response.status_code == 200:
            result = response.json().get("response", "").strip().upper()
            return "TRUE" in result
    except Exception as e:
        logger.error(f"AI check_profanity error: {e}")
    # Fail-open: if AI fails, assume it's clean to avoid blocking valid submissions
    return False

def suggest_category(text: str, categories_list: List[Dict]) -> int:
    """
    Analyzes the text and suggests the best category_id from the categories_list.
    Returns the category_id as an integer, or None if it fails.
    """
    categories_str = "\n".join([f"ID: {c['id']}, Name: {c['name']}" for c in categories_list])
    prompt = f"""
You are a Thai categorizer. Analyze the following problem description and select the most appropriate category from the provided list.
Respond ONLY with the integer ID of the best category. Do not include any text, explanation, or formatting.

Problem Description: {text}

Available Categories:
{categories_str}
"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": DEFAULT_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.0
            },
            timeout=10
        )
        if response.status_code == 200:
            result = response.json().get("response", "").strip()
            # Extract just the integer from the response
            import re
            match = re.search(r'\d+', result)
            if match:
                return int(match.group())
    except Exception as e:
        logger.error(f"AI suggest_category error: {e}")
    
    return None
