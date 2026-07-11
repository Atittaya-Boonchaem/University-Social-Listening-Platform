/**
 * ProfilePage.tsx
 *
 * Profile screen migrated from profile_screen.dart
 * Now expects authentication state to be handled by ProtectedRoute.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PROBLEMS_BASE = 'http://127.0.0.1:8000/api/v1/problems';

interface UserFields {
  access_token: string;
  role_id: number;
  role_name: string | null;
  user_id: number | null;
  display_name: string;
  email: string;
  student_id: string | null;
  faculty: string | null;
  education_level: string | null;
  age: number | null;
  gender: string | null;
  phone_number: string | null;
  relationship: string | null;
  position: string | null;
  department: string | null;
  office_location: string | null;
}

interface MyProblem {
  id: number;
  status?: string;
}

const LS = {
  get: (k: string) => localStorage.getItem(k),
  clear: () => localStorage.clear(),
  readUserFields: (): Partial<UserFields> => ({
    access_token: localStorage.getItem('access_token') ?? undefined,
    role_id: localStorage.getItem('role_id') != null ? Number(localStorage.getItem('role_id')) : undefined,
    role_name: localStorage.getItem('role') ?? null,
    user_id: localStorage.getItem('user_id') != null ? Number(localStorage.getItem('user_id')) : null,
    display_name: localStorage.getItem('display_name') ?? '',
    email: localStorage.getItem('email') ?? '',
    student_id: localStorage.getItem('student_id'),
    faculty: localStorage.getItem('faculty'),
    education_level: localStorage.getItem('education_level'),
    age: localStorage.getItem('age') != null ? Number(localStorage.getItem('age')) : null,
    gender: localStorage.getItem('gender'),
    phone_number: localStorage.getItem('phone_number'),
    relationship: localStorage.getItem('relationship'),
    position: localStorage.getItem('position'),
    department: localStorage.getItem('department'),
    office_location: localStorage.getItem('office_location'),
  }),
};

function getRoleName(roleId: number, studentId?: string | null, roleName?: string | null): string {
  if (roleName === 'anonymous') return 'ผู้ใช้ไม่ระบุตัวตน';
  switch (roleId) {
    case 1: {
      const prefix = studentId && studentId.length >= 2 ? ` ${studentId.substring(0, 2)}` : '';
      return `นิสิต มพ.${prefix}`;
    }
    case 2: return 'บุคลากร';
    case 3: return 'บุคคลทั่วไป';
    case 4: return 'ผู้ดูแลระบบ';
    case 5: return 'ผู้ดูแลหมวดหมู่';
    case 6: return 'ผู้ใช้ไม่ระบุตัวตน';
    default: return 'ผู้ใช้งานทั่วไป';
  }
}

function getRoleIcon(roleId: number): string {
  switch (roleId) {
    case 4: return '👤';
    case 5: return '👤';
    case 1: return '🎓';
    case 2: return '🪪';
    case 3: return '🌐';
    default: return '👤';
  }
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-28 flex-shrink-0 text-xs font-semibold text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-700 flex-1">{value}</span>
    </div>
  );
}

// ─── ProfilePage Component ──────────────────────────────────────────────────────
// หน้าที่: แสดงหน้าโปรไฟล์ส่วนตัวของผู้ใช้งาน
// การทำงานหลัก:
// 1. ดึงข้อมูลส่วนตัวจาก localStorage (เช่น ชื่อ, อีเมล, บทบาท, คณะ/สาขา, ตำแหน่ง) มาแสดงผล
// 2. มีฟังก์ชัน Logout เพื่อออกจากระบบ และเคลียร์ข้อมูลใน localStorage
// 3. แสดงสถิติการใช้งาน เช่น จำนวนปัญหาที่แจ้ง และจำนวนที่ได้รับการแก้ไขแล้ว (ดึงจาก API)
// 4. แสดงข้อมูลเพิ่มเติม (Extra Fields) ที่แตกต่างกันตามแต่ละ Role เช่น นิสิตจะมีรหัสนิสิต บุคลากรจะมีตำแหน่ง
export default function ProfilePage() {
  const [userFields] = useState<Partial<UserFields>>(LS.readUserFields);
  const roleId = userFields.role_id ?? 0;

  const [totalProblems, setTotalProblems] = useState(0);
  const [resolvedProblems, setResolvedProblems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();



  useEffect(() => {
    let cancelled = false;
    async function fetchMyProblems() {
      try {
        const token = LS.get('access_token');
        const res = await axios.get(`${PROBLEMS_BASE}/my-problems`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!cancelled && res.data.success) {
          const items: MyProblem[] = Array.isArray(res.data.data)
            ? res.data.data
            : res.data.data?.items ?? [];
          setTotalProblems(items.length);
          setResolvedProblems(items.filter(p => {
            const s = (p.status ?? '').toUpperCase();
            return s === 'RESOLVED' || s === 'CLOSED';
          }).length);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchMyProblems();
    return () => { cancelled = true; };
  }, []);

  function handleLogout() {
    LS.clear();
    setShowLogoutModal(false);
    navigate('/login');
  }

  const displayName = localStorage.getItem('display_name') || userFields.display_name || 'ไม่ระบุตัวตน';
  const displayEmail = userFields.email || userFields.phone_number || '';
  const roleName = getRoleName(roleId, userFields.student_id, userFields.role_name);
  const roleIcon = getRoleIcon(roleId);

  const hasExtraFields = !!(
    userFields.faculty || userFields.education_level || userFields.age ||
    userFields.gender || userFields.phone_number || userFields.relationship ||
    userFields.position || userFields.department || userFields.office_location
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D8B4E2] to-[#F1DFA8] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-[#2B164D] text-center mb-5">👤 ข้อมูลส่วนตัว</h1>
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl shadow-purple-200/30 p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-24 h-24 rounded-full bg-purple-50 border-4 border-white shadow-lg shadow-[#2B164D]/20 flex items-center justify-center">
              <span className="text-5xl">{roleIcon}</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{displayName}</p>
              {displayEmail && (
                <p className="text-sm text-slate-500 mt-0.5">{displayEmail}</p>
              )}
            </div>
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#2B164D]/10 border border-[#2B164D]/10 text-xs font-bold text-[#2B164D]">
              {roleName}
            </span>
          </div>

          <hr className="border-slate-100" />

          {hasExtraFields && (
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">ข้อมูลเพิ่มเติม</p>
              <div className="divide-y divide-slate-100">
                {userFields.faculty && <ProfileInfoRow label="คณะ" value={userFields.faculty} />}
                {userFields.education_level && <ProfileInfoRow label="ระดับการศึกษา" value={userFields.education_level} />}
                {userFields.age != null && <ProfileInfoRow label="อายุ" value={`${userFields.age} ปี`} />}
                {userFields.gender && <ProfileInfoRow label="เพศ" value={userFields.gender} />}
                {userFields.phone_number && <ProfileInfoRow label="เบอร์โทรศัพท์" value={userFields.phone_number} />}
                {userFields.relationship && <ProfileInfoRow label="ความสัมพันธ์" value={userFields.relationship} />}
                {userFields.position && <ProfileInfoRow label="ตำแหน่ง" value={userFields.position} />}
                {userFields.department && <ProfileInfoRow label="แผนก/หน่วยงาน" value={userFields.department} />}
                {userFields.office_location && <ProfileInfoRow label="สถานที่ทำงาน" value={userFields.office_location} />}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📋</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">ปัญหาที่เคยแจ้งทั้งหมด</p>
              </div>
              <div className="flex-shrink-0">
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#2B164D] border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">{totalProblems} เรื่อง</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✅</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">เรื่องที่ได้รับการแก้ไขแล้ว</p>
              </div>
              <div className="flex-shrink-0">
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#2B164D] border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  <span className="text-sm font-bold text-slate-500">{resolvedProblems} เรื่อง</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">❓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">ช่วยเหลือ</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400 flex-shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <button
            id="logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="w-full h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition flex items-center justify-center gap-2 border border-red-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ออกจากระบบ (Logout)
          </button>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowLogoutModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-slate-800 text-base">ออกจากระบบ</h3>
              <p className="text-sm text-slate-500 mt-1">คุณต้องการออกจากระบบใช่หรือไม่?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
              <button
                id="confirm-logout-btn"
                onClick={handleLogout}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition shadow-md shadow-red-200"
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
