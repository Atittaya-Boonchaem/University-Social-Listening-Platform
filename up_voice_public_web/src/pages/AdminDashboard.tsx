

// Brand colors
const UP_PURPLE = '#2B164D';

const dummyStats = [
  { title: 'Total Users', value: '1,245', icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { title: 'Total Problems', value: '3,842', icon: '📋', color: 'text-purple-600', bg: 'bg-purple-50' },
  { title: 'Pending', value: '142', icon: '⏳', color: 'text-amber-600', bg: 'bg-amber-50' },
  { title: 'Resolved', value: '2,904', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const dummyRecentProblems = [
  { id: 1, title: 'แอร์ในห้องเรียนไม่เย็น', category: 'อาคารสถานที่', location: 'ตึก ICT', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700' },
  { id: 2, title: 'อินเทอร์เน็ตหลุดบ่อยมาก', category: 'ไอทีและเครือข่าย', location: 'หอพักนิสิต 1', status: 'Active', statusColor: 'bg-blue-100 text-blue-700' },
  { id: 3, title: 'หลอดไฟทางเดินขาด', category: 'ระบบไฟฟ้า', location: 'ตึก CE', status: 'Resolved', statusColor: 'bg-emerald-100 text-emerald-700' },
  { id: 4, title: 'สุนัขจรจัดดุร้าย', category: 'ความปลอดภัย', location: 'หน้ามอ', status: 'Pending', statusColor: 'bg-amber-100 text-amber-700' },
];

const dummyAuditLogs = [
  { id: 1, action: 'Admin resolved issue #123', time: '10 mins ago', user: 'SuperAdmin' },
  { id: 2, action: 'Category assigned to "IT Dept"', time: '1 hour ago', user: 'System' },
  { id: 3, action: 'New user registration', time: '3 hours ago', user: 'Somchai (Student)' },
  { id: 4, action: 'Admin deleted a spam comment', time: '5 hours ago', user: 'SuperAdmin' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: UP_PURPLE }}>Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมและสถิติของระบบ UP Connect</p>
        </div>
        <button className="px-4 py-2 bg-[#2B164D] text-white text-sm font-medium rounded-lg shadow-sm shadow-[#2B164D]/20 hover:bg-[#1f103b] transition">
          Generate Report
        </button>
      </div>

      {/* ─── Top Section: Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dummyStats.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${stat.bg}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Middle Section: Chart Area ─── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800">Problem Reports Overview</h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button className="px-3 py-1.5 text-xs font-semibold bg-white text-[#2B164D] rounded-md shadow-sm">Last 7 days</button>
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">Last 30 days</button>
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">This Year</button>
          </div>
        </div>
        
        {/* Dummy Chart Placeholder */}
        <div className="w-full h-64 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center">
          <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span className="text-sm font-medium text-slate-400">Chart Visualization Area (e.g., Recharts Line/Bar)</span>
        </div>
      </div>

      {/* ─── Bottom Section: Split Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recent Problems (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Problems</h2>
            <button className="text-sm font-semibold text-[#2B164D] hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Location</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {dummyRecentProblems.map((prob) => (
                  <tr key={prob.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-medium text-slate-700">{prob.title}</td>
                    <td className="py-3 text-slate-500">{prob.category}</td>
                    <td className="py-3 text-slate-500">{prob.location}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full ${prob.statusColor}`}>
                        {prob.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Activity (1/3) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {dummyAuditLogs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-[#2B164D] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 leading-snug">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{log.time}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-500">{log.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
