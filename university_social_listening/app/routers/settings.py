import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import LLMSetting, User, AuditLog
from app.schemas import StandardResponse, LLMSettingUpdate, LLMSettingResponse
from app.routers.auth import get_current_user
from app.routers.users import require_super_admin
from pydantic import BaseModel

class PublicLLMSettingResponse(BaseModel):
    chatbot_opening_message: str
    is_auto_map_enabled: bool = True
    map_trigger_keywords: list = []
    default_map_image_url: str = "/static/campus_map.jpg"

router = APIRouter()

DEFAULT_MAP_KEYWORDS = [
    "อยู่ไหน", "อยู่ตรงไหน", "ไปยังไง", "ไปยังไงได้บ้าง", "ตั้งอยู่ตรงไหน", 
    "ไปอย่างไร", "ทางไหน", "ที่ไหน", "เส้นทาง", "ลงตรงไหน", "ขึ้นรถตรงไหน", 
    "ประตู", "ประตู1", "ประตู2", "ประตู3", "ประตู 1", "ประตู 2", "ประตู 3",
    "ประตูหนึ่ง", "ประตูสอง", "ประตูสาม", "gate 1", "gate 2", "gate 3",
    "ตึก", "อาคาร", "คณะ", "หอพัก", "แผนผัง", "แผนที่", "ส่งเอกสาร",
    "สงวน", "ict", "ไอซีที", "สาธิต", "อธิการ", "พญางำเมือง", "วิทย์", "วิศวะ",
    "พยาบาล", "เภสัช", "แพทยศาสตร์", "นิติ", "ศิลปศาสตร์", "วิทยาการจัดการ",
    "สหเวช", "ทันตะ", "เกษตร", "ศูนย์การแพทย์", "รพ.มพ", "หอสมุด", "อุบาลี",
    "ตึกรวม", "อาคารเรียนรวม", "เรียนรวม", "อาคารบรรยายรวม", "ce", "ub", "pk"
]

def get_safe_llm_setting(db: Session) -> Optional[LLMSetting]:
    try:
        return db.query(LLMSetting).first()
    except Exception as e:
        db.rollback()
        try:
            from scripts.db_upgrade import run_upgrade
            run_upgrade()
        except Exception:
            pass
        try:
            return db.query(LLMSetting).first()
        except Exception:
            return None

@router.get("/categories", response_model=StandardResponse)
def get_settings_categories(db: Session = Depends(get_db)):
    from app.models import Category
    from app.schemas import CategoryResponse
    cats = db.query(Category).filter(Category.is_active == True).all()
    return StandardResponse(
        success=True,
        message="Success",
        data={"items": [CategoryResponse.model_validate(c).model_dump() for c in cats]}
    )

@router.get("/public-llm-settings", response_model=StandardResponse)
def get_public_llm_settings(db: Session = Depends(get_db)):
    setting = get_safe_llm_setting(db)
    opening_msg = "สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ"
    is_map_enabled = True
    map_keywords = DEFAULT_MAP_KEYWORDS
    map_img_url = "/static/campus_map.jpg"
    
    if setting:
        if getattr(setting, "chatbot_opening_message", None):
            opening_msg = setting.chatbot_opening_message
        if getattr(setting, "is_auto_map_enabled", None) is not None:
            is_map_enabled = setting.is_auto_map_enabled
        if getattr(setting, "map_trigger_keywords", None):
            map_keywords = setting.map_trigger_keywords
        if getattr(setting, "default_map_image_url", None):
            map_img_url = setting.default_map_image_url
        
    return StandardResponse(
        success=True,
        message="Public LLM settings retrieved",
        data={"item": {
            "chatbot_opening_message": opening_msg,
            "is_auto_map_enabled": is_map_enabled,
            "map_trigger_keywords": map_keywords,
            "default_map_image_url": map_img_url
        }}
    )

@router.get("/llm-settings", response_model=StandardResponse)
def get_llm_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    setting = get_safe_llm_setting(db)
    if not setting:
        # Fallback if the reset script didn't seed it
        setting = LLMSetting(
            banned_words=[],
            banned_patterns=[],
            is_auto_ban_enabled=True,
            is_auto_routing_enabled=True,
            auto_ban_duration_days=7,
            confidence_threshold=0.85,
            max_warnings_before_ban=1,
            chatbot_persona="You are a helpful and polite university staff assistant. Your goal is to gather information about a problem or issue the user wants to report.",
            chatbot_questions=["The exact problem details (What happened? What is broken?)", "The location (Which building? Which room or area?)"],
            chatbot_opening_message="สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ (เช่น \"แอร์เสียที่ห้องเรียน\")",
            is_auto_map_enabled=True,
            map_trigger_keywords=DEFAULT_MAP_KEYWORDS,
            default_map_image_url="/static/campus_map.jpg"
        )
        try:
            db.add(setting)
            db.commit()
            db.refresh(setting)
        except Exception:
            db.rollback()

    # Convert to dictionary with safe defaults
    raw_dict = {
        "setting_id": getattr(setting, "setting_id", 1),
        "banned_words": getattr(setting, "banned_words", []) or [],
        "banned_patterns": getattr(setting, "banned_patterns", []) or [],
        "is_auto_ban_enabled": getattr(setting, "is_auto_ban_enabled", True) if getattr(setting, "is_auto_ban_enabled", True) is not None else True,
        "is_auto_routing_enabled": getattr(setting, "is_auto_routing_enabled", True) if getattr(setting, "is_auto_routing_enabled", True) is not None else True,
        "auto_ban_duration_days": getattr(setting, "auto_ban_duration_days", 7) if getattr(setting, "auto_ban_duration_days", 7) is not None else 7,
        "confidence_threshold": float(setting.confidence_threshold) if getattr(setting, "confidence_threshold", None) is not None else 0.85,
        "max_warnings_before_ban": getattr(setting, "max_warnings_before_ban", 1) if getattr(setting, "max_warnings_before_ban", 1) is not None else 1,
        "chatbot_persona": getattr(setting, "chatbot_persona", "") or "",
        "chatbot_questions": getattr(setting, "chatbot_questions", []) or [],
        "chatbot_opening_message": getattr(setting, "chatbot_opening_message", "") or "",
        "is_auto_map_enabled": getattr(setting, "is_auto_map_enabled", True) if getattr(setting, "is_auto_map_enabled", True) is not None else True,
        "map_trigger_keywords": getattr(setting, "map_trigger_keywords", DEFAULT_MAP_KEYWORDS) or DEFAULT_MAP_KEYWORDS,
        "default_map_image_url": getattr(setting, "default_map_image_url", "/static/campus_map.jpg") or "/static/campus_map.jpg",
        "category_prompt_rules": getattr(setting, "category_prompt_rules", []) or [],
        "updated_at": getattr(setting, "updated_at", None)
    }

    data = LLMSettingResponse.model_validate(raw_dict).model_dump()

    return StandardResponse(
        success=True,
        message="LLM settings retrieved",
        data={"item": data}
    )


@router.patch("/llm-settings", response_model=StandardResponse)
def update_llm_settings(
    settings_in: LLMSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    setting = db.query(LLMSetting).first()
    if not setting:
        raise HTTPException(status_code=404, detail="LLM Settings not initialized")

    # Audit logging for changes
    old_value = {
        "banned_words": setting.banned_words,
        "banned_patterns": setting.banned_patterns,
        "is_auto_ban_enabled": setting.is_auto_ban_enabled,
        "is_auto_routing_enabled": setting.is_auto_routing_enabled,
        "auto_ban_duration_days": setting.auto_ban_duration_days,
        "confidence_threshold": float(setting.confidence_threshold) if setting.confidence_threshold else 0.85,
        "max_warnings_before_ban": setting.max_warnings_before_ban,
        "chatbot_persona": setting.chatbot_persona,
        "chatbot_questions": setting.chatbot_questions,
        "chatbot_opening_message": setting.chatbot_opening_message,
        "is_auto_map_enabled": setting.is_auto_map_enabled,
        "map_trigger_keywords": setting.map_trigger_keywords,
        "default_map_image_url": setting.default_map_image_url,
        "category_prompt_rules": setting.category_prompt_rules
    }
    
    new_value_audit = {}

    for field, value in settings_in.model_dump(exclude_none=True).items():
        setattr(setting, field, value)
        new_value_audit[field] = value

    setting.updated_by = current_user.user_id
    
    if new_value_audit:
        audit = AuditLog(
            admin_id=current_user.user_id,
            action_type="UPDATE_LLM_SETTINGS",
            table_name="llm_settings",
            record_id=setting.setting_id,
            old_value=old_value,
            new_value=new_value_audit
        )
        db.add(audit)

    db.commit()
    db.refresh(setting)

    raw_dict = {
        "setting_id": setting.setting_id,
        "banned_words": setting.banned_words or [],
        "banned_patterns": setting.banned_patterns or [],
        "is_auto_ban_enabled": setting.is_auto_ban_enabled if setting.is_auto_ban_enabled is not None else True,
        "is_auto_routing_enabled": setting.is_auto_routing_enabled if setting.is_auto_routing_enabled is not None else True,
        "auto_ban_duration_days": setting.auto_ban_duration_days if setting.auto_ban_duration_days is not None else 7,
        "confidence_threshold": float(setting.confidence_threshold) if setting.confidence_threshold is not None else 0.85,
        "max_warnings_before_ban": setting.max_warnings_before_ban if setting.max_warnings_before_ban is not None else 1,
        "chatbot_persona": setting.chatbot_persona or "",
        "chatbot_questions": setting.chatbot_questions or [],
        "chatbot_opening_message": setting.chatbot_opening_message or "",
        "is_auto_map_enabled": setting.is_auto_map_enabled if setting.is_auto_map_enabled is not None else True,
        "map_trigger_keywords": setting.map_trigger_keywords or DEFAULT_MAP_KEYWORDS,
        "default_map_image_url": setting.default_map_image_url or "/static/campus_map.jpg",
        "category_prompt_rules": setting.category_prompt_rules or [],
        "updated_at": setting.updated_at
    }

    data = LLMSettingResponse.model_validate(raw_dict).model_dump()

    return StandardResponse(
        success=True,
        message="LLM settings updated",
        data={"item": data}
    )


@router.post("/upload-map-image", response_model=StandardResponse)
async def upload_map_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are allowed")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"campus_map_{uuid.uuid4().hex[:8]}{ext}"
    static_dir = "./static"
    os.makedirs(static_dir, exist_ok=True)
    file_path = os.path.join(static_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    map_url = f"/static/{filename}"

    # Auto-update LLMSetting default_map_image_url in DB
    setting = get_safe_llm_setting(db)
    if setting:
        setting.default_map_image_url = map_url
        setting.updated_by = current_user.user_id
        db.commit()

    return StandardResponse(
        success=True,
        message="Map image uploaded successfully",
        data={"url": map_url}
    )


@router.post("/upload-rule-image", response_model=StandardResponse)
async def upload_rule_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin(current_user, db)
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are allowed")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"rule_img_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = "./uploads/images"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/images/{filename}"

    return StandardResponse(
        success=True,
        message="Rule image uploaded successfully",
        data={"url": image_url}
    )


@router.get("/ai-model-metrics", response_model=StandardResponse)
def get_ai_model_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns AI model classification accuracy, evaluation metrics, and confusion matrix for Super Admin.
    """
    require_super_admin(current_user, db)
    metrics_path = os.path.join(os.path.dirname(__file__), "..", "..", "ai_data", "models", "evaluation_metrics.json")
    
    if not os.path.exists(metrics_path):
        return StandardResponse(
            success=True,
            message="Model metrics not yet generated. Train model first.",
            data={
                "accuracy": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "f1_score": 0.0,
                "total_samples": 0,
                "last_trained_at": "Never",
                "confusion_matrix": []
            }
        )

    try:
        import json
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)

        return StandardResponse(
            success=True,
            message="Model metrics retrieved successfully",
            data=metrics_data
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to load metrics: {str(e)}")


@router.post("/retrain-category-model", response_model=StandardResponse)
def retrain_category_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers local ML Model training (PyThaiNLP + TF-IDF + Classifier) and saves new evaluation metrics.
    """
    require_super_admin(current_user, db)
    try:
        from scripts.train_category_model import train_and_evaluate
        metrics = train_and_evaluate()
        if not metrics:
            raise HTTPException(500, "Model training failed due to insufficient dataset.")

        # Log audit trail
        try:
            audit = AuditLog(
                user_id=current_user.user_id,
                action_type="RETRAIN_AI_MODEL",
                table_name="ai_models",
                record_id=1,
                details=f"Retrained custom ML model. New Accuracy: {metrics.get('accuracy')}%",
                ip_address="127.0.0.1"
            )
            db.add(audit)
            db.commit()
        except Exception:
            db.rollback()

        return StandardResponse(
            success=True,
            message=f"Model retrained successfully! Accuracy: {metrics.get('accuracy')}%",
            data=metrics
        )
    except Exception as e:
        raise HTTPException(500, f"Error retraining model: {str(e)}")
