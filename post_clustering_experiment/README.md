# 🔬 คู่มือการทดลองและประเมินผลโมเดลรวมโพสต์ปัญหาซ้ำ (Post Similarity & Clustering)
### ระบบ UP Connect — มหาวิทยาลัยพะเยา

โฟลเดอร์นี้จัดทำขึ้นเป็นพิเศษเพื่อใช้เป็น **หลักฐานทางวิชาการ (Academic Evidence & Experimentation)** สำหรับการนำเสนอโปรเจกต์และรายงานอาจารย์/กรรมการ ว่าระบบตรวจจับและรวมโพสต์ปัญหาซ้ำ (Zero-Click Duplicate Clustering) ได้ผ่านการทดสอบและประเมินผลมาอย่างถูกต้อง

---

## 📁 โครงสร้างไฟล์ในโฟลเดอร์นี้

```text
d:\UP\min_app\post_clustering_experiment\
│
├── 📓 01_post_similarity_and_clustering.ipynb   <-- สมุด Jupyter Notebook สำหรับเปิดรันทีละ Cell
├── 📄 dataset_duplicate_pairs.csv             <-- ชุดข้อมูลคู่ข้อความปัญหา ม.พะเยา (เหมือน vs ต่าง)
├── 📄 train.csv                                <-- ข้อมูลชุดฝึกสอน (Train Set 75%)
├── 📄 test.csv                                 <-- ข้อมูลชุดทดสอบ (Test Set 25%)
├── 📄 run_experiment.py                        <-- สคริปต์รันการทดลองอัตโนมัติรอบเดียวจบ
│
└── 📁 results/                                 <-- ภาพกราฟและตารางผลลัพธ์ (นำไปใส่เล่มรายงานได้ทันที)
    ├── plot_similarity_distribution.png       <-- กราฟการกระจายตัวของค่า Cosine Similarity
    ├── plot_confusion_matrix.png              <-- ตาราง Confusion Matrix แสดงความแม่นยำ
    ├── plot_clustering_tree.png               <-- แผนภาพต้นไม้ Dendrogram แสดงการรวมกลุ่มโพสต์
    └── benchmark_thresholds.csv               <-- ตารางเปรียบเทียบจุดตัด Threshold (50% - 85%)
```

---

## 🚀 วิธีการเปิดใช้งาน

### วิธีที่ 1: เปิดรันผ่าน Jupyter Notebook / VS Code
1. เปิดโปรแกรม **VS Code** หรือพิมพ์คำสั่ง `jupyter notebook` ในโฟลเดอร์นี้
2. ดับเบิลคลิกเปิดไฟล์ **`01_post_similarity_and_clustering.ipynb`**
3. กดปุ่ม **"Run All"** หรือกด `Shift + Enter` ทีละ Cell:
   * **Step 4 มีฟังก์ชัน `test_similarity(text1, text2)`**: ให้คุณพิมพ์ทดสอบ 2 ข้อความใดๆ เพื่อดูค่า % ความมั่นใจและคำแนะนำรวมตั๋วได้สดๆ
   * **Step 7 มี Dendrogram**: แสดงผังต้นไม้การจัดกลุ่มโพสต์ 10 รายการจริงใน ม.พะเยา

### วิธีที่ 2: รันผ่าน Terminal ทันที (ไม่ต้องเปิด Jupyter)
เปิด Terminal แล้วรัน:
```bash
python run_experiment.py
```
สคริปต์จะคำนวณสถิติและเซฟกราฟใหม่ลงในโฟลเดอร์ `results/` ให้โดยอัตโนมัติ

---

## 📊 ตัวชี้วัดที่ได้จากการทดลอง (Key Metrics)
* **โมเดลที่ใช้:** `Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2)`
* **ฟังก์ชันวัดระยะห่าง:** `Semantic Cosine Similarity`
* **จุดตัดที่แนะนำ (Optimal Threshold):** `60% - 70%` 
* **ผลลัพธ์การรวมกลุ่ม:** สามารถตรวจจับปัญหาเดียวกัน (เช่น แอร์ห้อง 1201 ตึก ICT เสีย) ที่ผู้แจ้งพิมพ์ด้วยสำนวนต่างกัน แล้วยุบรวมเป็น **1 ตั๋วแม่ (Parent Ticket)** และ **ตั๋วลูก (Children Tickets)** ได้อย่างสมบูรณ์
