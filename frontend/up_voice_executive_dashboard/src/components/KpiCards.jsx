import React from 'react';
import { TrendingUp, BarChart3, Clock, Users, UserX } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function KpiCards({ kpi }) {
  const student = kpi.demographics?.student || { count: 0, percent: 0 };
  const staff = kpi.demographics?.staff || { count: 0, percent: 0 };
  const anonymous = kpi.demographics?.anonymous || { count: 0, percent: 0 };
  const publicUser = kpi.demographics?.public || { count: 0, percent: 0 };

  const demographicsData = [
    { name: 'นิสิต', value: student.count || student.percent || 0, percent: student.percent, color: '#3b0764' },
    { name: 'บุคลากร', value: staff.count || staff.percent || 0, percent: staff.percent, color: '#9333ea' },
    { name: 'ไม่ระบุตัวตน', value: anonymous.count || anonymous.percent || 0, percent: anonymous.percent, color: '#f59e0b' },
    { name: 'บุคคลภายนอก', value: publicUser.count || publicUser.percent || 0, percent: publicUser.percent, color: '#38bdf8' },
  ].filter((d) => d.value > 0);

  const resolvedPercent = kpi.resolvedPercent !== undefined ? kpi.resolvedPercent : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI 1: จำนวนปัญหาทั้งหมด */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              จำนวนปัญหาทั้งหมด
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {kpi.totalProblems?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
          <TrendingUp className="w-4 h-4" />
          <span>
            {kpi.changeMonthlyPercent > 0
              ? `+${kpi.changeMonthlyPercent}% จากเดือนที่แล้ว`
              : 'ข้อมูลรายการสะสมทั้งหมดในระบบ'}
          </span>
        </div>
      </div>

      {/* KPI 2: ปัญหาที่กำลังดำเนินการ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ปัญหาที่กำลังดำเนินการ
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {kpi.pendingProblems?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-700 to-fuchsia-600 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(resolvedPercent, 2)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mt-1.5">
            <span className="text-slate-400 font-normal">
              เปิดเรื่อง: {kpi.openProblems ?? 0} | กำลังทำ: {kpi.inProgressProblems ?? 0}
            </span>
            <span className="text-purple-900 font-bold">
              {resolvedPercent}% แก้ไขแล้ว ({kpi.resolvedCount ?? 0} เรื่อง)
            </span>
          </div>
        </div>
      </div>

      {/* KPI 3: ข้อมูลผู้แจ้งปัญหา (รองรับครบ 4 กลุ่ม รวมโหมดไม่ระบุตัวตน Anonymous) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ข้อมูลผู้แจ้งปัญหา (แยก 4 กลุ่ม)
          </span>
          <Users className="w-4 h-4 text-purple-600" />
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Donut Chart */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicsData.length > 0 ? demographicsData : [{ name: 'นิสิต', value: 1, color: '#3b0764' }]}
                  innerRadius={34}
                  outerRadius={46}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(demographicsData.length > 0 ? demographicsData : [{ color: '#3b0764' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-black text-purple-950">
                {student.percent}%
              </span>
              <span className="text-[10px] text-slate-500 font-medium">นิสิต</span>
            </div>
          </div>

          {/* Exact 4-Group Legend with Counts and Percentages */}
          <div className="space-y-1 text-xs flex-1">
            {/* นิสิต */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b0764]"></span>
                <span className="text-slate-700 font-medium">นิสิต</span>
              </div>
              <span className="font-bold text-slate-900">
                {student.count} เรื่อง ({student.percent}%)
              </span>
            </div>

            {/* บุคลากร */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9333ea]"></span>
                <span className="text-slate-700 font-medium">บุคลากร</span>
              </div>
              <span className="font-bold text-slate-900">
                {staff.count} เรื่อง ({staff.percent}%)
              </span>
            </div>

            {/* ไม่ระบุตัวตน (Anonymous) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                <span className="text-amber-700 font-semibold">ไม่ระบุตัวตน</span>
              </div>
              <span className="font-bold text-amber-800">
                {anonymous.count} เรื่อง ({anonymous.percent}%)
              </span>
            </div>

            {/* บุคคลภายนอก */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
                <span className="text-slate-500 font-medium">บุคคลภายนอก</span>
              </div>
              <span className="font-bold text-slate-600">
                {publicUser.count} เรื่อง ({publicUser.percent}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
