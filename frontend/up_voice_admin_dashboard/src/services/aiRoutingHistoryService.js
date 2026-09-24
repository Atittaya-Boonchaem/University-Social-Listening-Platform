// src/services/aiRoutingHistoryService.js
/**
 * Service for AI Multi-Label Routing Audit Logs & Full History
 * Tracks incoming posts, multi-label confidence scores across all 9 UP categories,
 * threshold cutoffs, and routing destinations.
 */

export const UP_OFFICIAL_CATEGORIES = [
  {
    category_id: 1,
    category_name: 'อาคารและสิ่งอำนวยความสะดวก',
    sla: 'SLA 3 ชม.',
    keywords: ['แอร์', 'ไม่เย็น', 'พัง', 'ก๊อก', 'รั่ว', 'น้ำไหล', 'ชำรุด', 'ลิฟต์', 'เพดาน', 'ประตู', 'หน้าต่าง', 'ตึก', 'พัดลม', 'โต๊ะ', 'เก้าอี้', 'ชักโครก', 'ท่อ', 'หลอดไฟ', 'ไฟดับ', 'มืด', 'สวิตช์'],
  },
  {
    category_id: 2,
    category_name: 'ระบบเครือข่ายและเทคโนโลยี',
    sla: 'SLA 1 ชม.',
    keywords: ['เน็ต', 'wifi', 'wi-fi', 'เน็ตหลุด', 'อินเทอร์เน็ต', 'ict', 'คอม', 'สัญญาณ', 'เว็บ', 'reg', 'dsmart', 'ระบบล่ม', 'เข้าไม่ได้', 'server', 'citcoms', 'รหัสผ่าน', 'อีเมล', 'up mail'],
  },
  {
    category_id: 3,
    category_name: 'การเรียนการสอนและวิชาการ',
    sla: 'SLA 6 ชม.',
    keywords: ['เรียน', 'สอน', 'อาจารย์', 'วิชา', 'สอบ', 'เกรด', 'ตารางเรียน', 'ลงทะเบียน', 'การศึกษา', 'ห้องเรียน', 'ตารางสอบ', 'เซค', 'วิทยานิพนธ์', 'ดรอป', 'เพิ่มถอน'],
  },
  {
    category_id: 4,
    category_name: 'ภูมิทัศน์และความสะอาด',
    sla: 'SLA 2 ชม.',
    keywords: ['ขยะ', 'เหม็น', 'สกปรก', 'กลิ่น', 'ซาก', 'เลือด', 'หมาตาย', 'สัตว์ตาย', 'ใบไม้', 'หญ้า', 'รก', 'ล้นถัง', 'ท่อตัน', 'ทำความสะอาด', 'กิ่งไม้', 'ห้องน้ำสกปรก', 'คราบ'],
  },
  {
    category_id: 5,
    category_name: 'ความปลอดภัยและจราจร',
    sla: 'SLA 1 ชม.',
    keywords: ['ปลอดภัย', 'รปภ', 'ยาม', 'ขโมย', 'หาย', 'กล้อง', 'cctv', 'จราจร', 'รถชน', 'ชน', 'มืด', 'เสี่ยง', 'ทางมืด', 'หมวกกันน็อค', 'ตีกัน', 'คนแปลกหน้า', 'กัด', 'งู', 'อันตราย'],
  },
  {
    category_id: 6,
    category_name: 'การเดินทางและระบบขนส่ง',
    sla: 'SLA 4 ชม.',
    keywords: ['รถเมล์', 'ขสมพ', 'รถมพ', 'สาย 1', 'สาย 2', 'สาย 3', 'ป้ายรถ', 'พขร', 'คนขับ', 'มาช้า', 'รอนาน', 'แน่น', 'แซง', 'วิน', 'รถกอล์ฟ', 'เดินทาง', 'ขนส่ง', 'มอไซค์'],
  },
  {
    category_id: 7,
    category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร',
    sla: 'SLA 2 ชม.',
    keywords: ['อาหาร', 'โรงอาหาร', 'แมลงสาบ', 'สิ่งแปลกปลอม', 'บูด', 'ท้องเสีย', 'ร้านข้าว', 'แม่ค้า', 'จานชาม', 'หนู', 'สุขาภิบาลอาหาร', 'สุขอนามัย', 'น้ำดื่ม', 'กิน'],
  },
  {
    category_id: 8,
    category_name: 'สาธารณสุขและสุขอนามัย',
    sla: 'SLA 2 ชม.',
    keywords: ['พยาบาล', 'หมอ', 'ยา', 'โรงพยาบาล', 'ป่วย', 'คลินิก', 'สุขภาพ', 'วัคซีน', 'ฉีดยา', 'ทำแผล', 'ปฐมพยาบาล', 'เป็นลม', 'ติดเชื้อ', 'หมดสติ', 'รถพยาบาล'],
  },
  {
    category_id: 9,
    category_name: 'บริการทั่วไป / อื่นๆ',
    sla: 'SLA 12 ชม.',
    keywords: ['ทุน', 'กิจกรรม', 'บัตรนิสิต', 'เอกสาร', 'สอบถาม', 'ติดต่อ', 'ของหาย', 'ช่วยด้วย', 'ทั่วไป', 'คำถาม', 'แนะแนว', 'หอพัก'],
  }
];

export const computeAll9CategoryScores = (text) => {
  if (!text || !text.trim()) {
    return UP_OFFICIAL_CATEGORIES.map((cat, idx) => ({
      category_id: cat.category_id,
      category_name: cat.category_name,
      sla: cat.sla,
      score: idx === 0 ? 94 : idx === 1 ? 88 : idx === 2 ? 65 : idx === 3 ? 28 : idx === 4 ? 18 : 0,
      reason: idx < 3 ? 'พบความเชื่อมโยงกับบริบทของปัญหา' : idx < 5 ? 'มีความเชื่อมโยงทางอ้อม' : 'ไม่พบความเชื่อมโยง (0%)',
    }));
  }

  const t = text.toLowerCase();

  const results = UP_OFFICIAL_CATEGORIES.map((cat) => {
    let matchedKeywords = [];
    cat.keywords.forEach((kw) => {
      if (t.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    });

    let score = 0;
    let reason = 'ไม่พบคำสำคัญหรือบริบทที่สอดคล้อง (0%)';

    if (matchedKeywords.length >= 3) {
      score = Math.min(98, 88 + matchedKeywords.length * 3);
      reason = `พบคำสำคัญตรงกับภารกิจหลัก (${matchedKeywords.slice(0, 3).join(', ')})`;
    } else if (matchedKeywords.length === 2) {
      score = Math.floor(Math.random() * 8) + 82; // 82 - 89%
      reason = `พบคำสำคัญสำคัญ 2 คำ (${matchedKeywords.join(', ')})`;
    } else if (matchedKeywords.length === 1) {
      score = Math.floor(Math.random() * 12) + 64; // 64 - 75%
      reason = `พบคำสำคัญที่เกี่ยวข้อง (${matchedKeywords[0]})`;
    } else {
      // Check secondary context
      if (t.includes('ตึก') || t.includes('อาคาร')) {
        if (cat.category_name === 'อาคารและสิ่งอำนวยความสะดวก') {
          score = 28;
          reason = 'ระบุพื้นที่อาคารแต่ไม่พบอาการชำรุดชัดเจน';
        }
      }
      if (t.includes('โรงอาหาร')) {
        if (cat.category_name === 'ภูมิทัศน์และความสะอาด') {
          score = 35;
          reason = 'พื้นที่โรงอาหารมีความเกี่ยวข้องกับงานความสะอาด';
        }
      }
      if (score === 0) {
        score = 0;
        reason = 'ไม่พบความเชื่อมโยงโดยตรง (0%)';
      }
    }

    return {
      category_id: cat.category_id,
      category_name: cat.category_name,
      sla: cat.sla,
      score: score,
      matched_keywords: matchedKeywords,
      reason: reason,
    };
  });

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results.map((item, idx) => ({ ...item, rank: idx + 1 }));
};

const INITIAL_AUDIT_HISTORY = [
  {
    ticket_id: 'UP-9828',
    created_at: '25 ก.ย. 2026, 03:45 น.',
    relative_time: 'เมื่อ 5 นาทีที่แล้ว',
    post_text: 'รถเมล์สาย 1 ขับแซงอันตรายแล้วชนสุนัขบาดเจ็บสาหัสหน้าอาคาร PKY เลือดไหลเต็มถนน',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 94,
    all_scores: [
      { category_name: 'การเดินทางและระบบขนส่ง', score: 94, sla: 'SLA 4 ชม.', reason: 'ตรวจสอบอุบัติเหตุรถเมล์ มพ. สาย 1 และพฤติกรรมการขับขี่' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 88, sla: 'SLA 2 ชม.', reason: 'เก็บกู้ซากสัตว์และทำความสะอาดคราบเลือดเร่งด่วน' },
      { category_name: 'ความปลอดภัยและจราจร', score: 72, sla: 'SLA 1 ชม.', reason: 'อำนวยความสะดวกการจราจรและบันทึกภาพกล้องวงจรปิด' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 28, sla: 'SLA 3 ชม.', reason: 'ตรวจสอบความเสียหายบริเวณฟุตบาทหน้าตึก PKY' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 18, sla: 'SLA 2 ชม.', reason: 'ควบคุมสุขอนามัยสัตว์เสี่ยงติดเชื้อ' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 0, sla: 'SLA 6 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 0, sla: 'SLA 12 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9825',
    created_at: '25 ก.ย. 2026, 03:22 น.',
    relative_time: 'เมื่อ 28 นาทีที่แล้ว',
    post_text: 'แอร์ห้องเรียน ICT 123 เสียไม่เย็นเลย แถมเน็ต Wi-Fi หลุดทั้งคาบเรียน อาจารย์สอนต่อไม่ได้',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 96,
    all_scores: [
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 96, sla: 'SLA 1 ชม.', reason: 'ตรวจสอบ Access Point และสัญญาณ Wi-Fi ห้อง ICT 123' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 91, sla: 'SLA 3 ชม.', reason: 'ซ่อมบำรุงเครื่องปรับอากาศห้อง ICT 123' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 38, sla: 'SLA 6 ชม.', reason: 'ส่งผลกระทบต่อคาบเรียน ประสานงานอาจารย์ผู้สอน' },
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 14, sla: 'SLA 12 ชม.', reason: 'ดูแลอำนวยความสะดวกอาคาร' },
      { category_name: 'ความปลอดภัยและจราจร', score: 4, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยงโดยตรง' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 0, sla: 'SLA 4 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9821',
    created_at: '25 ก.ย. 2026, 02:40 น.',
    relative_time: 'เมื่อ 1 ชม.ที่แล้ว',
    post_text: 'พบสิ่งแปลกปลอมและแมลงสาบในชามก๋วยเตี๋ยว โรงอาหารกลาง มพ. กลิ่นเน่าเหม็นมาก',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 97,
    all_scores: [
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 97, sla: 'SLA 2 ชม.', reason: 'ตรวจสุขาภิบาลร้านค้าโรงอาหารกลางและสั่งพักร้าน' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 78, sla: 'SLA 2 ชม.', reason: 'กำจัดแมลงและทำความสะอาดโต๊ะโรงอาหาร' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 62, sla: 'SLA 2 ชม.', reason: 'เฝ้าระวังความเสี่ยงอาหารเป็นพิษต่อนิสิต' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 20, sla: 'SLA 3 ชม.', reason: 'ตรวจระบบท่อน้ำทิ้งและดักไขมัน' },
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 10, sla: 'SLA 12 ชม.', reason: 'คุ้มครองผู้บริโภคในมหาวิทยาลัย' },
      { category_name: 'ความปลอดภัยและจราจร', score: 5, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยงโดยตรง' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 0, sla: 'SLA 6 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 0, sla: 'SLA 4 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9818',
    created_at: '25 ก.ย. 2026, 01:15 น.',
    relative_time: 'เมื่อ 2 ชม.ที่แล้ว',
    post_text: 'ทางเดินข้างหอพัก UP มืดสนิท หลอดไฟทางดับหมด 4 ดวง กลัวคนมาดักชิงทรัพย์',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 96,
    all_scores: [
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 96, sla: 'SLA 3 ชม.', reason: 'เปลี่ยนหลอดไฟทางเดินและตรวจระบบสายไฟ' },
      { category_name: 'ความปลอดภัยและจราจร', score: 85, sla: 'SLA 1 ชม.', reason: 'เพิ่มความถี่สายตรวจ รปภ. จุดมืดเสี่ยงภัยข้างหอพัก' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 32, sla: 'SLA 2 ชม.', reason: 'ตัดแต่งต้นไม้ที่บดบังแสงไฟ' },
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 15, sla: 'SLA 12 ชม.', reason: 'สวัสดิการหอพักนิสิต' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 8, sla: 'SLA 4 ชม.', reason: 'ทางสัญจรข้างหอพัก' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 0, sla: 'SLA 6 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9814',
    created_at: '24 ก.ย. 2026, 22:30 น.',
    relative_time: 'เมื่อ 5 ชม.ที่แล้ว',
    post_text: 'ระบบลงทะเบียนเรียน Reg ช้ามาก ขึ้น error 504 gateway timeout ทำให้นิสิตเพิ่มถอนไม่ทัน',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 98,
    all_scores: [
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 98, sla: 'SLA 1 ชม.', reason: 'เซิร์ฟเวอร์ระบบ Reg โหลดสูง แก้ไขคอขวดระบบด่วน' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 88, sla: 'SLA 6 ชม.', reason: 'ขยายระยะเวลาเพิ่ม-ถอนรายวิชาเยียวยานิสิต' },
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 25, sla: 'SLA 12 ชม.', reason: 'ศูนย์บริการข้อมูลการลงทะเบียน' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 0, sla: 'SLA 3 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ความปลอดภัยและจราจร', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 0, sla: 'SLA 4 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9810',
    created_at: '24 ก.ย. 2026, 18:10 น.',
    relative_time: 'เมื่อ 9 ชม.ที่แล้ว',
    post_text: 'มีใครทำพวงกุญแจห้อยกระเป๋ารูปหมีหล่นหายแถวศาลาริมน้ำมั้ยครับ เก็บได้มาฝากไว้ที่ป้อมยาม',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'auto_routed',
    top_confidence: 85,
    all_scores: [
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 85, sla: 'SLA 12 ชม.', reason: 'รับแจ้งของหายและติดตามเจ้าของทรัพย์สิน' },
      { category_name: 'ความปลอดภัยและจราจร', score: 68, sla: 'SLA 1 ชม.', reason: 'ประสานงานป้อมยามดูแลทรัพย์สินที่เก็บได้' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 15, sla: 'SLA 2 ชม.', reason: 'พื้นที่บริเวณศาลาริมน้ำ' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 5, sla: 'SLA 3 ชม.', reason: 'ไม่พบความเชื่อมโยงโดยตรง' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 0, sla: 'SLA 6 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 0, sla: 'SLA 4 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่พบความเชื่อมโยง (0%)' },
    ]
  },
  {
    ticket_id: 'UP-9805',
    created_at: '24 ก.ย. 2026, 15:40 น.',
    relative_time: 'เมื่อ 12 ชม.ที่แล้ว',
    post_text: 'สวัสดีครับ อยากทราบว่าสัปดาห์หน้าจะมีการจัดกิจกรรมอะไรบ้างครับ',
    cutoff_threshold: 40,
    model: 'PhayaoBERT-v4 (WangchanBERTa)',
    status: 'manual_review',
    top_confidence: 34,
    all_scores: [
      { category_name: 'บริการทั่วไป / อื่นๆ', score: 34, sla: 'SLA 12 ชม.', reason: 'สอบถามข้อมูลทั่วไปแต่ไม่มีรายละเอียดเจาะจง' },
      { category_name: 'การเรียนการสอนและวิชาการ', score: 25, sla: 'SLA 6 ชม.', reason: 'อาจเป็นกิจกรรมวิชาการ' },
      { category_name: 'ความปลอดภัยและจราจร', score: 5, sla: 'SLA 1 ชม.', reason: 'ไม่เข้าข่าย' },
      { category_name: 'อาคารและสิ่งอำนวยความสะดวก', score: 0, sla: 'SLA 3 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
      { category_name: 'ระบบเครือข่ายและเทคโนโลยี', score: 0, sla: 'SLA 1 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
      { category_name: 'ภูมิทัศน์และความสะอาด', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
      { category_name: 'การเดินทางและระบบขนส่ง', score: 0, sla: 'SLA 4 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
      { category_name: 'สุขอนามัย/ความปลอดภัยทางอาหาร', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
      { category_name: 'สาธารณสุขและสุขอนามัย', score: 0, sla: 'SLA 2 ชม.', reason: 'ไม่เข้าข่าย (0%)' },
    ]
  }
];

const STORAGE_KEY = 'up_ai_routing_audit_logs_v1';

export function getAIRoutingHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_HISTORY));
      return INITIAL_AUDIT_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_HISTORY;
  }
}

export function saveAIRoutingRecord(record) {
  try {
    const history = getAIRoutingHistory();
    const newRecord = {
      ticket_id: record.ticket_id || `UP-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
      relative_time: 'เมื่อสักครู่',
      post_text: record.post_text,
      cutoff_threshold: record.cutoff_threshold || 40,
      model: record.model || 'PhayaoBERT-v4 (WangchanBERTa)',
      status: record.status || (record.top_confidence >= record.cutoff_threshold ? 'auto_routed' : 'manual_review'),
      top_confidence: record.top_confidence,
      all_scores: record.all_scores || computeAll9CategoryScores(record.post_text),
    };
    const updated = [newRecord, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save routing record:', err);
    return getAIRoutingHistory();
  }
}
