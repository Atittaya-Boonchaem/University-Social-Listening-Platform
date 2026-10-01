"""FastAPI service for real-time Thai complaint categorization with 7 categories (Enterprise 7,000 Records Edition)."""
from contextlib import asynccontextmanager
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from complaint_classifier import ComplaintClassifier, CORE_LABELS

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv("COMPLAINT_MODEL_DIR", BASE_DIR / "model"))
ADMIN_ROUTES_FILE = Path(os.getenv("COMPLAINT_ADMIN_ROUTES", BASE_DIR / "admin_routes.json"))
DATASET_FILE = BASE_DIR / "data" / "up_complaints_data.json"
STATE: dict[str, object] = {}


def load_admin_routes() -> dict[str, list[str]]:
    data = json.loads(ADMIN_ROUTES_FILE.read_text(encoding="utf-8"))
    routes = data.get("routes", {})
    if not set(routes).issuperset(CORE_LABELS):
        raise ValueError("admin_routes.json must define every core label.")
    return {label: list(routes[label]) for label in CORE_LABELS}


@asynccontextmanager
async def lifespan(_: FastAPI):
    STATE["classifier"] = ComplaintClassifier(MODEL_DIR)
    STATE["admin_routes"] = load_admin_routes()
    if DATASET_FILE.exists():
        STATE["dataset"] = json.loads(DATASET_FILE.read_text(encoding="utf-8"))
    yield
    STATE.clear()


app = FastAPI(title="Thai Complaint Classification API - 7,000 Enterprise Records", version="2.5.0", lifespan=lifespan)


class ClassifyRequest(BaseModel):
    complaint_text: str = Field(min_length=1, max_length=5000)
    decision_threshold_percent: float = Field(default=50, ge=0, le=100)
    show_threshold_percent: float = Field(default=0, ge=0, le=100)


@app.get("/dataset")
def get_dataset():
    if "dataset" in STATE:
        return STATE["dataset"]
    if DATASET_FILE.exists():
        return json.loads(DATASET_FILE.read_text(encoding="utf-8"))
    return {"error": "Dataset not found"}


@app.get("/", response_class=HTMLResponse)
def index():
    html_content = """<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ระบบจำแนกหมวดหมู่ข้อร้องเรียน ม.พะเยา (Enterprise 7,136 Records)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --card-bg: rgba(22, 30, 49, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.35);
      --accent: #8b5cf6;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --up-purple: #7928ca;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Prompt', 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at top right, #2e1065, var(--bg-dark) 45%), radial-gradient(circle at bottom left, #0f172a, var(--bg-dark) 55%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.6;
    }
    header {
      padding: 1.2rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      background: rgba(11, 15, 25, 0.7);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .logo-area { display: flex; align-items: center; gap: 0.8rem; }
    .logo-badge {
      background: linear-gradient(135deg, #7928ca, #3b82f6);
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
      box-shadow: 0 0 15px var(--primary-glow);
    }
    .header-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      margin-left: 1.5rem;
      transition: color 0.2s;
    }
    .header-links a:hover { color: #fff; }
    main {
      flex: 1;
      max-width: 1280px;
      width: 100%;
      margin: 1.5rem auto;
      padding: 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.8rem;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 1.8rem;
    }
    @media (max-width: 960px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .glass-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.8rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(16px);
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    textarea {
      width: 100%;
      height: 125px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 1rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.95rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }
    .presets-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 1rem 0 0.5rem;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.2rem;
    }
    .preset-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--primary);
      color: #fff;
    }
    .slider-box {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 1.1rem;
      margin: 1.2rem 0;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .slider-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #93c5fd;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .slider-badge {
      background: #2563eb;
      color: #fff;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .slider-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.6rem;
    }
    input[type=range] {
      width: 100%;
      accent-color: #3b82f6;
      cursor: pointer;
      height: 6px;
    }
    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #7928ca, #2563eb);
      border: none;
      color: #fff;
      padding: 0.9rem;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      box-shadow: 0 4px 15px rgba(121, 40, 202, 0.35);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }
    .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); }
    .submit-btn:active { transform: translateY(0); }
    .results-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 320px;
      color: var(--text-muted);
      text-align: center;
      gap: 0.8rem;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.8rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      margin: 0.2rem;
    }
    .badge-label {
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #60a5fa;
    }
    .badge-review {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }
    .badge-ok {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .score-row {
      margin: 0.8rem 0;
    }
    .score-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
      margin-bottom: 0.3rem;
    }
    .score-pct {
      font-weight: 700;
      font-size: 0.92rem;
    }
    .score-pct.passed {
      color: #34d399;
    }
    .progress-bar-bg {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      height: 10px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #7928ca, #3b82f6);
      transition: width 0.4s ease;
    }
    .progress-threshold-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #f59e0b;
      z-index: 2;
      transition: left 0.1s linear;
    }
    .meta-box {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      padding: 1rem;
      margin-top: 1.2rem;
      font-size: 0.85rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }
    /* Reasoning Box */
    .reasoning-card {
      background: rgba(121, 40, 202, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.35);
      padding: 1.1rem;
      border-radius: 12px;
      margin-bottom: 1.2rem;
    }
    .reasoning-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #c084fc;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .reasoning-item {
      font-size: 0.88rem;
      margin-top: 0.4rem;
      line-height: 1.5;
      color: #e2e8f0;
    }
    /* Dataset Explorer Section */
    .dataset-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.8rem;
    }
    .dataset-tabs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .dataset-tab {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      padding: 0.4rem 0.9rem;
      border-radius: 10px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .dataset-tab.active {
      background: rgba(121, 40, 202, 0.35);
      border-color: #8b5cf6;
      color: #fff;
      font-weight: 600;
    }
    .dataset-list {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding-right: 0.4rem;
    }
    .dataset-item {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .dataset-item:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.3);
      transform: translateX(4px);
    }
    .dataset-item-text { flex: 1; }
    .dataset-use-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: var(--text-main);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #fff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <header>
    <div class="logo-area">
      <span class="logo-badge">UP ENTERPRISE 7,000</span>
      <div>
        <h1 style="font-size: 1.1rem; font-weight: 700;">ระบบจำแนกข้อร้องเรียน มหาวิทยาลัยพะเยา (Enterprise Edition)</h1>
        <p style="font-size: 0.75rem; color: var(--text-muted);">University of Phayao 7,000 Enterprise Records Engine (Powered by WangchanBERTa)</p>
      </div>
    </div>
    <div class="header-links">
      <a href="/dataset" target="_blank">📦 ดู Dataset JSON (7,000 รายการ)</a>
      <a href="/docs" target="_blank">📖 Swagger API Docs</a>
      <a href="/health" target="_blank">🩺 Health Check</a>
    </div>
  </header>

  <main>
    <div class="main-grid">
      <!-- Input Panel -->
      <section class="glass-card">
        <h2>📝 ป้อนข้อความร้องเรียน (ม.พะเยา)</h2>
        <textarea id="complaintInput" placeholder="พิมพ์ข้อร้องเรียนหรือปัญหาที่พบในมหาวิทยาลัยพะเยาที่นี่..."></textarea>
        
        <div class="presets-label">⚡ ตัวอย่างข้อร้องเรียน 7 หมวดหมู่ (คลิกเพื่อทดสอบ):</div>
        <div class="presets">
          <button class="preset-btn" onclick="setPreset('รถเมล์ มพ. หน้าประตู 1 คนแน่นมาก รอเป็นชั่วโมงกว่าจะได้ขึ้น รถไม่พอ')">1. 🚗 การจราจร/การขนส่ง</button>
          <button class="preset-btn" onclick="setPreset('ทางเดินข้างสระน้ำมืดมาก ไฟทางดับหลายดวง เปลี่ยว กลัวมีคนดักจี้ชิงทรัพย์')">2. 🛡️ ความปลอดภัย/อุบัติเหตุ</button>
          <button class="preset-btn" onclick="setPreset('โรงอาหารตึก EN ถังขยะล้น มีเศษอาหารบูด ส่งกลิ่นเหม็นเน่าและแมลงวันเยอะมาก')">3. 🧹 ความสะอาด/ขยะ/สุขอนามัย</button>
          <button class="preset-btn" onclick="setPreset('น้ำรั่วที่อาคารสงวน ท่อน้ำแตก แอร์ห้องเรียน 302 เสียเปิดไม่ติด')">4. 🏢 อาคารสถานที่/สิ่งอำนวยความสะดวก/แจ้งซ่อม</button>
          <button class="preset-btn" onclick="setPreset('ตารางสอบปลายภาคชนกัน 2 วิชา และอาจารย์ยังไม่แจ้งเกณฑ์คะแนนเก็บในระบบ')">5. 📚 การศึกษา/ทุน/บริการนักศึกษา</button>
          <button class="preset-btn" onclick="setPreset('ขีดเต็มแต่หน้าเว็บหมุนไม่หยุด ต่ออยู่แต่เปิดอะไรไม่ได้เลย')">📶 ขีดเต็มแต่หน้าเว็บหมุนไม่หยุด (Network Implicit)</button>
          <button class="preset-btn" onclick="setPreset('นั่งเรียนอยู่แล้วมีเศษปูนจากฝ้าเพดานตกลงมาใกล้โต๊ะ')">🏗️⚠️ เศษปูนจากฝ้าเพดานตกลงมา (Facilities + Safety)</button>
          <button class="preset-btn" onclick="setPreset('วันนี้เรียนที่ ICT สัญญาณขึ้นปกติ แต่พอกดส่งงานแล้วค้างจนหมดเวลาส่ง')">📶📚 ส่งงานแล้วค้างจนหมดเวลา (Network + Education)</button>
          <button class="preset-btn" onclick="setPreset('รถผ่านหน้า ICT เร็วมากจนคนข้ามถนนต้องหยุดหลบ เกือบชนกันตรงป้าย')">🚗🛡️ รถขับเร็วตรงข้ามถนน (Traffic + Safety)</button>
          <button class="preset-btn" onclick="setPreset('ร้านค้าในโรงอาหารขายข้าวแกงแพงมาก ปริมาณน้อยไม่สมราคา และแม่ค้าพูดจาไม่สุภาพ')">📦 ข้าวแกงแพง ปริมาณน้อย (Other)</button>
        </div>

        <div class="slider-box">
          <div class="slider-header">
            <span class="slider-title">🎯 เกณฑ์ตัดสินใจส่งต่อหมวดหมู่ (Decision Threshold):</span>
            <span id="thresholdVal" class="slider-badge">45%</span>
          </div>
          <div class="slider-desc">
            หมวดหมู่ที่มีคะแนน <b>ตั้งแต่เกณฑ์นี้ขึ้นไป</b> จะถูกเลือกเป็น Final Labels และส่งต่อไปยังผู้ดูแลหมวดนั้นโดยอัตโนมัติ (ปรับเลื่อนเพื่อดูผล Real-time ได้ทันที)
          </div>
          <input type="range" id="thresholdRange" min="10" max="90" value="45" oninput="onThresholdChange(this.value)">
        </div>

        <button id="submitBtn" class="submit-btn" onclick="classifyText()">
          <span>🚀 วิเคราะห์และจัดหมวดหมู่</span>
        </button>
      </section>

      <!-- Output Panel -->
      <section class="glass-card">
        <h2>📊 ผลการวิเคราะห์หมวดหมู่</h2>
        <div id="resultsContainer">
          <div class="results-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p>กรอกข้อความและกดปุ่มวิเคราะห์เพื่อดูผลลัพธ์</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Dataset Explorer Section -->
    <section class="glass-card">
      <div class="dataset-header">
        <div>
          <h2>📂 คลังชุดข้อมูลข้อร้องเรียน ม.พะเยา (Enterprise Edition: 7,136 รายการ)</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            ชุดข้อมูลร้องเรียน ม.พะเยา รวม 7,136 รายการ (รวม 136 ข้อความเคสยาก/นัยแฝง/Multi-label ล่าสุด) คลิกข้อความเพื่อนำไปวิเคราะห์ทันที
          </p>
        </div>
        <div class="dataset-tabs" id="datasetTabs">
          <button class="dataset-tab" onclick="switchCategory('traffic')">1. 🚗 การจราจร (1,023)</button>
          <button class="dataset-tab" onclick="switchCategory('safety')">2. 🛡️ ความปลอดภัย (1,013)</button>
          <button class="dataset-tab" onclick="switchCategory('cleaning')">3. 🧹 ความสะอาด (1,018)</button>
          <button class="dataset-tab active" onclick="switchCategory('facilities')">4. 🏢 อาคารสถานที่ (1,027)</button>
          <button class="dataset-tab" onclick="switchCategory('education')">5. 📚 การศึกษา/ทุน (1,019)</button>
          <button class="dataset-tab" onclick="switchCategory('network')">6. 📶 Wi-Fi/ระบบ (1,019)</button>
          <button class="dataset-tab" onclick="switchCategory('other')">7. 📦 ทั่วไป/อื่นๆ (1,017)</button>
        </div>
      </div>
      <div class="dataset-list" id="datasetList">
        <div style="color: var(--text-muted); text-align: center; padding: 2rem;">กำลังโหลดคลังข้อมูล ม.พะเยา 7,136 รายการ...</div>
      </div>
    </section>
  </main>

  <script>
    const categoryNames = {
      traffic: "1. Traffic — การจราจร/การขนส่ง",
      safety: "2. Safety — ความปลอดภัย/อุบัติเหตุ",
      cleaning: "3. Cleaning — ความสะอาด/ขยะ/สุขอนามัย",
      facilities: "4. Facilities — อาคารสถานที่/สิ่งอำนวยความสะดวก/แจ้งซ่อม",
      education: "5. Education — การศึกษา/ทุน/บริการนักศึกษา",
      network: "6. Network — Wi-Fi/อินเทอร์เน็ต/ระบบออนไลน์",
      other: "7. Other — ปัญหานอกเหนือจาก 6 หมวดหลัก"
    };

    let upDataset = null;
    let currentCategory = 'facilities';
    let lastAnalysisData = null;

    async function loadDataset() {
      try {
        const res = await fetch('/dataset');
        upDataset = await res.json();
        renderDatasetCategory(currentCategory);
      } catch (err) {
        document.getElementById('datasetList').innerHTML = '<div style="color: var(--danger);">ไม่สามารถโหลด Dataset ได้</div>';
      }
    }

    function switchCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.dataset-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('onclick').includes(cat));
      });
      renderDatasetCategory(cat);
    }

    function renderDatasetCategory(cat) {
      const container = document.getElementById('datasetList');
      if (!upDataset || !upDataset.categories || !upDataset.categories[cat]) {
        container.innerHTML = '<div style="color: var(--text-muted); padding: 1rem;">ไม่มีข้อมูลในหมวดนี้</div>';
        return;
      }
      const items = upDataset.categories[cat].slice(0, 100); // Display first 100 per tab for fast rendering
      container.innerHTML = items.map((text, idx) => `
        <div class="dataset-item" onclick="useDatasetText('${escapeHtml(text)}')">
          <div class="dataset-item-text"><b>#${idx + 1}</b> ${escapeHtml(text)}</div>
          <button class="dataset-use-btn">ทดสอบข้อความนี้ 🚀</button>
        </div>
      `).join('');
    }

    function useDatasetText(text) {
      document.getElementById('complaintInput').value = text;
      classifyText();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function escapeHtml(str) {
      return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    function setPreset(text) {
      document.getElementById('complaintInput').value = text;
      classifyText();
    }

    function onThresholdChange(val) {
      document.getElementById('thresholdVal').innerText = val + '%';
      if (lastAnalysisData) {
        renderResults(lastAnalysisData, parseFloat(val));
      }
    }

    async function classifyText() {
      const text = document.getElementById('complaintInput').value.trim();
      if (!text) {
        alert('กรุณาใส่ข้อความร้องเรียน');
        return;
      }
      const threshold = parseFloat(document.getElementById('thresholdRange').value);
      const submitBtn = document.getElementById('submitBtn');
      const resultsContainer = document.getElementById('resultsContainer');
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> กำลังวิเคราะห์...';

      try {
        const response = await fetch('/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complaint_text: text,
            decision_threshold_percent: threshold,
            show_threshold_percent: threshold
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'เกิดข้อผิดพลาดในการวิเคราะห์');
        }

        const data = await response.json();
        lastAnalysisData = data;
        renderResults(data, threshold);
      } catch (err) {
        resultsContainer.innerHTML = `<div style="color: var(--danger); padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">❌ ${err.message}</div>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀 วิเคราะห์และจัดหมวดหมู่</span>';
      }
    }

    function renderResults(data, activeThreshold) {
      const threshold = activeThreshold !== undefined ? activeThreshold : (data.decision_threshold_percent || 50);

      const passedCategories = [];
      for (const [label, info] of Object.entries(data.scores)) {
        if (info.percent >= threshold) {
          passedCategories.push(label);
        }
      }
      const finalLabels = passedCategories.length > 0 ? passedCategories : ["other"];

      const labelsBadges = finalLabels.map(label => 
        `<span class="badge badge-label">${categoryNames[label] || label}</span>`
      ).join('');

      const needsReview = passedCategories.length === 0;
      const reviewBadge = needsReview
        ? `<span class="badge badge-review">⚠️ คะแนนไม่ถึงเกณฑ์ ${threshold}% (ส่งเข้า Central Human Review)</span>`
        : `<span class="badge badge-ok">✅ ผ่านเกณฑ์ ${threshold}% (ส่งต่อไปยัง ${passedCategories.length} หมวดหมู่)</span>`;

      let adminHtml = '';
      if (passedCategories.length > 0) {
        adminHtml = passedCategories.map(cat => 
          `<div><b>${categoryNames[cat] || cat}:</b> admin_${cat}</div>`
        ).join('');
      } else {
        adminHtml = '<span style="color: var(--text-muted);">เข้าคิว Central Review Queue</span>';
      }

      let reasoningHtml = '';
      if (data.ai_reasoning && data.ai_reasoning.length > 0) {
        reasoningHtml = `
          <div class="reasoning-card">
            <div class="reasoning-title">
              <span>🧠</span> <span>การคิดวิเคราะห์เชิงเหตุและผลกระทบ (AI Reasoning):</span>
            </div>
            ${data.ai_reasoning.map(r => `<div class="reasoning-item">${r}</div>`).join('')}
          </div>
        `;
      }

      let scoresHtml = '';
      for (const [label, info] of Object.entries(data.scores)) {
        const pct = info.percent;
        const isPassed = pct >= threshold;
        scoresHtml += `
          <div class="score-row">
            <div class="score-info">
              <span>${categoryNames[label] || label}</span>
              <span class="score-pct ${isPassed ? 'passed' : ''}">${pct}% ${isPassed ? '✓' : ''}</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${pct}%"></div>
              <div class="progress-threshold-line" style="left: ${threshold}%" title="Threshold: ${threshold}%"></div>
            </div>
          </div>
        `;
      }

      document.getElementById('resultsContainer').innerHTML = `
        ${reasoningHtml}

        <div style="margin-bottom: 1.2rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">หมวดหมู่ที่จำแนกได้ (Final Labels - เกณฑ์ ≥ ${threshold}%):</div>
          <div>${labelsBadges}</div>
        </div>

        <div style="margin-bottom: 1.2rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">สถานะการคัดกรอง:</div>
          <div>${reviewBadge}</div>
        </div>

        <div style="margin-bottom: 1.2rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">คะแนนความมั่นใจทั้ง 7 หมวด (เปรียบเทียบเกณฑ์ ${threshold}%):</div>
          ${scoresHtml}
        </div>

        <div class="meta-box">
          <div>
            <div style="color: var(--text-muted);">คิวปลายทาง (Routing Queue):</div>
            <div><b>${needsReview ? 'central_human_review' : 'category_admin'}</b></div>
          </div>
          <div>
            <div style="color: var(--text-muted);">ผู้ดูแลที่ได้รับมอบหมาย:</div>
            <div>${adminHtml}</div>
          </div>
          <div>
            <div style="color: var(--text-muted);">โมเดล & คลังข้อมูล:</div>
            <div><code>${data.model_version}</code></div>
          </div>
          <div>
            <div style="color: var(--text-muted);">จำนวนหมวดที่ผ่านเกณฑ์:</div>
            <div><b>${passedCategories.length} หมวด</b></div>
          </div>
        </div>
      `;
    }

    window.addEventListener('DOMContentLoaded', loadDataset);
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": "classifier" in STATE,
        "model_dir": str(MODEL_DIR),
        "core_labels": CORE_LABELS,
    }


@app.post("/classify")
def classify(request: ClassifyRequest):
    classifier = STATE.get("classifier")
    if not isinstance(classifier, ComplaintClassifier):
        raise HTTPException(status_code=503, detail="Model is not ready.")
    
    threshold_val = request.decision_threshold_percent / 100.0 if request.decision_threshold_percent > 0 else (request.show_threshold_percent / 100.0 if request.show_threshold_percent > 0 else 0.50)
    
    try:
        result = classifier.predict(
            request.complaint_text,
            decision_threshold=threshold_val,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    routes = STATE["admin_routes"]
    result["admin_targets"] = {
        label: routes[label] for label in result["assigned_admin_categories"] if label in routes
    }
    return result
