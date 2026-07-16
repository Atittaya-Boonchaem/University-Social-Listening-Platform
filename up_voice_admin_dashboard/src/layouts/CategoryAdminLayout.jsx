// src/layouts/CategoryAdminLayout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Archive,
  BarChart2,
  Settings,
  Menu,
  ChevronRight,
  Tag,
  Bell,
  LayoutGrid,
} from 'lucide-react';

// ── Decode JWT ─────────────────────────────────────────────────
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

// ── Nav structure ──────────────────────────────────────────────
const NAV = [
  {
    group: 'Workspace',
    items: [
      {
        to: '/category-admin',
        end: true,
        icon: LayoutDashboard,
        label: 'My Problems',
        desc: 'Tickets assigned to your category',
      },
      {
        to: '/category-admin/kanban',
        end: false,
        icon: LayoutGrid,
        label: 'Kanban Board',
        desc: 'จัดการตั๋วแบบ Kanban',
      },
      {
        to: '/category-admin/history',
        end: false,
        icon: Archive,
        label: 'ประวัติการแก้ไข',
        desc: 'ประวัติกลุ่มปัญหาที่ดำเนินการเสร็จสิ้นแล้ว',
      },
      {
        to: '/category-admin/analytics',
        end: false,
        icon: BarChart2,
        label: 'สถิติและรายงาน',
        desc: 'ภาพรวมการดำเนินงานและการจัดการปัญหา',
      },
    ],
  },
  {
    group: 'Settings',
    items: [
      {
        to: '/category-admin/settings',
        end: false,
        icon: Settings,
        label: 'ตั้งค่าบัญชี',
        desc: 'จัดการข้อมูลส่วนตัวและรหัสผ่าน',
      },
    ],
  },
];

// ── Page title map ─────────────────────────────────────────────
const PAGE_TITLES = {
  '/category-admin':          { title: 'My Problems', sub: 'Tickets assigned to your category' },
  '/category-admin/kanban':   { title: 'Kanban Board', sub: 'จัดการตั๋วปัญหาด้วยระบบ Kanban' },
  '/category-admin/history':  { title: 'ประวัติการแก้ไข', sub: 'ประวัติกลุ่มปัญหาที่ดำเนินการเสร็จสิ้นแล้ว' },
  '/category-admin/analytics': { title: 'สถิติและรายงาน', sub: 'ภาพรวมการดำเนินงานและการจัดการปัญหา' },
  '/category-admin/settings': { title: 'ตั้งค่าบัญชี', sub: 'จัดการข้อมูลส่วนตัวและรหัสผ่าน' },
};

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
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Tag size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 leading-tight"><span className="font-bold">UP</span> Connect</p>
            <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-widest leading-tight">
              Category Admin
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
            {!collapsed && <p className="sa-group-label">{section.group}</p>}
            {collapsed && <div className="my-2 border-t border-slate-100" />}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
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
  const page = PAGE_TITLES[location.pathname] || { title: 'Category Admin', sub: '' };

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
        <button
          id="notification-bell-btn"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold select-none">
            CA
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-700 leading-tight">
              {decoded.sub || 'Category Admin'}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">Category Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

// ── Layout root ────────────────────────────────────────────────
const CategoryAdminLayout = () => {
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

export default CategoryAdminLayout;
