import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, RefreshCw, TriangleAlert } from 'lucide-react';
import api from '../../services/api';
import { fetchCategoryProblems } from '../../services/problemService';

export default function CategoryDashboards() {
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    const response = await api.get('/problems/categories');
    const items = response.data?.data?.items || response.data?.data || [];
    setCategories(items);
    if (!selectedId && items[0]) setSelectedId(String(items[0].category_id || items[0].id));
  };

  useEffect(() => { loadCategories().catch(() => setError('ไม่สามารถโหลดหมวดหมู่ได้')); }, []);
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true); setError('');
    fetchCategoryProblems({ category_id: selectedId })
      .then(data => setProblems(data.items || []))
      .catch(() => setError('ไม่สามารถโหลดคำร้องของหมวดนี้ได้'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const summary = useMemo(() => ({
    total: problems.length,
    open: problems.filter(p => p.status_name === 'OPEN').length,
    progress: problems.filter(p => p.status_name === 'IN_PROGRESS').length,
    done: problems.filter(p => ['RESOLVED', 'CLOSED'].includes(p.status_name)).length,
  }), [problems]);
  const selected = categories.find(c => String(c.category_id || c.id) === String(selectedId));

  return <main className="min-h-full bg-slate-50 p-6 md:p-8">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Super Admin only</p>
          <h1 className="text-3xl font-extrabold text-slate-800 mt-1">Category Dashboards</h1>
          <p className="text-sm text-slate-500 mt-1">ดูภาพรวมและคำร้องแยกตามหมวดหมู่</p></div>
        <div className="flex items-center gap-3"><label className="text-sm font-semibold text-slate-600">เลือกหมวดหมู่</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="min-w-64 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
            {categories.map(c => <option key={c.category_id || c.id} value={c.category_id || c.id}>{c.category_name || c.name}</option>)}
          </select><button onClick={() => { setSelectedId(''); loadCategories().then(() => setSelectedId(String(selected?.category_id || selected?.id || ''))); }} className="rounded-xl bg-white p-3 text-slate-500 shadow-sm border border-slate-200"><RefreshCw size={17} /></button></div>
      </div>
      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[['คำร้องทั้งหมด', summary.total, Activity, 'text-indigo-600'], ['รอดำเนินการ', summary.open, TriangleAlert, 'text-amber-600'], ['กำลังดำเนินการ', summary.progress, Clock3, 'text-blue-600'], ['เสร็จสิ้น', summary.done, CheckCircle2, 'text-emerald-600']].map(([label, value, Icon, color]) => <div key={label} className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm"><Icon className={color} size={22} /><p className="text-xs text-slate-500 mt-4">{label}</p><p className="text-3xl font-extrabold text-slate-800 mt-1">{value}</p></div>)}
      </div>
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="font-bold text-slate-800">คำร้องในหมวด {selected?.category_name || selected?.name || ''}</h2></div>
        {loading ? <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div> : problems.length === 0 ? <div className="p-8 text-center text-slate-500">ยังไม่มีคำร้องในหมวดนี้</div> : <div className="divide-y divide-slate-100">{problems.slice(0, 20).map(p => <div key={p.problem_id} className="p-5 flex items-center justify-between gap-4"><div><p className="font-semibold text-slate-800">{p.title || 'ไม่มีหัวข้อ'}</p><p className="text-xs text-slate-500 mt-1">{p.description}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{p.status_name || 'UNKNOWN'}</span></div>)}</div>}
      </section>
    </div>
  </main>;
}
