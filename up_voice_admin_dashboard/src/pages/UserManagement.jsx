import React, { useEffect, useState } from 'react';
import { fetchUsers, fetchUserById } from '../services/userService';
import api from '../services/api';
import { X, Eye } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userProblems, setUserProblems] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 mt-1">Manage users and view their report history.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-sm font-medium text-gray-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Email / IP</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
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
                  <td className="p-4">
                    <button
                      onClick={() => handleViewDetails(u)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
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
    </div>
  );
};

export default UserManagement;
