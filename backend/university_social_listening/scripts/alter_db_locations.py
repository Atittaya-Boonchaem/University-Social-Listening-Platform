from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE problems ADD COLUMN location_confidence FLOAT"))
        print("Added location_confidence")
    except Exception as e:
        print(f"Error adding location_confidence: {e}")
        
    try:
        # SQLite Boolean is just INTEGER/BOOLEAN under the hood
        conn.execute(text("ALTER TABLE problems ADD COLUMN is_location_confirmed BOOLEAN DEFAULT 0"))
        print("Added is_location_confirmed")
    except Exception as e:
        print(f"Error adding is_location_confirmed: {e}")
        
    conn.commit()

print("Alter DB locations done")
