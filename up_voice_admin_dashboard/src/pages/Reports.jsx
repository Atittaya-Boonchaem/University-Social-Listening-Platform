import React, { useState } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { FileDown, Search, AlertCircle, CheckCircle2, Clock, BarChart2 } from 'lucide-react';

// ── Palette ─────────────────────────────────────────────────────────────────
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const today     = () => new Date().toISOString().slice(0, 10);
const monthAgo  = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };

const downloadCSV = (rows, startDate, endDate) => {
  if (!rows || rows.length === 0) return;
  const headers = ['ID', 'Title', 'Status', 'Visibility', 'Category', 'Author', 'Role', 'Location', 'Latitude', 'Longitude', 'Created At'];
  const csvRows = [
    headers.join(','),
    ...rows.map(r =>
      [r.id, `"${(r.title || '').replace(/"/g, '""')}"`, r.status, r.visibility,
       r.category, `"${(r.author || '').replace(/"/g, '""')}"`, r.role,
       `"${(r.location || '').replace(/"/g, '""')}"`,
       r.latitude ?? '', r.longitude ?? '', r.created_at
      ].join(',')
    )
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `up_voice_report_${startDate}_to_${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Summary mini-card ────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, sub, colorClass, icon: Icon }) => (
  <div className={`rounded-xl border p-5 flex items-start gap-4 bg-white shadow-sm`}>
    <div className={`p-2.5 rounded-lg ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const Reports = () => {
  const [startDate, setStartDate] = useState(monthAgo());
  const [endDate,   setEndDate]   = useState(today());
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleGenerate = async () => {
    if (!startDate || !endDate) { setError('Please select both dates.'); return; }
    if (startDate > endDate)    { setError('Start date must be before end date.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/problems/analytics/report', {
        params: { start_date: startDate, end_date: endDate }
      });
      setReport(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report. Please try again.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = () => {
    if (report?.rows) downloadCSV(report.rows, startDate, endDate);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Reports</h2>
          <p className="text-gray-500 mt-1">Generate date-range analytics and export problem data as CSV.</p>
        </div>
        {report && (
          <button
            onClick={handleCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FileDown size={16} />
            Download CSV ({report.rows?.length || 0} rows)
          </button>
        )}
      </div>

      {/* ── Date range picker + Generate button ── */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Select Date Range</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today()}
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Last 7d',  days: 7  },
              { label: 'Last 30d', days: 30 },
              { label: 'Last 90d', days: 90 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - days);
                  setStartDate(d.toISOString().slice(0, 10));
                  setEndDate(today());
                }}
                className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Search size={16} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="text-center py-16 text-indigo-600 font-semibold animate-pulse">
          Generating report...
        </div>
      )}

      {/* ── Results ── */}
      {report && !loading && (
        <>
          {/* Date range banner */}
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border rounded-lg px-4 py-3">
            <BarChart2 size={16} className="text-indigo-500" />
            Showing data from <strong>{report.date_range?.start}</strong> to <strong>{report.date_range?.end}</strong>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SummaryCard
              label="Total Cases"
              value={report.summary.total}
              sub="In selected period"
              icon={BarChart2}
              colorClass="bg-indigo-50 text-indigo-600"
            />
            <SummaryCard
              label="Resolved"
              value={report.summary.resolved}
              sub={`${report.summary.resolution_rate}% resolution rate`}
              icon={CheckCircle2}
              colorClass="bg-green-50 text-green-600"
            />
            <SummaryCard
              label="Unresolved"
              value={report.summary.unresolved}
              sub="Still open or in progress"
              icon={Clock}
              colorClass="bg-orange-50 text-orange-600"
            />
            <SummaryCard
              label="Resolution Rate"
              value={`${report.summary.resolution_rate}%`}
              sub={`${report.summary.resolved} of ${report.summary.total} closed`}
              icon={CheckCircle2}
              colorClass="bg-emerald-50 text-emerald-600"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* By Category — Bar chart */}
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Problems by Category</h3>
              {report.by_category.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.by_category} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} width={110} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                      <Bar dataKey="count" name="Problems" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {report.by_category.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No category data.</div>
              )}
            </div>

            {/* By Role — Pie chart */}
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Problems by Role</h3>
              {report.by_role?.length > 0 ? (
                <div className="h-64 flex items-center">
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie data={report.by_role} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="name" paddingAngle={3}>
                        {report.by_role.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3 pl-2">
                    {report.by_role.map((role, i) => (
                      <div key={role.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-gray-700 flex-1">{role.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{role.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No role data.</div>
              )}
            </div>
          </div>

          {/* Status breakdown table */}
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(report.summary.by_status).map(([status, count]) => {
                const pct = report.summary.total > 0 ? Math.round((count / report.summary.total) * 100) : 0;
                const colors = {
                  OPEN: 'bg-orange-50 text-orange-700 border-orange-200',
                  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
                  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  CLOSED: 'bg-green-50 text-green-700 border-green-200',
                };
                return (
                  <div key={status} className={`border rounded-lg p-4 text-center ${colors[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1">{status.replace('_', ' ')}</p>
                    <p className="text-3xl font-bold">{count}</p>
                    <p className="text-xs mt-1 opacity-70">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw data preview */}
          {report.rows && report.rows.length > 0 && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Raw Data Preview</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Showing first 10 rows — download CSV for full export</p>
                </div>
                <button
                  onClick={handleCSV}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <FileDown size={14} />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-500 uppercase tracking-wider font-semibold">
                      {['ID', 'Title', 'Category', 'Author', 'Role', 'Location', 'Status', 'Created At'].map(h => (
                        <th key={h} className="px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.rows.slice(0, 10).map(row => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-400">#{row.id}</td>
                        <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{row.title}</td>
                        <td className="px-5 py-3 text-gray-600">{row.category || '-'}</td>
                        <td className="px-5 py-3 text-gray-600">{row.author?.display_name || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            row.role === 'Student' ? 'bg-blue-50   text-blue-700'   :
                            row.role === 'Staff'   ? 'bg-indigo-50 text-indigo-700' :
                            row.role === 'Public'  ? 'bg-gray-100  text-gray-600'   :
                            row.role === 'Admin'   ? 'bg-purple-50 text-purple-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{row.role || '-'}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {row.location
                            ? <span className="flex items-center gap-1">📍 {row.location}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            row.status === 'OPEN'        ? 'bg-orange-100 text-orange-700' :
                            row.status === 'IN_PROGRESS' ? 'bg-blue-100   text-blue-700'   :
                            row.status === 'CLOSED'      ? 'bg-green-100  text-green-700'   :
                            'bg-gray-100 text-gray-600'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-400">{row.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state before generating */}
      {!report && !loading && (
        <div className="border-2 border-dashed rounded-xl p-16 text-center text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No report generated yet.</p>
          <p className="text-sm mt-1">Select a date range above and click "Generate Report".</p>
        </div>
      )}

    </div>
  );
};

export default Reports;
