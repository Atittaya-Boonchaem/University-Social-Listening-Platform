/**
 * MainLayout.tsx
 *
 * Modern Web Standard Layout for UP Connect
 * Matching the University of Phayao Portal Design:
 *  - Fixed Top Header with UP Connect Logo, Navigation Links, Search Bar & Profile Badge
 *  - Full-width responsive main content area (no clunky sidebar pushing desktop content)
 *  - Unified Footer
 *  - Mobile Bottom Navigation Bar (< md) for mobile ease of use
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';

const BRAND_PRIMARY = '#340866';
const BRAND_GOLD = '#fed65b';

export default function MainLayout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);

  const displayName = localStorage.getItem('display_name') || 'ผู้ใช้งาน มพ.';
  const roleId = localStorage.getItem('role_id');
  const roleName = (() => {
    switch (roleId) {
      case '1': return 'นิสิต มพ.';
      case '2': return 'บุคลากร มพ.';
      case '4': return 'ผู้ดูแลระบบ';
      case '5': return 'ผู้ดูแลหมวดหมู่';
      default: return '';
    }
  })();

  const searchQuery = searchParams.get('search') || '';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#131b2e] flex flex-col font-sans antialiased">
      {/* ── Fixed Top Header ── */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#FAF8FF]/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all">
        <div className="h-16 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
          
          {/* Left: Brand Logo & Title + Navigation */}
          <div className="flex items-center gap-6 lg:gap-10">
            <NavLink to="/" className="flex items-center gap-3 group text-left shrink-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <span className="material-symbols-outlined text-[24px]" style={{ color: BRAND_GOLD }}>
                  forum
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[17px] leading-tight tracking-tight" style={{ color: BRAND_PRIMARY }}>
                  UP Connect
                </span>
                <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                  มหาวิทยาลัยพะเยา
                </span>
              </div>
            </NavLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#4B267D] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#eaedff] hover:text-[#340866]'
                  }`
                }
              >
                หน้าหลัก
              </NavLink>
              <NavLink
                to="/report"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#4B267D] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#eaedff] hover:text-[#340866]'
                  }`
                }
              >
                แจ้งปัญหา
              </NavLink>
              <NavLink
                to="/tracking"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#4B267D] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#eaedff] hover:text-[#340866]'
                  }`
                }
              >
                ติดตามคำร้อง
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#4B267D] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-[#eaedff] hover:text-[#340866]'
                  }`
                }
              >
                ข้อมูลส่วนตัว
              </NavLink>
            </nav>
          </div>

          {/* Right: Search, Notifications & User Profile */}
          <div className="flex items-center gap-3">
            {/* Desktop Search Bar */}
            <div className="hidden md:flex items-center bg-[#f2f3ff] rounded-lg px-3 py-1.5 gap-2 text-slate-500 w-60 lg:w-72 border border-slate-200/60 focus-within:border-[#4B267D] focus-within:ring-1 focus-within:ring-[#4B267D] transition-all">
              <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="ค้นหาเรื่องร้องเรียน นโยบาย..."
                className="bg-transparent text-sm text-[#131b2e] placeholder-slate-400 focus:outline-none w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Mobile Search Toggle */}
            <button
              aria-label="Search"
              onClick={() => setIsSearchOpenMobile(!isSearchOpenMobile)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-[#eaedff] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            {/* Notifications Button */}
            <button
              aria-label="Notifications"
              onClick={() => navigate('/tracking')}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-[#eaedff] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </button>

            {/* User Profile Badge */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 pl-1 sm:pl-2 py-1 pr-2 rounded-xl hover:bg-[#eaedff]/70 cursor-pointer transition-all border border-transparent hover:border-slate-200"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-[#131b2e] leading-tight truncate max-w-[120px]">
                  {displayName}
                </span>
                {roleName ? (
                  <span className="text-[10px] text-[#735c00] font-semibold leading-none mt-0.5">
                    {roleName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Dropdown Bar */}
        {isSearchOpenMobile && (
          <div className="md:hidden px-4 py-2 bg-white border-t border-slate-200 shadow-inner flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="ค้นหาเรื่องร้องเรียน นโยบาย..."
              className="bg-transparent text-sm text-[#131b2e] placeholder-slate-400 focus:outline-none w-full py-1"
            />
            <button
              onClick={() => setIsSearchOpenMobile(false)}
              className="text-slate-400 text-xs px-2 py-1 rounded hover:bg-slate-100"
            >
              ปิด
            </button>
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <main className="w-full pt-16 flex-1 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-[#f2f3ff] border-t border-slate-200/80 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: BRAND_GOLD }}>
                  forum
                </span>
              </div>
              <span className="font-bold text-[15px]" style={{ color: BRAND_PRIMARY }}>
                UP Connect
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <p className="text-xs text-slate-500">
              ระบบรับฟังเสียงและบริหารจัดการปัญหา มหาวิทยาลัยพะเยา
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>© 2026 University of Phayao</span>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation Bar (< md) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-stretch py-1.5 px-2 safe-area-pb"
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.04)' }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-[#340866] font-bold' : 'text-slate-400 font-medium'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="text-[10px] mt-0.5 leading-tight">หน้าแรก</span>
        </NavLink>
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-[#340866] font-bold' : 'text-slate-400 font-medium'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">add_circle</span>
          <span className="text-[10px] mt-0.5 leading-tight">แจ้งปัญหา</span>
        </NavLink>
        <NavLink
          to="/tracking"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-[#340866] font-bold' : 'text-slate-400 font-medium'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">assignment</span>
          <span className="text-[10px] mt-0.5 leading-tight">ติดตาม</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-[#340866] font-bold' : 'text-slate-400 font-medium'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span className="text-[10px] mt-0.5 leading-tight">โปรไฟล์</span>
        </NavLink>
      </nav>
    </div>
  );
}
