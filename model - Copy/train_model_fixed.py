# -*- coding: utf-8 -*-
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from pythainlp.tokenize import word_tokenize # ✨ เพิ่มไลบรารีตัดคำภาษาไทย

print("=" * 80)
print("🚀 เริ่มกระบวนการ Train โมเดล Machine Learning (เวอร์ชันแก้ปัญหาตัดคำไทย)")
print("=" * 80)

# 1. โหลดข้อมูล (Data Loading)
dataset_filename = "test_dataset_1500.csv"
try:
    df = pd.read_csv(dataset_filename, encoding='utf-8-sig')
    df = df.dropna(subset=['Raw_Text', 'Actual_Category'])
except FileNotFoundError:
    print(f"❌ ไม่พบไฟล์ {dataset_filename}")
    exit()

X = df['Raw_Text']
y = df['Actual_Category']

# 2. แบ่งข้อมูลสำหรับ Train และ Test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ✨ 3. ฟังก์ชันพิเศษสำหรับตัดคำภาษาไทย
def thai_tokenizer(text):
    # ใช้ engine 'newmm' ซึ่งเป็นมาตรฐานอิงพจนานุกรมภาษาไทย
    return word_tokenize(text, engine='newmm')

print("⚙️ กำลังแปลงข้อความเป็นตัวเลขทางคณิตศาสตร์ (TF-IDF + PyThaiNLP)...")
# ✨ สั่งให้ TF-IDF เลิกตัดคำด้วยเว้นวรรค แต่มาใช้ฟังก์ชัน thai_tokenizer ของเราแทน
vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer, token_pattern=None, max_features=5000)

X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# 4. สร้างและสอนโมเดล
print("🧠 กำลัง Train โมเดล Logistic Regression...")
model = LogisticRegression(max_iter=1000, random_state=42)
model.fit(X_train_tfidf, y_train)

# 5. ทดสอบและประเมินผล
print("\n✅ Train เสร็จสิ้น! กำลังทดสอบกับข้อมูล Test Set...")
y_pred = model.predict(X_test_tfidf)
print(f"🎯 ความแม่นยำรวม (Accuracy): {accuracy_score(y_test, y_pred) * 100:.2f}%\n")

# 6. ทดสอบของจริง
print("💬 ทดสอบให้โมเดลทำนายประโยคใหม่ (ที่ไม่มีใน Dataset)")
test_sentences = [
    "แอร์ห้องเรียน CE112 ไม่เย็นเลยครับ ร้อนมาก",
    "รอรถเมล์มอมาครึ่งชั่วโมงแล้ว ยังไม่มาเลย สาย 1 หายไปไหน",
    "เน็ตหอพักล่ม เข้าเว็บลงทะเบียนเรียนไม่ได้เลย"
]

test_sentences_tfidf = vectorizer.transform(test_sentences)
predictions = model.predict(test_sentences_tfidf)

for sentence, category in zip(test_sentences, predictions):
    print(f"📝 ประโยค: \"{sentence}\"")
    print(f"👉 โมเดลทำนายว่าอยู่หมวด: **{category}**\n")