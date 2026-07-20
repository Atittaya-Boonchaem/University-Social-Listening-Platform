from app.database import engine, Base
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE students DROP COLUMN age"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE students ADD COLUMN birthdate DATE"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE public_users DROP COLUMN age"))
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE public_users ADD COLUMN birthdate DATE"))
    except Exception as e:
        print(e)
    conn.commit()
print("Alter DB done")
