import os
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from app.database import engine

def run_upgrade():
    print(f"Executing db_upgrade on {engine.url} ...")
    
    queries = [
        # Category table
        "ALTER TABLE categories ADD COLUMN ticket_prefix VARCHAR(10) UNIQUE NULL;",
        
        # Problem table
        "ALTER TABLE problems ADD COLUMN ticket_id VARCHAR(50) UNIQUE NULL;",
        "ALTER TABLE problems ADD COLUMN parent_problem_id INT NULL;",
        "ALTER TABLE problems ADD CONSTRAINT fk_problems_parent FOREIGN KEY (parent_problem_id) REFERENCES problems(problem_id);",
        "ALTER TABLE problems ADD COLUMN is_hidden BOOLEAN DEFAULT 0;",
        "ALTER TABLE problems ADD COLUMN sla_due_date DATETIME NULL;",
        
        # LLM Settings table
        "ALTER TABLE llm_settings ADD COLUMN is_auto_map_enabled BOOLEAN DEFAULT 1;",
        "ALTER TABLE llm_settings ADD COLUMN map_trigger_keywords JSON NULL;",
        "ALTER TABLE llm_settings ADD COLUMN default_map_image_url VARCHAR(255) DEFAULT '/static/campus_map.jpg';",
        "ALTER TABLE llm_settings ADD COLUMN category_prompt_rules JSON NULL;"
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
