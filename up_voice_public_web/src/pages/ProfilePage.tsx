/**
 * ProfilePage.tsx
 * - Fetches full profile from API (not just localStorage)
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:8000/api/v1';
const PROBLEMS_BASE = `${API_BASE}/problems`;

const FACULTY_MAP: Record<number, string> = {
  1:  'คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
  2:  'คณะวิศวกรรมศาสตร์',
  3:  'คณะวิทยาศาสตร์',
  4:  'คณะแพทยศาสตร์',
  5:  'คณะศิลปศาสตร์',
  6:  'คณะบริหารธุรกิจและนิเทศศาสตร์',
  7:  'คณะนิติศาสตร์',
  8:  'คณะสหเวชศาสตร์และสาธารณสุขศาสตร์',
  9:  'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ',
  10: 'คณะทันตแพทยศาสตร์',
  11: 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
  12: 'คณะพยาบาลศาสตร์',
  13: 'คณะเภสัชศาสตร์',
  14: 'วิทยาลัยการศึกษา',
};

const GENDER_MAP: Record<string, string> = {
  male: 'ชาย', Male: 'ชาย',
  female: 'หญิง', Female: 'หญิง',
  other: 'อื่นๆ',
};

const YEAR_MAP: Record<number, string> = {
  1: 'ปริญญาตรี',
  2: 'ปริญญาโท',
  3: 'ปริญญาเอก',
};

interface MyProblem {
  id: number;
  status?: string;
  status_name?: string;
}

function getRoleName(roleId: number): string {
  switch (roleId) {
    case 1: return 'นิสิตผู้ใช้งาน (Student)';
    case 2: return 'บุคลากร (Staff)';
    case 3: return 'บุคคลทั่วไป (Guest)';
    case 4: return 'ผู้ดูแลระบบ (Admin)';
    case 5: return 'ผู้ดูแลหมวดหมู่ (Category Admin)';
    case 6: return 'ผู้ใช้ไม่ระบุตัวตน (Anonymous)';
    default: return 'ผู้ใช้งานทั่วไป';
  }
}

function getRoleBadge(roleId: number): string {
  switch (roleId) {
    case 1: return 'นิสิต';
    case 2: return 'บุคลากร';
    case 3: return 'บุคคลทั่วไป';
    case 4: return 'แอดมิน';
    case 5: return 'แอดมินหมวดหมู่';
    case 6: return 'ไม่ระบุตัวตน';
    default: return 'ผู้ใช้งาน';
  }
}

function InfoRow({ icon, label, value, wide }: { icon: string; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${wide ? 'col-span-2 md:col-span-3' : ''}`}>
      <span className="material-symbols-outlined text-[#310065] text-sm mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-[#7c7483] font-semibold uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[#310065]">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const roleId = Number(localStorage.getItem('role_id') ?? 0);
  const userId = localStorage.getItem('user_id');
  const displayName = localStorage.getItem('display_name') ?? '';
  const email = localStorage.getItem('email') ?? '';

  const [profile, setProfile] = useState<any>(null);
  const [totalProblems, setTotalProblems] = useState(0);
  const [resolvedProblems, setResolvedProblems] = useState(0);
  const [pendingProblems, setPendingProblems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Fetch user profile from API
    if (userId && token) {
      axios.get(`${API_BASE}/users/${userId}`, { headers })
        .then(res => {
          if (res.data?.success) setProfile(res.data.data?.profile ?? null);
        })
        .catch(err => console.error('Profile fetch error:', err));
    }

    // Fetch my problems
    let cancelled = false;
    async function fetchMyProblems() {
      try {
        const url = token ? `${PROBLEMS_BASE}/my-problems` : `${PROBLEMS_BASE}/list`;
        const res = await axios.get(url, { headers });

        if (!cancelled && res.data) {
          let items: MyProblem[] = [];
          if (Array.isArray(res.data)) items = res.data;
          else if (res.data?.data && Array.isArray(res.data.data)) items = res.data.data;
          else if (res.data?.data?.items && Array.isArray(res.data.data.items)) items = res.data.data.items;
          else if (res.data?.items && Array.isArray(res.data.items)) items = res.data.items;

          setTotalProblems(items.length);
          let resolved = 0, pending = 0;
          items.forEach(p => {
            const s = (p.status_name || p.status || '').toUpperCase();
            if (s === 'เสร็จสิ้น' || s === 'RESOLVED' || s === 'CLOSED') resolved++;
            else pending++;
          });
          setResolvedProblems(resolved);
          setPendingProblems(pending);
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setIsLoading(false); }
    }
    fetchMyProblems();
    return () => { cancelled = true; };
  }, [userId]);

  function handleLogout() {
    localStorage.clear();
    setShowLogoutModal(false);
    navigate('/login');
  }

  const roleName = getRoleName(roleId);
  const roleBadge = getRoleBadge(roleId);
  const userIdentifier = profile?.student_id
    ? `Student #${profile.student_id}`
    : `User #${userId || 'Guest'}`;

  const facultyName = profile?.faculty_id
    ? (FACULTY_MAP[Number(profile.faculty_id)] ?? `คณะ #${profile.faculty_id}`)
    : null;
  const genderLabel = profile?.gender ? (GENDER_MAP[profile.gender] ?? profile.gender) : null;
  const yearLabel = profile?.year ? (YEAR_MAP[Number(profile.year)] ?? `ปีที่ ${profile.year}`) : null;

  const getAvatarContent = () => {
    switch (roleId) {
      case 1: return (
        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
          <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
      );
      case 2: return (
        <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-600">
          <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
        </div>
      );
      case 4: case 5: return (
        <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-600">
          <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
        </div>
      );
      default: return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-600">
          <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>
      );
    }
  };

  const hasProfileInfo = profile && (facultyName || yearLabel || genderLabel || profile.age || profile.department || profile.position);

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-24">
      <div className="max-w-[1280px] mx-auto px-5 md:px-16 pt-8">
        
        {/* Profile Header */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:items-start">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)] overflow-hidden bg-[#eddcff]">
                {getAvatarContent()}
              </div>
              <div className="absolute bottom-1 right-1 bg-[#cba72f] p-1.5 rounded-full border-2 border-white">
                <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            </div>
            
            <div className="text-center md:text-left flex-1 mt-2 md:mt-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-[#310065]">{roleName}</h2>
                <span className="bg-[#f8d4fe] text-[#75597c] px-3 py-1 rounded-full text-[12px] font-medium inline-block self-center md:self-auto">
                  {roleBadge}
                </span>
              </div>
              <p className="text-[#4a4452] text-sm font-semibold mb-1 flex items-center justify-center md:justify-start gap-1">
                <span className="material-symbols-outlined text-sm">id_card</span>{userIdentifier}
              </p>
              {displayName && (
                <p className="text-[#4a4452] text-sm mb-1 flex items-center justify-center md:justify-start gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>{displayName}
                </p>
              )}
              {email && (
                <p className="text-[#4a4452] text-xs mb-4 flex items-center justify-center md:justify-start gap-1">
                  <span className="material-symbols-outlined text-sm">mail</span>{email}
                </p>
              )}
              <div className="flex gap-3 justify-center md:justify-start">
                <button 
                  onClick={() => navigate('/tracking')}
                  className="bg-[#310065] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)]"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  ดูโพสต์ทั้งหมดของคุณ
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Info Card */}
        {hasProfileInfo && (
          <section className="mb-8 bg-white/80 backdrop-blur-[8px] border border-[#cdc3d4]/30 rounded-xl shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)] p-6">
            <h3 className="text-sm font-bold text-[#310065] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">account_circle</span>
              ข้อมูลส่วนตัว
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {facultyName && <InfoRow icon="school" label="คณะ / วิทยาลัย" value={facultyName} wide />}
              {yearLabel && <InfoRow icon="workspace_premium" label="ระดับการศึกษา" value={yearLabel} />}
              {profile?.student_id && <InfoRow icon="badge" label="รหัสนิสิต" value={profile.student_id} />}
              {profile?.major && <InfoRow icon="menu_book" label="สาขาวิชา" value={profile.major} />}
              {profile?.department && <InfoRow icon="corporate_fare" label="ภาควิชา / หน่วยงาน" value={profile.department} />}
              {profile?.position && <InfoRow icon="work" label="ตำแหน่ง" value={profile.position} />}
              {genderLabel && <InfoRow icon="person" label="เพศ" value={genderLabel} />}
              {profile?.age && <InfoRow icon="calendar_today" label="อายุ" value={`${profile.age} ปี`} />}
              {profile?.phone && <InfoRow icon="phone" label="เบอร์โทรศัพท์" value={profile.phone} />}
            </div>
          </section>
        )}

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-[8px] border border-[#cdc3d4]/30 p-6 rounded-xl shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)] flex flex-col items-center justify-center text-center hover:scale-[0.98] transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[#310065] text-4xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>report_problem</span>
            <span className="text-2xl font-bold text-[#310065]">{isLoading ? '...' : totalProblems}</span>
            <span className="text-[12px] font-medium text-[#4a4452]">ปัญหาที่แจ้งทั้งหมด</span>
          </div>
          
          <div className="bg-white/80 backdrop-blur-[8px] border border-[#cdc3d4]/30 p-6 rounded-xl shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)] flex flex-col items-center justify-center text-center hover:scale-[0.98] transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[#cba72f] text-4xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="text-2xl font-bold text-[#310065]">{isLoading ? '...' : resolvedProblems}</span>
            <span className="text-[12px] font-medium text-[#4a4452]">ดำเนินการแก้ไขแล้ว</span>
          </div>
          
          <div className="bg-white/80 backdrop-blur-[8px] border-y border-r border-[#cdc3d4]/30 border-l-4 border-l-[#ffe088] p-6 rounded-xl shadow-[0_10px_30px_-5px_rgba(49,0,101,0.08)] flex flex-col items-center justify-center text-center hover:scale-[0.98] transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-[#715478] text-4xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
            <span className="text-2xl font-bold text-[#310065]">{isLoading ? '...' : pendingProblems}</span>
            <span className="text-[12px] font-medium text-[#4a4452]">กำลังรอดำเนินการ</span>
          </div>
        </section>

        {/* Logout Action */}
        <section className="mt-4">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-all text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            ออกจากระบบ
          </button>
          <p className="text-center mt-6 text-[12px] font-medium text-[#7c7483]">
            UP Connect v2.4.0 — Smart Campus Solution
          </p>
        </section>

      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLogoutModal(false)}
          ></div>
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการออกจากระบบ</h3>
            <p className="text-sm text-slate-600 mb-6">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีผู้ใช้นี้?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold bg-red-600 hover:bg-red-700 transition"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
