import sys
import os
import bcrypt
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from app.models import User

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def reset_password():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        user = db.query(User).filter(User.email == 'superadmin@up.ac.th').first()
        if not user:
            print("User not found!")
            return
        
        user.password_hash = hash_password("123456")
        db.commit()
        print("Password reset to 123456 successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    reset_password()
