// src/pages/super-admin/LLMSettings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLLMSettings, updateLLMSettings } from '../../services/llmSettingService';
import { Bot, Plus, Trash2, Save, AlertTriangle, Info, Sliders, Zap, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';

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
};

// ── Tag pill for Chatbot Questions ─────────────────────────────
const WordTag = ({ word, onRemove }) => (
  <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm border bg-emerald-50 border-emerald-100 text-emerald-700">
    {word}
    <button
      onClick={() => onRemove(word)}
      className="transition-colors text-emerald-400 hover:text-emerald-700"
    >
      <Trash2 size={11} />
    </button>
  </span>
);

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
  const [ruleType, setRuleType] = useState('WORD');
  const [newRuleValue, setNewRuleValue] = useState('');

  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
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
        });
      }
    } catch (e) {
      setError('Failed to load LLM settings. Ensure you are a Super Admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
    <div className="space-y-6 max-w-5xl mx-auto">
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
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-shrink-0 flex flex-col gap-1 sticky top-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Navigation</h3>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'chatbot' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <MessageSquare size={18} /> Chatbot Config
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
    </div>
  );
};

export default LLMSettings;
