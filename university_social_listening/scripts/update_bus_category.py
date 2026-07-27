import os
import sys

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Category

def update_category_name():
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        updated_count = 0
        for cat in categories:
            if "ขส.พะเยา" in cat.category_name or "ขส" in cat.category_name or "สัตว์จรจัด" in cat.category_name:
                old_name = cat.category_name
                cat.category_name = cat.category_name.replace("รถ ขส.พะเยา", "รถเมล์มพ.").replace("ขส.พะเยา", "รถเมล์มพ.").replace("สัตว์จรจัด", "สัตว์ในบริเวณมพ.")
                print(f"Updated category ID {cat.category_id}: '{old_name}' -> '{cat.category_name}'")
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            print(f"Successfully updated {updated_count} categories.")
        else:
            print("No matching category found to update.")
    except Exception as e:
        db.rollback()
        print(f"Error updating category: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_category_name()
