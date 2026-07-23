import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from app.database import config

def run_upgrade():
    print(f"Connecting to {config.DATABASE_URL} ...")
    engine = create_engine(config.DATABASE_URL)
    
    queries = [
        # Category table
        "ALTER TABLE categories ADD COLUMN ticket_prefix VARCHAR(10) UNIQUE NULL;",
        
        # Problem table
        "ALTER TABLE problems ADD COLUMN ticket_id VARCHAR(50) UNIQUE NULL;",
        "ALTER TABLE problems ADD COLUMN parent_problem_id INT NULL;",
        "ALTER TABLE problems ADD CONSTRAINT fk_problems_parent FOREIGN KEY (parent_problem_id) REFERENCES problems(problem_id);",
        "ALTER TABLE problems ADD COLUMN is_hidden BOOLEAN DEFAULT 0;",
        "ALTER TABLE problems ADD COLUMN sla_due_date DATETIME NULL;"
    ]

    with engine.connect() as conn:
        for q in queries:
            try:
                print(f"Executing: {q}")
                conn.execute(text(q))
                print(" -> Success")
            except OperationalError as e:
                err_msg = str(e)
                if "Duplicate column name" in err_msg or "Duplicate key name" in err_msg:
                    print(" -> Ignored (Column or Constraint already exists)")
                else:
                    print(f" -> Failed: {err_msg}")
        conn.commit()

    print("Upgrade completed.")

if __name__ == "__main__":
    run_upgrade()
