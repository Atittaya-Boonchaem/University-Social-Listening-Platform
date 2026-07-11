/**
 * MainLayout.tsx
 *
 * Responsive app shell that mirrors Flutter's MainNavigationScreen:
 *  - Mobile (< md): Fixed bottom navigation bar — 4 tabs with icons & Thai labels.
 *  - Desktop (≥ md): Fixed left sidebar with brand logo, nav links, and user badge.
 *
 * Tab order mirrors Flutter exactly:
 *   0 → หน้าแรก    /
 *   1 → แจ้งปัญหา  /report
 *   2 → ติดตามสถานะ /tracking
 *   3 → ข้อมูลส่วนตัว /profile
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom';

// ─── Brand colour ─────────────────────────────────────────────────────────────
const UP_PURPLE = '#2B164D';

// ─── Nav items (mirrors Flutter BottomNavigationBarItem list) ─────────────────
interface NavItem {
  to: string;
  label: string;
  /** SVG path for outlined (inactive) state */
  iconOutline: React.ReactNode;
  /** SVG path for filled (active) state */
  iconFilled: React.ReactNode;
}

// Inline SVG icons – no extra icon library needed
const navItems: NavItem[] = [
  {
    to: '/',
    label: 'หน้าแรก',
    iconOutline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
        <rect x="3" y="12" width="18" height="9" rx="1" fill="none" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10.707 2.293a1 1 0 0 1 1.414 0l9 9A1 1 0 0 1 20 13h-1v7a1 1 0 0 1-1 1h-4v-5H10v5H6a1 1 0 0 1-1-1v-7H4a1 1 0 0 1-.707-1.707l9-9z" />
      </svg>
    ),
  },
  {
    to: '/report',
    label: 'แจ้งปัญหา',
    iconOutline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 5a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7z" />
      </svg>
    ),
  },
  {
    to: '/tracking',
    label: 'ติดตามสถานะ',
    iconOutline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 22a2 2 0 0 0 1.73-1H10.27A2 2 0 0 0 12 22zm6-4c0-3.07 1.41-5.57 2.8-7.55A1 1 0 0 0 20 9H4a1 1 0 0 0-.8 1.45C4.59 12.43 6 14.93 6 18H3l1 1h16l1-1h-3z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'ข้อมูลส่วนตัว',
    iconOutline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
      </svg>
    ),
  },
];

// ─── Helper: exact match for "/" to avoid highlighting Home on every route ────
function useIsActive(to: string) {
  const { pathname } = useLocation();
  if (to === '/') return pathname === '/';
  return pathname.startsWith(to);
}

// ─── Single nav item (reused in both sidebar and bottom bar) ─────────────────
function NavItemButton({
  item,
  variant,
}: {
  item: NavItem;
  variant: 'sidebar' | 'bottom';
}) {
  const active = useIsActive(item.to);

  if (variant === 'sidebar') {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
          transition-all duration-200 group
          ${
            active
              ? 'bg-[#2B164D] text-white shadow-md shadow-[#2B164D]/30'
              : 'text-slate-500 hover:bg-slate-100 hover:text-[#2B164D]'
          }
        `}
      >
        <span className={`flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#2B164D]'}`}>
          {active ? item.iconFilled : item.iconOutline}
        </span>
        <span>{item.label}</span>
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
        )}
      </NavLink>
    );
  }

  // bottom bar variant
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2 relative group"
    >
      {/* Active pill indicator */}
      {active && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
          style={{ backgroundColor: UP_PURPLE }}
        />
      )}
      <span
        className="transition-colors duration-200"
        style={{ color: active ? UP_PURPLE : '#94a3b8' }}
      >
        {active ? item.iconFilled : item.iconOutline}
      </span>
      <span
        className="text-[10px] font-medium transition-colors duration-200 leading-tight"
        style={{ color: active ? UP_PURPLE : '#94a3b8' }}
      >
        {item.label}
      </span>
    </NavLink>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-white border-r border-slate-100 shadow-sm z-30">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ backgroundColor: UP_PURPLE }}
          >
            <span className="text-base">🎓</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#2B164D] leading-tight truncate">
              UP Voice
            </p>
            <p className="text-[10px] text-slate-400 leading-tight truncate">
              มหาวิทยาลัยพะเยา
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 mb-2">
          เมนูหลัก
        </p>
        {navItems.map((item) => (
          <NavItemButton key={item.to} item={item} variant="sidebar" />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">👤</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-700 truncate">{localStorage.getItem('display_name') || 'ผู้ใช้งานทั่วไป'}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {!localStorage.getItem('access_token') 
                ? 'ไม่ได้เข้าสู่ระบบ' 
                : localStorage.getItem('role_id') === '1'
                ? 'นิสิต มพ.'
                : localStorage.getItem('role_id') === '2'
                ? 'บุคลากร'
                : localStorage.getItem('role_id') === '3'
                ? 'บุคคลทั่วไป'
                : localStorage.getItem('role_id') === '4'
                ? 'ผู้ดูแลระบบ'
                : localStorage.getItem('role_id') === '5'
                ? 'ผู้ดูแลหมวดหมู่'
                : localStorage.getItem('role_id') === '6'
                ? 'ผู้ใช้งานไม่ระบุตัวตน'
                : 'ผู้ใช้งานทั่วไป'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Navigation Bar ────────────────────────────────────────────
function BottomNavBar() {
  return (
    <nav
      className="
        md:hidden fixed bottom-0 left-0 right-0 z-30
        bg-white border-t border-slate-100
        flex items-stretch
        safe-area-pb
      "
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}
    >
      {navItems.map((item) => (
        <NavItemButton key={item.to} item={item} variant="bottom" />
      ))}
    </nav>
  );
}

// ─── Main Layout Shell ────────────────────────────────────────────────────────
export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar (desktop only) */}
      <Sidebar />

      {/* Page content — offset by sidebar on desktop, padded for bottom bar on mobile */}
      <main
        className="
          md:ml-60
          pb-20 md:pb-0
          min-h-screen
        "
      >
        <Outlet />
      </main>

      {/* Bottom nav (mobile only) */}
      <BottomNavBar />
    </div>
  );
}
