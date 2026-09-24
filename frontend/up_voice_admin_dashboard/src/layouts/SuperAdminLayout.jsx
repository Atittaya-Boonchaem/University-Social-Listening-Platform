// src/layouts/SuperAdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, Mail,
  Bot, LogOut, ChevronRight, Shield, Bell,
  Menu, ChevronDown, Layers, Building2, ExternalLink,
  MapPin, CheckCircle, AlertTriangle, Sparkles
} from 'lucide-react';
import api from '../services/api';

// ── Decode the JWT to get user info ─────────────────────────────
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return {};
  }
}

// ── Navigation structure in Thai with English subtext ───────────
const NAV = [
  {
    group: 'ภาพรวมมหาวิทยาลัย (Overview)',
    items: [
      {
        to: '/super-admin',
        end: true,
        icon: LayoutDashboard,
        label: 'แดชบอร์ดภาพรวม',
        desc: 'Global Command Center',
      },
      {
        to: '/super-admin/global-heatmap',
        end: false,
        icon: MapPin,
        label: 'แผนที่พิกัดปัญหา',
        desc: 'Campus GIS Heatmap',
      },
    ],
  },
  {
    group: 'การบริหารบุคคล (People & Roles)',
    items: [
      {
        to: '/super-admin/users',
        icon: Users,
        label: 'จัดการผู้ใช้งาน',
        desc: 'Students, Staff & Public',
      },
      {
        to: '/super-admin/category-admins',
        icon: Mail,
        label: 'แอดมินประจำหมวดหมู่',
        desc: 'Category Admin Assignments',
      },
    ],
  },
  {
    group: 'ข้อมูลโครงสร้าง (Master Data)',
    items: [
      {
        to: '/super-admin/categories',
        icon: Layers,
        label: 'หมวดหมู่ปัญหา',
        desc: 'Problem Categories',
      },
      {
        to: '/super-admin/buildings',
        icon: Building2,
        label: 'อาคารสถานที่ & พิกัด',
        desc: 'Campus Buildings & GPS',
      },
    ],
  },
  {
    group: 'ปัญญาประดิษฐ์และระบบ (AI & System)',
    items: [
      {
        to: '/super-admin/llm-settings',
        icon: Bot,
        label: 'การตั้งค่า AI & กฎกระจายงาน',
        desc: 'LLM & Auto-Routing Rules',
      },
    ],
  },
];

// ── Sidebar ────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle, pendingCount }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200/80 flex flex-col z-30 transition-all duration-300 shadow-[4px_0_24px_rgba(43,22,77,0.03)] ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2B164D] to-[#4B267D] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#2B164D]/20 ring-2 ring-[#F59E0B]/30">
          <Shield size={20} className="text-[#F59E0B]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-[#2B164D] tracking-tight">UP Connect</span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30 rounded">
                Super
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              ศูนย์ควบคุมระบบภาพรวม
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
          title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
        >
          {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Super Admin Quick Identity Card */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-100 bg-[#FAF8FC]">
          <div className="px-3.5 py-2.5 rounded-xl bg-white border border-[#E9D5FF]/60 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2B164D] to-[#4B267D] flex items-center justify-center text-white text-xs font-bold shadow-xs">
              👑
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4B267D] uppercase tracking-wider">ระดับสิทธิ์สูงสุด</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="ออนไลน์" />
              </div>
              <span className="text-xs text-slate-800 font-bold truncate">
                Super Administrator
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV.map((section) => (
          <div key={section.group} className="mb-2">
            {!collapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1.5">
                {section.group}
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-slate-100" />}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sa-nav-link group relative ${isActive ? 'active' : ''}`
                }
                title={collapsed ? `${item.label} (${item.desc})` : undefined}
              >
                <item.icon size={19} className="flex-shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold leading-tight truncate">{item.label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight truncate font-normal group-hover:text-[#4B267D]/70">{item.desc}</span>
                  </div>
                )}
                {/* Pending Badge on Global Dashboard */}
                {item.to === '/super-admin' && pendingCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                      collapsed
                        ? 'absolute top-1 right-1 w-2.5 h-2.5 p-0 bg-amber-500'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {!collapsed && `${pendingCount} รอตรวจ`}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom Actions & User Profile */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-100 flex-shrink-0 bg-slate-50/50 space-y-1.5">

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors w-full border border-transparent hover:border-rose-200"
          title={collapsed ? 'ออกจากระบบ' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>ออกจากระบบ (Sign Out)</span>}
        </button>
      </div>
    </aside>
  );
};

// ── Top Navbar ─────────────────────────────────────────────────
const TopNavbar = ({ collapsed, pendingCount }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : {};

  // Thai titles with clear context
  const PAGE_TITLES = {
    '/super-admin':                 { title: 'ศูนย์ควบคุมภาพรวมมหาวิทยาลัย (Global Command Center)', sub: 'ภาพรวมระบบ, สถิติ KPI, คิวรออนุมัติ และพิกัดปัญหาทั่วทั้งมหาวิทยาลัยพะเยา' },
    '/super-admin/global-heatmap':  { title: 'แผนที่พิกัดปัญหา (Campus GIS Heatmap)', sub: 'แผนที่ดาวเทียมและจุดกระจายตัวของปัญหาตามพิกัดจริงทั่ววิทยาเขต' },
    '/super-admin/users':           { title: 'จัดการข้อมูลผู้ใช้งาน (User Management)', sub: 'ดูแลและกำหนดสิทธิ์ผู้ใช้นิสิต, บุคลากร, บุคคลภายนอก และการระงับบัญชี' },
    '/super-admin/category-admins': { title: 'แอดมินประจำหมวดหมู่ (Category Admin Invites)', sub: 'มอบหมายหน่วยงานรับผิดชอบและแต่งตั้งเจ้าหน้าที่ดูแลแต่ละหมวดหมู่' },
    '/super-admin/categories':      { title: 'จัดการหมวดหมู่ปัญหา (Category Management)', sub: 'สร้าง แก้ไข และจัดการโครงสร้างหมวดหมู่รับเรื่องร้องเรียนของมหาวิทยาลัย' },
    '/super-admin/buildings':       { title: 'จัดการอาคารสถานที่และพิกัด (Building Management)', sub: 'ฐานข้อมูลอาคาร คณะ หอพัก และพิกัด GPS สำหรับระบบเช็คอินปัญหา' },
    '/super-admin/llm-settings':        { title: 'การตั้งค่า AI & กฎกระจายงานอัตโนมัติ (AI Multi-Label Routing)', sub: 'ศูนย์ควบคุมโมเดลภาษาและการจัดส่งงานอัตโนมัติข้ามหน่วยงาน มหาวิทยาลัยพะเยา' },
    '/super-admin/llm-routing-history': { title: 'ประวัติการวิเคราะห์และกระจายงาน AI (AI Routing Audit History)', sub: 'บันทึกประวัติการคัดกรองภาษาธรรมชาติ เปอร์เซ็นต์ความมั่นใจของทุกหมวดหมู่ และการจัดส่งงานอัตโนมัติ' },
  };

  const page = PAGE_TITLES[location.pathname] || { title: 'ระบบผู้ดูแลสูงสุด (Super Admin)', sub: 'UP Connect Administrative Suite' };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 z-20 transition-all duration-300 shadow-[0_2px_12px_rgba(43,22,77,0.02)] ${
        collapsed ? 'left-[72px]' : 'left-72'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FAF8FC] border border-[#E9D5FF]/60 text-[11px] font-bold text-[#4B267D]">
          <Shield size={13} className="text-[#F59E0B]" />
          <span>Super Admin Console</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-black text-slate-800 leading-tight truncate font-sans">
            {page.title}
          </h1>
          {page.sub && <p className="text-[11px] text-slate-400 leading-tight truncate hidden sm:block">{page.sub}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System Online Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>ระบบออนไลน์ปกติ</span>
        </div>

        {/* Notification bell with pending counter */}
        <NavLink
          to="/super-admin"
          id="notification-bell-btn"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-[#FAF8FC] hover:text-[#2B164D] border border-slate-200/60 transition-colors"
          title={pendingCount > 0 ? `มี ${pendingCount} คำร้องรอการตรวจสอบ` : 'การแจ้งเตือน'}
        >
          <Bell size={18} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-black rounded-full ring-2 ring-white flex items-center justify-center animate-bounce">
              {pendingCount}
            </span>
          )}
        </NavLink>

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2B164D] to-[#4B267D] ring-2 ring-[#F59E0B]/40 flex items-center justify-center text-white text-xs font-black shadow-xs select-none">
            SA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">Super Admin</p>
            <p className="text-[10px] text-[#B45309] font-bold leading-tight">สิทธิ์ควบคุมสูงสุด</p>
          </div>
        </div>
      </div>
    </header>
  );
};

// ── Layout root ────────────────────────────────────────────────
const SuperAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Poll or fetch pending review issues count for notification badge
  useEffect(() => {
    let isMounted = true;
    const checkPending = async () => {
      try {
        const res = await api.get('/problems/list', { params: { status_name: 'PENDING_REVIEW', page_size: 1 } });
        if (isMounted) {
          setPendingCount(res.data?.data?.total || 0);
        }
      } catch {
        // silent fail
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} pendingCount={pendingCount} />
      <TopNavbar collapsed={collapsed} pendingCount={pendingCount} />
      <main
        className={`transition-all duration-300 pt-16 min-h-screen ${
          collapsed ? 'pl-[72px]' : 'pl-72'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 w-full page-enter max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
