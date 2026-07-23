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

router = APIRouter()

@router.get("/public-llm-settings", response_model=StandardResponse)
def get_public_llm_settings(db: Session = Depends(get_db)):
    setting = db.query(LLMSetting).first()
    opening_msg = "สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ"
    if setting and setting.chatbot_opening_message:
        opening_msg = setting.chatbot_opening_message
        
    return StandardResponse(
        success=True,
        message="Public LLM settings retrieved",
        data={"item": {"chatbot_opening_message": opening_msg}}
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
            chatbot_opening_message="สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ (เช่น \"แอร์เสียที่ห้องเรียน\")"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)

    # Convert to response schema
    data = LLMSettingResponse.model_validate(setting).model_dump()
    # Handle None values for JSON columns
    data["banned_words"] = data.get("banned_words") or []
    data["banned_patterns"] = data.get("banned_patterns") or []
    data["chatbot_questions"] = data.get("chatbot_questions") or []

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
        "chatbot_opening_message": setting.chatbot_opening_message
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

    data = LLMSettingResponse.model_validate(setting).model_dump()
    data["banned_words"] = data.get("banned_words") or []
    data["banned_patterns"] = data.get("banned_patterns") or []
    data["chatbot_questions"] = data.get("chatbot_questions") or []

    return StandardResponse(
        success=True,
        message="LLM settings updated",
        data={"item": data}
    )
