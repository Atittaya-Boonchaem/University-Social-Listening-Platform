import React, { useEffect, useState } from 'react';
import { fetchUsers, fetchUserById } from '../services/userService';
import api from '../services/api';
import { X, Eye, UserPlus, Check, Edit, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userProblems, setUserProblems] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Category Admin');
  const [inviteLoginMethod, setInviteLoginMethod] = useState('Local (Username / Password)');
  const [inviteCategories, setInviteCategories] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, user: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [inviteStatus, setInviteStatus] = useState('active');
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Categories for multi-select
  const [availableCategories, setAvailableCategories] = useState([]);

  const toggleCategory = (catId) => {
    setInviteCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      alert("Please enter an email address.");
      return;
    }
    setIsInviting(true);
    try {
      const mappedRole = inviteRole === 'Super Admin' ? 'super_admin' : 
                         inviteRole === 'Category Admin' ? 'category_admin' : 
                         inviteRole === 'Staff (บุคลากร)' ? 'staff' : 'student';

      const payload = {
        email: inviteEmail,
        login_method: inviteLoginMethod,
        role: mappedRole,
        is_active: inviteStatus === 'active',
        category_id: inviteRole === 'Category Admin' && inviteCategories.length > 0 ? inviteCategories[0] : null,
        categories: inviteRole === 'Category Admin' ? inviteCategories : []
      };
      
      if (editingUser) {
        await api.put(`/users/${editingUser.user_id}`, payload);
        alert(`User updated successfully!`);
      } else {
        await api.post('/users/invites', payload);
        alert(`Invitation sent successfully to ${inviteEmail}!`);
      }
      
      setShowInviteModal(false);
      setEditingUser(null);
      setInviteEmail('');
      setInviteRole('Category Admin');
      setInviteCategories([]);
      setInviteStatus('active');
      loadUsers();
    } catch (err) {
      console.error("Failed to save user:", err);
      alert(`Failed to save: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setInviteEmail(user.email || '');
    setInviteStatus(user.is_active ? 'active' : 'suspended');
    
    // Map backend role to exact dropdown option strings
    let mappedRole = formatRole(user.role);
    if (user.role === 'staff') mappedRole = 'Staff (บุคลากร)';
    if (user.role === 'student') mappedRole = 'Student (นิสิต)';
    setInviteRole(mappedRole);
    
    setInviteLoginMethod('Local (Username / Password)');
    if (user.role === 'category_admin') {
      if (user.category_id) {
        setInviteCategories([user.category_id]);
      } else if (user.category_name) {
        const matched = availableCategories.find(c => (c.category_name || c.name) === user.category_name);
        if (matched) setInviteCategories([matched.category_id || matched.id]);
      }
    } else {
      setInviteCategories([]);
    }
    setShowInviteModal(true);
  };

  const handleDeleteUser = (user) => {
    setDeleteConfig({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deleteConfig.user.user_id}`);
      alert(`User ${deleteConfig.user.display_name || deleteConfig.user.email} deleted successfully!`);
      setDeleteConfig({ isOpen: false, user: null });
      loadUsers();
    } catch (err) {
      alert(`Failed to delete user: ${JSON.stringify(err.response?.data?.detail || err.message)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/problems/categories');
      const cats = res.data?.data?.items || [];
      cats.sort((a, b) => (a.category_id || a.id || 0) - (b.category_id || b.id || 0));
      setAvailableCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      console.log("Users fetched:", data);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    setUserDetails(null);
    setUserProblems([]);
    
    try {
      // Fetch full profile details
      const profileData = await fetchUserById(user.user_id);
      if (profileData) {
        setUserDetails(profileData.profile || null);
      }
      
      // Fetch user's problem history (limit to recent 20 for preview)
      const probRes = await api.get('/problems/list', {
        params: { user_id: user.user_id, page: 1, page_size: 20 }
      });
      setUserProblems(probRes.data?.data?.items || []);
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatRole = (role) => {
    const roles = {
      super_admin: 'Super Admin',
      category_admin: 'Category Admin',
      student: 'Student',
      staff: 'Staff',
      public: 'Public User',
      anonymous: 'Guest / Anonymous'
    };
    return roles[role] || role;
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.display_name && u.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchRole = true;
    if (roleFilter !== 'All') {
      const roleMap = {
        'Super Admin': 'super_admin',
        'Category Admin': 'category_admin',
        'Public User': 'public',
        'Guest / Anonymous': 'anonymous',
        'Staff': 'staff',
        'Student': 'student'
      };
      matchRole = u.role === roleMap[roleFilter];
    }

    return matchSearch && matchRole;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 mt-1">Manage users and view their report history.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setInviteEmail('');
            setInviteRole('Category Admin');
            setInviteCategories([]);
            setShowInviteModal(true);
          }}
          className="bg-[#2B164D] hover:bg-[#1e0f36] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Invite Category Admin
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm w-full sm:w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm bg-white"
        >
          <option value="All">All</option>
          <option value="Super Admin">Super Admin</option>
          <option value="Category Admin">Category Admin</option>
          <option value="Staff">Staff</option>
          <option value="Student">Student</option>
          <option value="Public User">Public User</option>
          <option value="Guest / Anonymous">Guest / Anonymous</option>
        </select>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-sm font-medium text-gray-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email / IP</th>
              <th className="p-4">Role</th>
              <th className="p-4">Assigned Category</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">No users found.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">
                    {u.display_name || 'Unknown User'}
                  </td>
                  <td className="p-4 text-gray-500">
                    {u.email || u.ip_address || 'N/A'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md font-medium text-xs ${
                      u.role === 'super_admin' ? 'bg-purple-50 text-purple-700' :
                      u.role === 'category_admin' ? 'bg-blue-50 text-blue-700' :
                      u.role === 'anonymous' ? 'bg-gray-100 text-gray-600' :
                      'bg-indigo-50 text-indigo-700'
                    }`}>
                      {formatRole(u.role)}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.role !== 'category_admin' ? (
                      <span className="text-gray-400">-</span>
                    ) : u.category_name ? (
                      <span className="text-gray-700">{u.category_name}</span>
                    ) : u.categories && u.categories.length > 0 ? (
                      <span className="text-gray-700">{u.categories.map(c => c.name || c.category_name).join(', ')}</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">Not Assigned</span>
                    )}
                  </td>
                  <td className="p-4">
                    {u.is_active ? (
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md font-medium text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md font-medium text-xs">
                        Suspended
                      </span>
                    )}
                  </td>
                   <td className="p-4 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuUserId(activeMenuUserId === u.user_id ? null : u.user_id);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title="เมนูเพิ่มเติม"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                      </svg>
                    </button>
                    {activeMenuUserId === u.user_id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuUserId(null)} />
                        <div className="absolute right-4 top-12 bg-white border border-slate-100 rounded-lg shadow-lg z-20 py-1.5 min-w-[150px] text-left">
                          <button
                            onClick={() => {
                              setActiveMenuUserId(null);
                              handleViewDetails(u);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            ดูรายละเอียด
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuUserId(null);
                              handleEditUser(u);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2"
                          >
                            <Edit className="w-3.5 h-3.5 text-emerald-500" />
                            แก้ไข (บทบาท/สถานะ)
                          </button>
                          {u.role === 'category_admin' && (
                            <button
                              onClick={() => {
                                setActiveMenuUserId(null);
                                setResetPwdUser(u);
                                setNewPassword('');
                                setShowResetPwdModal(true);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              รีเซ็ตรหัสผ่าน
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveMenuUserId(null);
                              handleDeleteUser(u);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600 text-xs font-medium flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            ลบผู้ใช้งาน
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">User Details</h3>
                <p className="text-sm text-gray-500 mt-1">Viewing information for {selectedUser.display_name}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 border shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {loadingDetails ? (
                <div className="text-center py-12 text-gray-500">Loading details...</div>
              ) : (
                <>
                  {/* Basic & Profile Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Profile Information</h4>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">Role</span>
                        <span className="font-medium text-gray-900">{formatRole(selectedUser.role)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 mb-1">Email / IP</span>
                        <span className="font-medium text-gray-900">{selectedUser.email || selectedUser.ip_address || 'N/A'}</span>
                      </div>
                      
                      {/* Render extra details based on user type */}
                      {userDetails && selectedUser.role === 'student' && (
                        <>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Student ID</span>
                            <span className="font-medium text-gray-900">{userDetails.student_id || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Major</span>
                            <span className="font-medium text-gray-900">{userDetails.major || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Year</span>
                            <span className="font-medium text-gray-900">{userDetails.year || '-'}</span>
                          </div>
                        </>
                      )}
                      
                      {userDetails && selectedUser.role === 'staff' && (
                        <>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Employee ID</span>
                            <span className="font-medium text-gray-900">{userDetails.employee_id || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Department</span>
                            <span className="font-medium text-gray-900">{userDetails.department || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Position</span>
                            <span className="font-medium text-gray-900">{userDetails.position || '-'}</span>
                          </div>
                        </>
                      )}

                      {userDetails && selectedUser.role === 'public' && (
                        <>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">Phone</span>
                            <span className="font-medium text-gray-900">{userDetails.phone || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-gray-500 mb-1">User Type</span>
                            <span className="font-medium text-gray-900">{userDetails.user_type || '-'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Problem History */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider flex justify-between items-center">
                      <span>Problem History ({userProblems.length})</span>
                    </h4>
                    
                    {userProblems.length === 0 ? (
                      <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-100 text-gray-500">
                        No problems reported by this user.
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b text-gray-500">
                              <th className="p-3">Title</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {userProblems.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900 truncate max-w-[200px]" title={p.title}>{p.title}</td>
                                <td className="p-3 text-gray-600">{p.category_name}</td>
                                <td className="p-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status_name === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                                    p.status_name === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {p.status_name}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Advanced Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#2B164D]">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Invite User'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{editingUser ? 'Modify user roles and categories' : 'Send a sign-up invitation or assign roles'}</p>
                </div>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Form Layout */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email *</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all" 
                  placeholder="staff@up.ac.th" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Login Method</label>
                  <select 
                    value={inviteLoginMethod}
                    onChange={(e) => setInviteLoginMethod(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all bg-white"
                  >
                    <option>Local (Username / Password)</option>
                    <option>UP SSO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role *</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all bg-white"
                  >
                    <option>Super Admin</option>
                    <option>Category Admin</option>
                    <option>Staff (บุคลากร)</option>
                    <option>Student (นิสิต)</option>
                  </select>
                </div>
                {editingUser && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                    <select 
                      value={inviteStatus}
                      onChange={(e) => setInviteStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              {inviteRole === 'Category Admin' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Category</label>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50">
                    {availableCategories.map(cat => {
                      const cId = cat.category_id || cat.id;
                      const cName = cat.category_name || cat.name;
                      return (
                        <label key={cId} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-100 hover:shadow-sm">
                          <input 
                            type="checkbox"
                            className="hidden"
                            checked={inviteCategories.includes(cId)}
                            onChange={() => toggleCategory(cId)}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${inviteCategories.includes(cId) ? 'bg-[#2B164D] border-[#2B164D]' : 'bg-white border-slate-300'}`}>
                            {inviteCategories.includes(cId) && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-sm text-slate-700 font-medium">{cName}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {inviteCategories.map(id => {
                      const c = availableCategories.find(x => (x.category_id || x.id) === id);
                      return c ? (
                        <span key={id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {c.category_name || c.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowInviteModal(false)}
                disabled={isInviting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendInvite}
                disabled={isInviting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2B164D] hover:bg-[#1e0f36] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isInviting ? (editingUser ? 'Saving...' : 'Sending...') : (editingUser ? 'Save Changes' : 'Send Invitation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User?</h3>
              <p className="text-gray-500">
                Are you sure you want to deactivate or delete{' '}
                <span className="font-semibold text-gray-800">{deleteConfig.user?.display_name || deleteConfig.user?.email}</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t">
              <button
                onClick={() => setDeleteConfig({ isOpen: false, user: null })}
                className="px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">รีเซ็ตรหัสผ่าน</h3>
              <p className="text-xs text-gray-500 mb-4">
                ตั้งค่ารหัสผ่านใหม่สำหรับแอดมินปัญหานี้: <span className="font-semibold text-gray-700">{resetPwdUser?.display_name || resetPwdUser?.email}</span>
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">รหัสผ่านใหม่ *</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] outline-none text-sm transition-all"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t">
              <button
                onClick={() => setShowResetPwdModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isResetting}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  if (!newPassword.trim() || newPassword.length < 6) {
                    alert("กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร");
                    return;
                  }
                  setIsResetting(true);
                  try {
                    await api.post(`/users/${resetPwdUser.user_id}/reset-password`, { password: newPassword });
                    alert("รีเซ็ตรหัสผ่านสำเร็จ!");
                    setShowResetPwdModal(false);
                    setNewPassword('');
                  } catch (err) {
                    alert("รีเซ็ตรหัสผ่านล้มเหลว: " + (err.response?.data?.detail || err.message));
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2B164D] hover:bg-[#1f1037] rounded-lg transition-colors disabled:opacity-50"
              >
                {isResetting ? 'กำลังเปลี่ยน...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
