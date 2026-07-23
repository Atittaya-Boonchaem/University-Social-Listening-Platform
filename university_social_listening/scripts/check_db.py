import sys
import os
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from app.models import User, AnonymousUser, SuperAdmin

def check_db():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        users = db.query(User).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"ID: {u.user_id}, Email: {u.email}")
            
        anons = db.query(AnonymousUser).all()
        print(f"\nTotal Anonymous: {len(anons)}")
        for a in anons:
            print(f"User ID: {a.user_id}, IP: {a.raw_ip}")
            
        supers = db.query(SuperAdmin).all()
        print(f"\nTotal SuperAdmins: {len(supers)}")
        for s in supers:
            print(f"User ID: {s.user_id}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    check_db()
