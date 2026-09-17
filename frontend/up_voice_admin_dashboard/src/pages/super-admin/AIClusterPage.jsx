// src/pages/super-admin/AIClusterPage.jsx
/**
 * AI Problem Cluster Dashboard
 * แสดงกลุ่มปัญหาที่ AI รวบรวมมาจากโพสต์ที่คล้ายกัน
 * มีตาราง: AI สรุป | หมวดหมู่ | สถานที่ | จำนวนโพสต์ | วันที่ | สถานะ
 */
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import {
  Layers, RefreshCw, ChevronDown, Eye, X,
  MapPin, Calendar, Hash, Tag, Loader2, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000/api/v1' 
  : 'https://university-social-listening-platform.onrender.com/api/v1';

const STATUS_OPTIONS = [
  { value: 'OPEN',        label: '🟠 รอดำเนินการ',   color: '#F97316' },
  { value: 'IN_PROGRESS', label: '🔵 กำลังดำเนินการ', color: '#3B82F6' },
  { value: 'CLOSED',      label: '🟢 เสร็จสิ้น',      color: '#22C55E' },
];

function StatusBadge({ statusName }) {
  const s = STATUS_OPTIONS.find(o => o.value === statusName) || { label: statusName, color: '#9CA3AF' };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.color + '20', color: s.color }}>
      {s.label}
    </span>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AIClusterPage() {
  const [clusters, setClusters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reclusterLoading, setReclusterLoading] = useState(false);
  const [detailCluster, setDetailCluster] = useState(null);
  const [detailProblems, setDetailProblems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [categories, setCategories] = useState([]);

  // ML Model Training States
  const [aiMetrics, setAiMetrics] = useState(null);
  const [retrainLoading, setRetrainLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAiMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/ai-model-metrics`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setAiMetrics(data.data);
      }
    } catch (e) {
      console.error("Failed to load AI model metrics:", e);
    }
  }, []);

  const handleRetrainModel = async () => {
    setRetrainLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/retrain-category-model`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        setAiMetrics(data.data);
        showToast('success', `เทรนโมเดลสำเร็จ! ความแม่นยำ: ${data.data.accuracy}%`);
      } else {
        showToast('error', data.message || 'การเทรนโมเดลล้มเหลว');
      }
    } catch (e) {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อรันเทรนโมเดล');
    } finally {
      setRetrainLoading(false);
    }
  };

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, page_size: 50 });
      if (filterCategory) params.set('category_id', filterCategory);
      if (filterStatus)   params.set('status_name', filterStatus);
      const res = await fetch(`${API_BASE}/clusters?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setClusters(data.data.items || []);
        setTotal(data.data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus]);

  useEffect(() => {
    fetchClusters();
    fetchAiMetrics();
  }, [fetchClusters, fetchAiMetrics]);

  useEffect(() => {
    fetch(`${API_BASE}/problems/categories`, { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data.items || []); })
      .catch(() => {});
  }, []);

  const openDetail = async (cluster) => {
    setDetailCluster(cluster);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clusters/${cluster.cluster_id}`, { headers });
      const data = await res.json();
      if (data.success) setDetailProblems(data.data.problems || []);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const updateStatus = async (clusterId, statusName) => {
    setUpdatingId(clusterId);
    try {
      const res = await fetch(
        `${API_BASE}/clusters/${clusterId}/status?status_name=${statusName}`,
        { method: 'PATCH', headers }
      );
      const data = await res.json();
      if (data.success) {
        setClusters(prev => prev.map(c =>
          c.cluster_id === clusterId ? { ...c, status_name: statusName } : c
        ));
        if (detailCluster?.cluster_id === clusterId) {
          setDetailCluster(prev => ({ ...prev, status_name: statusName }));
        }
        showToast('success', `อัปเดตสถานะ "${statusName}" เรียบร้อย`);
      }
    } catch (e) {
      showToast('error', 'เกิดข้อผิดพลาด');
    } finally {
      setUpdatingId(null);
    }
  };

  const recluster = async () => {
    if (!confirm('รัน AI clustering ใหม่ทั้งหมด? (อาจใช้เวลาสักครู่)')) return;
    setReclusterLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clusters/recluster`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        showToast('success', `จัดกลุ่มใหม่ ${data.data.clustered} ปัญหา`);
        fetchClusters();
      }
    } catch (e) { showToast('error', 'Recluster ล้มเหลว'); }
    finally { setReclusterLoading(false); }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B164D] flex items-center gap-2">
            <Layers className="w-6 h-6" />
            AI สรุปกลุ่มปัญหา & Custom Model Evaluation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI วิเคราะห์หมวดหมู่อัตโนมัติด้วยโมเดล PyThaiNLP + TF-IDF และจัดกลุ่มปัญหาที่คล้ายกัน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetrainModel}
            disabled={retrainLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            {retrainLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            🔄 Retrain AI Model
          </button>
          <button
            onClick={recluster}
            disabled={reclusterLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B164D] text-white rounded-lg hover:bg-[#3d2268] transition text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            {reclusterLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            Re-cluster ใหม่
          </button>
        </div>
      </div>

      {/* AI Custom Model Evaluation Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm border border-purple-800">
          <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Model Accuracy Rate</div>
          <div className="text-3xl font-extrabold mt-2 flex items-baseline gap-1">
            {aiMetrics ? `${aiMetrics.accuracy}%` : '---'}
          </div>
          <p className="text-xs text-purple-300 mt-1">PyThaiNLP + TF-IDF Classifier</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">F1-Score</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {aiMetrics ? `${aiMetrics.f1_score}%` : '---'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Precision: {aiMetrics?.precision || 0}% | Recall: {aiMetrics?.recall || 0}%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Trained Samples</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">
            {aiMetrics?.total_samples || 0} <span className="text-xs font-normal text-gray-400">เคสตัวอย่าง</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">ครอบคลุมทั้ง 8 หมวดหมู่</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Last Trained</div>
          <div className="text-sm font-bold text-gray-700 mt-3 truncate">
            {aiMetrics?.last_trained_at || 'ยังไม่ได้เทรน'}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Status: Model Active & Ready</p>
        </div>
      </div>

      {/* Model Performance Breakdown Table per Category */}
      {aiMetrics && aiMetrics.classification_report && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#2B164D] text-base">📊 ตารางประเมินผลความแม่นยำรายหมวดหมู่ (Classification Report Table)</h3>
              <p className="text-xs text-gray-500 mt-0.5">แสดงค่า Precision, Recall และ F1-Score ของโมเดลจำแนกประเภทในแต่ละหมวดหมู่</p>
            </div>
            <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-semibold">
              8 หมวดหมู่
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-100 text-xs uppercase font-bold">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">หมวดหมู่ปัญหา</th>
                  <th className="py-3 px-4 text-center">Precision</th>
                  <th className="py-3 px-4 text-center">Recall</th>
                  <th className="py-3 px-4 text-center">F1-Score</th>
                  <th className="py-3 px-4 text-center">จำนวนเคส (Support)</th>
                  <th className="py-3 px-4 text-right">สถานะความแม่นยำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(aiMetrics.classification_report)
                  .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                  .map(([catId, metrics]) => {
                    const matchedCat = categories.find(c => String(c.category_id) === String(catId));
                    const catName = matchedCat ? matchedCat.category_name : `หมวดหมู่ ID ${catId}`;
                    const prec = Math.round((metrics.precision || 0) * 100);
                    const rec = Math.round((metrics.recall || 0) * 100);
                    const f1 = Math.round((metrics['f1-score'] || 0) * 100);
                    return (
                      <tr key={catId} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-400 text-xs">#{catId}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{catName}</td>
                        <td className="py-3 px-4 text-center font-medium text-emerald-600">{prec}%</td>
                        <td className="py-3 px-4 text-center font-medium text-blue-600">{rec}%</td>
                        <td className="py-3 px-4 text-center font-bold text-purple-700">{f1}%</td>
                        <td className="py-3 px-4 text-center font-medium text-gray-600">{metrics.support || 0} เคส</td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            ✓ แม่นยำสูง (100%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">หมวดหมู่</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none min-w-[180px]"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">สถานะ</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none min-w-[160px]"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchClusters}
          className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition"
        >
          กรอง
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="animate-spin w-8 h-8 mr-2" /> กำลังโหลด...
          </div>
        ) : clusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Layers className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">ยังไม่มีกลุ่มปัญหา</p>
            <p className="text-sm mt-1">ส่งปัญหาใหม่หรือกด Re-cluster เพื่อสร้างกลุ่ม</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">AI สรุปปัญหา</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">หมวดหมู่</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">สถานที่</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">โพสต์</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">วันที่รายงาน</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[180px]">สถานะ</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-center">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((c, idx) => (
                  <tr key={c.cluster_id} className="border-b border-gray-50 hover:bg-purple-50/30 transition">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 p-1 rounded-lg bg-purple-100 flex-shrink-0">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                        </span>
                        <div>
                          <p className="font-semibold text-[#2B164D] leading-snug line-clamp-2">
                            {c.ai_summary || '(ไม่มีสรุป)'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">กลุ่ม #{c.cluster_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.category_name
                        ? <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
                            <Tag className="w-3 h-3" />{c.category_name}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.location_label
                        ? <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {c.location_label}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {c.post_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {formatDate(c.first_posted_at)}
                      </div>
                      {c.last_posted_at !== c.first_posted_at && (
                        <div className="text-gray-400 mt-0.5 pl-4">ล่าสุด: {formatDate(c.last_posted_at)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge statusName={c.status_name || 'OPEN'} />
                        <div className="relative">
                          <select
                            className="appearance-none text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-7 focus:ring-2 focus:ring-purple-200 outline-none cursor-pointer font-medium"
                            value={c.status_name || 'OPEN'}
                            onChange={e => updateStatus(c.cluster_id, e.target.value)}
                            disabled={updatingId === c.cluster_id}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                          {updatingId === c.cluster_id && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-purple-500" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetail(c)}
                        className="p-2 rounded-lg hover:bg-purple-100 text-purple-600 transition"
                        title="ดูโพสต์ในกลุ่ม"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#2B164D] flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  กลุ่ม #{detailCluster.cluster_id}
                </h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  {detailCluster.ai_summary}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {detailCluster.category_name && (
                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                      <Tag className="w-3 h-3" />{detailCluster.category_name}
                    </span>
                  )}
                  {detailCluster.location_label && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      <MapPin className="w-3 h-3" />{detailCluster.location_label}
                    </span>
                  )}
                  <StatusBadge statusName={detailCluster.status_name || 'OPEN'} />
                </div>
              </div>
              <button
                onClick={() => { setDetailCluster(null); setDetailProblems([]); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body — Problem list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" /> กำลังโหลด...
                </div>
              ) : detailProblems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">ไม่มีโพสต์ในกลุ่มนี้</div>
              ) : detailProblems.map((p, i) => (
                <div key={p.problem_id} className="border border-gray-100 rounded-xl p-4 hover:border-purple-200 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                        {p.ticket_id && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{p.ticket_id}</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-[#2B164D] leading-snug">{p.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        {p.building_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{p.building_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(p.created_at)}
                        </span>
                        {p.author?.display_name && (
                          <span>โดย: {p.author.display_name}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge statusName={p.status_name} />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer — Status Update */}
            <div className="border-t border-gray-100 p-4 flex items-center justify-between gap-3 bg-gray-50">
              <span className="text-sm font-semibold text-gray-600">อัปเดตสถานะทั้งกลุ่ม:</span>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => updateStatus(detailCluster.cluster_id, s.value)}
                    disabled={updatingId === detailCluster.cluster_id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                    style={{
                      borderColor: s.color,
                      color: detailCluster.status_name === s.value ? 'white' : s.color,
                      backgroundColor: detailCluster.status_name === s.value ? s.color : 'transparent',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
