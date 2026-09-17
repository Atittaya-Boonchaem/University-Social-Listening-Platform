// src/pages/super-admin/CategoryManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
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

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse">
    {/* Header skeleton */}
    <div className="flex items-center justify-between mb-5">
      <div className="space-y-2">
        <div className="w-44 h-5 bg-slate-200 rounded-lg" />
        <div className="w-64 h-3 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-36 h-10 bg-slate-200 rounded-xl" />
    </div>
    {/* Search skeleton */}
    <div className="w-full h-10 bg-slate-100 rounded-xl mb-5" />
    {/* Table skeleton */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-8">
          {['w-8', 'w-32', 'w-48', 'w-24', 'w-16'].map((w, i) => (
            <div key={i} className={`${w} h-3 bg-slate-200 rounded`} />
          ))}
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex gap-8 items-center">
          <div className="w-8 h-3 bg-slate-100 rounded" />
          <div className="w-32 h-4 bg-slate-200 rounded" />
          <div className="w-56 h-3 bg-slate-100 rounded" />
          <div className="w-16 h-6 bg-slate-100 rounded-full" />
          <div className="ml-auto flex gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Privacy Tag ────────────────────────────────────────────────
const PrivacyTag = ({ value }) =>
  value ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
      <ShieldCheck size={12} />
      Hidden
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      <ShieldOff size={12} />
      Visible
    </span>
  );

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[60] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-medium ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
    {msg}
  </div>
);

// ── Confirm Delete Dialog ──────────────────────────────────────
const ConfirmDeleteDialog = ({ category, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[pageFadeIn_0.2s_ease]">
      <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
        <Trash2 size={20} className="text-rose-500" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">Delete Category</h3>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        Are you sure you want to delete{' '}
        <strong className="text-slate-800">"{category.category_name}"</strong>? This action cannot
        be undone and may affect existing problems.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            'Yes, Delete'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Category Modal (Create / Edit) ─────────────────────────────
const EMPTY_FORM = { category_name: '', ticket_prefix: '', color_code: '#2B164D', description: '', requires_location_privacy: false };

const generateAutoPrefix = (name) => {
  if (!name || !name.trim()) return '';
  const text = name.trim().toLowerCase();

  if (text.includes('รถ') || text.includes('เมล์') || text.includes('สัตเติ้ล') || text.includes('รับส่ง') || text.includes('ขนส่ง')) return 'BUS';
  if (text.includes('สะอาด') || text.includes('ขยะ') || text.includes('สุขาภิบาล') || text.includes('ความสะอาด')) return 'CLEAN';
  if (text.includes('อาคาร') || text.includes('สถานที่') || text.includes('โยธา') || text.includes('สิ่งก่อสร้าง') || text.includes('ห้องเรียน')) return 'BLDG';
  if (text.includes('ไอที') || text.includes('คอมพิวเตอร์') || text.includes('ระบบ') || text.includes('อินเทอร์เน็ต') || text.includes('เน็ต') || text.includes('wifi')) return 'IT';
  if (text.includes('ไฟ') || text.includes('แอร์') || text.includes('ไฟฟ้า') || text.includes('สว่าง')) return 'ELEC';
  if (text.includes('ประปา') || text.includes('น้ำ') || text.includes('ท่อ')) return 'PLUMB';
  if (text.includes('จราจร') || text.includes('จอดรถ') || text.includes('ยานพาหนะ') || text.includes('ทางเดิน') || text.includes('ถนน')) return 'TRAF';
  if (text.includes('ปลอดภัย') || text.includes('อันตราย') || text.includes('อุบัติเหตุ') || text.includes('ยาม') || text.includes('รปภ')) return 'SAFE';
  if (text.includes('เรียน') || text.includes('วิชาการ') || text.includes('การศึกษา') || text.includes('สอบ')) return 'ACAD';
  if (text.includes('เสียง') || text.includes('รบกวน')) return 'NOISE';
  if (text.includes('แวดล้อม') || text.includes('มลพิษ') || text.includes('ต้นไม้') || text.includes('สวน')) return 'ENV';
  if (text.includes('อาหาร') || text.includes('โรงอาหาร') || text.includes('โภชนาการ') || text.includes('ร้านค้า')) return 'FOOD';
  if (text.includes('หอพัก') || text.includes('ที่พัก') || text.includes('หอ') || text.includes('สวัสดิการ')) return 'DORM';
  if (text.includes('เงิน') || text.includes('การเงิน') || text.includes('ค่าธรรมเนียม') || text.includes('ทุน')) return 'FIN';
  if (text.includes('สุขภาพ') || text.includes('พยาบาล') || text.includes('หมอ') || text.includes('ยา')) return 'MED';

  const engMatch = text.match(/[a-zA-Z]+/g);
  if (engMatch && engMatch.length > 0) {
    return engMatch.join('').toUpperCase().slice(0, 5);
  }

  return 'GEN';
};

const CategoryModal = ({ mode, initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // File import state for Edit Mode
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const isEdit = mode === 'edit';

  const handleAutoGeneratePrefix = () => {
    if (!form.category_name.trim()) {
      setError('Please enter a Category Name first.');
      return;
    }
    const autoPfx = generateAutoPrefix(form.category_name);
    setForm(f => ({ ...f, ticket_prefix: autoPfx }));
  };

  const handleGenerateDescription = async () => {
    if (!form.category_name.trim()) {
      setError('Please enter a Category Name first.');
      return;
    }
    setGeneratingDesc(true);
    setError('');
    try {
      const res = await api.post('/problems/ai/generate-category-desc', {
        category_name: form.category_name,
        existing_description: form.description
      });
      
      setForm(f => ({ ...f, description: res.data.data.description }));
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Something went wrong while generating description.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!file || !initial?.category_id) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.post(`/problems/categories/${initial.category_id}/import-data`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(res.data.message || 'Data imported successfully! AI will now use this context.');
      setFile(null);
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_name.trim()) {
      setError('Category name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-[pageFadeIn_0.2s_ease] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            {isEdit ? (
              <Pencil size={16} className="text-indigo-600" />
            ) : (
              <Plus size={16} className="text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isEdit ? 'Edit Category' : 'Create New Category'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEdit ? `Update category details ${initial?.category_id ? `(ID: #${initial.category_id})` : ''}` : 'Fill in the details to add a new category'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            id="category-modal-close"
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 text-left overflow-y-auto">
          {/* Category Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="cat-name">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              autoFocus
              value={form.category_name}
              onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
              disabled={saving}
              placeholder="e.g. Infrastructure, Academic, Safety..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Prefix */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600" htmlFor="cat-prefix">
                  ตัวย่อ (Prefix)
                </label>
                <button
                  type="button"
                  onClick={handleAutoGeneratePrefix}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  title="สร้างตัวย่ออัตโนมัติจากชื่อหมวดหมู่"
                >
                  <Sparkles className="w-3 h-3" />
                  🪄 ออโต้
                </button>
              </div>
              <input
                id="cat-prefix"
                type="text"
                value={form.ticket_prefix || ''}
                onChange={(e) => setForm((f) => ({ ...f, ticket_prefix: e.target.value.toUpperCase() }))}
                disabled={saving}
                placeholder="e.g. ACAD, SAFE"
                maxLength={10}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50"
              />
            </div>
            {/* Color Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="cat-color">
                โค้ดสี (Color Code)
              </label>
              <div className="flex gap-2">
                <input
                  id="cat-color-picker"
                  type="color"
                  value={form.color_code || '#2B164D'}
                  onChange={(e) => setForm((f) => ({ ...f, color_code: e.target.value }))}
                  disabled={saving}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 bg-transparent flex-shrink-0"
                />
                <input
                  id="cat-color"
                  type="text"
                  value={form.color_code || ''}
                  onChange={(e) => setForm((f) => ({ ...f, color_code: e.target.value }))}
                  disabled={saving}
                  placeholder="#2B164D"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="block text-xs font-semibold text-slate-600"
                htmlFor="cat-desc"
              >
                Description
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingDesc || saving}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {generatingDesc ? (
                  <>
                    <div className="w-3 h-3 border-[1.5px] border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    🪄 ให้ AI ช่วยคิด
                  </>
                )}
              </button>
            </div>
            <textarea
              id="cat-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={saving}
              placeholder="Briefly describe what kind of problems belong to this category..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50 resize-none"
            />
          </div>

          {/* Location Privacy Toggle */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-violet-200 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 leading-tight">
                Requires Location Privacy
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                When enabled, exact GPS coordinates are hidden on the heatmap to protect reporter
                privacy.
              </p>
            </div>
            <button
              type="button"
              id="location-privacy-toggle"
              role="switch"
              aria-checked={form.requires_location_privacy}
              disabled={saving}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  requires_location_privacy: !f.requires_location_privacy,
                }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 mt-0.5 ${
                form.requires_location_privacy ? 'bg-violet-600' : 'bg-slate-300'
              } disabled:opacity-50`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  form.requires_location_privacy ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Import AI Training Data Section (Only in Edit Mode) */}
          {isEdit && initial?.category_id && (
            <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-900">Import AI Training Data (.csv)</h4>
              </div>
              <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                Upload a <span className="font-semibold text-slate-800">.csv</span> file containing example problems for this category. The AI will learn from this data to classify future reports more accurately.
              </p>
              
              {uploadError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              
              {uploadSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-lg flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="file"
                    id={`upload-${initial.category_id}`}
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor={`upload-${initial.category_id}`}
                    className="flex items-center justify-between w-full px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <span className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {file ? file.name : 'Choose CSV file...'}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 px-2.5 py-0.5 bg-indigo-50 rounded-md">Browse</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {uploading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload
                </button>
              </div>
            </div>
          )}

          {/* Inline error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="category-modal-submit"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Category'
              )}
            </button>
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

  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch {
      showToast('Failed to load categories. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Filtered list ────────────────────────────────────────────
  const filtered = categories.filter((c) =>
    `${c.category_name} ${c.description || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  // ── Save (Create / Edit) ─────────────────────────────────────
  const handleSave = async (form) => {
    if (modal?.mode === 'edit' && modal.data) {
      const updated = await updateCategory(modal.data.category_id, form);
      setCategories((prev) =>
        prev.map((c) => (c.category_id === modal.data.category_id ? { ...c, ...updated } : c))
      );
      showToast('Category updated successfully.');
    } else {
      const created = await createCategory(form);
      setCategories((prev) => [...prev, created]);
      showToast('Category created successfully.');
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
      showToast('Category deleted.');
      setDeleteDialog(null);
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.response?.data?.message || 'Failed to delete.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Delete dialog */}
      {deleteDialog && (
        <ConfirmDeleteDialog
          category={deleteDialog}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteDialog(null)}
          isLoading={deleting}
        />
      )}

      {/* Category modal */}
      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.data ? { ...modal.data } : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers size={17} className="text-indigo-500" />
            Problem Categories
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define the categories used to classify reported problems across the platform.
          </p>
        </div>
        <button
          id="create-category-btn"
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={16} />
          Create Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          id="category-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or description..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm transition-shadow"
        />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Tag size={15} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">{categories.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total Categories</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <ShieldCheck size={15} className="text-violet-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">
              {categories.filter((c) => c.requires_location_privacy).length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Privacy Protected</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <ShieldOff size={15} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">
              {categories.filter((c) => !c.requires_location_privacy).length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Coords Visible</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'category' : 'categories'}
            {search && ' found'}
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <X size={12} /> Clear search
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Tag size={22} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">No categories found</p>
              <p className="text-xs mt-0.5">
                {search ? 'Try a different search term.' : 'Click "Create Category" to add one.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '100px' }}>Prefix</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th style={{ width: '120px' }}>Color</th>
                  <th style={{ width: '160px' }}>Location Privacy</th>
                  <th style={{ width: '100px' }} className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr 
                    key={cat.category_id} 
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setModal({ mode: 'edit', data: cat })}
                  >
                    {/* ID */}
                    <td>
                      <span className="text-xs font-mono text-slate-400">#{cat.category_id}</span>
                    </td>

                    {/* Prefix */}
                    <td>
                      <span className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-md font-mono">
                        {cat.ticket_prefix || '—'}
                      </span>
                    </td>

                    {/* Name */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: `${cat.color_code || '#2B164D'}15` }}
                        >
                          <Tag size={13} style={{ color: cat.color_code || '#2B164D' }} />
                        </div>
                        <span className="font-semibold text-slate-800 text-[13px]">
                          {cat.category_name}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td>
                      <span
                        className="text-slate-500 text-[13px] line-clamp-1"
                        title={cat.description || ''}
                      >
                        {cat.description || (
                          <span className="italic text-slate-300">No description</span>
                        )}
                      </span>
                    </td>

                    {/* Color */}
                    <td>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color_code || '#2B164D' }}
                        />
                        <code className="text-xs text-slate-500 font-mono">{cat.color_code || '#2B164D'}</code>
                      </div>
                    </td>

                    {/* Privacy */}
                    <td>
                      <PrivacyTag value={cat.requires_location_privacy} />
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`edit-cat-${cat.category_id}`}
                          title="Edit category"
                          onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', data: cat }); }}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-cat-${cat.category_id}`}
                          title="Delete category"
                          onClick={(e) => { e.stopPropagation(); setDeleteDialog(cat); }}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
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
