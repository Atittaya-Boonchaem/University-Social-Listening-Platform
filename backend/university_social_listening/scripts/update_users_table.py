from sqlalchemy import create_engine, text
from app.main import config

engine = create_engine(config.DATABASE_URL)
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN faculty VARCHAR(100) NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN education_level VARCHAR(50) NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN age INT NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN relationship VARCHAR(50) NULL;"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_phone_number ON users (phone_number);"))
        print("Successfully updated users table")
    except Exception as e:
        print(f"Error: {e}")
