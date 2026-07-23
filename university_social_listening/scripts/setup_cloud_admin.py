import sys
import os
import bcrypt
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from app.models import User, SuperAdmin

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def setup_cloud():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        email = "superadmin@up.ac.th"
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print("Creating new user in cloud DB...")
            user = User(
                email=email,
                password_hash=hash_password("123456"),
                is_active=True
            )
            db.add(user)
            db.flush()
        else:
            print("User exists, resetting password...")
            user.password_hash = hash_password("123456")
            
        # Ensure they are super admin
        sa = db.query(SuperAdmin).filter(SuperAdmin.user_id == user.user_id).first()
        if not sa:
            sa = SuperAdmin(user_id=user.user_id)
            db.add(sa)
            
        db.commit()
        print("\nCloud Super Admin setup complete! You can now log in.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    setup_cloud()
