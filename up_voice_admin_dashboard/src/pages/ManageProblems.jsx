import React, { useEffect, useState, useCallback } from 'react';
import Select from 'react-select';
import api from '../services/api';
import { Trash2, RefreshCw, Filter, Eye, X, Download } from 'lucide-react';

// Role options are static — matches the roles table in the DB
const ROLE_OPTIONS = [
  { value: 1, label: 'นิสิต มพ. (Student)' },
  { value: 2, label: 'บุคลากร (Staff)' },
  { value: 3, label: 'บุคคลทั่วไป (Public)' },
  { value: 4, label: 'ผู้ดูแลระบบ (Admin)' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN',        label: '🟠 OPEN' },
  { value: 'IN_PROGRESS', label: '🔵 IN PROGRESS' },
  { value: 'CLOSED',      label: '🟢 CLOSED' },
];

// Shared react-select styles to match our Tailwind theme
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#6366F1' : '#E5E7EB',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(99,102,241,0.2)' : 'none',
    '&:hover': { borderColor: '#6366F1' },
    minHeight: '40px',
    fontSize: '0.875rem',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#EEF2FF',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#4338CA',
    fontWeight: 600,
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#6366F1',
    '&:hover': { backgroundColor: '#C7D2FE', color: '#3730A3' },
  }),
  placeholder: (base) => ({ ...base, color: '#9CA3AF' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#6366F1' : state.isFocused ? '#EEF2FF' : 'white',
    color: state.isSelected ? 'white' : '#111827',
    fontSize: '0.875rem',
  }),
};

const ManageProblems = () => {
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/api\/v1\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const [problems, setProblems]           = useState([]);
  const [allProblems, setAllProblems]     = useState([]); // unfiltered master list
  const [loading, setLoading]             = useState(true);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);

  // Filter state
  const [selectedRoles,      setSelectedRoles]      = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses,   setSelectedStatuses]   = useState([]);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [startDate,          setStartDate]          = useState('');
  const [endDate,            setEndDate]            = useState('');

  // ── Fetch categories for the filter dropdown ──────────────────────────────
  useEffect(() => {
    api.get('/problems/categories')
      .then(res => {
        const cats = res.data?.data?.items || [];
        setCategoryOptions(cats.map(c => ({ value: c.category_id || c.id, label: c.category_name || c.name })));
      })
      .catch(() => {});
  }, []);

  // ── Paginated fetch helper ────────────────────────────────────────────────
  const fetchAllPages = async (visibility) => {
    let page = 1;
    let allItems = [];
    while (true) {
      const res = await api.get('/problems/list', {
        params: { page, page_size: 100, visibility }
      }).catch(() => null);

      const items = res?.data?.data?.items || [];
      allItems = [...allItems, ...items];

      const total = res?.data?.data?.total || 0;
      if (allItems.length >= total || items.length === 0) break;
      page++;
    }
    return allItems;
  };

  // ── Initial data fetch ────────────────────────────────────────────────────
  const fetchProblems = useCallback(async () => {
    try {
      setLoading(true);
      const [publicItems, internalItems] = await Promise.all([
        fetchAllPages('public'),
        fetchAllPages('internal'),
      ]);

      const merged = [...publicItems, ...internalItems];
      const unique = Array.from(new Map(merged.map(p => [p.id, p])).values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setAllProblems(unique);
      setProblems(unique);
    } catch (error) {
      console.error("Failed to fetch problems", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  // ── Client-side filter whenever selections change ─────────────────────────
  useEffect(() => {
    let filtered = [...allProblems];

    if (selectedRoles.length > 0) {
      const roleIds = selectedRoles.map(r => r.value);
      filtered = filtered.filter(p => roleIds.includes(p.author?.role_id));
    }

    if (selectedCategories.length > 0) {
      const catIds = selectedCategories.map(c => c.value);
      filtered = filtered.filter(p => catIds.includes(p.category_id));
    }

    if (selectedStatuses.length > 0) {
      const statuses = selectedStatuses.map(s => s.value);
      filtered = filtered.filter(p => statuses.includes(p.status));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.title && p.title.toLowerCase().includes(term)) ||
        (p.id && String(p.id).includes(term))
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.created_at) <= end);
    }

    setProblems(filtered);
  }, [selectedRoles, selectedCategories, selectedStatuses, searchTerm, startDate, endDate, allProblems]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (problemId, newStatus) => {
    try {
      await api.patch(`/problems/${problemId}/status?new_status_name=${newStatus}`);
      const update = p => p.id === problemId ? { ...p, status: newStatus } : p;
      setAllProblems(prev => prev.map(update));
      setProblems(prev => prev.map(update));
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status.");
    }
  };

  const handleDelete = async (problemId) => {
    if (!window.confirm("Are you sure you want to delete this problem? This cannot be undone.")) return;
    try {
      await api.delete(`/problems/${problemId}`);
      setAllProblems(prev => prev.filter(p => p.id !== problemId));
      setProblems(prev => prev.filter(p => p.id !== problemId));
    } catch (error) {
      console.error("Failed to delete problem", error);
      alert("Failed to delete problem.");
    }
  };

  const clearFilters = () => {
    setSelectedRoles([]);
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered = selectedRoles.length > 0 || selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm !== '' || startDate !== '' || endDate !== '';

  const exportToCSV = () => {
    const headers = ['ID', 'Category', 'Description', 'Author / Role', 'Location', 'Status', 'Date'];
    const rows = problems.map(p => {
      const roleLabel = ROLE_OPTIONS.find(r => r.value === p.author?.role_id)?.label.split(' ')[0] || 'N/A';
      return [
        p.id,
        `"${(p.category_name || 'N/A').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        `"${(p.author?.display_name || 'ไม่ระบุตัวตน...')} (${roleLabel})"`.replace(/"/g, '""'),
        `"${(p.building_name || 'ไม่ระบุสถานที่').replace(/"/g, '""')}"`,
        p.status,
        new Date(p.created_at).toLocaleDateString()
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // BOM for Excel UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "problems_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'OPEN':        return 'bg-orange-100 text-orange-800';
      case 'IN_PROGRESS': return 'bg-blue-100   text-blue-800';
      case 'RESOLVED':
      case 'CLOSED':      return 'bg-green-100  text-green-800';
      default:            return 'bg-gray-100   text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-xl font-semibold text-indigo-600 animate-pulse">Loading problems...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Problems</h2>
          <p className="text-gray-500 mt-1">
            Showing <span className="font-semibold text-indigo-600">{problems.length}</span> of{' '}
            <span className="font-semibold">{allProblems.length}</span> total problems
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Download size={16} />
            Export to CSV
          </button>
          <button
            onClick={fetchProblems}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      <div className="bg-white border rounded-xl shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-700 text-sm">Filter Problems</h3>
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by title or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#2B164D]/20 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#2B164D]/20 outline-none"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              User Roles
            </label>
            <Select
              isMulti
              options={ROLE_OPTIONS}
              value={selectedRoles}
              onChange={setSelectedRoles}
              styles={selectStyles}
              placeholder="All roles..."
              closeMenuOnSelect={false}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              Problem Categories
            </label>
            <Select
              isMulti
              options={categoryOptions}
              value={selectedCategories}
              onChange={setSelectedCategories}
              styles={selectStyles}
              placeholder="All categories..."
              closeMenuOnSelect={false}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
              Status
            </label>
            <Select
              isMulti
              options={STATUS_OPTIONS}
              value={selectedStatuses}
              onChange={setSelectedStatuses}
              styles={selectStyles}
              placeholder="All statuses..."
              closeMenuOnSelect={false}
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 w-16">ID</th>
                <th className="p-4">Category</th>
                <th className="p-4">รายละเอียด</th>
                <th className="p-4">Author / Role</th>
                <th className="p-4">LOCATION (สถานที่)</th>
                <th className="p-4">Date</th>
                <th className="p-4 w-40">Status</th>
                <th className="p-4 w-20 text-center">Action</th>
                <th className="p-4 w-20 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {problems.map((problem) => (
                <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-400 text-xs">#{problem.id}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">
                      {problem.category_name || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[200px] truncate text-sm text-gray-700" title={problem.description}>
                      {problem.description}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {problem.author?.display_name || 'ไม่ระบุตัวตน...'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ROLE_OPTIONS.find(r => r.value === problem.author?.role_id)?.label.split(' ')[0] || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 text-xs">{problem.building_name || 'ไม่ระบุสถานที่'}</td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(problem.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <select
                      value={problem.status}
                      onChange={(e) => handleStatusChange(problem.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1.5 rounded outline-none cursor-pointer border hover:border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${getStatusBadgeClass(problem.status)}`}
                    >
                      <option value="OPEN"        className="bg-white text-gray-900">OPEN</option>
                      <option value="IN_PROGRESS" className="bg-white text-gray-900">IN PROGRESS</option>
                      <option value="CLOSED"      className="bg-white text-gray-900">CLOSED</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedProblem(problem)}
                      className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(problem.id)}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Problem"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {problems.length === 0 && (
                <tr key="empty">
                  <td colSpan="9" className="p-12 text-center text-gray-400">
                    {isFiltered
                      ? 'No problems match the selected filters.'
                      : 'No problems found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── Problem Details Modal ── */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Problem Details</h3>
              <button 
                onClick={() => setSelectedProblem(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                <p className="text-gray-900 font-medium text-lg whitespace-pre-wrap leading-relaxed">{selectedProblem.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</h4>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-md font-medium inline-block">
                    {selectedProblem.category_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Location</h4>
                  <p className="text-gray-700">{selectedProblem.building_name || 'ไม่ระบุสถานที่'}</p>
                  {(selectedProblem.latitude && selectedProblem.longitude) && (
                    <a 
                      href={`https://www.google.com/maps?q=${selectedProblem.latitude},${selectedProblem.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                    >
                      View on Map ({selectedProblem.latitude}, {selectedProblem.longitude})
                    </a>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Reporter</h4>
                  <p className="text-gray-700 font-medium">{selectedProblem.author?.display_name || 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</h4>
                  <span className={`px-2 py-1 text-xs rounded-md font-bold ${getStatusBadgeClass(selectedProblem.status)}`}>
                    {selectedProblem.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Submitted</h4>
                  <p className="text-gray-700">{new Date(selectedProblem.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedProblem.attachments && selectedProblem.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Attached Image</h4>
                  <div className="rounded-lg overflow-hidden border bg-gray-50 max-h-80 flex items-center justify-center">
                    <img 
                      src={getImageUrl(selectedProblem.attachments[0].file_url)} 
                      alt="Problem Attachment" 
                      className="max-w-full max-h-80 object-contain"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400?text=Image+Not+Found'; }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedProblem(null)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProblems;
