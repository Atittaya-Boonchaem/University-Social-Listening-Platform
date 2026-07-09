// src/pages/super-admin/BuildingManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '../../services/buildingService';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  MapPin,
  Navigation,
} from 'lucide-react';

// ── Coord formatter ────────────────────────────────────────────
const fmtCoord = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return parseFloat(val).toFixed(6);
};

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse space-y-5">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="w-48 h-5 bg-slate-200 rounded-lg" />
        <div className="w-72 h-3 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-36 h-10 bg-slate-200 rounded-xl" />
    </div>
    {/* Search */}
    <div className="w-full h-10 bg-slate-100 rounded-xl" />
    {/* Stats */}
    <div className="grid grid-cols-2 gap-3">
      <div className="h-16 bg-white rounded-xl border border-slate-100" />
      <div className="h-16 bg-white rounded-xl border border-slate-100" />
    </div>
    {/* Table */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-8">
          {['w-8', 'w-40', 'w-28', 'w-28', 'w-16'].map((w, i) => (
            <div key={i} className={`${w} h-3 bg-slate-200 rounded`} />
          ))}
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex gap-8 items-center">
          <div className="w-8 h-3 bg-slate-100 rounded" />
          <div className="w-44 h-4 bg-slate-200 rounded" />
          <div className="w-24 h-3 bg-slate-100 rounded" />
          <div className="w-24 h-3 bg-slate-100 rounded" />
          <div className="ml-auto flex gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[60] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-medium ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
    {msg}
  </div>
);

// ── Confirm Delete Dialog ──────────────────────────────────────
const ConfirmDeleteDialog = ({ building, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[pageFadeIn_0.2s_ease]">
      <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
        <Trash2 size={20} className="text-rose-500" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">Delete Building</h3>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        Are you sure you want to delete{' '}
        <strong className="text-slate-800">"{building.name}"</strong>? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Deleting...
            </>
          ) : (
            'Yes, Delete'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Building Modal (Create / Edit) ─────────────────────────────
const EMPTY_FORM = { name: '', latitude: '', longitude: '' };

const BuildingModal = ({ mode, initial, onClose, onSave }) => {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name || '',
          latitude: initial.latitude !== null && initial.latitude !== undefined ? String(initial.latitude) : '',
          longitude: initial.longitude !== null && initial.longitude !== undefined ? String(initial.longitude) : '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Building name is required.');
      return;
    }
    const lat = form.latitude !== '' ? parseFloat(form.latitude) : null;
    const lng = form.longitude !== '' ? parseFloat(form.longitude) : null;
    if (form.latitude !== '' && isNaN(lat)) {
      setError('Latitude must be a valid decimal number (e.g. 19.028600).');
      return;
    }
    if (form.longitude !== '' && isNaN(lng)) {
      setError('Longitude must be a valid decimal number (e.g. 99.895800).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), latitude: lat, longitude: lng });
    } catch (err) {
      setError(
        err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.'
      );
      setSaving(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[pageFadeIn_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            {isEdit ? (
              <Pencil size={16} className="text-indigo-600" />
            ) : (
              <Plus size={16} className="text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isEdit ? 'Edit Building' : 'Add New Building'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEdit ? 'Update the building details below' : 'Enter the building details below'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            id="building-modal-close"
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Building Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="bld-name">
              Building Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="bld-name"
              type="text"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={saving}
              placeholder="e.g. คณะเทคโนโลยีสารสนเทศและการสื่อสาร"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold text-slate-600 mb-1.5"
                htmlFor="bld-lat"
              >
                Latitude
              </label>
              <input
                id="bld-lat"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                disabled={saving}
                placeholder="19.028600"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50 font-mono"
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold text-slate-600 mb-1.5"
                htmlFor="bld-lng"
              >
                Longitude
              </label>
              <input
                id="bld-lng"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                disabled={saving}
                placeholder="99.895800"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 bg-slate-50/50 hover:bg-white transition-colors disabled:opacity-50 font-mono"
              />
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <Navigation size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-600 leading-relaxed">
              These coordinates serve as the <strong>default map center</strong> when a reporter
              selects this building but hasn't provided their own GPS location.
            </p>
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="building-modal-submit"
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {isEdit ? 'Saving...' : 'Adding...'}
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add Building'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Coordinate Cell ────────────────────────────────────────────
const CoordCell = ({ value, icon: Icon, label, colorClass }) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-xs text-slate-300 italic">not set</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className={colorClass} />
      <span className="text-xs font-mono text-slate-600">{fmtCoord(value)}</span>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const BuildingManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: object }
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadBuildings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBuildings();
      setBuildings(data);
    } catch {
      showToast('Failed to load buildings. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // ── Filtered list ────────────────────────────────────────────
  const filtered = buildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Stats ────────────────────────────────────────────────────
  const withCoords = buildings.filter(
    (b) =>
      b.latitude !== null &&
      b.latitude !== undefined &&
      b.longitude !== null &&
      b.longitude !== undefined
  ).length;

  // ── Save (Create / Edit) ─────────────────────────────────────
  const handleSave = async (form) => {
    if (modal?.mode === 'edit' && modal.data) {
      const updated = await updateBuilding(modal.data.building_id, form);
      setBuildings((prev) =>
        prev.map((b) =>
          b.building_id === modal.data.building_id ? { ...b, ...updated } : b
        )
      );
      showToast('Building updated successfully.');
    } else {
      const created = await createBuilding(form);
      setBuildings((prev) => [...prev, created]);
      showToast('Building added successfully.');
    }
    setModal(null);
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await deleteBuilding(deleteDialog.building_id);
      setBuildings((prev) => prev.filter((b) => b.building_id !== deleteDialog.building_id));
      showToast('Building deleted.');
      setDeleteDialog(null);
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.response?.data?.message || 'Failed to delete.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Delete dialog */}
      {deleteDialog && (
        <ConfirmDeleteDialog
          building={deleteDialog}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteDialog(null)}
          isLoading={deleting}
        />
      )}

      {/* Modal */}
      {modal && (
        <BuildingModal
          mode={modal.mode}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={17} className="text-indigo-500" />
            Building Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage campus buildings and their center coordinates used for problem location mapping.
          </p>
        </div>
        <button
          id="add-building-btn"
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={16} />
          Add Building
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          id="building-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by building name..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm transition-shadow"
        />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 size={15} className="text-indigo-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">{buildings.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total Buildings</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <MapPin size={15} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">{withCoords}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">With Coordinates</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'building' : 'buildings'}
            {search && ' found'}
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Building2 size={22} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">No buildings found</p>
              <p className="text-xs mt-0.5">
                {search ? 'Try a different search term.' : 'Click "Add Building" to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Building Name</th>
                  <th style={{ width: '160px' }}>Latitude</th>
                  <th style={{ width: '160px' }}>Longitude</th>
                  <th style={{ width: '100px' }} className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bld) => (
                  <tr key={bld.building_id}>
                    {/* ID */}
                    <td>
                      <span className="text-xs font-mono text-slate-400">#{bld.building_id}</span>
                    </td>

                    {/* Name */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-indigo-500" />
                        </div>
                        <span className="font-semibold text-slate-800 text-[13px] leading-tight">
                          {bld.name}
                        </span>
                      </div>
                    </td>

                    {/* Latitude */}
                    <td>
                      <CoordCell
                        value={bld.latitude}
                        icon={MapPin}
                        label="Lat"
                        colorClass="text-indigo-400"
                      />
                    </td>

                    {/* Longitude */}
                    <td>
                      <CoordCell
                        value={bld.longitude}
                        icon={Navigation}
                        label="Lng"
                        colorClass="text-violet-400"
                      />
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`edit-bld-${bld.building_id}`}
                          title="Edit building"
                          onClick={() => setModal({ mode: 'edit', data: bld })}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-bld-${bld.building_id}`}
                          title="Delete building"
                          onClick={() => setDeleteDialog(bld)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingManagement;
