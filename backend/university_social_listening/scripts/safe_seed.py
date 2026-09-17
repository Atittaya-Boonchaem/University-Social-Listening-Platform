#!/usr/bin/env python3
"""
safe_seed.py
===========
Safely seeds required lookup tables (Statuses, Visibility Types, Roles, Faculties, LLM settings)
without dropping or recreating any existing tables. It checks if the data exists before inserting.

Run this script from the `university_social_listening/` directory:
    python safe_seed.py
"""
import sys
import os
from sqlalchemy.orm import sessionmaker

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import (
    Status, VisibilityType, Role, Faculty,
    LLMVersion, LLMSetting,
)

def safe_seed():
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("\nSafely seeding lookup tables...")

        # ── Statuses ──
        statuses_data = [
            ("OPEN", "#F59E0B"),
            ("IN_PROGRESS", "#3B82F6"),
            ("RESOLVED", "#10B981"),
            ("CLOSED", "#6B7280"),
        ]
        added_statuses = 0
        for name, color in statuses_data:
            if not db.query(Status).filter(Status.status_name == name).first():
                db.add(Status(status_name=name, color_code=color))
                added_statuses += 1
        db.flush()
        print(f"   [OK] {added_statuses} new statuses seeded.")

        # ── Visibility Types ──
        visibility_data = [
            ("public", "Visible to everyone"),
            ("internal", "Visible to university staff and admins only"),
            ("anonymous_only", "Reporter identity hidden from the public feed"),
        ]
        added_visibilities = 0
        for name, desc in visibility_data:
            if not db.query(VisibilityType).filter(VisibilityType.visibility_name == name).first():
                db.add(VisibilityType(visibility_name=name, description=desc))
                added_visibilities += 1
        db.flush()
        print(f"   [OK] {added_visibilities} new visibility types seeded.")

        # ── Roles ──
        roles_data = [
            ("student", "มหาวิทยาลัยพะเยา นิสิต"),
            ("staff", "บุคลากรมหาวิทยาลัยพะเยา"),
            ("public", "บุคคลทั่วไป"),
            ("anonymous", "ผู้ใช้ไม่ระบุตัวตน"),
            ("category_admin", "ผู้ดูแลหมวดหมู่"),
            ("super_admin", "ผู้ดูแลระบบสูงสุด"),
        ]
        added_roles = 0
        for name, desc in roles_data:
            if not db.query(Role).filter(Role.role_name == name).first():
                db.add(Role(role_name=name, description=desc))
                added_roles += 1
        db.flush()
        print(f"   [OK] {added_roles} new roles seeded.")

        # ── Faculties ──
        faculty_names = [
            ("คณะวิทยาศาสตร์", "Faculty of Science"),
            ("คณะวิศวกรรมศาสตร์", "Faculty of Engineering"),
            ("คณะแพทยศาสตร์", "School of Medicine"),
            ("คณะพยาบาลศาสตร์", "Faculty of Nursing"),
            ("คณะบริหารธุรกิจและนิเทศศาสตร์", "Faculty of Business Administration and Communication Arts"),
            ("คณะรัฐศาสตร์และสังคมศาสตร์", "Faculty of Political Science and Social Sciences"),
            ("คณะศิลปศาสตร์", "Faculty of Liberal Arts"),
            ("คณะนิติศาสตร์", "School of Law"),
            ("คณะทันตแพทยศาสตร์", "School of Dentistry"),
            ("คณะเภสัชศาสตร์", "School of Pharmaceutical Sciences"),
            ("คณะสหเวชศาสตร์", "Faculty of Allied Health Sciences"),
            ("คณะวิทยาศาสตร์การแพทย์", "Faculty of Medical Science"),
            ("คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์", "Faculty of Architecture and Fine Arts"),
            ("คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", "Faculty of Agriculture and Natural Resources"),
            ("วิทยาลัยการศึกษา", "College of Education"),
            ("วิทยาลัยการจัดการ", "School of Management"),
        ]
        added_faculties = 0
        for name, desc in faculty_names:
            if not db.query(Faculty).filter(Faculty.faculty_name == name).first():
                db.add(Faculty(faculty_name=name, description=desc))
                added_faculties += 1
        db.flush()
        print(f"   [OK] {added_faculties} new faculties seeded.")

        # ── Default LLM Version ──
        added_llm = 0
        if not db.query(LLMVersion).filter(LLMVersion.model_name == "neural-chat").first():
            llm_version = LLMVersion(
                model_name="neural-chat",
                model_type="ollama",
                is_active=True,
                notes="Default local Ollama model for content moderation and categorization",
            )
            db.add(llm_version)
            added_llm += 1
        db.flush()
        print(f"   [OK] {added_llm} new LLM version seeded.")

        # ── Default LLM Settings ──
        added_llm_setting = 0
        if db.query(LLMSetting).count() == 0:
            llm_setting = LLMSetting(
                banned_words=["โง่", "ห่วย", "ขี้", "มึง", "สัส", "ควย", "แม่ง",
                              "stupid", "dumb", "idiot", "asshole"],
                banned_patterns=[],
                is_auto_ban_enabled=True,
                is_auto_routing_enabled=True,
                auto_ban_duration_days=7,
                confidence_threshold=0.85,
            )
            db.add(llm_setting)
            added_llm_setting += 1
        db.flush()
        print(f"   [OK] {added_llm_setting} new LLM setting seeded.")

        db.commit()
        print("\nSafe seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"\nError seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    safe_seed()
