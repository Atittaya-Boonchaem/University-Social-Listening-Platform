import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, LogOut, FileText } from 'lucide-react';

const Sidebar = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  let roleId = null;
  let role = null;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      roleId = payload.role_id;
      role = payload.role;
    }
  } catch (e) {}

  const canViewUsers = [1, 3, 4].includes(roleId) || ['super_admin', 'category_admin'].includes(role);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/problems', icon: FileText, label: 'Manage Problems' },
    canViewUsers ? { to: '/users', icon: Users, label: 'Users' } : null,
    { to: '/reports', icon: FileBarChart, label: 'Reports' },
  ].filter(Boolean);

  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-900">UP Voice</h1>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>
      
      <nav className="flex-1 px-4 mt-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
