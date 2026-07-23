from sqlalchemy import text
from app.main import SessionLocal

def main():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE problems ADD COLUMN visibility VARCHAR(50) DEFAULT 'public'"))
        db.commit()
        print("Successfully added visibility column to problems table.")
    except Exception as e:
        print(f"Error (column might already exist): {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
