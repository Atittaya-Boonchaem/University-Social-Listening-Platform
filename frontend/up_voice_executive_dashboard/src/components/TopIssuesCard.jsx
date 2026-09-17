import React from 'react';

export default function TopIssuesCard({ topIssues = [] }) {
  const maxCount = Math.max(...topIssues.map((item) => item.count), 500);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-900 text-base md:text-lg">
          5 อันดับปัญหาที่พบมากที่สุด
        </h3>
        <button className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline">
          ดูทั้งหมด
        </button>
      </div>

      {/* Ranked Issue Bars */}
      <div className="space-y-4">
        {topIssues.map((issue, idx) => {
          const percentage = Math.round((issue.count / maxCount) * 100);
          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs md:text-sm font-medium mb-1.5">
                <span className="text-slate-700 group-hover:text-purple-900 transition-colors">
                  {issue.title}
                </span>
                <span className="font-bold text-slate-900 ml-2">
                  {issue.count}
                </span>
              </div>
              <div className="w-full bg-purple-50 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#2d0c52] h-3 rounded-full transition-all duration-700 ease-out group-hover:bg-purple-700"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
