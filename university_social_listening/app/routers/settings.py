from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
    "ประตู", "ตึก", "อาคาร", "คณะ", "หอพัก", "แผนผัง", "แผนที่", "ส่งเอกสาร",
    "สงวน", "ict", "ไอซีที", "สาธิต", "อธิการ", "พญางำเมือง", "วิทย์", "วิศวะ",
    "พยาบาล", "เภสัช", "แพทยศาสตร์", "นิติ", "ศิลปศาสตร์", "วิทยาการจัดการ",
    "สหเวช", "ทันตะ", "เกษตร", "ศูนย์การแพทย์", "รพ.มพ", "หอสมุด", "อุบาลี",
    "ตึกรวม", "อาคารเรียนรวม", "เรียนรวม", "อาคารบรรยายรวม", "ce", "ub", "pk"
]

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
    setting = db.query(LLMSetting).first()
    opening_msg = "สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ"
    is_map_enabled = True
    map_keywords = DEFAULT_MAP_KEYWORDS
    map_img_url = "/static/campus_map.jpg"
    
    if setting:
        if setting.chatbot_opening_message:
            opening_msg = setting.chatbot_opening_message
        if setting.is_auto_map_enabled is not None:
            is_map_enabled = setting.is_auto_map_enabled
        if setting.map_trigger_keywords:
            map_keywords = setting.map_trigger_keywords
        if setting.default_map_image_url:
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
    
    setting = db.query(LLMSetting).first()
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
        db.add(setting)
        db.commit()
        db.refresh(setting)

    # Convert to dictionary with safe defaults
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
        "updated_at": setting.updated_at
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
        "default_map_image_url": setting.default_map_image_url
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
        "updated_at": setting.updated_at
    }

    data = LLMSettingResponse.model_validate(raw_dict).model_dump()

    return StandardResponse(
        success=True,
        message="LLM settings updated",
        data={"item": data}
    )
