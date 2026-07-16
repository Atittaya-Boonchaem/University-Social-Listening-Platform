import React, { useState, useEffect } from 'react';
import { Building2, Tags, Users, Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position && position.lat && position.lng ? <Marker position={[position.lat, position.lng]} /> : null;
}

const MasterDataSettings = () => {
  const [activeTab, setActiveTab] = useState('buildings');
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3B82F6');
  const [requireMap, setRequireMap] = useState(false);
  const [isBuildingActive, setIsBuildingActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map Panel State
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [editCoords, setEditCoords] = useState({ lat: 19.0286, lng: 99.8946 });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete Modal State
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [bldRes, catRes, utRes] = await Promise.all([
        api.get('/buildings/'),
        api.get('/problems/categories'),
        api.get('/public-user-types')
      ]);

      let bData = bldRes.data?.data?.items || [];
      const cData = catRes.data?.data?.items || [];
      const utData = utRes.data?.data || [];

      // Sort numerically by ID ascending
      bData.sort((a, b) => (a.building_id || a.id || 0) - (b.building_id || b.id || 0));
      cData.sort((a, b) => (a.category_id || a.id || 0) - (b.category_id || b.id || 0));
      utData.sort((a, b) => (a.id || 0) - (b.id || 0));

      if (bData.length === 0) {
        bData = [
          { building_id: 1, name: 'ตึก ICT', is_active: true, latitude: 19.0286, longitude: 99.8946 },
          { building_id: 2, name: 'ตึกวิศวกรรม', is_active: true, latitude: 19.0289, longitude: 99.8973 },
          { building_id: 3, name: 'โรงอาหาร', is_active: false, latitude: 19.0281, longitude: 99.8950 },
        ];
      } else {
        bData.forEach((b, i) => b.is_active = b.is_active ?? (i % 2 === 0));
      }

      const mockColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      cData.forEach((c, i) => c.color = c.color || mockColors[i % mockColors.length]);

      setBuildings(bData);
      setCategories(cData);
      setUserTypes(utData);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (category) => {
    setEditingItem(category);
    setNewItemName(category.category_name);
    setCategoryColor(category.color || '#3B82F6');
    setRequireMap(category.requires_location_privacy || false);
    setIsAddModalOpen(true);
  };

  const handleEditBuilding = (building) => {
    setEditingItem(building);
    setNewItemName(building.name);
    setIsBuildingActive(building.is_active ?? true);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (id, name, type) => {
    setDeleteConfig({ isOpen: true, id, name, type });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      let endpoint = '';
      if (deleteConfig.type === 'category') {
        endpoint = `/problems/categories/${deleteConfig.id}`;
      } else if (deleteConfig.type === 'building') {
        endpoint = `/buildings/${deleteConfig.id}`;
      } else if (deleteConfig.type === 'user_type') {
        endpoint = `/public-user-types/${deleteConfig.id}`;
      }
      
      if (endpoint) {
        await api.delete(endpoint);
        fetchMasterData();
      }
      setDeleteConfig({ isOpen: false, id: null, name: '', type: '' });
    } catch (err) {
      console.error(`Failed to delete ${deleteConfig.type}:`, err);
      alert(`Failed to delete ${deleteConfig.type}: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
      setDeleteConfig({ isOpen: false, id: null, name: '', type: '' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'buildings') {
        if (editingItem) {
          await api.put(`/buildings/${editingItem.building_id}`, { name: newItemName, is_active: isBuildingActive });
        } else {
          await api.post('/buildings/', { name: newItemName, is_active: isBuildingActive });
        }
      } else if (activeTab === 'categories') {
        if (editingItem) {
          await api.put(`/problems/categories/${editingItem.category_id}`, { category_name: newItemName, requires_location_privacy: requireMap });
        } else {
          await api.post('/problems/categories', { category_name: newItemName, requires_location_privacy: requireMap });
        }
      } else if (activeTab === 'users') {
        if (editingItem) {
          const uId = editingItem.id || editingItem.user_type_id;
          await api.put(`/public-user-types/${uId}`, { name: newItemName });
        } else {
          await api.post('/public-user-types', { name: newItemName });
        }
      }
      setIsAddModalOpen(false);
      setNewItemName('');
      setCategoryColor('#3B82F6');
      setRequireMap(false);
      setIsBuildingActive(true);
      setEditingItem(null);
      fetchMasterData(); // Refresh the list
    } catch (err) {
      console.error('Failed to save item:', err);
      alert(`Failed to save item: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectBuilding = (b) => {
    setSelectedBuilding(b);
    setEditCoords({
      lat: b.latitude || 19.0286,
      lng: b.longitude || 99.8946
    });
  };

  const handleUpdateLocation = async () => {
    if (!selectedBuilding) return;
    setIsUpdating(true);
    try {
      await api.put(`/buildings/${selectedBuilding.building_id}`, {
        latitude: parseFloat(editCoords.lat) || null,
        longitude: parseFloat(editCoords.lng) || null,
      });
      fetchMasterData(); // Refresh list to get updated coords
      // Optionally show a subtle success toast instead of alert
      alert('Location updated successfully!');
    } catch (error) {
      console.error("Update Error:", error.response?.data || error.message);
      alert(`Failed to update: ${JSON.stringify(error.response?.data?.detail || error.message)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleRequireMap = async (category) => {
    const previousCategories = [...categories];
    setCategories(categories.map(c => 
      c.category_id === category.category_id 
        ? { ...c, requires_location_privacy: !c.requires_location_privacy } 
        : c
    ));

    try {
      await api.put(`/problems/categories/${category.category_id}`, {
        requires_location_privacy: !category.requires_location_privacy
      });
    } catch (error) {
      console.error("Failed to toggle require map:", error.response?.data || error.message);
      setCategories(previousCategories);
      alert(`Failed to update category: ${JSON.stringify(error.response?.data?.detail || error.message)}`);
    }
  };

  const handleToggleBuildingStatus = async (building) => {
    const previousBuildings = [...buildings];
    setBuildings(buildings.map(b => 
      b.building_id === building.building_id 
        ? { ...b, is_active: !b.is_active } 
        : b
    ));

    try {
      await api.put(`/buildings/${building.building_id}`, {
        is_active: !building.is_active
      });
    } catch (error) {
      console.error("Failed to toggle building status:", error.response?.data || error.message);
      setBuildings(previousBuildings);
      alert(`Failed to update building: ${JSON.stringify(error.response?.data?.detail || error.message)}`);
    }
  };

  return (
    <div className="bg-white rounded-xl h-full flex flex-col">
      {/* ─── Header & Action ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#2B164D]">Master Data Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Configure core system data and dropdown options.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setNewItemName('');
            setCategoryColor('#3B82F6');
            setRequireMap(false);
            setIsBuildingActive(true);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2B164D] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-[#1e0f36] transition-colors"
        >
          <Plus size={16} />
          <span>Add New</span>
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-6 border-b border-slate-100 mb-6">
        <button
          onClick={() => setActiveTab('buildings')}
          className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'buildings'
              ? 'border-[#2B164D] text-[#2B164D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 size={16} />
          Buildings
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-[#2B164D] text-[#2B164D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Tags size={16} />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-[#2B164D] text-[#2B164D]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users size={16} />
          Public User Types
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="flex-1 overflow-auto">
        {/* Buildings Table: Split Layout */}
        {activeTab === 'buildings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full pb-4">
            <div className="overflow-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white sticky top-0">
                    <th className="py-3 px-4 w-16">ID</th>
                    <th className="py-3 px-4">Building Name</th>
                    <th className="py-3 px-4 w-28 text-center">Status (เปิด/ปิด)</th>
                    <th className="py-3 px-4 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr><td colSpan="3" className="py-4 text-center text-slate-500">Loading...</td></tr>
                  ) : buildings.length === 0 ? (
                    <tr><td colSpan="3" className="py-4 text-center text-slate-500">No buildings found</td></tr>
                  ) : buildings.map(b => (
                    <tr 
                      key={b.building_id} 
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedBuilding?.building_id === b.building_id ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => handleSelectBuilding(b)}
                    >
                      <td className="py-3 px-4 text-slate-400 font-medium">{b.building_id}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{b.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleBuildingStatus(b)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                              b.is_active ? 'bg-emerald-500' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                b.is_active ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditBuilding(b); }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Edit Building"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(b.building_id, b.name, 'building'); }}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Building"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Interactive Map Panel */}
            <div className="bg-slate-50 rounded-lg border border-slate-100 flex flex-col min-h-[300px]">
              {!selectedBuilding ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3 text-2xl">🗺️</div>
                  <p className="text-slate-500 font-medium">Interactive Map Integration</p>
                  <p className="text-xs text-slate-400 mt-1">Select a building to view/edit location (Lat/Lng)</p>
                </div>
              ) : (
                <div className="p-5 flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800">📍 Editing Location: {selectedBuilding.name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editCoords.lat}
                        onChange={(e) => setEditCoords({ ...editCoords, lat: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none focus:border-[#2B164D] text-sm"
                        placeholder="e.g. 19.0286"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editCoords.lng}
                        onChange={(e) => setEditCoords({ ...editCoords, lng: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md outline-none focus:border-[#2B164D] text-sm"
                        placeholder="e.g. 99.8958"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-300 z-0 mb-4 relative">
                    <MapContainer center={[editCoords.lat || 19.0286, editCoords.lng || 99.8946]} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker position={editCoords} setPosition={setEditCoords} />
                    </MapContainer>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={handleUpdateLocation}
                      disabled={isUpdating}
                      className="bg-[#2B164D] hover:bg-[#1e0f36] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Save Location'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Table */}
        {activeTab === 'categories' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4 w-20">ID</th>
                <th className="pb-3 px-4">Category Name</th>
                <th className="pb-3 px-4 w-32">COLOR (สีประจำหมวด)</th>
                <th className="pb-3 px-4 w-32 text-center">Require Map</th>
                <th className="pb-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan="3" className="py-4 text-center text-slate-500">Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan="3" className="py-4 text-center text-slate-500">No categories found</td></tr>
              ) : categories.map(c => (
                <tr key={c.category_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-medium">{c.category_id}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{c.category_name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: c.color }}></div>
                      <span className="text-xs text-gray-500 uppercase font-mono">{c.color}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleToggleRequireMap(c)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          c.requires_location_privacy ? 'bg-[#2B164D]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            c.requires_location_privacy ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleEditClick(c)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(c.category_id, c.category_name, 'category')}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* User Types Table */}
        {activeTab === 'users' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4 w-20">ID</th>
                <th className="pb-3 px-4">Type Name</th>
                <th className="pb-3 px-4 w-32">Status</th>
                <th className="pb-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan="4" className="py-4 text-center text-slate-500">Loading...</td></tr>
              ) : userTypes.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-center text-slate-500">No user types found</td></tr>
              ) : userTypes.map(u => {
                const uId = u.id || u.user_type_id;
                const uName = u.name || u.type_name;
                return (
                  <tr key={uId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium">{uId}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{uName}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            setEditingItem(u);
                            setNewItemName(uName);
                            setIsAddModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(uId, uName, 'user_type')}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Add New Modal ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? (
                  activeTab === 'buildings' ? 'Edit Building' : activeTab === 'categories' ? 'Edit Category' : 'Edit User Type'
                ) : (
                  activeTab === 'buildings' ? 'Add New Building' : activeTab === 'categories' ? 'Add New Category' : 'Add New User Type'
                )}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  {activeTab === 'buildings' ? 'Building Name *' : activeTab === 'categories' ? 'Category Name *' : 'User Type Name *'}
                </label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all" 
                  placeholder="Enter name..." 
                />
              </div>

              {activeTab === 'buildings' && (
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">Building Status</label>
                    <p className="text-xs text-slate-500 mt-0.5">Allow users to select this building when reporting problems.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsBuildingActive(!isBuildingActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isBuildingActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isBuildingActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category Color (สีประจำหมวดหมู่)</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        className="w-12 h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        placeholder="#HEXCODE"
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all font-mono uppercase" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">Require Map (บังคับระบุตำแหน่งบนแผนที่)</label>
                      <p className="text-xs text-slate-500 mt-0.5">Force users to drop a pin on the map when selecting this category.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setRequireMap(!requireMap)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${requireMap ? 'bg-[#2B164D]' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireMap ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2B164D] hover:bg-[#1e0f36] rounded-lg shadow-sm transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfig.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-4">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete '{deleteConfig.name}'? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfig({ isOpen: false, id: null, name: '' })}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataSettings;
