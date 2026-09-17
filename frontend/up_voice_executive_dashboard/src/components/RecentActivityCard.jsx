import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRightLeft, MessageSquare } from 'lucide-react';

export default function RecentActivityCard({ activities = [] }) {
  const getIcon = (type) => {
    switch (type) {
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
    }
  };

  const getBgClass = (type) => {
    switch (type) {
      case 'resolved':
        return 'bg-emerald-50 border-emerald-200';
      case 'urgent':
        return 'bg-rose-50 border-rose-200';
      case 'transfer':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900 text-base md:text-lg">
          กิจกรรมล่าสุด
        </h3>
        <span className="text-xs text-slate-400 font-medium">เรียลไทม์</span>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.map((act) => (
          <div key={act.id} className="flex items-start gap-3.5 group">
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${getBgClass(act.type)}`}>
              {getIcon(act.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-slate-800 font-medium leading-snug group-hover:text-purple-900 transition-colors">
                {act.title}
              </p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {act.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
