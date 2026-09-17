# -*- coding: utf-8 -*-
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from pythainlp.tokenize import word_tokenize
import warnings
warnings.filterwarnings('ignore') # ซ่อนแจ้งเตือนรกๆ

print("=" * 80)
print("🚀 กำลังโหลดและ Train โมเดล AI (UP Connect) กรุณารอสักครู่...")

# 1. โหลดข้อมูลและ Train โมเดลอย่างรวดเร็ว (ใช้ข้อมูลทั้งหมด)
try:
    df = pd.read_csv("test_dataset_1500.csv", encoding='utf-8-sig').dropna(subset=['Raw_Text', 'Actual_Category'])
except FileNotFoundError:
    print("❌ ไม่พบไฟล์ test_dataset_1500.csv")
    exit()

def thai_tokenizer(text):
    return word_tokenize(text, engine='newmm')

# แปลงข้อความและ Train
vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer, token_pattern=None, max_features=5000)
X_tfidf = vectorizer.fit_transform(df['Raw_Text'])

model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_tfidf, df['Actual_Category'])

print("✅ โมเดลเรียนรู้ข้อมูล 1,500 รายการ สำเร็จแล้ว!")
print("=" * 80)
print("🎤 [โหมดทดสอบ Live Test] เชิญอาจารย์พิมพ์ประโยคปัญหาที่ต้องการทดสอบได้เลยครับ")
print("   (พิมพ์ 'exit' เพื่อปิดระบบ)")
print("-" * 80)

# 2. ระบบลูปรับข้อความและทำนายผลสดๆ
while True:
    try:
        user_input = input("\n📝 พิมพ์ปัญหา (เช่น แอร์ร้อน, รถไม่มา): ")
        
        if user_input.lower() == 'exit':
            print("👋 ปิดระบบทดสอบ ขอบคุณครับ")
            break
            
        if not user_input.strip():
            continue

        # แปลงข้อความที่พิมพ์เข้ามาใหม่
        input_tfidf = vectorizer.transform([user_input])
        
        # ทำนายหมวดหมู่
        prediction = model.predict(input_tfidf)[0]
        
        # ดูความน่าจะเป็น (Confidence Score) ของทุกหมวดหมู่
        probabilities = model.predict_proba(input_tfidf)[0]
        max_prob = max(probabilities) * 100 # ดึงเปอร์เซ็นต์ที่สูงสุดมาโชว์

        print(f"👉 [AI ทำนายหมวดหมู่] : **{prediction}**")
        print(f"📊 [ความมั่นใจของโมเดล]: {max_prob:.2f}%")
        
    except KeyboardInterrupt:
        print("\n👋 ปิดระบบทดสอบ ขอบคุณครับ")
        break