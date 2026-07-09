// src/layouts/SuperAdminLayout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, Mail,
  Bot, LogOut, ChevronRight, Shield, Bell,
  Menu, X, ChevronDown, Layers, Building2,
} from 'lucide-react';

// ── Decode the JWT to get the user's display name ─────────────
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return {};
  }
}

// ── Navigation structure ───────────────────────────────────────
const NAV = [
  {
    group: 'Overview',
    items: [
      {
        to: '/super-admin',
        end: true,
        icon: LayoutDashboard,
        label: 'Global Heatmap',
        desc: 'Problem distribution map',
      },
    ],
  },
  {
    group: 'People',
    items: [
      {
        to: '/super-admin/users',
        icon: Users,
        label: 'User Management',
        desc: 'Students, Staff, Public & Anonymous',
      },
    ],
  },
  {
    group: 'Governance',
    items: [
      {
        to: '/super-admin/audit-logs',
        icon: ClipboardList,
        label: 'Audit & Logs',
        desc: 'Login logs and admin actions',
      },
      {
        to: '/super-admin/category-admins',
        icon: Mail,
        label: 'Category Admin Invites',
        desc: 'Assign admins to categories',
      },
    ],
  },
  {
    group: 'AI Configuration',
    items: [
      {
        to: '/super-admin/llm-settings',
        icon: Bot,
        label: 'LLM Settings',
        desc: 'Auto-ban words & AI thresholds',
      },
    ],
  },
  {
    group: 'Data Management',
    items: [
      {
        to: '/super-admin/categories',
        icon: Layers,
        label: 'Category Management',
        desc: 'Create & edit problem categories',
      },
      {
        to: '/super-admin/buildings',
        icon: Building2,
        label: 'Building Management',
        desc: 'Campus buildings & coordinates',
      },
    ],
  },
];

// ── Sidebar ────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-100 flex flex-col z-30 transition-all duration-300 shadow-sm ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-800 text-slate-800 leading-tight font-bold">UP Voice</p>
            <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-widest leading-tight">
              Super Admin
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {NAV.map((section) => (
          <div key={section.group}>
            {!collapsed && (
              <p className="sa-group-label">{section.group}</p>
            )}
            {collapsed && <div className="my-2 border-t border-slate-100" />}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sa-nav-link ${isActive ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2.5 pb-4 flex-shrink-0">
        {!collapsed && <div className="border-t border-slate-100 mb-3" />}
        <button
          onClick={handleLogout}
          className="sa-nav-link w-full text-rose-500 hover:!bg-rose-50 hover:!text-rose-600"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

// ── Top Navbar ─────────────────────────────────────────────────
const TopNavbar = ({ collapsed }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : {};

  // Map routes to page titles
  const PAGE_TITLES = {
    '/super-admin':               { title: 'Global Overview', sub: 'Heatmap & Problem Distribution' },
    '/super-admin/users':         { title: 'User Management', sub: 'Students, Staff, Public & Anonymous' },
    '/super-admin/audit-logs':    { title: 'Audit & Logs', sub: 'Login history and admin actions' },
    '/super-admin/category-admins': { title: 'Category Admin Invites', sub: 'Assign & manage category admins' },
    '/super-admin/llm-settings':  { title: 'LLM Settings', sub: 'AI configuration & auto-ban rules' },
    '/super-admin/categories':    { title: 'Category Management', sub: 'Create & manage problem categories' },
    '/super-admin/buildings':     { title: 'Building Management', sub: 'Campus buildings & GPS coordinates' },
  };

  const page = PAGE_TITLES[location.pathname] || { title: 'Super Admin', sub: '' };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-20 transition-all duration-300 ${
        collapsed ? 'left-[68px]' : 'left-64'
      }`}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800 leading-tight">{page.title}</h2>
        {page.sub && <p className="text-[11px] text-slate-400 leading-tight">{page.sub}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          id="notification-bell-btn"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold select-none">
            SA
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-700 leading-tight">Super Admin</p>
            <p className="text-[11px] text-slate-400 leading-tight">Full Access</p>
          </div>
        </div>
      </div>
    </header>
  );
};

// ── Layout root ────────────────────────────────────────────────
const SuperAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <TopNavbar collapsed={collapsed} />
      <main
        className={`transition-all duration-300 pt-16 min-h-screen ${
          collapsed ? 'pl-[68px]' : 'pl-64'
        }`}
      >
        <div className="p-6 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
