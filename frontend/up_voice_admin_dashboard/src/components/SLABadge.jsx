// src/components/SLABadge.jsx
/**
 * Color-coded SLA status badge.
 * level: 'green' | 'yellow' | 'red' | 'grey'
 */
import React from 'react';
import { Clock } from 'lucide-react';

const config = {
  green:  { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', emoji: '🟢' },
  yellow: { bar: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400',   emoji: '🟡' },
  red:    { bar: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500',    emoji: '🔴' },
  grey:   { bar: 'bg-slate-300',   bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   dot: 'bg-slate-400',   emoji: '⚪' },
};

export default function SLABadge({ level = 'grey', label = 'Unknown', daysOpen = 0 }) {
  const c = config[level] ?? config.grey;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${c.bg} ${c.border} ${c.text} w-fit`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${c.dot}`} />
      <Clock size={11} className="shrink-0" />
      <span>{c.emoji} {label}</span>
      <span className="text-[10px] font-normal opacity-70 ml-1">({daysOpen} วัน)</span>
    </div>
  );
}
