import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE = 'https://university-social-listening-platform.onrender.com/api/v1/auth';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS = {
  get: (k: string) => localStorage.getItem(k),
  set: (k: string, v: string) => localStorage.setItem(k, v),
  clear: () => localStorage.clear(),
  saveUser: (data: Record<string, unknown>, token: string) => {
    localStorage.setItem('access_token', token);
    const u = data['user'] as Record<string, unknown>;
    if (!u) return;
    const set = (k: string, lk = k) => { if (u[k] != null) localStorage.setItem(lk, String(u[k])); };

    let roleId = 1;
    const roleStr = u['role'] as string;
    if (roleStr === 'student') roleId = 1;
    else if (roleStr === 'staff') roleId = 2;
    else if (roleStr === 'public') roleId = 3;
    else if (roleStr === 'super_admin') roleId = 4;
    else if (roleStr === 'category_admin') roleId = 5;
    else if (roleStr === 'anonymous') roleId = 6;
    else if (u['role_id'] != null) roleId = Number(u['role_id']);

    localStorage.setItem('role_id', String(roleId));

    if (u['id'] != null) localStorage.setItem('user_id', String(u['id']));
    else if (u['user_id'] != null) localStorage.setItem('user_id', String(u['user_id']));

    set('email'); set('display_name'); set('student_id'); set('faculty');
    set('education_level'); set('age'); set('gender'); set('phone_number'); set('relationship');

    const p = u['profile'] as Record<string, unknown>;
    const setP = (k: string) => { if (p && p[k] != null) localStorage.setItem(k, String(p[k])); };
    setP('position'); setP('department'); setP('office_location'); setP('employee_id');
  },
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 ' +
  'outline-none transition focus:border-[#2B164D] focus:ring-2 focus:ring-[#2B164D]/20 disabled:opacity-50';

function parseError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'เกิดข้อผิดพลาด';
  const d = data as Record<string, unknown>;
  if (d['message']) return String(d['message']);
  if (d['detail']) {
    if (Array.isArray(d['detail']) && d['detail'].length > 0) {
      const first = d['detail'][0] as Record<string, unknown>;
      return String(first['msg'] ?? 'ข้อมูลไม่ถูกต้อง');
    }
    if (typeof d['detail'] === 'string') return d['detail'];
  }
  return 'เกิดข้อผิดพลาด';
}

function SSOPanel({ onSuccess, onClose }: { onSuccess: (roleId: number, token: string) => void; onClose: () => void }) {
  const [selectedRole, setSelectedRole] = useState<0 | 1>(0); // 0=student, 1=staff
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!id.trim() || !password) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    setIsLoading(true); setError('');

    try {
      let email = id.trim();
      if (!email.includes('@')) email += '@up.ac.th';
      const expectedRoleId = selectedRole === 0 ? 1 : 2;

      const res = await axios.post(`${API_BASE}/login`, {
        email,
        password,
        expected_role_id: expectedRoleId,
      });

      const data = res.data;
      if (data.success === true) {
        const actualRoleStr = data.data?.user?.role;
        let actualRoleId = 1;
        if (actualRoleStr === 'student') actualRoleId = 1;
        else if (actualRoleStr === 'staff') actualRoleId = 2;
        else if (actualRoleStr === 'public') actualRoleId = 3;
        else if (actualRoleStr === 'super_admin') actualRoleId = 4;
        else if (actualRoleStr === 'category_admin') actualRoleId = 5;
        else if (actualRoleStr === 'anonymous') actualRoleId = 6;
        else if (data.data?.user?.role_id != null) actualRoleId = Number(data.data.user.role_id);

        if (selectedRole === 0 && actualRoleId !== 1) {
          setError('อีเมลนี้ไม่ใช่บัญชีของนิสิต กรุณาเข้าสู่ระบบผ่านช่องทางที่ถูกต้อง');
          setIsLoading(false);
          return;
        }
        if (selectedRole === 1 && ![2, 4, 5].includes(actualRoleId)) {
          setError('อีเมลนี้ไม่ใช่บัญชีของบุคลากร หรือผู้ดูแลระบบ');
          setIsLoading(false);
          return;
        }

        LS.saveUser(data.data, data.data.access_token);
        onSuccess(actualRoleId, data.data.access_token);
      } else {
        let msg = parseError(data);
        if (msg === 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานในบทบาทนี้') {
          msg = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบสิทธิ์การใช้งาน';
        }
        setError(msg);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(parseError(err.response?.data) ?? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#2B164D] text-base">เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['นิสิต มพ.', 'บุคลากร'] as const).map((label, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedRole(idx as 0 | 1)}
            className={`py-2.5 rounded-xl text-sm font-bold transition-all ${selectedRole === idx
              ? 'bg-[#2B164D] text-white shadow-md shadow-[#2B164D]/20'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="sso-id"
          type={selectedRole === 0 ? 'number' : 'text'}
          className={inputCls + ' flex-1'}
          placeholder={selectedRole === 0 ? 'รหัสนิสิต (เช่น 66xxxx)' : 'บัญชีบุคลากร'}
          value={id}
          onChange={e => setId(e.target.value)}
          disabled={isLoading}
        />
        <div className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-[#2B164D] whitespace-nowrap">
          @up.ac.th
        </div>
      </div>

      <div className="relative">
        <input
          id="sso-password"
          type={showPwd ? 'text' : 'password'}
          className={inputCls + ' pr-10'}
          placeholder="รหัสผ่าน"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setShowPwd(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {showPwd ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        id="sso-login-btn"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-[#2B164D] hover:bg-[#3d2268] text-white text-sm font-bold transition shadow-lg shadow-[#2B164D]/25 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>กำลังเข้าสู่ระบบ...</span></> : 'เข้าสู่ระบบ'}
      </button>
    </div>
  );
}

function PublicPanel({ onSuccess, onClose }: { onSuccess: (roleId: number, token: string) => void; onClose: () => void }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!loginId.trim() || !password) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    setIsLoading(true); setError('');

    try {
      const isEmail = loginId.includes('@');
      const payload: Record<string, string | number> = {
        password,
        expected_role: 'public',
      };
      
      if (isEmail) {
        payload.email = loginId.trim();
      } else {
        payload.phone = loginId.trim();
      }

      const res = await axios.post(`${API_BASE}/login`, payload);
      const data = res.data;
      if (data.success === true) {
        const actualRoleStr = data.data?.user?.role;
        let actualRoleId = 1;
        if (actualRoleStr === 'student') actualRoleId = 1;
        else if (actualRoleStr === 'staff') actualRoleId = 2;
        else if (actualRoleStr === 'public') actualRoleId = 3;
        else if (actualRoleStr === 'super_admin') actualRoleId = 4;
        else if (actualRoleStr === 'category_admin') actualRoleId = 5;
        else if (actualRoleStr === 'anonymous') actualRoleId = 6;
        else if (data.data?.user?.role_id != null) actualRoleId = Number(data.data.user.role_id);

        if (![3, 4, 5].includes(actualRoleId)) {
          setError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานผ่านช่องทางนี้');
          setIsLoading(false);
          return;
        }

        LS.saveUser(data.data, data.data.access_token);
        onSuccess(actualRoleId, data.data.access_token);
      } else {
        setError(parseError(data));
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(parseError(err.response?.data) ?? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#2B164D] text-base">เข้าสู่ระบบสำหรับบุคคลทั่วไป</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">✕</button>
      </div>

      <input
        id="public-id"
        type="text"
        className={inputCls}
        placeholder="อีเมล หรือ เบอร์โทรศัพท์"
        value={loginId}
        onChange={e => setLoginId(e.target.value)}
        disabled={isLoading}
      />

      <div className="relative">
        <input
          id="public-password"
          type={showPwd ? 'text' : 'password'}
          className={inputCls + ' pr-10'}
          placeholder="รหัสผ่าน"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setShowPwd(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {showPwd ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        id="public-login-btn"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-[#2B164D] hover:bg-[#3d2268] text-white text-sm font-bold transition shadow-lg shadow-[#2B164D]/25 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>กำลังเข้าสู่ระบบ...</span></> : 'เข้าสู่ระบบ'}
      </button>
    </div>
  );
}

type Panel = 'none' | 'sso' | 'public' | 'sso_mock';

// ─── LoginPage Component ──────────────────────────────────────────────────────
// หน้าที่: จัดการหน้าจอเข้าสู่ระบบ (Login) ทั้งหมดของแอปพลิเคชัน
// การทำงานหลัก:
// 1. แสดงตัวเลือกการเข้าสู่ระบบ: ผ่านระบบ SSO ของมหาวิทยาลัย หรือ บัญชีบุคคลทั่วไป
// 2. มีระบบ Guest (เข้าสู่ระบบแบบไม่ระบุตัวตน)
// 3. หลังจากล็อกอินสำเร็จ จะดึงข้อมูล Token และ Role มาบันทึกลงใน localStorage
// 4. เมื่อเข้าสู่ระบบสำเร็จ จะทำการ Redirect ผู้ใช้ไปยังหน้าหลัก (HomeFeed) ทันที
export default function LoginPage() {
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [isAnonLoading, setIsAnonLoading] = useState(false);
  const [anonError, setAnonError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Read sso_error from URL if redirected back from failed SSO
  const ssoErrorParam = new URLSearchParams(location.search).get('sso_error');
  const ssoErrorMsg = ssoErrorParam === 'server_error'
    ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ SSO กรุณาลองใหม่'
    : ssoErrorParam
    ? 'ไม่สามารถเข้าสู่ระบบด้วย SSO ได้'
    : '';

  function onLoggedIn(roleId: number, token: string) {
    if (roleId === 4 || roleId === 5) {
      window.location.href = `http://localhost:5173/sso?token=${token}`;
    } else {
      navigate('/');
    }
  }

  async function handleAnonymousLogin() {
    setIsAnonLoading(true);
    setAnonError('');
    try {
      const res = await axios.post(`${API_BASE}/anonymous`);
      const data = res.data;
      if (data.success === true) {
        LS.saveUser(data.data, data.data.access_token);
        onLoggedIn(6, data.data.access_token); // anonymous roleId is 6
      } else {
        setAnonError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err) {
      setAnonError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsAnonLoading(false);
    }
  }

  return (
    <div className="login-body-bg flex flex-col min-h-screen text-on-background font-body-md">
      {/* TopNavBar */}
      <nav className="sticky top-0 z-50 bg-background/80 dark:bg-background/80 backdrop-blur-xl border-b border-outline-variant/30 w-full">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">UP Connect</div>
          <div className="flex gap-gutter items-center">
            {/* Nav links removed as requested */}
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-fixed opacity-20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-fixed opacity-20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="w-full max-w-[480px] relative z-10">
          
          {/* Header Section */}
          <div className="text-center mb-stack-lg">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-2">ยินดีต้อนรับเข้าสู่ระบบ</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">สำหรับนักศึกษาใหม่และบุคลากร University Portal Connect</p>
            {anonError && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg mt-3">{anonError}</p>}
            {ssoErrorMsg && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg mt-3">⚠️ {ssoErrorMsg}</p>}
          </div>

          {/* Login Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/50 p-8 md:p-10 rounded-xl login-card-shadow transition-all hover:border-primary/30">
            
            {activePanel === 'none' && (
              <div className="space-y-stack-md">
                {/* SSO Primary Action */}
                {activePanel === 'none' ? (
                  <button
                    onClick={() => { window.location.href = 'https://university-social-listening-platform.onrender.com/api/v1/auth/sso/login'; }}
                    className="w-full py-4 px-6 bg-primary-container text-white rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-[0.98] shadow-lg shadow-primary/10"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (@up.ac.th)
                  </button>
                ) : null}
                
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
                  <span className="font-label-sm text-label-sm text-outline">หรือเข้าใช้งานผ่านช่องทางอื่น</span>
                  <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
                </div>

                {/* Secondary Login Actions */}
                <div className="grid grid-cols-1 gap-stack-sm">
                  <button onClick={() => setActivePanel('public')} className="w-full py-4 px-6 border border-outline-variant text-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined">person</span>
                    เข้าสู่ระบบบุคคลทั่วไป
                  </button>
                  <button onClick={handleAnonymousLogin} disabled={isAnonLoading} className="w-full py-4 px-6 bg-surface-container-low text-on-surface-variant rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-high transition-all active:scale-[0.98]">
                    {isAnonLoading ? (
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined">visibility_off</span>
                    )}
                    {isAnonLoading ? 'กำลังประมวลผล...' : 'เข้าใช้งานแบบไม่ระบุตัวตน'}
                  </button>
                </div>

                {/* Assistance Links */}
                <div className="mt-stack-lg pt-stack-md border-t border-outline-variant/30 flex flex-col items-center gap-3">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">พบปัญหาในการเข้าสู่ระบบ?</p>
                  <div className="flex gap-4">
                    <a className="font-label-md text-label-md text-primary hover:underline" href="#">ลืมรหัสผ่าน</a>
                    <span className="text-outline-variant">•</span>
                    <a className="font-label-md text-label-md text-primary hover:underline" href="#">คู่มือการใช้งาน</a>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'sso_mock' && (
              <div className="space-y-4 fade-in">
                <div className="text-center mb-6">
                  <h3 className="font-headline-md text-headline-md text-primary mb-2">จำลองการเข้าสู่ระบบ SSO</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">กรุณาเลือกสถานะจำลองที่คุณต้องการ</p>
                </div>
                
                <button onClick={() => navigate('/onboarding?type=student')} className="w-full py-4 px-6 bg-primary-container text-white rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-[0.98] shadow-lg shadow-primary/10">
                  <span className="material-symbols-outlined">school</span>
                  เข้าสู่ระบบจำลอง (นิสิต)
                </button>
                
                <button onClick={() => navigate('/onboarding?type=staff')} className="w-full py-4 px-6 border border-primary text-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-all active:scale-[0.98] shadow-sm">
                  <span className="material-symbols-outlined">badge</span>
                  เข้าสู่ระบบจำลอง (บุคลากร)
                </button>
                
                <button
                  onClick={() => setActivePanel('none')}
                  className="w-full mt-4 py-3 text-on-surface-variant hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    กลับไปหน้าแรก
                  </div>
                </button>
              </div>
            )}

            {activePanel === 'sso' && <SSOPanel onSuccess={onLoggedIn} onClose={() => setActivePanel('none')} />}
            {activePanel === 'public' && <PublicPanel onSuccess={onLoggedIn} onClose={() => setActivePanel('none')} />}

          </div>

          {/* Welcome Illustration/Image Placeholder */}
          <div className="mt-stack-lg overflow-hidden rounded-xl border border-outline-variant/20 h-48 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent z-10"></div>
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqkwj8DfUfIlW1tJ8TC2H1T0TxLo1WW_tKn5hRRJ4abvwi6xr1R9nu1Q4yhCytCDGQXBZo4AgJ-LSwMsmb2JRqnFWJwbuP0D-X_matnIw_b3e9qVszfZxUP0pgAclmG0-NDFyB711YqJrFelWAqZupDz5a3YxCsQqkBWYU4RUuzpmmDDI0UnrnPpb85sw_OcTKroHuOuTByzhnQF73HStYjmW57pA4dP5aZemzztVclr8DdERAulXaDIOudqTCujzkI4MoScY-aACJ"
              alt="Welcome Illustration"
            />
            <div className="absolute bottom-4 left-6 z-20">
              <p className="text-white font-label-md text-label-md">ก้าวสู่ความสำเร็จที่ University Portal</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant w-full">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop py-stack-md max-w-container-max mx-auto gap-4">
          <div className="font-headline-md text-headline-md text-primary">UP Connect</div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Terms of Service</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Help Center</a>
            <a className="font-label-sm text-label-sm text-on-tertiary-fixed-variant hover:text-primary transition-all hover:underline" href="#">Accessibility</a>
          </div>
          <div className="font-label-sm text-label-sm text-secondary dark:text-secondary-fixed-dim opacity-80">
            © 2024 University Portal Connect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
