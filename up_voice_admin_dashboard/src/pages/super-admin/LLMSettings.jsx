import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLLMSettings, updateLLMSettings } from '../../services/llmSettingService';
import api from '../../services/api';
import { Bot, Plus, Trash2, Save, AlertTriangle, Info, Sliders, Zap, CheckCircle2, MessageSquare, ShieldAlert, MapPin, Compass, Upload, Image, BookOpen, Layers, Edit3, X, Check } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'https://university-social-listening-platform.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');
const toAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_ROOT}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ── Default empty state ─────────────────────────────────────────
const DEFAULT_SETTINGS = {
  is_auto_ban_enabled: true,
  is_auto_routing_enabled: true,
  auto_ban_duration_days: 7,
  confidence_threshold: 0.85,
  max_warnings_before_ban: 1,
  banned_words: [],
  banned_patterns: [],
  chatbot_persona: '',
  chatbot_opening_message: '',
  chatbot_questions: [],
  is_auto_map_enabled: true,
  map_trigger_keywords: [],
  default_map_image_url: '/static/campus_map.jpg',
  category_prompt_rules: [],
};

// ── Tag pill for Chatbot Questions ─────────────────────────────
const WordTag = ({ word, onRemove, colorScheme = 'emerald' }) => {
  const bgClass = colorScheme === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700';
  const textClass = colorScheme === 'blue' ? 'text-blue-400 hover:text-blue-700' : 'text-emerald-400 hover:text-emerald-700';
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm border ${bgClass}`}>
      {word}
      <button
        onClick={() => onRemove(word)}
        className={`transition-colors ${textClass}`}
      >
        <Trash2 size={11} />
      </button>
    </span>
  );
};

// ── Toggle switch ──────────────────────────────────────────────
const Toggle = ({ id, checked, onChange, label, sub }) => (
  <label htmlFor={id} className="flex items-center justify-between gap-4 cursor-pointer group py-1">
    <div>
      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    <div className="relative flex-shrink-0">
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`w-11 h-6 rounded-full transition-colors duration-300 shadow-inner ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}
      />
      <div
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`}
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </div>
  </label>
);

// ── Skeleton Loader ────────────────────────────────────────────
const PageSkeleton = () => (
  <div className="space-y-6 max-w-5xl mx-auto animate-pulse flex flex-col md:flex-row gap-6">
    <div className="w-full md:w-64 h-96 bg-slate-200 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-6 w-full">
      <div className="h-40 bg-slate-200 rounded-2xl" />
      <div className="h-64 bg-slate-200 rounded-2xl" />
    </div>
  </div>
);

// ── Rules Table Component ──────────────────────────────────────
const RulesTable = ({ rules, onRemove }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">NAME / PATTERN</th>
            <th className="px-4 py-3">TYPE</th>
            <th className="px-4 py-3 text-center">ACTION</th>
            <th className="px-4 py-3 text-center">ENABLED</th>
            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-slate-400">No rules configured yet.</td>
            </tr>
          ) : (
            rules.map((rule, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {rule.type === 'REGEX' ? <code className="text-violet-600 bg-violet-50 px-1 rounded">{rule.value}</code> : rule.value}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${rule.type === 'REGEX' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                    {rule.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">BAN</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="w-8 h-4 bg-emerald-500 rounded-full relative mx-auto shadow-inner">
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onRemove(rule.type, rule.value)} className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};


// ── Main page ──────────────────────────────────────────────────
const LLMSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  
  const [activeTab, setActiveTab] = useState('chatbot');
  
  const [newQuestion, setNewQuestion] = useState('');
  const [newMapKeyword, setNewMapKeyword] = useState('');
  const [ruleType, setRuleType] = useState('WORD');
  const [newRuleValue, setNewRuleValue] = useState('');

  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ msg: '', type: '' });

  const fileInputRef = useRef(null);
  const [uploadingMap, setUploadingMap] = useState(false);

  const [categories, setCategories] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [uploadingRuleImage, setUploadingRuleImage] = useState(false);
  const ruleFileInputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/settings/categories');
      const items = res.data?.data?.items || res.data?.data || [];
      setCategories(items.map(c => ({ id: c.category_id || c.id, name: c.category_name || c.name })));
    } catch (e) {
      setCategories([
        { id: 1, name: 'การเดินทาง/รถเมล์' },
        { id: 2, name: 'อุปกรณ์การเรียน/ห้องเรียน' },
        { id: 3, name: 'อาคารสถานที่/สิ่งอำนวยความสะดวก' },
        { id: 4, name: 'ระบบเทคโนโลยี/อินเทอร์เน็ต' },
        { id: 5, name: 'ความสะอาด/ขยะ' },
        { id: 6, name: 'ความปลอดภัย/เหตุฉุกเฉิน' },
      ]);
    }
  }, []);

  const handleMapImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMap(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/settings/upload-map-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newUrl = res.data?.data?.url;
      if (newUrl) {
        setSettings((s) => ({ ...s, default_map_image_url: newUrl }));
        showToast('อัปโหลดไฟล์ภาพแผนที่ มพ. สำเร็จเรียบร้อย!', 'success');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปโหลดไฟล์ภาพแผนที่', 'error');
    } finally {
      setUploadingMap(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await fetchCategories();
      const data = await fetchLLMSettings();
      if (data) {
        setSettings({
          is_auto_ban_enabled: data.is_auto_ban_enabled ?? true,
          is_auto_routing_enabled: data.is_auto_routing_enabled ?? true,
          auto_ban_duration_days: data.auto_ban_duration_days ?? 7,
          confidence_threshold: data.confidence_threshold ?? 0.85,
          max_warnings_before_ban: data.max_warnings_before_ban ?? 1,
          banned_words: data.banned_words || [],
          banned_patterns: data.banned_patterns || [],
          chatbot_persona: data.chatbot_persona || '',
          chatbot_opening_message: data.chatbot_opening_message || '',
          chatbot_questions: data.chatbot_questions || [],
          is_auto_map_enabled: data.is_auto_map_enabled ?? true,
          map_trigger_keywords: data.map_trigger_keywords || [],
          default_map_image_url: data.default_map_image_url || '/static/campus_map.jpg',
          category_prompt_rules: data.category_prompt_rules || [],
        });
      }
    } catch (e) {
      setError('Failed to load LLM settings. Ensure you are a Super Admin.');
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  useEffect(() => { loadData(); }, [loadData]);

  // Prompt Rule Handlers
  const openNewRuleModal = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      name: '',
      category_ids: [],
      category_names: [],
      questions: [
        { id: `q_1`, question_text: 'เกิดเหตุที่อาคารไหน และห้องอะไรครับ?', image_url: '' },
        { id: `q_2`, question_text: 'พบเห็นปัญหาตั้งแต่เมื่อไหร่ครับ?', image_url: '' }
      ],
      guidance_prompt: '',
      image_url: '',
      is_active: true
    });
    setNewRuleKeyword('');
  };

  const addQuestionStep = () => {
    if (!editingRule) return;
    const currentQ = editingRule.questions || [];
    setEditingRule({
      ...editingRule,
      questions: [
        ...currentQ,
        { id: `q_${Date.now()}`, question_text: '', image_url: '' }
      ]
    });
  };

  const updateQuestionStepText = (idx, text) => {
    if (!editingRule) return;
    const updatedQ = [...(editingRule.questions || [])];
    if (updatedQ[idx]) {
      updatedQ[idx] = { ...updatedQ[idx], question_text: text };
      setEditingRule({ ...editingRule, questions: updatedQ });
    }
  };

  const updateQuestionStepImage = (idx, url) => {
    if (!editingRule) return;
    const updatedQ = [...(editingRule.questions || [])];
    if (updatedQ[idx]) {
      updatedQ[idx] = { ...updatedQ[idx], image_url: url };
      setEditingRule({ ...editingRule, questions: updatedQ });
    }
  };

  const handleQuestionImageUpload = async (idx, file) => {
    if (!file || !editingRule) return;
    try {
      showToast('กำลังอัปโหลดรูปภาพประจำข้อคำถาม...', 'info');
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/settings/upload-rule-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        updateQuestionStepImage(idx, url);
        showToast(`อัปโหลดรูปภาพสำหรับคำถามข้อที่ ${idx + 1} สำเร็จ!`, 'success');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', 'error');
    }
  };

  const removeQuestionStep = (idx) => {
    if (!editingRule) return;
    const updatedQ = (editingRule.questions || []).filter((_, i) => i !== idx);
    setEditingRule({ ...editingRule, questions: updatedQ });
  };

  const moveQuestionStep = (idx, direction) => {
    if (!editingRule) return;
    const updatedQ = [...(editingRule.questions || [])];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= updatedQ.length) return;
    const temp = updatedQ[idx];
    updatedQ[idx] = updatedQ[targetIdx];
    updatedQ[targetIdx] = temp;
    setEditingRule({ ...editingRule, questions: updatedQ });
  };

  const handleRuleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingRule) return;
    try {
      setUploadingRuleImage(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/settings/upload-rule-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        setEditingRule(r => ({ ...r, image_url: url }));
        showToast('อัปโหลดรูปภาพกติกาสำเร็จ!', 'success');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพกติกา', 'error');
    } finally {
      setUploadingRuleImage(false);
    }
  };

  const saveRuleToSettings = async () => {
    if (!editingRule || !editingRule.name.trim()) {
      showToast('กรุณาระบุชื่อกติกา', 'error');
      return;
    }
    const currentRules = settings.category_prompt_rules || [];
    const index = currentRules.findIndex(r => r.id === editingRule.id);
    let updated;
    if (index >= 0) {
      updated = [...currentRules];
      updated[index] = editingRule;
    } else {
      updated = [...currentRules, editingRule];
    }
    const newSettings = { ...settings, category_prompt_rules: updated };
    setSettings(newSettings);
    setEditingRule(null);
    try {
      await updateLLMSettings(newSettings);
      showToast('บันทึกกติกาคำถามลงฐานข้อมูลเรียบร้อย!', 'success');
    } catch (err) {
      showToast('เพิ่มกติกาในระบบชั่วคราวสำเร็จ (อย่าลืมกด Save Changes)', 'success');
    }
  };

  const deleteRuleFromSettings = async (ruleId) => {
    const updated = (settings.category_prompt_rules || []).filter(r => r.id !== ruleId);
    const newSettings = { ...settings, category_prompt_rules: updated };
    setSettings(newSettings);
    try {
      await updateLLMSettings(newSettings);
      showToast('ลบกติกาออกจากฐานข้อมูลเรียบร้อย', 'success');
    } catch (err) {
      showToast('ลบกติกาเรียบร้อย', 'success');
    }
  };

  const toggleRuleActive = async (ruleId) => {
    const updated = (settings.category_prompt_rules || []).map(r => 
      r.id === ruleId ? { ...r, is_active: !r.is_active } : r
    );
    const newSettings = { ...settings, category_prompt_rules: updated };
    setSettings(newSettings);
    try {
      await updateLLMSettings(newSettings);
      showToast('อัปเดตสถานะกติกาสำเร็จ', 'success');
    } catch (err) {}
  };

  // Chatbot Question Handlers
  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q || settings.chatbot_questions.includes(q)) return;
    setSettings((s) => ({ ...s, chatbot_questions: [...s.chatbot_questions, q] }));
    setNewQuestion('');
  };
  const removeQuestion = (q) => {
    setSettings((s) => ({ ...s, chatbot_questions: s.chatbot_questions.filter((item) => item !== q) }));
  };

  // Map Keyword Handlers
  const addMapKeyword = () => {
    const kw = newMapKeyword.trim();
    if (!kw || (settings.map_trigger_keywords && settings.map_trigger_keywords.includes(kw))) return;
    setSettings((s) => ({ ...s, map_trigger_keywords: [...(s.map_trigger_keywords || []), kw] }));
    setNewMapKeyword('');
  };
  const removeMapKeyword = (kw) => {
    setSettings((s) => ({ ...s, map_trigger_keywords: (s.map_trigger_keywords || []).filter((item) => item !== kw) }));
  };

  // Rule Handlers
  const combinedRules = [
    ...settings.banned_words.map(w => ({ type: 'WORD', value: w })),
    ...settings.banned_patterns.map(p => ({ type: 'REGEX', value: p }))
  ];

  const addRule = () => {
    const val = newRuleValue.trim();
    if (!val) return;
    if (ruleType === 'WORD') {
      if (!settings.banned_words.includes(val)) {
        setSettings(s => ({ ...s, banned_words: [...s.banned_words, val] }));
      }
    } else {
      if (!settings.banned_patterns.includes(val)) {
        setSettings(s => ({ ...s, banned_patterns: [...s.banned_patterns, val] }));
      }
    }
    setNewRuleValue('');
  };

  const removeRule = (type, value) => {
    if (type === 'WORD') {
      setSettings(s => ({ ...s, banned_words: s.banned_words.filter(w => w !== value) }));
    } else {
      setSettings(s => ({ ...s, banned_patterns: s.banned_patterns.filter(p => p !== value) }));
    }
  };

  // Save Handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateLLMSettings(settings);
      setSettings({
        ...data,
        banned_words: data.banned_words || [],
        banned_patterns: data.banned_patterns || [],
        chatbot_questions: data.chatbot_questions || [],
        map_trigger_keywords: data.map_trigger_keywords || [],
      });
      showToast('AI Configuration saved successfully!');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div className="bg-rose-50 text-rose-600 rounded-2xl p-6 text-center border border-rose-100 max-w-3xl mx-auto">
      <AlertTriangle className="mx-auto mb-2" size={24} />
      <p className="font-semibold">{error}</p>
      <button onClick={loadData} className="mt-3 text-sm font-medium hover:underline">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg z-50 animate-[pageFadeIn_0.2s_ease] flex items-center gap-2 text-sm text-white ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">LLM Settings</h2>
            <p className="text-white/80 text-sm mt-1">
              Configure frontline AI parameters, content moderation rules, and automation triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-shrink-0 flex flex-col gap-1 sticky top-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Navigation</h3>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'chatbot' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <MessageSquare size={18} /> Chatbot Config
          </button>
          <button
            onClick={() => setActiveTab('prompt_rules')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'prompt_rules' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <BookOpen size={18} /> Multi-Category Prompt Rules
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'rules' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ShieldAlert size={18} /> Message Filter
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sliders size={18} /> General Settings
          </button>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full">
          
          {/* TAB: Chatbot Configuration */}
          {activeTab === 'chatbot' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-[pageFadeIn_0.2s_ease]">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Bot size={18} className="text-emerald-500" />
                <h3 className="text-base font-bold text-slate-800">AI Chatbot Configuration</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Opening Message (คำทักทายแรกของ AI)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.chatbot_opening_message}
                    onChange={(e) => setSettings(s => ({ ...s, chatbot_opening_message: e.target.value }))}
                    placeholder="e.g. สวัสดีครับ มีปัญหาอะไรให้ผมช่วยไหมครับ..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-shadow bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    AI Persona / System Prompt (บทบาทของ AI)
                  </label>
                  <textarea
                    rows={4}
                    value={settings.chatbot_persona}
                    onChange={(e) => setSettings(s => ({ ...s, chatbot_persona: e.target.value }))}
                    placeholder="e.g. You are a helpful assistant..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-shadow bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Required Questions (คำถามที่ AI ต้องถามผู้ใช้)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3 min-h-[44px] p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    {settings.chatbot_questions.length === 0
                      ? <p className="text-xs text-slate-400 self-center w-full text-center">No questions configured yet</p>
                      : settings.chatbot_questions.map((q) => (
                          <WordTag key={q} word={q} onRemove={removeQuestion} />
                        ))
                    }
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. เกิดเหตุที่อาคารไหนครับ?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-shadow bg-white"
                    />
                    <button
                      onClick={addQuestion}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors shadow-sm"
                    >
                      <Plus size={15} /> Add Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Multi-Category AI Prompt Rules */}
          {activeTab === 'prompt_rules' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-[pageFadeIn_0.2s_ease]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-800">กติกาคำถาม AI ตามหมวดหมู่ (Multi-Category Prompt Rules)</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    กำหนดคำแนะนำให้ AI ถามข้อมูลที่จำเป็นจากผู้ใช้โดยอัตโนมัติแยกตามหมวดหมู่ (ระบบ AI จะวิเคราะห์บริบทคำถามจากแชต และดึงกติกาประจำหมวดหมู่นั้นมาใช้อัตโนมัติ โดยไม่ต้องพิมพ์คีย์เวิร์ด)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewRuleModal}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex-shrink-0"
                >
                  <Plus size={16} /> สร้างกติกาใหม่ (New Rule)
                </button>
              </div>

              {/* Rules List */}
              {(!settings.category_prompt_rules || settings.category_prompt_rules.length === 0) ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Layers className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-sm font-semibold text-slate-700">ยังไม่มีกติกาคำถาม AI ในระบบ</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    คลิกที่ปุ่ม "สร้างกติกาใหม่" ด้านบนเพื่อเพิ่มกติกาการถามตอบของ AI แยกตามหลายหมวดหมู่พร้อมแนบรูปภาพประกอบ
                  </p>
                  <button
                    type="button"
                    onClick={openNewRuleModal}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={14} /> เพิ่มกติกาแรก
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {settings.category_prompt_rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-5 rounded-2xl border transition-all ${rule.is_active ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-200' : 'bg-slate-50/70 border-slate-200 opacity-75'}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          {/* Rule Title & Status */}
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-sm text-slate-800">{rule.name}</h4>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                              {rule.is_active ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}
                            </span>
                          </div>

                          {/* Categories Multi-Select Pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 mr-1">หมวดหมู่:</span>
                            {rule.category_names && rule.category_names.length > 0 ? (
                              rule.category_names.map((catName, idx) => (
                                <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                  {catName}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 font-italic">ทุกหมวดหมู่ (Global)</span>
                            )}
                          </div>

                          {/* Sequential Question Script Steps Preview */}
                          {rule.questions && rule.questions.length > 0 && (
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-2">
                              <p className="font-semibold text-indigo-700 text-[11px] flex items-center gap-1.5">
                                <MessageSquare size={13} /> สคริปต์คำถามตามลำดับ ({rule.questions.length} คำถาม):
                              </p>
                              <div className="space-y-1 pl-1">
                                {rule.questions.map((q, qIdx) => (
                                  <div key={qIdx} className="flex items-start gap-1.5 text-xs">
                                    <span className="font-bold text-indigo-600 flex-shrink-0">ข้อ {qIdx + 1}:</span>
                                    <span className="text-slate-800 font-medium">{q.question_text || '—'}</span>
                                    {q.image_url && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono flex-shrink-0">📸 มีรูปประกอบ</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Guidance Prompt Snippet */}
                          {rule.guidance_prompt && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                              <p className="font-semibold text-slate-500 text-[11px]">คำแนะนำเพิ่มเติมสำหรับ AI:</p>
                              <p className="whitespace-pre-wrap">{rule.guidance_prompt}</p>
                            </div>
                          )}
                        </div>

                        {/* Image Preview & Controls */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 flex-shrink-0">
                          {rule.image_url && (
                            <div className="w-24 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative group">
                              <img
                                src={toAbsoluteUrl(rule.image_url)}
                                alt="Rule attached media"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleRuleActive(rule.id)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rule.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            >
                              {rule.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingRule({ ...rule }); setNewRuleKeyword(''); }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="แก้ไขกติกา"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRuleFromSettings(rule.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="ลบกติกา"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB: Message Filter Rules */}
          {activeTab === 'rules' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-[pageFadeIn_0.2s_ease]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-500" />
                  <h3 className="text-base font-bold text-slate-800">Message Filter</h3>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <span className="block font-extrabold text-xl text-slate-800 leading-none">{combinedRules.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Rules</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-extrabold text-xl text-emerald-600 leading-none">{combinedRules.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Add Rule Form */}
              <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="WORD">Word (Exact)</option>
                  <option value="REGEX">Regex (Pattern)</option>
                </select>
                <input
                  type="text"
                  placeholder={ruleType === 'WORD' ? "Enter banned word..." : "Enter regex pattern e.g. \b(bad)\b"}
                  value={newRuleValue}
                  onChange={(e) => setNewRuleValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRule()}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono bg-white"
                />
                <button
                  onClick={addRule}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus size={15} /> Add Filter
                </button>
              </div>

              <RulesTable rules={combinedRules} onRemove={removeRule} />
            </div>
          )}

          {/* TAB: General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-[pageFadeIn_0.2s_ease]">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Zap size={18} className="text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-800">Automation Rules</h3>
                </div>
                <div className="space-y-4 divide-y divide-slate-50">
                  <Toggle
                    id="toggle-auto-ban"
                    checked={settings.is_auto_ban_enabled}
                    onChange={(v) => setSettings((s) => ({ ...s, is_auto_ban_enabled: v }))}
                    label="Auto-Ban on Toxic Content"
                    sub="Automatically deactivate users who submit flagged content based on the blocked lists."
                  />
                  <div className="pt-4">
                    <Toggle
                      id="toggle-auto-routing"
                      checked={settings.is_auto_routing_enabled}
                      onChange={(v) => setSettings((s) => ({ ...s, is_auto_routing_enabled: v }))}
                      label="Auto-Route by AI Category"
                      sub="Automatically assign unclassified problems to their predicted categories."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Sliders size={18} className="text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-800">AI Sensitivity & Punishments</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Confidence threshold */}
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <label className="text-sm font-semibold text-slate-700">
                        AI Confidence Threshold
                      </label>
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {(settings.confidence_threshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.0}
                      step={0.01}
                      value={settings.confidence_threshold}
                      onChange={(e) => setSettings((s) => ({ ...s, confidence_threshold: parseFloat(e.target.value) }))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-indigo-500 hover:accent-indigo-600 transition-all"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                      <span>50% (Lenient)</span><span>100% (Strict)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      Determines how certain the AI must be before applying an auto-ban or auto-route. Lowering this may cause false positives.
                    </p>
                  </div>

                  {/* Auto-ban duration */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Auto-Ban Duration (days)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={settings.auto_ban_duration_days}
                        onChange={(e) => setSettings((s) => ({ ...s, auto_ban_duration_days: parseInt(e.target.value) || 0 }))}
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-shadow"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">Days</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      How long users stay deactivated before the ban expires. Set to <code className="bg-slate-100 px-1 rounded text-slate-600">0</code> for permanent bans.
                    </p>
                  </div>

                  {/* Max Warnings */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Max Warnings Before Ban (จำนวนครั้งที่เตือนก่อนแบน)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={settings.max_warnings_before_ban}
                        onChange={(e) => setSettings((s) => ({ ...s, max_warnings_before_ban: parseInt(e.target.value) || 0 }))}
                        className="w-full pl-3 pr-16 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-shadow"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">Strikes</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      How many warnings a user can receive for toxic content before their account is banned. Set to <code className="bg-slate-100 px-1 rounded text-slate-600">0</code> to ban immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit / Create Prompt Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-[pageFadeIn_0.15s_ease]">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <BookOpen size={20} className="text-indigo-400" />
                <h3 className="font-bold text-base">
                  {settings.category_prompt_rules?.some(r => r.id === editingRule.id) ? 'แก้ไขกติกาคำถาม AI' : 'สร้างกติกาคำถาม AI ใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Rule Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  ชื่อกติกา (Rule Name) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น กติการายงานปัญหาตึกเรียนรวมและรถเมล์ มพ."
                  value={editingRule.name}
                  onChange={(e) => setEditingRule(r => ({ ...r, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 font-medium"
                />
              </div>

              {/* Multi-Category Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  หมวดหมู่ที่เกี่ยวข้อง (Multi-Category Selection)
                </label>
                <p className="text-xs text-slate-500 mb-2.5">เลือกได้มากกว่า 1 หมวดหมู่ หากไม่เลือกจะถือเป็นกติการวมทุกหมวดหมู่ (Global)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-60 overflow-y-auto">
                  {categories.map((cat) => {
                    const selected = editingRule.category_ids?.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const currentIds = editingRule.category_ids || [];
                          const currentNames = editingRule.category_names || [];
                          let newIds, newNames;
                          if (selected) {
                            newIds = currentIds.filter(id => id !== cat.id);
                            newNames = currentNames.filter(n => n !== cat.name);
                          } else {
                            newIds = [...currentIds, cat.id];
                            newNames = [...currentNames, cat.name];
                          }
                          setEditingRule(r => ({ ...r, category_ids: newIds, category_names: newNames }));
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-white border-white text-indigo-600' : 'border-slate-300 bg-white'}`}>
                          {selected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sequential Question Script Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      ชุดคำถามของแอดมินตามลำดับสเตป (Step-by-Step Questions Script) *
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      AI จะดึงชุดคำถามนี้ไปไล่ถามนิสิต/ผู้ใช้งานทีละสเตปตามลำดับที่คุณกำหนด พร้อมแสดงรูปแนบประจำข้อคำถาม
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addQuestionStep}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors flex-shrink-0"
                  >
                    <Plus size={14} /> เพิ่มคำถาม (Add Step)
                  </button>
                </div>

                <div className="space-y-3">
                  {(!editingRule.questions || editingRule.questions.length === 0) ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                      ยังไม่มีสคริปต์คำถาม กดปุ่ม "+ เพิ่มคำถาม" ด้านบนเพื่อสร้างคำถามแรก
                    </div>
                  ) : (
                    editingRule.questions.map((q, idx) => (
                      <div key={q.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-lg">
                            คำถามที่ {idx + 1} (Step {idx + 1})
                          </span>
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveQuestionStep(idx, -1)}
                                className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg font-bold"
                                title="เลื่อนขึ้น"
                              >
                                ↑
                              </button>
                            )}
                            {idx < (editingRule.questions.length - 1) && (
                              <button
                                type="button"
                                onClick={() => moveQuestionStep(idx, 1)}
                                className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg font-bold"
                                title="เลื่อนลง"
                              >
                                ↓
                              </button>
                            )}
                            {editingRule.questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQuestionStep(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                title="ลบคำถามนี้"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Question Text Input */}
                        <input
                          type="text"
                          placeholder={`เช่น ${idx === 0 ? 'เกิดเหตุที่อาคารไหน และห้องอะไรครับ?' : 'พบเห็นปัญหาตั้งแต่เมื่อไหร่ครับ?'}`}
                          value={q.question_text || ''}
                          onChange={(e) => updateQuestionStepText(idx, e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-medium"
                        />

                        {/* Question Image Attachment */}
                        <div className="flex items-center gap-3 pt-1">
                          {q.image_url ? (
                            <div className="w-16 h-12 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative flex-shrink-0">
                              <img src={toAbsoluteUrl(q.image_url)} alt="Question Attachment" className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id={`q_img_file_${idx}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleQuestionImageUpload(idx, file);
                              }}
                              accept="image/*"
                              className="hidden"
                            />
                            <label
                              htmlFor={`q_img_file_${idx}`}
                              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
                            >
                              <Upload size={12} /> {q.image_url ? 'เปลี่ยนรูปประจำข้อนี้' : 'แนบรูปภาพตัวอย่างประจำข้อคำถามนี้'}
                            </label>
                            {q.image_url && (
                              <button
                                type="button"
                                onClick={() => updateQuestionStepImage(idx, '')}
                                className="text-xs text-rose-600 hover:underline ml-1"
                              >
                                ลบรูป
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Guidance Prompt */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  คำแนะนำเพิ่มเติมสำหรับ AI (Optional AI Guidance Prompt)
                </label>
                <textarea
                  rows={3}
                  placeholder="เช่น ให้สังเคราะห์ข้อมูลห้องและอาคารลงในรายละเอียดตั๋วหลังจากผู้ใช้ตอบครบสองคำถาม..."
                  value={editingRule.guidance_prompt}
                  onChange={(e) => setEditingRule(r => ({ ...r, guidance_prompt: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50 leading-relaxed font-medium"
                />
              </div>

              {/* Image Attachment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  รูปภาพประกอบประจำกติกา (Rule Attached Image)
                </label>
                
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-28 h-24 bg-slate-200 rounded-xl overflow-hidden border border-slate-300 relative flex items-center justify-center flex-shrink-0 shadow-inner">
                    {editingRule.image_url ? (
                      <img
                        src={toAbsoluteUrl(editingRule.image_url)}
                        alt="Rule Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="text-slate-400" size={28} />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs font-semibold text-slate-700">แนบรูปภาพแผนผัง/อินโฟกราฟิกประกอบกติกา</p>
                    <p className="text-[11px] text-slate-500">ภาพนี้จะถูกส่งไปแสดงในช่องแชตของผู้ใช้อัตโนมัติเมื่อกติกานี้ถูกใช้งาน</p>
                    
                    <input
                      type="file"
                      ref={ruleFileInputRef}
                      onChange={handleRuleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => ruleFileInputRef.current?.click()}
                        disabled={uploadingRuleImage}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                      >
                        {uploadingRuleImage ? (
                          <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload size={14} /> อัปโหลดรูปภาพ (Upload Image)</>
                        )}
                      </button>
                      
                      {editingRule.image_url && (
                        <button
                          type="button"
                          onClick={() => setEditingRule(r => ({ ...r, image_url: '' }))}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-colors"
                        >
                          ลบรูปภาพ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Is Active Toggle */}
              <div className="pt-2">
                <Toggle
                  id="rule-active-toggle"
                  checked={editingRule.is_active}
                  onChange={(v) => setEditingRule(r => ({ ...r, is_active: v }))}
                  label="เปิดใช้งานกติกานี้ (Is Active)"
                  sub="หากปิดใช้งาน กติกานี้จะไม่ถูกนำไปใช้ใน System Prompt ของ AI"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={saveRuleToSettings}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg"
              >
                บันทึกกติกา (Apply Rule)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMSettings;
