import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:8000/api/v1/auth';

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

function SSOPanel({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
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
        else if (data.data?.user?.role_id != null) actualRoleId = Number(data.data.user.role_id);

        if (selectedRole === 0 && actualRoleId !== 1) {
          setError('อีเมลนี้ไม่ใช่บัญชีของนิสิต กรุณาเข้าสู่ระบบผ่านช่องทางที่ถูกต้อง');
          setIsLoading(false);
          return;
        }
        if (selectedRole === 1 && actualRoleId !== 2) {
          setError('อีเมลนี้ไม่ใช่บัญชีของบุคลากร กรุณาเข้าสู่ระบบผ่านช่องทางที่ถูกต้อง');
          setIsLoading(false);
          return;
        }

        LS.saveUser(data.data, data.data.access_token);
        onSuccess();
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
            className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
              selectedRole === idx
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

function PublicPanel({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!phone.trim() || !password) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    setIsLoading(true); setError('');

    try {
      const res = await axios.post(`${API_BASE}/login`, {
        phone_number: phone.trim(),
        password,
        expected_role_id: 3,
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
        else if (data.data?.user?.role_id != null) actualRoleId = Number(data.data.user.role_id);

        if (actualRoleId !== 3) {
          setError('เบอร์โทรศัพท์นี้ไม่ใช่บัญชีของบุคคลทั่วไป กรุณาเข้าสู่ระบบผ่านช่องทางที่ถูกต้อง');
          setIsLoading(false);
          return;
        }

        LS.saveUser(data.data, data.data.access_token);
        onSuccess();
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
        id="public-phone"
        type="tel"
        className={inputCls}
        placeholder="เบอร์โทรศัพท์"
        value={phone}
        onChange={e => setPhone(e.target.value)}
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

type Panel = 'none' | 'sso' | 'public';

export default function LoginPage() {
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [isAnonLoading, setIsAnonLoading] = useState(false);
  const [anonError, setAnonError] = useState('');
  const navigate = useNavigate();

  function onLoggedIn() {
    navigate('/');
  }

  async function handleAnonymousLogin() {
    setIsAnonLoading(true);
    setAnonError('');
    try {
      const res = await axios.post(`${API_BASE}/anonymous`);
      const data = res.data;
      if (data.success === true) {
        LS.saveUser(data.data, data.data.access_token);
        onLoggedIn();
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
    <div className="min-h-screen bg-gradient-to-br from-[#D8B4E2] to-[#F1DFA8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] bg-white/95 backdrop-blur rounded-[2rem] shadow-2xl shadow-purple-200/40 p-7">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2B164D]">📣 UP Voice</h1>
          <p className="text-sm font-semibold text-slate-600 mt-2 leading-snug">
            ระบบรับฟังเสียงและวิเคราะห์ปัญหาของชุมชนมหาวิทยาลัยพะเยา
          </p>
          <p className="text-sm text-slate-400 mt-1">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          {anonError && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg mt-3">{anonError}</p>}
        </div>

        {activePanel === 'none' && (
          <div className="flex flex-col gap-4">
            <button
              id="btn-sso"
              onClick={() => setActivePanel('sso')}
              className="w-full h-14 rounded-xl bg-[#2B164D] hover:bg-[#3d2268] text-white text-sm font-bold transition shadow-lg shadow-[#2B164D]/25 active:scale-[0.98]"
            >
              เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (SSO)
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400">หรือ</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-public"
                onClick={() => setActivePanel('public')}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2B164D] text-sm font-bold transition"
              >
                บุคคลทั่วไป
              </button>
              <button
                id="btn-anonymous"
                onClick={handleAnonymousLogin}
                disabled={isAnonLoading}
                className="h-12 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {isAnonLoading ? <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /><span>กำลังประมวลผล...</span></> : 'ไม่ระบุตัวตน'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-1">
              ยังไม่มีบัญชีบุคคลทั่วไป?{' '}
              <a href="#" className="text-[#2B164D] font-bold hover:underline">สมัครสมาชิก</a>
            </p>
          </div>
        )}

        {activePanel === 'sso' && <SSOPanel onSuccess={onLoggedIn} onClose={() => setActivePanel('none')} />}
        {activePanel === 'public' && <PublicPanel onSuccess={onLoggedIn} onClose={() => setActivePanel('none')} />}
      </div>
    </div>
  );
}
