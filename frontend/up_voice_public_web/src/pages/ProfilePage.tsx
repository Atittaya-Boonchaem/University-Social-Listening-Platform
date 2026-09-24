/**
 * ProfilePage.tsx
 *
 * Modern UP Connect "ข้อมูลส่วนตัว" (User Profile & Session Page)
 * Designed for University of Phayao:
 *  - Clean, focused, and truthful profile view (removed redundant stats, ticket lists, privacy toggles, and duplicate action buttons)
 *  - Top Breadcrumbs Navigation
 *  - Hero Profile Card with UP Connect signature gradient, avatar, role badge, user ID, and truthful session info
 *  - Identity / Session Card:
 *      - For Anonymous: Anonymous Session & Privacy info (User ID, IP device link, zero personal data collected)
 *      - For Authenticated: Real student/staff records from database (only non-null fields)
 *  - Account & Session Management Card with Logout button and Confirmation Modal
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const FACULTY_MAP: Record<number, string> = {
  1: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
  2: 'คณะวิศวกรรมศาสตร์',
  3: 'คณะวิทยาศาสตร์',
  4: 'คณะแพทยศาสตร์',
  5: 'คณะศิลปศาสตร์',
  6: 'คณะบริหารธุรกิจและนิเทศศาสตร์',
  7: 'คณะนิติศาสตร์',
  8: 'คณะสหเวชศาสตร์และสาธารณสุขศาสตร์',
  9: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ',
  10: 'คณะทันตแพทยศาสตร์',
  11: 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
  12: 'คณะพยาบาลศาสตร์',
  13: 'คณะเภสัชศาสตร์',
  14: 'วิทยาลัยการศึกษา',
};

const GENDER_MAP: Record<string, string> = {
  male: 'ชาย',
  Male: 'ชาย',
  female: 'หญิง',
  Female: 'หญิง',
  other: 'อื่นๆ',
};

const YEAR_MAP: Record<number, string> = {
  1: 'ปริญญาตรี (ปี 1)',
  2: 'ปริญญาตรี (ปี 2)',
  3: 'ปริญญาตรี (ปี 3)',
  4: 'ปริญญาตรี (ปี 4)',
  5: 'ปริญญาโท',
  6: 'ปริญญาเอก',
};

export interface UserProfileData {
  user_id?: number;
  email?: string;
  display_name?: string;
  role?: string;
  is_active?: boolean;
  profile?: {
    student_id?: string;
    student_name?: string;
    faculty_id?: number;
    faculty_name?: string;
    year?: number;
    year_name?: string;
    birthdate?: string;
    gender?: string;
    department?: string;
    major?: string;
    employee_id?: string;
    staff_name?: string;
    position?: string;
    phone?: string;
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const [roleId, setRoleId] = useState<number>(Number(localStorage.getItem('role_id') ?? 6));
  const storedUserId = localStorage.getItem('user_id');
  const storedDisplayName = localStorage.getItem('display_name') ?? '';
  const storedEmail = localStorage.getItem('email') ?? '';

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    async function loadUserProfile() {
      setIsLoading(true);
      try {
        if (token) {
          try {
            const userRes = await axios.get(`${API_BASE}/users/me`, { headers });
            if (userRes.data?.success && userRes.data?.data) {
              const data = userRes.data.data;
              setProfileData(data);
              const roleMap: Record<string, number> = {
                student: 1, staff: 2, public: 3, super_admin: 4, category_admin: 5, anonymous: 6
              };
              if (data.role && roleMap[data.role]) {
                setRoleId(roleMap[data.role]);
              }
            }
          } catch {
            // Fallback: fetch by user ID if /me isn't reachable
            if (storedUserId) {
              try {
                const fallbackRes = await axios.get(`${API_BASE}/users/${storedUserId}`, { headers });
                if (fallbackRes.data?.success && fallbackRes.data?.data) {
                  setProfileData(fallbackRes.data.data);
                }
              } catch {
                // Ignore fallback error
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, [storedUserId]);

  function handleLogout() {
    localStorage.clear();
    setShowLogoutModal(false);
    navigate('/login');
  }



  // ─── Real Identity Resolvers (Strictly NO fake mock fallbacks) ──────────────
  const isAnonymous = roleId === 6 || profileData?.role === 'anonymous' || !profileData?.profile;
  const subProfile = profileData?.profile;

  // Real display name
  const displayName = profileData?.display_name || storedDisplayName || 'ผู้ใช้ไม่ระบุตัวตน';

  // Only non-empty values from database:
  const realFacultyName = subProfile?.faculty_name || (subProfile?.faculty_id ? FACULTY_MAP[subProfile.faculty_id] : null);
  const realYearName = subProfile?.year_name || (subProfile?.year ? YEAR_MAP[subProfile.year] : null);
  const realGender = subProfile?.gender ? (GENDER_MAP[subProfile.gender] || subProfile.gender) : null;
  const realStudentId = subProfile?.student_id || null;
  const realEmployeeId = subProfile?.employee_id || null;
  const realEmail = profileData?.email || (storedEmail && storedEmail.includes('@') && !storedEmail.includes('anonymous') ? storedEmail : null);
  const realDepartment = subProfile?.department || null;
  const realPosition = subProfile?.position || null;

  const roleBadgeText = (() => {
    switch (roleId) {
      case 1: return 'นิสิตมหาวิทยาลัยพะเยา (Student)';
      case 2: return 'บุคลากร มพ. (Staff)';
      case 4: case 5: return 'ผู้ดูแลระบบ (Admin)';
      case 6: return 'ไม่ระบุตัวตน (Anonymous)';
      default: return isAnonymous ? 'ไม่ระบุตัวตน (Anonymous)' : 'บุคคลทั่วไป (Citizen)';
    }
  })();

  return (
    <div className="w-full bg-[#faf8ff] text-[#21172e] pb-24 font-sans min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">


        {/* ── 2. Hero Profile Card (การ์ดโปรไฟล์ / ข้อมูลผู้ใช้งาน) ── */}
        <div className="rounded-3xl bg-gradient-to-r from-[#340866] via-[#4b267d] to-[#6f45a7] text-white p-6 sm:p-8 shadow-elevated relative overflow-hidden border border-purple-400/20">
          {/* Subtle Background Glows and Watermark */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/5 pointer-events-none blur-xl" />
          <div className="absolute -left-16 -bottom-16 w-60 h-60 rounded-full bg-amber-400/10 pointer-events-none blur-xl" />
          <div className="absolute top-6 right-8 opacity-10 pointer-events-none hidden md:block">
            <span className="material-symbols-outlined text-9xl text-white">
              {isAnonymous ? 'shield' : 'account_balance'}
            </span>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-[#fed65b] to-amber-300 p-1 shadow-lg">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#4b267d] to-[#340866] flex items-center justify-center text-white overflow-hidden relative">
                  {!isAnonymous ? (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-200">
                        {displayName.slice(0, 2)}
                      </span>
                      <span className="text-[10px] text-purple-200 font-mono mt-0.5">UP-ID</span>
                    </div>
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-amber-300">
                      visibility_off
                    </span>
                  )}
                </div>
              </div>
              
              {/* Badge Icon */}
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-lg border-2 border-white shadow-sm flex items-center justify-center ${
                  isAnonymous ? 'bg-purple-900 text-amber-300' : 'bg-amber-400 text-slate-950'
                }`}
                title={isAnonymous ? 'โหมดไม่ระบุตัวตน (Anonymous Session)' : 'ยืนยันตัวตนในระบบแล้ว'}
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {isAnonymous ? 'shield' : 'verified'}
                </span>
              </div>
            </div>

            {/* Identity Meta */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/90 text-slate-900 border border-amber-300 shadow-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    {isAnonymous ? 'shield' : 'school'}
                  </span>
                  <span>{roleBadgeText}</span>
                </span>
                
                {/* Real ID pill */}
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/15 text-purple-100 backdrop-blur-sm border border-white/10">
                  {isAnonymous
                    ? `User #${storedUserId || profileData?.user_id || 'Guest'}`
                    : realStudentId
                    ? `ID #${realStudentId}`
                    : realEmployeeId
                    ? `Staff #${realEmployeeId}`
                    : `User #${storedUserId || 'Guest'}`}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {displayName}
              </h1>

              {/* Subtext: Conditional on whether user is Anonymous vs Authenticated */}
              {isAnonymous ? (
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-purple-100/90 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className="flex items-center gap-1 text-amber-200 font-medium">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      เซสชันไม่ระบุตัวตน (Anonymous Session)
                    </span>
                    <span className="text-purple-300 hidden sm:inline">•</span>
                    <span className="text-purple-200">จดจำประวัติคำร้องผ่าน IP ประจำเครื่องนี้</span>
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-purple-200/80 pt-0.5">
                    <span className="flex items-center gap-1 text-emerald-300 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      พร้อมใช้งาน (ไม่ต้องเข้าสู่ระบบซ้ำ)
                    </span>
                    <span>•</span>
                    <span className="text-purple-200/70">ไม่มีการเก็บชื่อ คณะ หรืออีเมลในฐานข้อมูล</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-purple-100/90 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {realFacultyName && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-amber-300">apartment</span>
                        {realFacultyName}
                      </span>
                    )}
                    {realYearName && (
                      <>
                        <span className="text-purple-300 hidden sm:inline">•</span>
                        <span className="text-purple-200">{realYearName}</span>
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-purple-200/80 pt-0.5 font-mono">
                    {realEmail && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">mail</span>
                        {realEmail}
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      บัญชีพร้อมใช้งาน (Active)
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── 3. Identity / Session Card ── */}
        {isLoading ? (
          <div className="min-h-[160px] bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-3 border border-purple-100/60 shadow-sm">
            <span className="w-8 h-8 border-4 border-[#4b267d] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
          </div>
        ) : isAnonymous ? (
          /* ── Anonymous Session Card ── */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">shield_person</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ข้อมูลเซสชันและการไม่ระบุตัวตน</h3>
                  <p className="text-[11px] text-slate-500">Anonymous Session & Device Link</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                โหมดนิรนาม
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">badge</span>
                  ประเภทบัญชี
                </span>
                <span className="font-semibold text-slate-800">
                  ผู้ใช้ไม่ระบุตัวตน (Anonymous User)
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">fingerprint</span>
                  รหัสผู้ใช้งานในระบบ
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  User #{storedUserId || profileData?.user_id || 'Guest'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">router</span>
                  การระบุตัวตน
                </span>
                <span className="font-mono text-slate-700">
                  IP Address ประจำอุปกรณ์ (จดจำอัตโนมัติ)
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">privacy_tip</span>
                  ข้อมูลส่วนบุคคลที่จัดเก็บ
                </span>
                <span className="text-emerald-700 font-semibold">
                  ไม่มี (ไม่เก็บชื่อ คณะ ชั้นปี หรืออีเมล)
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">history</span>
                  การจำประวัติคำร้อง
                </span>
                <span className="font-medium text-slate-700">
                  ผูกกับอุปกรณ์นี้อัตโนมัติ ไม่ต้องกรอกรหัสผ่าน
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">security</span>
                  สถานะการทำงาน
                </span>
                <span className="font-semibold text-[#4b267d]">พร้อมส่งเรื่องและติดตามคำร้องได้ทันที</span>
              </div>
            </div>

            {/* Helpful Callout for Anonymous */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl text-xs space-y-1.5 text-slate-700 mt-2">
              <div className="font-bold text-[#4b267d] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>ข้อดีของโหมดไม่ระบุตัวตน</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ระบบจะไม่เก็บข้อมูลส่วนตัวใดๆ ในฐานข้อมูล แต่จะจำประวัติคำร้องที่คุณแจ้งผ่าน IP ของอุปกรณ์นี้ ทำให้คุณสามารถกลับมาติดตามความคืบหน้าได้ตลอดเวลาโดยไม่ต้องล็อกอินซ้ำ
              </p>
            </div>
          </div>
        ) : (
          /* ── Authenticated Student / Staff Record (Only Real Data) ── */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#4b267d] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ข้อมูลทะเบียนนิสิต / ผู้ใช้งาน</h3>
                  <p className="text-[11px] text-slate-500">Academic & Citizen Record</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ยืนยันแล้ว (SSO)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {realFacultyName && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">school</span>
                    คณะ / วิทยาลัย
                  </span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate" title={realFacultyName}>
                    {realFacultyName}
                  </span>
                </div>
              )}

              {realDepartment && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">corporate_fare</span>
                    สาขาวิชา / ภาควิชา
                  </span>
                  <span className="font-semibold text-slate-800">{realDepartment}</span>
                </div>
              )}

              {realYearName && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">workspace_premium</span>
                    ระดับการศึกษา
                  </span>
                  <span className="font-semibold text-slate-800">{realYearName}</span>
                </div>
              )}

              {realStudentId && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">fingerprint</span>
                    รหัสประจำตัวนิสิต
                  </span>
                  <span className="font-mono font-semibold text-slate-800">{realStudentId}</span>
                </div>
              )}

              {realEmployeeId && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">badge</span>
                    รหัสประจำตัวบุคลากร
                  </span>
                  <span className="font-mono font-semibold text-slate-800">{realEmployeeId}</span>
                </div>
              )}

              {realPosition && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">work</span>
                    ตำแหน่ง
                  </span>
                  <span className="font-semibold text-slate-800">{realPosition}</span>
                </div>
              )}

              {realGender && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">person</span>
                    เพศ
                  </span>
                  <span className="font-semibold text-slate-800">{realGender}</span>
                </div>
              )}

              {realEmail && (
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">mail</span>
                    อีเมลมหาวิทยาลัย
                  </span>
                  <span className="font-mono text-slate-700 truncate max-w-[240px]">{realEmail}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4b267d]">security</span>
                  สิทธิ์การเข้าใช้งาน
                </span>
                <span className="font-semibold text-[#4b267d]">{roleBadgeText}</span>
              </div>
            </div>
          </div>
        )}


        {/* ── 4. Account Management & Logout Card ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">จัดการเซสชันและบัญชีผู้ใช้งาน</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAnonymous
                ? 'ออกจากเซสชันไม่ระบุตัวตนบนอุปกรณ์นี้ หรือเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย'
                : 'ออกจากระบบ UP Connect บนอุปกรณ์นี้ หรือสลับเข้าสู่ระบบด้วยบัญชีบุคลากร'}
            </p>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>

      </div>

      {/* ── Logout Confirmation Modal Dialog ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col border border-rose-100 p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 ring-4 ring-rose-50/70">
                <span className="material-symbols-outlined text-2xl">logout</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">ยืนยันการออกจากระบบ?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  คุณต้องการออกจากเซสชันบัญชี <span className="font-semibold text-slate-800">{displayName}</span> ใช่หรือไม่
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
