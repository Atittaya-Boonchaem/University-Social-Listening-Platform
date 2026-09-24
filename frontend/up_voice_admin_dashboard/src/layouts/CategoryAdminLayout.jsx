// src/layouts/CategoryAdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { fetchProblems } from '../services/problemService';

// ── Decode JWT ─────────────────────────────────────────────────
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

// ── Sidebar ────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, assignedCatName, problemCount }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#ffffff] z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#e2e7ff] transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-[#f2f3ff] border-b border-[#e2e7ff] flex-shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-[#4b267d] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#340866] text-base leading-tight tracking-tight">UP Connect</span>
              <span className="text-[11px] text-[#735c00] font-bold uppercase tracking-wider leading-tight">Admin Workspace</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors flex-shrink-0"
          title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {collapsed ? 'chevron_right' : 'menu_open'}
          </span>
        </button>
      </div>

      {/* Department badge box */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-[#f0eded]">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#eaedff] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#340866] text-[20px] flex-shrink-0">apartment</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-[#4a4450] font-bold uppercase tracking-wider">หมวดหมู่ที่รับผิดชอบ</span>
              <span className="text-[13px] text-[#131b2e] font-bold truncate">
                {assignedCatName || 'หมวดหมู่ที่ได้รับมอบหมาย'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-1.5 overflow-y-auto">
        <NavLink
          to="/category-admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              isActive
                ? 'bg-[#4b267d] text-white shadow-sm'
                : 'text-[#4a4450] hover:bg-[#eaedff] hover:text-[#131b2e]'
            }`
          }
          title={collapsed ? 'แดชบอร์ดภาพรวม' : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          {!collapsed && <span>แดชบอร์ดภาพรวม</span>}
        </NavLink>

        <NavLink
          to="/category-admin/kanban"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              isActive
                ? 'bg-[#4b267d] text-white shadow-sm'
                : 'text-[#4a4450] hover:bg-[#eaedff] hover:text-[#131b2e]'
            }`
          }
          title={collapsed ? 'รายการคำร้องทั้งหมด' : undefined}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">inbox</span>
            {!collapsed && <span>รายการคำร้องทั้งหมด</span>}
          </div>
          {!collapsed && (
            <span className="px-2 py-0.5 rounded-full bg-[#eaedff] text-[#340866] font-mono text-xs font-bold">
              {problemCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/category-admin/history"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              isActive
                ? 'bg-[#4b267d] text-white shadow-sm'
                : 'text-[#4a4450] hover:bg-[#eaedff] hover:text-[#131b2e]'
            }`
          }
          title={collapsed ? 'ประวัติ' : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">analytics</span>
          {!collapsed && <span>ประวัติ</span>}
        </NavLink>

        <NavLink
          to="/category-admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
              isActive
                ? 'bg-[#4b267d] text-white shadow-sm'
                : 'text-[#4a4450] hover:bg-[#eaedff] hover:text-[#131b2e]'
            }`
          }
          title={collapsed ? 'โปรไฟล์แอดมิน' : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">badge</span>
          {!collapsed && <span>โปรไฟล์แอดมิน</span>}
        </NavLink>
      </nav>

      {/* SLA Monitor & Logout */}
      <div className="p-3 bg-[#f2f3ff] border-t border-[#e2e7ff] flex flex-col gap-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-[#e2e7ff]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#735c00] animate-pulse"></div>
              <span className="text-[12px] text-[#131b2e] font-bold">SLA Monitor</span>
            </div>
            <span className="font-mono text-[12px] text-[#735c00] font-bold">96.4% On-time</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-semibold transition-colors"
          title={collapsed ? 'ออกจากระบบ' : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>
    </aside>
  );
};

// ── Top Header ─────────────────────────────────────────────────
const TopNavbar = ({ collapsed, adminName, adminRole, onSearchChange }) => {
  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-[#faf8ff]/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e2e7ff] z-40 flex items-center justify-between px-6 transition-all duration-300 ${
        collapsed ? 'left-[72px]' : 'left-72'
      }`}
    >
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="ค้นหาเลขที่คำร้อง (#UP-...), อาคาร, ช่างผู้รับผิดชอบ..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white text-sm text-[#131b2e] placeholder:text-slate-400 border border-[#e2e7ff] focus:outline-none focus:ring-2 focus:ring-[#4b267d]/20 focus:border-[#4b267d] shadow-xs transition"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button
          id="notification-bell-btn"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-[#eaedff] transition-colors"
          title="การแจ้งเตือน"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        <div className="h-7 w-[1px] bg-[#e2e7ff]"></div>

        <Link to="/category-admin/settings" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer" title="ดูโปรไฟล์แอดมิน">
          <div className="w-9 h-9 rounded-full bg-[#340866] text-white flex items-center justify-center shadow-sm font-bold text-sm">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-sm font-bold text-[#131b2e] leading-tight">
              {adminName || 'อัสยาน์ Admin'}
            </span>
            <span className="text-[11px] text-[#4a4450] leading-tight">
              {adminRole || 'ผู้ดูแลระบบประจำหมวดหมู่'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

// ── Layout root ────────────────────────────────────────────────
const CategoryAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [assignedCatName, setAssignedCatName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('ผู้ดูแลระบบประจำหมวดหมู่');
  const [problemCount, setProblemCount] = useState(0);

  useEffect(() => {
    // 1. Fetch user info and problems count
    api.get('/users/me')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const user = res.data.data;
          if (user.category_name) setAssignedCatName(user.category_name);
          if (user.display_name) setAdminName(user.display_name);
          if (user.role) setAdminRole(user.role === 'category_admin' ? (user.category_name || 'แอดมินหมวดหมู่') : user.role);

          const params = { page_size: 150, visibility_name: 'public' };
          if (user.category_id && user.role === 'category_admin') {
            params.category_id = user.category_id;
          }
          fetchProblems(params, true)
            .then(pubData => {
              setProblemCount(pubData.total || (pubData.items || []).length);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        assignedCatName={assignedCatName}
        problemCount={problemCount}
      />
      <TopNavbar
        collapsed={collapsed}
        adminName={adminName}
        adminRole={adminRole}
      />
      <main
        className={`transition-all duration-300 pt-16 min-h-screen ${
          collapsed ? 'pl-[72px]' : 'pl-72'
        }`}
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CategoryAdminLayout;
