import shutil
import os

src = r"C:\Users\ASUS TUF GAMING\.gemini\antigravity-ide\brain\dc3accc9-f19a-4665-8d4f-9f4c7a116ce0\media__1785911056548.jpg"

targets = [
    r"d:\UP\min_app\university_social_listening\static\campus_map.jpg",
    r"d:\UP\min_app\university_social_listening\static\campus_map.png",
    r"d:\UP\min_app\university_social_listening\static\ict_map.png",
    r"d:\UP\min_app\university_social_listening\static\sanguan_map.png",
    r"d:\UP\min_app\up_voice_public_web\public\campus_map.jpg",
    r"d:\UP\min_app\up_voice_public_web\public\campus_map.png",
    r"d:\UP\min_app\up_voice_public_web\public\sanguan_map.jpg",
    r"d:\UP\min_app\up_voice_public_web\public\sanguan_map.png"
]

print("Source exists:", os.path.exists(src))
for t in targets:
    shutil.copy(src, t)
    print(f"Copied to {t}: {os.path.exists(t)}")
