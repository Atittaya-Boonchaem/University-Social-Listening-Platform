// src/pages/super-admin/PolicyManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Plus, Search, Edit3, Trash2, Eye, ToggleLeft, ToggleRight,
  CheckCircle2, AlertCircle, FileText, Lock, Globe, Users, Sparkles, X,
  ExternalLink, Info, Check, ShieldAlert
} from 'lucide-react';
import {
  fetchAllPolicies,
  createPolicy,
  updatePolicy,
  togglePolicyActive,
  deletePolicy
} from '../../services/policyService';

// ── Helpers ────────────────────────────────────────────────────
const POLICY_TYPES = {
  pdpa: { label: 'นโยบายความเป็นส่วนตัว (PDPA)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  terms_of_service: { label: 'ข้อตกลงการใช้งาน (Terms)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  location_privacy: { label: 'ความยินยอมพิกัดและสื่อ (Location & Media)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  data_consent: { label: 'ความยินยอมประมวลผลข้อมูล (Data Consent)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  other: { label: 'ข้อกำหนดอื่นๆ (Other)', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const TARGET_ROLES = {
  all: 'ทุกคน (All Users)',
  student: 'นิสิต (Students)',
  staff: 'บุคลากร (Staff)',
  public: 'บุคคลทั่วไป (Public Users)',
};

// ── Toast Notification ──────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[80] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-medium ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
    {msg}
  </div>
);

// ── Modal: View Full Content ───────────────────────────────────
const ViewContentModal = ({ policy, onClose }) => {
  if (!policy) return null;
  const typeInfo = POLICY_TYPES[policy.policy_type] || POLICY_TYPES.other;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-[pageFadeIn_0.2s_ease] border border-slate-100">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Ver. {policy.version}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800">{policy.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-line font-sans">
          {policy.summary && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
              <span className="font-bold">ข้อความสรุปหน้าเช็คบ็อกซ์:</span> {policy.summary}
            </div>
          )}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 font-mono text-xs text-slate-800">
            {policy.content}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal: Live User Preview ───────────────────────────────────
const LivePreviewModal = ({ policies, onClose }) => {
  const activePolicies = policies.filter((p) => p.is_active);
  const [checkedState, setCheckedState] = useState({});

  const toggleCheck = (id) => {
    setCheckedState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-[pageFadeIn_0.2s_ease]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2B164D] text-white flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">จำลองมุมมองผู้ใช้งาน (Live Preview)</h3>
              <p className="text-[11px] text-slate-500">ตัวอย่างข้อความที่นิสิต/บุคลากรจะเห็นในหน้าสมัครสมาชิกและหน้า Onboarding</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              ฟอร์มยืนยันข้อตกลงและเงื่อนไข (ความยินยอม)
            </h4>
            
            {activePolicies.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">ไม่มีนโยบายที่เปิดใช้งานอยู่ในขณะนี้</p>
            ) : (
              <div className="space-y-3">
                {activePolicies.map((pol) => {
                  const isChecked = !!checkedState[pol.policy_id];
                  return (
                    <label
                      key={pol.policy_id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs cursor-pointer hover:border-purple-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(pol.policy_id)}
                        className="mt-0.5 w-4 h-4 text-[#2B164D] rounded border-slate-300 focus:ring-purple-500"
                      />
                      <div className="text-xs text-slate-700 leading-relaxed flex-1">
                        <span>{pol.summary || pol.title}</span>
                        {pol.is_mandatory && <span className="text-rose-500 ml-1 font-bold">*</span>}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-purple-700 font-bold underline cursor-pointer">
                            อ่านรายละเอียดฉบับเต็ม (v{pol.version})
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-[11px] text-slate-400">💡 การเปลี่ยนแปลงสถานะเปิด/ปิด จะมีผลทันที</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2B164D] text-white text-xs font-bold hover:bg-[#3d2268] transition-colors"
          >
            ปิดตัวอย่าง
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal: Create / Edit Policy ────────────────────────────────
const PolicyFormModal = ({ isOpen, onClose, policy, onSave, submitting }) => {
  const isEdit = !!policy;
  const [form, setForm] = useState({
    title: '',
    policy_type: 'pdpa',
    version: '1.0',
    summary: '',
    content: '',
    is_mandatory: true,
    is_active: true,
    target_role: 'all',
  });

  useEffect(() => {
    if (policy) {
      setForm({
        title: policy.title || '',
        policy_type: policy.policy_type || 'pdpa',
        version: policy.version || '1.0',
        summary: policy.summary || '',
        content: policy.content || '',
        is_mandatory: policy.is_mandatory !== false,
        is_active: policy.is_active !== false,
        target_role: policy.target_role || 'all',
      });
    } else {
      setForm({
        title: '',
        policy_type: 'pdpa',
        version: '1.0',
        summary: '',
        content: '',
        is_mandatory: true,
        is_active: true,
        target_role: 'all',
      });
    }
  }, [policy, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-[pageFadeIn_0.2s_ease] border border-slate-100">
        {/* Header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {isEdit ? 'แก้ไขข้อตกลง / นโยบาย' : 'สร้างข้อตกลง / นโยบายใหม่'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดเนื้อหาข้อตกลง และข้อความที่จะนำไปแสดงข้างช่องทำเครื่องหมายยอมรับ
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="px-7 py-6 overflow-y-auto space-y-4 flex-1">
          {/* Row 1: Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อนโยบาย / ข้อตกลง <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-white"
              placeholder="เช่น นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA)"
              required
            />
          </div>

          {/* Row 2: Type, Version, Target Role */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทนโยบาย <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.policy_type}
                onChange={(e) => setForm({ ...form, policy_type: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                <option value="pdpa">นโยบายความเป็นส่วนตัว (PDPA)</option>
                <option value="terms_of_service">ข้อตกลงการใช้งาน (Terms)</option>
                <option value="location_privacy">ความยินยอมพิกัด/ภาพ (Location)</option>
                <option value="data_consent">ความยินยอมประมวลผลข้อมูล</option>
                <option value="other">อื่นๆ (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เวอร์ชัน (Version) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono bg-white"
                placeholder="เช่น 1.0 หรือ 2.1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กลุ่มผู้ใช้เป้าหมาย
              </label>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              >
                <option value="all">ทุกคน (All Users)</option>
                <option value="student">นิสิต (Students Only)</option>
                <option value="staff">บุคลากร (Staff Only)</option>
                <option value="public">บุคคลทั่วไป (Public Only)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Short Summary / Checkbox label */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">
                ข้อความสรุปหน้าเช็คบ็อกซ์ (Checkbox Display Text) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">แสดงข้างช่องติ๊กถูกที่ผู้ใช้เห็น</span>
            </div>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              placeholder="เช่น ฉันยินยอมให้จัดเก็บและประมวลผลข้อมูลตามนโยบายความเป็นส่วนตัว (PDPA) เพื่อความปลอดภัยในการใช้งานระบบ"
              required
            />
          </div>

          {/* Row 4: Full Content Text */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">
                รายละเอียดนโยบายฉบับเต็ม (Full Policy Text) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">เนื้อหาเต็มสำหรับป็อปอัปอ่านรายละเอียด</span>
            </div>
            <textarea
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
              placeholder="กรอกเนื้อหารายละเอียดข้อกำหนดและเงื่อนไขฉบับเต็ม..."
              required
            />
          </div>

          {/* Row 5: Toggles (Mandatory & Active) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={form.is_mandatory}
                onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
                disabled={submitting}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">เป็นข้อกำหนดบังคับ (Mandatory)</p>
                <p className="text-[11px] text-slate-500">ผู้ใช้จำเป็นต้องกดยอมรับจึงจะสามารถใช้งานระบบต่อได้</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                disabled={submitting}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">เปิดใช้งานทันที (Active)</p>
                <p className="text-[11px] text-slate-500">นำข้อความนี้ไปแสดงผลในหน้าจอผู้ใช้ในระบบจริง</p>
              </div>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.summary.trim() || !form.content.trim()}
              className="px-5 py-2 bg-[#2B164D] hover:bg-[#3d2268] text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check size={14} />
                  บันทึกข้อมูล
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page Component ────────────────────────────────────────
export default function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [toast, setToast] = useState({ msg: '', type: '' });
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchAllPolicies();
      setPolicies(items);
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลนโยบายได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Handlers
  const handleCreate = () => {
    setEditingPolicy(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setIsFormModalOpen(true);
  };

  const handleSave = async (formData) => {
    setSubmitting(true);
    try {
      if (editingPolicy) {
        await updatePolicy(editingPolicy.policy_id, formData);
        showToast(`อัปเดตนโยบาย '${formData.title}' เรียบร้อยแล้ว`);
      } else {
        await createPolicy(formData);
        showToast(`สร้างนโยบาย '${formData.title}' สำเร็จแล้ว`);
      }
      setIsFormModalOpen(false);
      loadPolicies();
    } catch (err) {
      showToast(err.response?.data?.message || err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (policy) => {
    try {
      await togglePolicyActive(policy.policy_id);
      showToast(`${policy.is_active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'} นโยบายแล้ว`);
      setPolicies((prev) =>
        prev.map((p) =>
          p.policy_id === policy.policy_id ? { ...p, is_active: !p.is_active } : p
        )
      );
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบนโยบาย "${policy.title}"?`)) return;
    try {
      await deletePolicy(policy.policy_id);
      showToast(`ลบนโยบาย '${policy.title}' เรียบร้อย`);
      setPolicies((prev) => prev.filter((p) => p.policy_id !== policy.policy_id));
    } catch (err) {
      showToast('ไม่สามารถลบนโยบายได้', 'error');
    }
  };

  // Filtered
  const filtered = policies.filter((p) => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.summary || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.version || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' || p.policy_type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalActive = policies.filter((p) => p.is_active).length;
  const totalMandatory = policies.filter((p) => p.is_mandatory && p.is_active).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[pageFadeIn_0.2s_ease]">
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Modals */}
      <PolicyFormModal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        policy={editingPolicy}
        onSave={handleSave}
        submitting={submitting}
      />

      {viewingPolicy && (
        <ViewContentModal
          policy={viewingPolicy}
          onClose={() => setViewingPolicy(null)}
        />
      )}

      {isPreviewOpen && (
        <LivePreviewModal
          policies={policies}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Header Banner */}
      <section className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#2B164D] flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              ข้อตกลงและนโยบาย PDPA (Terms & Privacy Policies)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              กำหนดเนื้อหาเงื่อนไขการยินยอม, นโยบายความเป็นส่วนตัว (PDPA) และเลือกข้อความที่จะนำไปแสดงในหน้าจอผู้ใช้งาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Eye size={15} />
            <span>จำลองหน้าจอผู้ใช้</span>
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B164D] hover:bg-[#3d2268] text-white font-bold text-xs transition-all shadow-md shadow-purple-950/20 cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>สร้างนโยบายใหม่</span>
          </button>
        </div>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">นโยบายทั้งหมด</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{policies.length}</p>
          <span className="text-[11px] text-slate-400">รายการในระบบ</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600">เปิดใช้งานอยู่</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{totalActive}</p>
          <span className="text-[11px] text-slate-400">แสดงผลจริงบนหน้าเว็บ</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700">ข้อกำหนดบังคับ</span>
            <Lock size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900">{totalMandatory}</p>
          <span className="text-[11px] text-slate-400">ผู้ใช้ต้องยินยอมเพื่อใช้งาน</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600">กลุ่มผู้ใช้</span>
            <Users size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700">ครอบคลุม</p>
          <span className="text-[11px] text-slate-400">นิสิต / บุคลากร / ประชาชน</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อนโยบาย, ข้อความสรุป หรือเวอร์ชัน..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">ประเภท:</span>
          {['ALL', 'pdpa', 'terms_of_service', 'location_privacy'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedType === t
                  ? 'bg-[#2B164D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'ทั้งหมด' : POLICY_TYPES[t]?.label.split(' ')[0] || t}
            </button>
          ))}
        </div>
      </div>

      {/* Policies List Table / Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 animate-pulse">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">กำลังโหลดรายการนโยบายและข้อกำหนด...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <FileText size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">ไม่พบนโยบายตามเงื่อนไขที่เลือก</p>
          <p className="text-xs text-slate-400 mt-1">สามารถกดปุ่ม "สร้างนโยบายใหม่" เพื่อเพิ่มข้อตกลงได้ทันที</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pol) => {
            const typeInfo = POLICY_TYPES[pol.policy_type] || POLICY_TYPES.other;
            return (
              <div
                key={pol.policy_id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  pol.is_active ? 'border-slate-200/90' : 'border-slate-200/50 bg-slate-50/40 opacity-75'
                }`}
              >
                {/* Left side details */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                      v{pol.version}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700">
                      {TARGET_ROLES[pol.target_role] || pol.target_role}
                    </span>
                    {pol.is_mandatory ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                        บังคับยอมรับ *
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                        ทางเลือก
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                      {pol.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold mr-1">ข้อความแสดง:</span>
                      "{pol.summary || pol.title}"
                    </p>
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(pol)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      pol.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="คลิกเพื่อเปิด/ปิดการแสดงผล"
                  >
                    <span className={`w-2 h-2 rounded-full ${pol.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{pol.is_active ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}</span>
                  </button>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewingPolicy(pol)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="ดูเนื้อหาฉบับเต็ม"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(pol)}
                      className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="แก้ไขนโยบาย"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pol)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      title="ลบนโยบาย"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
