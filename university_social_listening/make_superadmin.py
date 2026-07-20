import sys
import os
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from app.models import User, SuperAdmin, Staff

def set_superadmin():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        user = db.query(User).filter(User.email == 'superadmin@up.ac.th').first()
        if not user:
            print("User not found!")
            return
        
        print(f"Found user: {user.email} (ID: {user.user_id})")
        
        # Check if already a super admin
        sa = db.query(SuperAdmin).filter(SuperAdmin.user_id == user.user_id).first()
        if not sa:
            sa = SuperAdmin(user_id=user.user_id)
            db.add(sa)
            print("Added to super_admins table.")
        else:
            print("Already a super admin.")
            
        db.commit()
        print("Success!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    set_superadmin()
