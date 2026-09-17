# -*- coding: utf-8 -*-
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

print("=" * 80)
print("🚀 เริ่มกระบวนการ Train โมเดล Machine Learning สำหรับแชทบอท UP Connect")
print("=" * 80)

# 1. โหลดข้อมูล (Data Loading)
dataset_filename = "test_dataset_1500.csv"
try:
    df = pd.read_csv(dataset_filename, encoding='utf-8-sig')
    print(f"📂 โหลดข้อมูลสำเร็จ: พบข้อมูลทั้งหมด {len(df)} รายการ")
except FileNotFoundError:
    print(f"❌ ไม่พบไฟล์ {dataset_filename} กรุณาตรวจสอบชื่อไฟล์และตำแหน่งที่อยู่")
    exit()

# ลบข้อมูลแถวที่มีค่าว่าง (Missing Values) ออกเพื่อป้องกัน Error
df = df.dropna(subset=['Raw_Text', 'Actual_Category'])

# 2. แบ่งข้อมูลสำหรับ Train และ Test (Train/Test Split)
# X คือ ข้อมูลข้อความ (Features) / y คือ หมวดหมู่ที่เป็นคำตอบ (Labels)
X = df['Raw_Text']
y = df['Actual_Category']

# แบ่งข้อมูลเป็น 2 ส่วน: ให้โมเดลเรียนรู้ 80% และเก็บไว้ทดสอบความแม่นยำ 20%
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"📊 แบ่งข้อมูลสำหรับเรียนรู้ (Train) {len(X_train)} รายการ และทดสอบ (Test) {len(X_test)} รายการ")

# 3. แปลงข้อความเป็นตัวเลขด้วย TF-IDF (Feature Extraction)
print("\n⚙️ กำลังแปลงข้อความเป็นตัวเลขทางคณิตศาสตร์ (TF-IDF)...")
vectorizer = TfidfVectorizer(max_features=5000) # ดึงคำที่สำคัญที่สุดไม่เกิน 5,000 คำ

# ให้ vectorizer เรียนรู้คำศัพท์จาก X_train และแปลงเป็นตัวเลข
X_train_tfidf = vectorizer.fit_transform(X_train)
# แปลง X_test เป็นตัวเลขโดยใช้คำศัพท์ที่เรียนรู้มาแล้ว
X_test_tfidf = vectorizer.transform(X_test)

# 4. สร้างและสอนโมเดล (Model Training)
print("🧠 กำลัง Train โมเดล Logistic Regression...")
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train_tfidf, y_train) # ป้อนข้อสอบ(X) และเฉลย(y) ให้โมเดลเรียนรู้

# 5. ทดสอบและประเมินผลโมเดล (Model Evaluation)
print("\n✅ Train เสร็จสิ้น! กำลังทดสอบกับข้อมูล Test Set ที่โมเดลไม่เคยเห็นมาก่อน...")
y_pred = model.predict(X_test_tfidf) # ให้โมเดลลองทำนายข้อมูล Test

accuracy = accuracy_score(y_test, y_pred)
print(f"🎯 ความแม่นยำรวม (Accuracy): {accuracy * 100:.2f}%")
print("-" * 80)
print("📊 รายงานประเมินผลเชิงลึก (Classification Report):")
print(classification_report(y_test, y_pred))
print("=" * 80)

# 6. ทดสอบของจริง (Deployment Simulation)
print("💬 ทดสอบให้โมเดลทำนายประโยคใหม่ (ที่ไม่มีใน Dataset)")
test_sentences = [
    "แอร์ห้องเรียน CE112 ไม่เย็นเลยครับ ร้อนมาก",
    "รอรถเมล์มอมาครึ่งชั่วโมงแล้ว ยังไม่มาเลย สาย 1 หายไปไหน",
    "เน็ตหอพักล่ม เข้าเว็บลงทะเบียนเรียนไม่ได้เลย"
]

# แปลงประโยคใหม่เป็น TF-IDF ก่อนเข้าโมเดล
test_sentences_tfidf = vectorizer.transform(test_sentences)
predictions = model.predict(test_sentences_tfidf)

for sentence, category in zip(test_sentences, predictions):
    print(f"📝 ประโยค: \"{sentence}\"")
    print(f"👉 โมเดลทำนายว่าอยู่หมวด: **{category}**\n")