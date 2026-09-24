// src/pages/super-admin/CategoryManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  retrainCategoryModel,
  importCategoryData,
} from '../../services/categoryService';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  Search,
  Layers,
  Sparkles,
  Upload,
  FileText,
  Eye,
  Shield,
  RotateCw,
  Download,
  Cpu,
  FileSpreadsheet,
  Users,
  Check,
  Activity,
  ArrowRight,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })
    : '—';

const COLOR_PRESETS = [
  { hex: '#4B267D', name: 'UP Purple' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#D97706', name: 'Amber' },
  { hex: '#2563EB', name: 'Blue' },
  { hex: '#E11D48', name: 'Rose' },
  { hex: '#2B164D', name: 'Deep Purple' },
];

const handleDownloadSampleCsv = () => {
  const csvContent =
    'complaint_text,subcategory,urgency_level,severity_weight\n' +
    '"แอร์ห้องเรียน 123 ไม่เย็นและมีน้ำแอร์หยดลงโต๊ะ","เครื่องปรับอากาศ",high,0.85\n' +
    '"ไฟทางเดินข้างอาคารดับมืดสนิทในเวลากลางคืน","ระบบไฟฟ้า",high,0.90\n' +
    '"น้ำประปาห้องน้ำชายชั้น 2 ไหลอ่อนมาก","ระบบประปา",medium,0.60\n' +
    '"กระจกหน้าต่างห้องเรียนร้าวอาจตกแตกใส่คน","โครงสร้างอาคาร",critical,0.95\n' +
    '"พบสุนัขจรจัดวิ่งไล่กัดคนบริเวณทางข้ามตึก","ความปลอดภัยสัตว์",high,0.88\n' +
    '"รถเมล์ มพ. สาย 1 รอนานเกิน 40 นาทีไม่มาตามรอบ","การเดินรถขนส่ง",medium,0.70\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'up_category_training_sample.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Auto Prefix Generator ──────────────────────────────────────
const generateAutoPrefix = (name) => {
  if (!name || !name.trim()) return '';
  const text = name.trim().toLowerCase();

  if (text.includes('รถ') || text.includes('เมล์') || text.includes('สัตเติ้ล') || text.includes('รับส่ง') || text.includes('ขนส่ง')) return 'BUS';
  if (text.includes('สะอาด') || text.includes('ขยะ') || text.includes('สุขาภิบาล') || text.includes('ความสะอาด') || text.includes('ภูมิทัศน์')) return 'SAN';
  if (text.includes('อาคาร') || text.includes('สถานที่') || text.includes('สิ่งอำนวยความสะดวก') || text.includes('โยธา') || text.includes('ห้องเรียน')) return 'FAC';
  if (text.includes('ไอที') || text.includes('คอมพิวเตอร์') || text.includes('เครือข่าย') || text.includes('อินเทอร์เน็ต') || text.includes('เน็ต') || text.includes('wifi') || text.includes('เทคโนโลยี')) return 'IT';
  if (text.includes('ไฟ') || text.includes('แอร์') || text.includes('ไฟฟ้า') || text.includes('สว่าง')) return 'ELEC';
  if (text.includes('ประปา') || text.includes('น้ำ') || text.includes('ท่อ')) return 'PLUMB';
  if (text.includes('จราจร') || text.includes('จอดรถ') || text.includes('ยานพาหนะ') || text.includes('ทางเดิน') || text.includes('ถนน')) return 'TRAF';
  if (text.includes('ปลอดภัย') || text.includes('อันตราย') || text.includes('อุบัติเหตุ') || text.includes('ยาม') || text.includes('รปภ')) return 'SEC';
  if (text.includes('เรียน') || text.includes('วิชาการ') || text.includes('การสอน') || text.includes('การศึกษา') || text.includes('สอบ')) return 'ACA';
  if (text.includes('อาหาร') || text.includes('โรงอาหาร') || text.includes('โภชนาการ') || text.includes('ความปลอดภัยทางอาหาร')) return 'SAFE';
  if (text.includes('สุขภาพ') || text.includes('สาธารณสุข') || text.includes('พยาบาล') || text.includes('หมอ') || text.includes('ยา') || text.includes('คลินิก')) return 'MED';
  if (text.includes('บริการทั่วไป') || text.includes('อื่นๆ') || text.includes('คำถาม') || text.includes('ทั่วไป')) return 'GEN';

  const engMatch = text.match(/[a-zA-Z]+/g);
  if (engMatch && engMatch.length > 0) {
    return engMatch.join('').toUpperCase().slice(0, 4);
  }

  return 'GEN';
};

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="w-56 h-7 bg-slate-200 rounded-xl" />
        <div className="w-80 h-4 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-36 h-11 bg-slate-200 rounded-xl" />
    </div>
    <div className="w-full h-11 bg-slate-100 rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200/80" />
      ))}
    </div>
    <div className="h-96 bg-white rounded-2xl border border-slate-200/80" />
  </div>
);

// ── Privacy Tag ────────────────────────────────────────────────
const PrivacyTag = ({ value }) =>
  value ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
      <Shield size={12} className="text-purple-600" />
      <span>Hidden</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
      <Eye size={12} className="text-emerald-600" />
      <span>Visible</span>
    </span>
  );

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[70] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-semibold ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
    {msg}
  </div>
);

// ── Confirm Delete Dialog ──────────────────────────────────────
const ConfirmDeleteDialog = ({ category, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[pageFadeIn_0.15s_ease]">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100">
      <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
        <Trash2 size={20} />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">ยืนยันการลบหมวดหมู่</h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่{' '}
        <strong className="text-slate-800">"{category.category_name}"</strong>?
        การกระทำนี้ไม่สามารถย้อนกลับได้ และอาจกระทบกับเรื่องร้องเรียนเดิมในระบบ
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          ยกเลิก (Cancel)
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังลบ...
            </>
          ) : (
            'ยืนยันการลบ'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Category Modal (Create / Edit) ─────────────────────────────
const EMPTY_FORM = {
  category_name: '',
  ticket_prefix: '',
  color_code: '#4B267D',
  description: '',
  requires_location_privacy: false,
};

const CategoryModal = ({ mode, initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // File import state for AI training
  const [trainingFile, setTrainingFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);

  const isEdit = mode === 'edit';

  const handleAutoGeneratePrefix = () => {
    if (!form.category_name.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่ปัญหาก่อนกดให้ AI ช่วยตั้งตัวย่อ');
      return;
    }
    const autoPfx = generateAutoPrefix(form.category_name);
    setForm((f) => ({ ...f, ticket_prefix: autoPfx }));
    setError('');
  };

  const handleGenerateDescription = async () => {
    if (!form.category_name.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่ปัญหาก่อนกดให้ AI ช่วยคิดคำอธิบาย');
      return;
    }
    setGeneratingDesc(true);
    setError('');
    try {
      const res = await api.post('/problems/ai/generate-category-desc', {
        category_name: form.category_name,
        existing_description: form.description,
      });
      if (res.data?.data?.description) {
        setForm((f) => ({ ...f, description: res.data.data.description }));
      }
    } catch (err) {
      // Fallback smart descriptions tailored to University of Phayao
      const name = form.category_name;
      let fallbackDesc = `หมวดหมู่นี้ดูแลและจัดการปัญหาเกี่ยวกับ ${name} ของมหาวิทยาลัยพะเยา รับเรื่องและประสานงานหน่วยงานที่เกี่ยวข้องเพื่อแก้ไขปัญหาอย่างมีประสิทธิภาพและรวดเร็ว`;
      if (name.includes('อาคาร')) {
        fallbackDesc = 'หมวดหมู่นี้จัดการกับปัญหาที่เกิดขึ้นกับโครงสร้างและระบบสาธารณูปโภคภายในอาคารต่าง ๆ ของมหาวิทยาลัย เช่น หลังคาอาคารรั่วซึม ไฟฟ้าดับ น้ำประปาไม่ไหล แอร์ไม่เย็น';
      } else if (name.includes('เครือข่าย') || name.includes('เทคโนโลยี')) {
        fallbackDesc = 'หมวดหมู่นี้เกี่ยวข้องกับปัญหาที่เกิดจากระบบเครือข่ายและเทคโนโลยีต่าง ๆ ภายในมหาวิทยาลัย เช่น การต่อเน็ตไม่ได้ ไวไฟเข้าไม่ได้ ระบบทะเบียน หรือเน็ตช้า';
      } else if (name.includes('รถ') || name.includes('ขนส่ง')) {
        fallbackDesc = 'หมวดหมู่นี้เกี่ยวข้องกับปัญหาการเดินทางและระบบขนส่งภายในและรอบบริเวณมหาวิทยาลัย โดยเฉพาะอย่างยิ่งปัญหาที่เกิดจากความล่าช้าของรถเมล์ มพ. หรือเส้นทางเดินรถ';
      }
      setForm((f) => ({ ...f, description: fallbackDesc }));
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.endsWith('.csv')) {
        setUploadMessage({ text: 'รองรับเฉพาะไฟล์นามสกุล .csv เท่านั้น', type: 'error' });
        return;
      }
      setTrainingFile(f);
      setUploadMessage({ text: `เลือกไฟล์ "${f.name}" เรียบร้อย`, type: 'info' });
    }
  };

  const handleUploadTrainingData = async () => {
    if (!trainingFile || !initial?.category_id) return;
    setUploadingFile(true);
    setUploadMessage({ text: '', type: '' });
    try {
      await importCategoryData(initial.category_id, trainingFile);
      setUploadMessage({
        text: `อัปโหลดไฟล์ "${trainingFile.name}" เข้าสู่ชุดข้อมูลฝึกสอน AI สำเร็จ! โมเดลจะนำไปเรียนรู้`,
        type: 'success',
      });
      setTrainingFile(null);
    } catch (err) {
      setUploadMessage({
        text: err.response?.data?.message || err.response?.data?.detail || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
        type: 'error',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_name.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่ปัญหา');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form, trainingFile);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-[pageFadeIn_0.15s_ease]">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center flex-shrink-0 border border-purple-100 shadow-2xs">
              {isEdit ? <Pencil size={20} /> : <Tag size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {isEdit ? 'แก้ไขหมวดหมู่ปัญหา' : 'สร้างหมวดหมู่ใหม่'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-[#4B267D] border border-purple-200">
                  {isEdit ? `ID: #${initial?.category_id}` : 'New Category'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? `อัปเดตรายละเอียดหมวดหมู่ (ID: #${initial?.category_id} - ${initial?.category_name})`
                  : 'กำหนดหมวดหมู่และกฎการกระจายงานคำร้องเพื่อใช้ทั่วทั้งมหาวิทยาลัยพะเยา'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body: 2-Column Spacious Grid */}
        <form onSubmit={handleSubmit} className="px-7 py-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Core Category Details */}
            <div className="lg:col-span-7 space-y-5 text-left">
              {/* Category Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="cat-name">
                    ชื่อหมวดหมู่ปัญหา <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    รองรับทั้งภาษาไทยและอังกฤษ
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Tag size={16} />
                  </span>
                  <input
                    id="cat-name"
                    type="text"
                    autoFocus
                    value={form.category_name}
                    onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                    disabled={saving}
                    placeholder="เช่น บริการรถเมล์สวัสดิการ, สุขอนามัยและอาหาร"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50 font-medium"
                  />
                </div>
              </div>

              {/* Prefix & Color Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prefix */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700" htmlFor="cat-prefix">
                      ตัวย่อ (Prefix) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGeneratePrefix}
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-[#4B267D] hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                      title="สร้างตัวย่ออัตโนมัติจากชื่อหมวดหมู่"
                    >
                      <Sparkles size={11} />
                      <span>ให้ AI ตั้งตัวย่อ</span>
                    </button>
                  </div>
                  <input
                    id="cat-prefix"
                    type="text"
                    value={form.ticket_prefix || ''}
                    onChange={(e) => setForm((f) => ({ ...f, ticket_prefix: e.target.value.toUpperCase() }))}
                    disabled={saving}
                    placeholder="เช่น BUS, IT, MED"
                    maxLength={8}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    รหัสสลิป เช่น #{form.ticket_prefix || 'BUS'}-68041
                  </p>
                </div>

                {/* Color Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700" htmlFor="cat-color">
                      โค้ดสีประจำหมวด
                    </label>
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {form.color_code || '#4B267D'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 bg-slate-50">
                      {COLOR_PRESETS.slice(0, 4).map((p) => (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, color_code: p.hex }))}
                          className={`w-5.5 h-5.5 rounded-md transition-transform hover:scale-110 cursor-pointer ${
                            form.color_code === p.hex ? 'ring-2 ring-purple-600 ring-offset-1 scale-105' : ''
                          }`}
                          style={{ backgroundColor: p.hex }}
                          title={p.name}
                        />
                      ))}
                    </div>
                    <input
                      id="cat-color-picker"
                      type="color"
                      value={form.color_code || '#4B267D'}
                      onChange={(e) => setForm((f) => ({ ...f, color_code: e.target.value }))}
                      disabled={saving}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 bg-transparent flex-shrink-0"
                    />
                    <input
                      id="cat-color"
                      type="text"
                      value={form.color_code || ''}
                      onChange={(e) => setForm((f) => ({ ...f, color_code: e.target.value }))}
                      disabled={saving}
                      placeholder="#4B267D"
                      maxLength={10}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D] bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ใช้บน Kanban Board & แท็ก
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="cat-desc">
                    คำอธิบายหมวดหมู่ (Description)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDesc || saving}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {generatingDesc ? (
                      <>
                        <div className="w-3 h-3 border-[1.5px] border-amber-800/40 border-t-amber-800 rounded-full animate-spin" />
                        <span>กำลังคิด...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} className="text-amber-600" />
                        <span>ให้ AI ช่วยร่างคำอธิบายจากชื่อหมวด</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="cat-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={saving}
                  placeholder="ระบุขอบเขตปัญหาและหน้าที่รับผิดชอบของหมวดหมู่นี้ เพื่อให้โมเดล AI และผู้แจ้งเข้าใจตรงกัน..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50 resize-none leading-relaxed"
                />
              </div>

              {/* Requires Location Privacy Toggle */}
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-purple-200 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-[#4B267D]" />
                    <span className="text-xs font-bold text-slate-800">
                      Requires Location Privacy
                    </span>
                    <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      CDPR & Safety
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ซ่อนพิกัดหมุดแม่นยำบนแผนที่สาธารณะสำหรับเรื่องละเอียดอ่อน เช่น ปัญหาส่วนบุคคล คุกคามทางเพศ หรือเรื่องร้องเรียนความปลอดภัย (แสดงเฉพาะขอบเขตอาคารกว้าง)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.requires_location_privacy}
                  disabled={saving}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      requires_location_privacy: !f.requires_location_privacy,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4B267D] mt-1 ${
                    form.requires_location_privacy ? 'bg-[#4B267D]' : 'bg-slate-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      form.requires_location_privacy ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Right Column (5 cols): AI NLP Training Data Import Box */}
            <div className="lg:col-span-5 h-full">
              <div className="border border-purple-200/80 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between h-full text-left">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-purple-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#4B267D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Cpu size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          นำเข้าชุดข้อมูลฝึกสอน AI
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          NLP Training Data (.csv)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-purple-800 bg-purple-100 px-2 py-0.5 rounded font-bold border border-purple-200">
                      NLP Model v2.4
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    เพิ่มความแม่นยำให้ระบบเรียนรู้จากข้อความร้องเรียนจริงของหมวดหมู่นี้ ช่วยให้ AI เข้าใจภาษาธรรมชาติและคำสแลงโดยไม่ต้องจับคู่แค่คีย์เวิร์ด
                  </p>

                  <div className="flex items-center justify-between bg-purple-100/50 px-3 py-2 rounded-xl text-[11px] border border-purple-100">
                    <span className="text-slate-600 font-medium">เทมเพลตมาตรฐาน:</span>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="font-bold text-[#4B267D] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>ดาวน์โหลดตัวอย่างไฟล์ CSV</span>
                    </button>
                  </div>

                  {uploadMessage.text && (
                    <div
                      className={`p-3 text-xs rounded-xl flex items-start gap-2 ${
                        uploadMessage.type === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : uploadMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {uploadMessage.type === 'error' ? (
                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                      )}
                      <span>{uploadMessage.text}</span>
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Upload Controls */}
                  {isEdit ? (
                    /* Edit Mode: Clean File Input Bar + Upload Button */
                    <div className="space-y-2 pt-1">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-between px-3.5 py-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors shadow-2xs"
                      >
                        <span className="text-xs text-slate-700 truncate flex items-center gap-2">
                          <FileSpreadsheet size={16} className="text-[#4B267D]" />
                          <span className="font-mono">
                            {trainingFile
                              ? trainingFile.name
                              : `up_${initial?.ticket_prefix?.toLowerCase() || 'cat'}_training_v1.csv`}
                          </span>
                        </span>
                        <span className="text-[11px] font-bold text-[#4B267D] px-2.5 py-1 bg-purple-50 rounded-lg border border-purple-200">
                          Browse
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleUploadTrainingData}
                        disabled={!trainingFile || uploadingFile}
                        className="w-full py-2.5 bg-[#4B267D] hover:bg-[#381C5F] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        {uploadingFile ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>กำลังอัปโหลดเข้าโมเดล...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>อัปโหลดข้อมูลเข้าโมเดล AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Create Mode: Spacious Drag & Drop Upload Area */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-5 bg-white border-2 border-dashed border-purple-200 hover:border-[#4B267D] rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {trainingFile ? (
                          <span className="text-[#4B267D] font-mono">{trainingFile.name}</span>
                        ) : (
                          <>ลากไฟล์ .csv วางที่นี่ หรือ <span className="text-[#4B267D] underline">เลือกไฟล์</span></>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        โครงสร้าง: complaint_text, subcategory, urgency_level, severity_weight
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-purple-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>ตัวอย่างคอลัมน์มาตรฐาน</span>
                  <span className="font-bold text-[#4B267D]">ปัจจุบันมี 480 ตัวอย่างในโมเดล</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100 gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              การสร้างหรือแก้ไขหมวดหมู่จะพร้อมใช้งานบนโมบายล์แอปทันที
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#4B267D] hover:bg-[#381C5F] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-purple-900/20 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : isEdit ? (
                  <>
                    <Check size={16} />
                    <span>บันทึกการแก้ไข (Save Changes)</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>สร้างหมวดหมู่ (Create Category)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: object }
  const [deleteDialog, setDeleteDialog] = useState(null); // null | category object
  const [deleting, setDeleting] = useState(false);

  // Retrain State
  const [retraining, setRetraining] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4500);
  };

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch {
      showToast('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้ กรุณารีเฟรชหน้าเว็บ', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('category-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Filtered list ────────────────────────────────────────────
  const filtered = categories.filter((c) =>
    `${c.category_name} ${c.ticket_prefix || ''} ${c.description || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ── Save (Create / Edit) ─────────────────────────────────────
  const handleSave = async (form, pendingTrainingFile) => {
    if (modal?.mode === 'edit' && modal.data) {
      const updated = await updateCategory(modal.data.category_id, form);
      setCategories((prev) =>
        prev.map((c) => (c.category_id === modal.data.category_id ? { ...c, ...updated } : c))
      );
      showToast('อัปเดตข้อมูลหมวดหมู่เรียบร้อยแล้ว');
    } else {
      const created = await createCategory(form);
      const newCat = created || { ...form, category_id: Date.now() };
      setCategories((prev) => [...prev, newCat]);

      // If user provided a training file during create
      if (pendingTrainingFile && newCat.category_id) {
        try {
          await importCategoryData(newCat.category_id, pendingTrainingFile);
          showToast('สร้างหมวดหมู่ใหม่พร้อมนำเข้าข้อมูลฝึกสอน AI สำเร็จ');
        } catch {
          showToast('สร้างหมวดหมู่สำเร็จ แต่การนำเข้าไฟล์ AI ขัดข้อง', 'error');
        }
      } else {
        showToast('สร้างหมวดหมู่ปัญหาใหม่เรียบร้อยแล้ว');
      }
    }
    setModal(null);
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteDialog.category_id);
      setCategories((prev) => prev.filter((c) => c.category_id !== deleteDialog.category_id));
      showToast(`ลบหมวดหมู่ "${deleteDialog.category_name}" เรียบร้อย`);
      setDeleteDialog(null);
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.response?.data?.message || 'ไม่สามารถลบหมวดหมู่นี้ได้',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Trigger Retraining AI Model ──────────────────────────────
  const handleTriggerRetrain = async () => {
    setRetraining(true);
    try {
      const res = await retrainCategoryModel();
      showToast(res.message || 'สั่งเทรนโมเดล AI สำเร็จ! อัปเดตความแม่นยำใหม่เรียบร้อย');
    } catch (err) {
      showToast(
        err.response?.data?.message || err.response?.data?.detail || 'เกิดข้อผิดพลาดในการเทรนโมเดล AI',
        'error'
      );
    } finally {
      setRetraining(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[pageFadeIn_0.2s_ease]">
      {/* Toast */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Delete Dialog */}
      {deleteDialog && (
        <ConfirmDeleteDialog
          category={deleteDialog}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteDialog(null)}
          isLoading={deleting}
        />
      )}

      {/* Category Modal */}
      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.data ? { ...modal.data } : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Page Header (Matching HTML) */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
            <Tag size={22} className="text-[#4B267D]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Problem Categories
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Define the categories used to classify reported problems across the platform.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* AI Retrain Button */}
          <button
            type="button"
            onClick={handleTriggerRetrain}
            disabled={retraining}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-[#4B267D] font-bold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="เทรนโมเดล AI ใหม่จากข้อมูลคำร้องล่าสุดและไฟล์ CSV (Self-learning)"
          >
            <RotateCw size={14} className={retraining ? 'animate-spin' : ''} />
            <span>{retraining ? 'กำลังเทรนโมเดล...' : 'เทรนโมเดล AI ใหม่'}</span>
          </button>

          {/* Create Category Button */}
          <button
            id="create-category-btn"
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#340866] hover:bg-[#4B267D] text-white transition-all shadow-md shadow-purple-950/20 font-bold text-xs sm:text-sm cursor-pointer"
          >
            <Plus size={18} />
            <span>Create Category</span>
          </button>
        </div>
      </section>

      {/* Search Input Bar */}
      <div className="w-full">
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            id="category-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full h-11 pl-11 pr-14 rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent transition-all"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 font-mono text-[11px]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards (Matching HTML) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Categories */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center shrink-0 border border-purple-100">
            <Tag size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">
              {categories.length}
            </span>
            <span className="text-xs text-slate-500 font-semibold mt-1">
              Total Categories
            </span>
          </div>
        </div>

        {/* Privacy Protected */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#733fae] flex items-center justify-center shrink-0 border border-purple-100">
            <Shield size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">
              {categories.filter((c) => c.requires_location_privacy).length}
            </span>
            <span className="text-xs text-slate-500 font-semibold mt-1">
              Privacy Protected
            </span>
          </div>
        </div>

        {/* Coords Visible */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Eye size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">
              {categories.filter((c) => !c.requires_location_privacy).length}
            </span>
            <span className="text-xs text-slate-500 font-semibold mt-1">
              Coords Visible
            </span>
          </div>
        </div>
      </div>

      {/* Main Categories Table (Matching HTML) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'CATEGORY' : 'CATEGORIES'}
            {search && ' FOUND'}
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-[#4B267D] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <X size={12} /> ล้างคำค้นหา
            </button>
          )}
        </div>

        {/* Table Content */}
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Tag size={24} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">ไม่พบหมวดหมู่ที่ค้นหา</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'ลองค้นหาด้วยคำอื่น' : 'คลิก "Create Category" เพื่อเพิ่มหมวดหมู่ใหม่'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 w-16" scope="col">ID</th>
                  <th className="py-3.5 px-4 w-24" scope="col">PREFIX</th>
                  <th className="py-3.5 px-5 min-w-[200px]" scope="col">CATEGORY NAME</th>
                  <th className="py-3.5 px-5 min-w-[340px]" scope="col">DESCRIPTION</th>
                  <th className="py-3.5 px-4 w-32" scope="col">COLOR</th>
                  <th className="py-3.5 px-5 w-40 text-center" scope="col">LOCATION PRIVACY</th>
                  <th className="py-3.5 px-6 text-right w-28" scope="col">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map((cat) => (
                  <tr
                    key={cat.category_id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setModal({ mode: 'edit', data: cat })}
                  >
                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-slate-500">
                      #{cat.category_id}
                    </td>

                    {/* Prefix */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px] border border-slate-200/70">
                        {cat.ticket_prefix || 'GEN'}
                      </span>
                    </td>

                    {/* Category Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${cat.color_code || '#4B267D'}15`,
                            borderColor: `${cat.color_code || '#4B267D'}30`,
                            color: cat.color_code || '#4B267D',
                          }}
                        >
                          <Tag size={16} />
                        </div>
                        <span className="font-bold text-slate-900 leading-snug">
                          {cat.category_name}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-5 text-slate-500 leading-relaxed">
                      <p className="line-clamp-2">
                        {cat.description || (
                          <span className="italic text-slate-300">ไม่มีคำอธิบาย</span>
                        )}
                      </p>
                    </td>

                    {/* Color */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-2xs"
                          style={{ backgroundColor: cat.color_code || '#4B267D' }}
                        />
                        <span className="font-mono text-slate-600 font-semibold text-[11px]">
                          {cat.color_code || '#4B267D'}
                        </span>
                      </div>
                    </td>

                    {/* Location Privacy */}
                    <td className="py-4 px-5 text-center">
                      <PrivacyTag value={cat.requires_location_privacy} />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          id={`edit-cat-${cat.category_id}`}
                          title="แก้ไขหมวดหมู่"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ mode: 'edit', data: cat });
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          id={`delete-cat-${cat.category_id}`}
                          title="ลบหมวดหมู่"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog(cat);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
