#!/usr/bin/env python3
"""
reset_db.py
===========
Run this script from the `university_social_listening/` directory:

    python reset_db.py

It will:
  1. DROP all 26 tables (plus any leftover legacy tables)
  2. CREATE all 26 tables fresh using the current models.py
  3. SEED the required lookup tables so the API works out of the box:
       • statuses        (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
       • visibility_types (public, internal, anonymous_only)
       • roles           (student, staff, public, anonymous, category_admin, super_admin)
       • faculties       (default UP faculties)
       • llm_versions    (default Ollama neural-chat)
       • llm_settings    (default settings row)

WARNING: This is DESTRUCTIVE — all existing data will be lost.
"""

import sys
import os

# ── Ensure the project root is on sys.path ────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base       # Base + engine from database.py
import app.models as _models               # noqa: F401 — registers all 26 model classes

from datetime import datetime
from sqlalchemy.orm import sessionmaker
from app.models import (
    Status, VisibilityType, Role, Faculty,
    LLMVersion, LLMSetting,
)


# ──────────────────────────────────────────────────────────────────────────────
# Step 1 — DROP all tables
# ──────────────────────────────────────────────────────────────────────────────
def drop_all_tables():
    print("🗑️  Dropping all existing tables...")
    # Reflect any tables that exist in the DB but may not be in current models
    Base.metadata.reflect(bind=engine, extend_existing=True)
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped.")


# ──────────────────────────────────────────────────────────────────────────────
# Step 2 — CREATE all 26 tables
# ──────────────────────────────────────────────────────────────────────────────
def create_all_tables():
    print("🏗️  Creating 26 new tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All 26 tables created.")


# ──────────────────────────────────────────────────────────────────────────────
# Step 3 — SEED lookup tables
# ──────────────────────────────────────────────────────────────────────────────
def seed_data():
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("\n🌱 Seeding lookup tables...")

        # ── Statuses ──────────────────────────────────────────────────────────
        statuses = [
            Status(status_name="OPEN",        color_code="#F59E0B"),
            Status(status_name="IN_PROGRESS", color_code="#3B82F6"),
            Status(status_name="RESOLVED",    color_code="#10B981"),
            Status(status_name="CLOSED",      color_code="#6B7280"),
        ]
        db.add_all(statuses)
        db.flush()
        print(f"   ✔ {len(statuses)} statuses seeded.")

        # ── Visibility Types ──────────────────────────────────────────────────
        visibility_types = [
            VisibilityType(
                visibility_name="public",
                description="Visible to everyone",
            ),
            VisibilityType(
                visibility_name="internal",
                description="Visible to university staff and admins only",
            ),
            VisibilityType(
                visibility_name="anonymous_only",
                description="Reporter identity hidden from the public feed",
            ),
        ]
        db.add_all(visibility_types)
        db.flush()
        print(f"   ✔ {len(visibility_types)} visibility types seeded.")

        # ── Roles (reference table — not FK'd to User in v2 schema) ──────────
        roles = [
            Role(role_name="student",        description="มหาวิทยาลัยพะเยา นิสิต"),
            Role(role_name="staff",           description="บุคลากรมหาวิทยาลัยพะเยา"),
            Role(role_name="public",          description="บุคคลทั่วไป"),
            Role(role_name="anonymous",       description="ผู้ใช้ไม่ระบุตัวตน"),
            Role(role_name="category_admin",  description="ผู้ดูแลหมวดหมู่"),
            Role(role_name="super_admin",     description="ผู้ดูแลระบบสูงสุด"),
        ]
        db.add_all(roles)
        db.flush()
        print(f"   ✔ {len(roles)} roles seeded.")

        # ── Faculties (University of Phayao) ─────────────────────────────────
        faculty_names = [
            ("คณะวิทยาศาสตร์",                   "Faculty of Science"),
            ("คณะวิศวกรรมศาสตร์",                 "Faculty of Engineering"),
            ("คณะแพทยศาสตร์",                     "School of Medicine"),
            ("คณะพยาบาลศาสตร์",                   "Faculty of Nursing"),
            ("คณะบริหารธุรกิจและนิเทศศาสตร์",      "Faculty of Business Administration and Communication Arts"),
            ("คณะรัฐศาสตร์และสังคมศาสตร์",         "Faculty of Political Science and Social Sciences"),
            ("คณะศิลปศาสตร์",                     "Faculty of Liberal Arts"),
            ("คณะนิติศาสตร์",                     "School of Law"),
            ("คณะทันตแพทยศาสตร์",                 "School of Dentistry"),
            ("คณะเภสัชศาสตร์",                    "School of Pharmaceutical Sciences"),
            ("คณะสหเวชศาสตร์",                    "Faculty of Allied Health Sciences"),
            ("คณะวิทยาศาสตร์การแพทย์",            "Faculty of Medical Science"),
            ("คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์", "Faculty of Architecture and Fine Arts"),
            ("คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", "Faculty of Agriculture and Natural Resources"),
            ("วิทยาลัยการศึกษา",                  "College of Education"),
            ("วิทยาลัยการจัดการ",                 "School of Management"),
        ]
        faculties = [Faculty(faculty_name=name, description=desc) for name, desc in faculty_names]
        db.add_all(faculties)
        db.flush()
        print(f"   ✔ {len(faculties)} faculties seeded.")

        # ── Default LLM Version ───────────────────────────────────────────────
        llm_version = LLMVersion(
            model_name="neural-chat",
            model_type="ollama",
            is_active=True,
            notes="Default local Ollama model for content moderation and categorization",
        )
        db.add(llm_version)
        db.flush()
        print("   ✔ 1 LLM version seeded (neural-chat / ollama).")

        # ── Default LLM Settings ──────────────────────────────────────────────
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
        db.flush()
        print("   ✔ 1 LLM setting row seeded.")

        db.commit()
        print("\n✅ All seed data committed successfully.")

    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seeding failed: {exc}")
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    confirm = 'yes'

    if confirm != "yes":
        print("❌ Aborted.")
        sys.exit(0)

    print("\n" + "=" * 60)
    print("  University Social Listening — DB Reset & Seed (v2)")
    print("=" * 60)

    drop_all_tables()
    create_all_tables()
    seed_data()

    print("\n" + "=" * 60)
    print("🎉 Database reset complete! You can now start the API with:")
    print("   uvicorn app.main:app --reload --port 8000")
    print("=" * 60)
