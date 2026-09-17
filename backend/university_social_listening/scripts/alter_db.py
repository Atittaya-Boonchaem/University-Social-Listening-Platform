import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
from app.database import engine, Base
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE llm_settings ADD COLUMN chatbot_persona TEXT"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE llm_settings ADD COLUMN chatbot_questions JSON"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE llm_settings ADD COLUMN chatbot_opening_message TEXT"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN strike_count INT DEFAULT 0"))
        print("Added strike_count to users")
    except Exception as e:
        print("users table migration error:", e)
    try:
        conn.execute(text("ALTER TABLE llm_settings ADD COLUMN max_warnings_before_ban INT DEFAULT 1"))
        print("Added max_warnings_before_ban to llm_settings")
    except Exception as e:
        print("llm_settings table migration error:", e)
    
    # Initialize default settings if row 1 doesn't exist
    try:
        conn.execute(text("""
        INSERT INTO llm_settings (setting_id, is_auto_ban_enabled, auto_ban_duration_days) 
        SELECT 1, 1, 7 
        WHERE NOT EXISTS (SELECT 1 FROM llm_settings WHERE setting_id = 1)
        """))
    except Exception as e:
        print(e)
        
    conn.commit()
print("Alter DB for LLM Settings done")
