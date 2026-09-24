import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchLLMSettings, updateLLMSettings, testAutoRouting } from '../../services/llmSettingService';
import { 
  computeAll9CategoryScores, 
  getAIRoutingHistory, 
  saveAIRoutingRecord, 
  UP_OFFICIAL_CATEGORIES 
} from '../../services/aiRoutingHistoryService';
import api from '../../services/api';
import { 
  Bot, Plus, Trash2, Save, AlertTriangle, Info, Sliders, Zap, 
  CheckCircle2, MessageSquare, ShieldAlert, MapPin, Compass, 
  Upload, Image, BookOpen, Layers, Edit3, X, Check, Route, 
  Share2, Sparkles, Activity, ArrowRight, ShieldCheck, CheckCheck,
  RefreshCw, Play, Server, Clock, Cpu, FileText, ChevronRight, Loader2,
  FlaskConical, History, BarChart3, Eye
} from 'lucide-react';

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
  confidence_threshold: 0.40, // 40% มพ. Standard
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

// ── Preset Test Scenarios (UP Connect) ──────────────────────────
const SIMULATION_PRESETS = [
  {
    id: 'dog_bus',
    label: '🚌 รถเมล์ชนหมาตายเลือดสาดที่ตึก PKY ✓',
    text: 'รถเมล์ชนหมาตายเลือดสาดที่ตึก PKY',
  },
  {
    id: 'ac_wifi',
    label: '❄️ แอร์ห้อง ICT 123 ไม่เย็นและเน็ตหลุด',
    text: 'แอร์ห้อง ICT 123 ไม่เย็นและเน็ตหลุด',
  },
  {
    id: 'food_canteen',
    label: '🍜 พบสิ่งแปลกปลอมในโรงอาหารกลาง',
    text: 'พบสิ่งแปลกปลอมในโรงอาหารกลาง',
  },
  {
    id: 'dark_lights',
    label: '💡 ไฟทางเดินมืดช่วงค่ำข้างหอพัก UP',
    text: 'ไฟทางเดินมืดช่วงค่ำข้างหอพัก UP',
  },
];

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
  
  const [activeTab, setActiveTab] = useState('routing');
  
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

  // Multi-label Routing Simulator State
  const [simText, setSimText] = useState(SIMULATION_PRESETS[0].text);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('dog_bus');
  const [simResultsList, setSimResultsList] = useState(() => computeAll9CategoryScores(SIMULATION_PRESETS[0].text));
  const [auditLogs, setAuditLogs] = useState(() => getAIRoutingHistory());
  const [selectedAuditLogModal, setSelectedAuditLogModal] = useState(null);

  const tokenCount = useMemo(() => {
    if (!simText) return 0;
    return Math.ceil(simText.trim().length / 3.2);
  }, [simText]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const handleResetDefault = () => {
    setSettings((s) => ({
      ...s,
      confidence_threshold: 0.40,
      is_auto_routing_enabled: true,
    }));
    showToast('รีเซ็ตเกณฑ์ความเชื่อมั่นเป็นค่ามาตรฐาน 40% (มพ. Standard) เรียบร้อย');
  };

  const runSimulation = async (textToTest = simText, customThreshold = settings.confidence_threshold) => {
    if (!textToTest || !textToTest.trim()) return;
    setSimLoading(true);
    try {
      const allScores = computeAll9CategoryScores(textToTest);
      setSimResultsList(allScores);

      const topScore = Math.max(...allScores.map(s => s.score));
      const thresholdPercent = Math.round(customThreshold * 100);
      const updatedHistory = saveAIRoutingRecord({
        post_text: textToTest,
        cutoff_threshold: thresholdPercent,
        top_confidence: topScore,
        all_scores: allScores,
        status: topScore >= thresholdPercent ? 'auto_routed' : 'manual_review',
      });
      setAuditLogs(updatedHistory);

      try {
        const res = await testAutoRouting({
          text: textToTest,
          threshold: customThreshold
        });
        if (res) setSimResult(res);
      } catch (apiErr) {
        // Fallback simulation already active
      }
      showToast('ประเมินผลการกระจายงานทั้ง 9 หมวดหมู่สำเร็จ');
    } catch (e) {
      showToast('ไม่สามารถทดสอบจำลองได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSimLoading(false);
    }
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

      {/* Page Header Card */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center shrink-0 border border-purple-100 shadow-xs">
            <Sparkles size={24} className="text-[#4B267D]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
              ตั้งค่า AI Engine & ระบบกระจายงานอัตโนมัติ
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              กำหนดพารามิเตอร์การคัดกรองภาษาธรรมชาติ (NLP), เกณฑ์ความเชื่อมั่น (Confidence Cutoff), และกฎกระจายงานอัตโนมัติข้ามหน่วยงาน มหาวิทยาลัยพะเยา
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors bg-white shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className="text-slate-500" />
            <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#4B267D] hover:bg-[#381C5F] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm shadow-purple-900/20 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Check size={14} className="stroke-[2.5]" />
                <span>บันทึกการตั้งค่า</span>
              </>
            )}
          </button>
        </div>
      </section>



      {/* Main Content Area: AI Multi-Label Routing */}
      <div className="w-full space-y-6">
        {/* 2-Column AI Configuration Grid (7 Cols Left / 5 Cols Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Cutoff Threshold Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Sliders size={18} className="text-[#4B267D]" />
                          <span>เกณฑ์ % ความมั่นใจสำหรับกระจายงาน (Confidence Cutoff)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          หน่วยงานที่มีคะแนนความมั่นใจจากโมเดลสูงกว่าเกณฑ์นี้จะได้รับงานอัตโนมัติ
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-purple-50 text-[#4B267D] font-mono font-bold text-sm border border-purple-100 self-start sm:self-auto shadow-2xs">
                        {Math.round(settings.confidence_threshold * 100)}% {Math.round(settings.confidence_threshold * 100) === 40 ? '(มพ. Standard)' : ''}
                      </span>
                    </div>

                    {/* Slider Bar visual */}
                    <div className="space-y-3">
                      <div className="relative w-full py-1">
                        <input
                          type="range"
                          min={0.10}
                          max={0.95}
                          step={0.01}
                          value={settings.confidence_threshold}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSettings((s) => ({ ...s, confidence_threshold: val }));
                          }}
                          className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-[#4B267D] hover:accent-[#381C5F] transition-all"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span className={Math.round(settings.confidence_threshold * 100) <= 35 ? 'font-bold text-emerald-600' : ''}>
                          10% (Zero-Drop)
                        </span>
                        <span className="font-bold text-[#4B267D]">
                          40% (แนะนำ มพ.)
                        </span>
                        <span>75%</span>
                        <span className={Math.round(settings.confidence_threshold * 100) >= 76 ? 'font-bold text-amber-600' : ''}>
                          95% (เข้มงวด)
                        </span>
                      </div>
                    </div>

                    {/* 3 Strategy Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div
                        onClick={() => setSettings((s) => ({ ...s, confidence_threshold: 0.25 }))}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          Math.round(settings.confidence_threshold * 100) >= 10 && Math.round(settings.confidence_threshold * 100) <= 35
                            ? 'border-2 border-[#4B267D] bg-purple-50/40 relative shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {Math.round(settings.confidence_threshold * 100) >= 10 && Math.round(settings.confidence_threshold * 100) <= 35 && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-[#4B267D] text-white text-[9px] font-bold">
                            ใช้งานอยู่
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span className="text-xs font-bold text-slate-800">10% - 35%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Zero-Drop ส่งทุกหน่วยงานที่อาจเกี่ยวข้อง งานไม่ตกหล่น
                        </p>
                      </div>

                      <div
                        onClick={() => setSettings((s) => ({ ...s, confidence_threshold: 0.40 }))}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          Math.round(settings.confidence_threshold * 100) >= 36 && Math.round(settings.confidence_threshold * 100) <= 75
                            ? 'border-2 border-[#4B267D] bg-purple-50/40 relative shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {Math.round(settings.confidence_threshold * 100) >= 36 && Math.round(settings.confidence_threshold * 100) <= 75 && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-[#4B267D] text-white text-[9px] font-bold">
                            ใช้งานอยู่
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4B267D]"></span>
                          <span className="text-xs font-bold text-[#4B267D]">36% - 75% Balanced</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          สมดุลสูงสุด ส่งเฉพาะหน่วยงานที่มีหลักฐานชัดเจน (แนะนำ มพ.)
                        </p>
                      </div>

                      <div
                        onClick={() => setSettings((s) => ({ ...s, confidence_threshold: 0.80 }))}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          Math.round(settings.confidence_threshold * 100) >= 76 && Math.round(settings.confidence_threshold * 100) <= 95
                            ? 'border-2 border-[#4B267D] bg-purple-50/40 relative shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        {Math.round(settings.confidence_threshold * 100) >= 76 && Math.round(settings.confidence_threshold * 100) <= 95 && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-[#4B267D] text-white text-[9px] font-bold">
                            ใช้งานอยู่
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span className="text-xs font-bold text-slate-800">76% - 95%</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          เข้มงวด ส่งเฉพาะแก่นหลัก อาจต้องมีคนช่วย Triage
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Routing Simulator Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FlaskConical size={18} className="text-emerald-600" />
                          <span>กล่องทดสอบจำลองส่งเรื่องจริง (Live Routing Simulator)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          พิมพ์ปัญหาหรือคลิกกรณีจำลองเพื่อทดสอบการตัดคำและประเมินผล Multi-Label
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        PhayaoBERT-v4
                      </span>
                    </div>

                    {/* Quick Scenario Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        กรณีทดสอบด่วน (QUICK PRESETS)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {SIMULATION_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedPresetId(preset.id);
                              setSimText(preset.text);
                              setSimResultsList(computeAll9CategoryScores(preset.text));
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              simText === preset.text
                                ? 'bg-[#4B267D] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulator Input Area */}
                    <div className="space-y-2">
                      <div className="relative">
                        <textarea
                          rows={2}
                          value={simText}
                          onChange={(e) => setSimText(e.target.value)}
                          placeholder="พิมพ์ข้อความจำลองการแจ้งปัญหา เช่น รถเมล์ชนหมาตายเลือดสาดที่ตึก PKY..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 text-xs p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4B267D] transition-all"
                        />
                        <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-400 pointer-events-none">
                          {simText.length} ตัวอักษร • {tokenCount} โทเค็น
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          จำลองด้วยเกณฑ์มั่นใจ {Math.round(settings.confidence_threshold * 100)}% (GPU Load ปกติ)
                        </span>
                        <button
                          type="button"
                          onClick={() => runSimulation(simText, settings.confidence_threshold)}
                          disabled={simLoading || !simText.trim()}
                          className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {simLoading ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>กำลังประมวลผล...</span>
                            </>
                          ) : (
                            <>
                              <Play size={13} className="fill-current" />
                              <span>ทดสอบการกระจายงาน</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Predicted Multi-Labels Stack (ALL 9 Categories) */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Activity size={16} className="text-[#4B267D]" />
                          <span>
                            ผลการวิเคราะห์ Multi-Label (ส่งต่องาน {simResultsList.filter(item => item.score >= Math.round(settings.confidence_threshold * 100)).length} จากทั้งหมด {simResultsList.length} หมวดหมู่)
                          </span>
                        </span>
                        {simResultsList.filter(item => item.score >= Math.round(settings.confidence_threshold * 100)).length > 0 ? (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Check size={12} className="stroke-[3]" /> กระจายงานสำเร็จ
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                            ไม่มีหน่วยงานถึงเกณฑ์
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {simResultsList.map((item, idx) => {
                          const isRouted = item.score >= Math.round(settings.confidence_threshold * 100);
                          return isRouted ? (
                            <div
                              key={item.category_id || idx}
                              className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3 transition-all hover:shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {item.rank || idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {item.category_name}
                                    </span>
                                    <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                                      {item.sla || 'SLA 2 ชม.'}
                                    </span>
                                  </div>
                                  {item.reason && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                      {item.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-extrabold font-mono text-emerald-700 block">
                                  {item.score}%
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600">
                                  ส่งต่องานอัตโนมัติ
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={item.category_id || idx}
                              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 opacity-75 flex items-center justify-between gap-3 transition-all hover:opacity-100"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                                  {item.rank || idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-700 truncate">
                                      {item.category_name}
                                    </span>
                                    <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-500 font-mono">
                                      {item.sla || 'ไม่เข้าข่าย'}
                                    </span>
                                  </div>
                                  {item.reason && (
                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                      {item.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-slate-500 font-mono block">
                                  {item.score}%
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ตัดทิ้ง (&lt; {Math.round(settings.confidence_threshold * 100)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* AI Audit Trail Log Widget */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History size={16} className="text-slate-600" />
                        <span>บันทึกการทำงานล่าสุด (Audit Log)</span>
                      </h2>
                      <Link
                        to="/super-admin/llm-routing-history"
                        className="text-xs text-[#4B267D] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>ดูทั้งหมด ({auditLogs.length})</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {auditLogs.slice(0, 5).map((log) => {
                        const routedCats = (log.all_scores || []).filter(
                          (c) => c.score >= (log.cutoff_threshold || 40)
                        );
                        const isAutoRouted = log.status === 'auto_routed' || routedCats.length > 0;

                        return (
                          <div
                            key={log.ticket_id}
                            onClick={() => setSelectedAuditLogModal(log)}
                            className="p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-pointer space-y-2 group shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isAutoRouted ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                <span>{isAutoRouted ? 'จัดส่งอัตโนมัติ' : 'ตรวจพบคำสุ่มเสี่ยง / รอคัดกรอง'}</span>
                                <span className="font-mono text-slate-500 font-semibold">
                                  #{log.ticket_id}
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {log.relative_time || log.created_at}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-1 group-hover:text-slate-900 transition-colors">
                              "{log.post_text}"
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {routedCats.length > 0 ? (
                                routedCats.map((cat, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                                  >
                                    <span className="truncate max-w-[140px]">{cat.category_name}</span>
                                    <span className="font-bold font-mono text-emerald-600">
                                      (มั่นใจ {cat.score}%)
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  คะแนนสูงสุด {log.top_confidence}% (ต่ำกว่าเกณฑ์)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Link
                      to="/super-admin/llm-routing-history"
                      className="block text-center py-2.5 rounded-xl border border-slate-200 hover:border-[#4B267D] hover:bg-purple-50/50 text-[#4B267D] font-bold text-xs transition-all"
                    >
                      เปิดหน้าประวัติการกระจายงานฉบับเต็ม พร้อมตัวกรอง ↗
                    </Link>
                  </div>
                </div>
              </div>
            </div>

      {/* Footer Telemetry */}
      <footer className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>© 2025 มหาวิทยาลัยพะเยา (University of Phayao). ศูนย์บริการเทคโนโลยีสารสนเทศและการสื่อสาร (CITCOMS).</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            CITCOMS PhayaoBERT Cluster v4.2
          </span>
          <span>•</span>
          <span>Security Level: Super-Admin Authorized</span>
        </div>
      </footer>

      {/* 9-Category Breakdown Modal for Selected Audit Log */}
      {selectedAuditLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-[pageFadeIn_0.15s_ease]">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] my-auto overflow-hidden">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <BarChart3 size={18} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>รายละเอียดผลการประเมิน 9 หมวดหมู่</span>
                    <span className="font-mono text-purple-300 text-xs">#{selectedAuditLogModal.ticket_id}</span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    เกณฑ์ตัดคะแนนความมั่นใจ {selectedAuditLogModal.cutoff_threshold}% • โมเดล {selectedAuditLogModal.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLogModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  ข้อความโพสต์จากผู้ใช้งาน
                </span>
                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  "{selectedAuditLogModal.post_text}"
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
                  <Activity size={14} className="text-[#4B267D]" />
                  <span>ผลคะแนนจำแนกตามภารกิจทั้ง 9 หมวดหมู่ของมหาวิทยาลัย (0% - 100%)</span>
                </span>

                <div className="space-y-2">
                  {selectedAuditLogModal.all_scores.map((cat, idx) => {
                    const isRouted = cat.score >= selectedAuditLogModal.cutoff_threshold;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                          isRouted
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-slate-200 bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isRouted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {cat.category_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({cat.sla})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs font-extrabold font-mono ${
                                isRouted ? 'text-emerald-700' : 'text-slate-500'
                              }`}
                            >
                              {cat.score}%
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isRouted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isRouted ? 'จัดส่งอัตโนมัติ' : 'ตัดทิ้ง'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isRouted ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(cat.score, 0)}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-500">
                          {cat.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/super-admin/llm-routing-history"
                className="text-xs text-[#4B267D] font-bold hover:underline"
              >
                ดูประวัติทั้งหมดในหน้าแยก ↗
              </Link>
              <button
                type="button"
                onClick={() => setSelectedAuditLogModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

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
