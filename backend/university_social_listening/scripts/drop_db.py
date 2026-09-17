from app.database import engine, Base
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("DROP DATABASE IF EXISTS university_social_listening;"))
    conn.execute(text("CREATE DATABASE university_social_listening;"))
    conn.commit()
print("Drop DB done")
