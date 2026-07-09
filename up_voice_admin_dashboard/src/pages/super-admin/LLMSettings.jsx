// src/pages/super-admin/LLMSettings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLLMSettings, updateLLMSettings } from '../../services/llmSettingService';
import { Bot, Plus, Trash2, Save, AlertTriangle, Info, Sliders, Zap, CheckCircle2 } from 'lucide-react';

// ── Default empty state ─────────────────────────────────────────
const DEFAULT_SETTINGS = {
  is_auto_ban_enabled: true,
  is_auto_routing_enabled: true,
  auto_ban_duration_days: 7,
  confidence_threshold: 0.85,
  banned_words: [],
  banned_patterns: [],
};

// ── Tag pill ───────────────────────────────────────────────────
const WordTag = ({ word, onRemove, type = 'word' }) => (
  <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm border ${
    type === 'word' 
      ? 'bg-rose-50 border-rose-100 text-rose-700'
      : 'bg-violet-50 border-violet-100 text-violet-700 font-mono'
  }`}>
    {word}
    <button
      onClick={() => onRemove(word)}
      className={`transition-colors ${type === 'word' ? 'text-rose-400 hover:text-rose-700' : 'text-violet-400 hover:text-violet-700'}`}
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
  <div className="space-y-6 max-w-3xl animate-pulse">
    <div className="h-32 bg-slate-200 rounded-2xl" />
    <div className="h-40 bg-slate-200 rounded-2xl" />
    <div className="h-40 bg-slate-200 rounded-2xl" />
    <div className="h-48 bg-slate-200 rounded-2xl" />
  </div>
);


// ── Main page ──────────────────────────────────────────────────
const LLMSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  
  const [newWord, setNewWord]   = useState('');
  const [newPattern, setNewPattern] = useState('');
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
          banned_words: data.banned_words || [],
          banned_patterns: data.banned_patterns || [],
        });
      }
    } catch (e) {
      setError('Failed to load LLM settings. Ensure you are a Super Admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Tag Handlers
  const addWord = () => {
    const w = newWord.trim();
    if (!w || settings.banned_words.includes(w)) return;
    setSettings((s) => ({ ...s, banned_words: [...s.banned_words, w] }));
    setNewWord('');
  };

  const removeWord = (word) => {
    setSettings((s) => ({ ...s, banned_words: s.banned_words.filter((w) => w !== word) }));
  };

  const addPattern = () => {
    const p = newPattern.trim();
    if (!p || settings.banned_patterns.includes(p)) return;
    setSettings((s) => ({ ...s, banned_patterns: [...s.banned_patterns, p] }));
    setNewPattern('');
  };

  const removePattern = (pat) => {
    setSettings((s) => ({ ...s, banned_patterns: s.banned_patterns.filter((p) => p !== pat) }));
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
    <div className="bg-rose-50 text-rose-600 rounded-2xl p-6 text-center border border-rose-100 max-w-3xl">
      <AlertTriangle className="mx-auto mb-2" size={24} />
      <p className="font-semibold">{error}</p>
      <button onClick={loadData} className="mt-3 text-sm font-medium hover:underline">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">

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
              Configure frontline AI parameters: content moderation rules, auto-ban triggers, and category routing.
            </p>
            <p className="text-white/60 text-xs mt-3 flex items-center gap-1.5 font-medium">
              <Info size={13} />
              Changes take effect immediately for all new problem submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Automation toggles */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Zap size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Automation Rules</h3>
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

      {/* Thresholds */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Sliders size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">AI Sensitivity & Punishments</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Confidence threshold */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="text-xs font-semibold text-slate-700">
                AI Confidence Threshold
              </label>
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {(settings.confidence_threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="confidence-threshold-slider"
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
            <label className="block text-xs font-semibold text-slate-700 mb-3">
              Auto-Ban Duration (days)
            </label>
            <div className="relative">
              <input
                id="auto-ban-duration-input"
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
        </div>
      </div>

      {/* Banned words */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-rose-500" />
          <h3 className="text-sm font-bold text-slate-800">Banned Words</h3>
          <span className="badge bg-rose-50 border border-rose-100 text-rose-700 ml-auto font-semibold">{settings.banned_words.length} items</span>
        </div>

        {/* Word cloud */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[56px] p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
          {settings.banned_words.length === 0
            ? <p className="text-xs text-slate-400 self-center w-full text-center">No banned words configured yet</p>
            : settings.banned_words.map((w) => (
                <WordTag key={w} word={w} onRemove={removeWord} type="word" />
              ))
          }
        </div>

        {/* Add word form */}
        <div className="flex gap-2">
          <input
            id="add-banned-word-input"
            type="text"
            placeholder="Type a toxic word and press Enter…"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWord())}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-shadow bg-white"
          />
          <button
            id="add-banned-word-btn"
            onClick={addWord}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Banned regex patterns */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={16} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-800">Banned Patterns (Regex)</h3>
          <span className="badge bg-violet-50 border border-violet-100 text-violet-700 ml-auto font-semibold">{settings.banned_patterns.length} patterns</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 min-h-[56px] p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
          {settings.banned_patterns.length === 0
            ? <p className="text-xs text-slate-400 self-center w-full text-center">No regex patterns configured yet</p>
            : settings.banned_patterns.map((p) => (
                <WordTag key={p} word={p} onRemove={removePattern} type="pattern" />
              ))
          }
        </div>

        <div className="flex gap-2">
          <input
            id="add-banned-pattern-input"
            type="text"
            placeholder="e.g. \b(bad|ugly)\b"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPattern())}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-shadow bg-white"
          />
          <button
            id="add-banned-pattern-btn"
            onClick={addPattern}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Patterns use standard Python <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">re.search()</code> syntax. Escape special characters accordingly.
        </p>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          id="save-llm-settings-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:hover:shadow-md"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving Configuration…
            </>
          ) : (
            <>
              <Save size={16} />
              Save AI Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LLMSettings;
