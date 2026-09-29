import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';

const API_BASE = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:8000/api/v1/auth';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

interface InviteDetails {
  email: string;
  role: string;
  display_role: string;
  category_id?: number | null;
  category_name?: string | null;
  expires_at?: string | null;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  // Extract token from query param
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const isInviteMode = !!token;

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    birthdate: null as Dayjs | null,
    phone: '',
    public_user_type_id: '',
  });

  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);

  // Password visibility
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Invite verification state
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(isInviteMode);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Submit status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Criteria Calculation
  const pwd = formData.password;
  const confirmPwd = formData.confirm_password;

  const criteria = useMemo(() => {
    return {
      minLength: pwd.length >= 8,
      hasUpperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd),
      isMatch: pwd.length > 0 && confirmPwd.length > 0 && pwd === confirmPwd,
    };
  }, [pwd, confirmPwd]);

  // Strength score based on first 4 rules
  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLength) score += 1;
    if (criteria.hasUpperLower) score += 1;
    if (criteria.hasNumber) score += 1;
    if (criteria.hasSpecial) score += 1;
    return score;
  }, [criteria]);

  const strengthMeta = useMemo(() => {
    if (!pwd) {
      return { label: 'กรุณากรอกรหัสผ่าน', percent: 0, color: 'bg-slate-200', text: 'text-slate-400' };
    }
    if (strengthScore <= 1) {
      return { label: 'ความปลอดภัยต่ำ (ง่ายเกินไป)', percent: 25, color: 'bg-rose-500', text: 'text-rose-600' };
    }
    if (strengthScore === 2) {
      return { label: 'ความปลอดภัยปานกลาง', percent: 50, color: 'bg-amber-500', text: 'text-amber-600' };
    }
    if (strengthScore === 3) {
      return { label: 'ความปลอดภัยดี', percent: 75, color: 'bg-blue-500', text: 'text-blue-600' };
    }
    return { label: 'ความปลอดภัยสูงมาก (พร้อมใช้งาน)', percent: 100, color: 'bg-emerald-500', text: 'text-emerald-600' };
  }, [pwd, strengthScore]);

  // Fetch Public User Types (for general registration)
  useEffect(() => {
    axios.get(`${API_URL}/public-user-types`)
      .then(res => {
        if (res.data?.success) {
          setTypes(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load user types', err));
  }, []);

  // Fetch Invite verification if token exists
  useEffect(() => {
    if (!token) return;
    setIsVerifyingInvite(true);
    setInviteError(null);

    axios.get(`${API_URL}/users/invites/verify/${token}`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setInviteData(res.data.data);
        } else {
          setInviteError('ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
        }
      })
      .catch(err => {
        const detail = err.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : 'ลิงก์คำเชิญนี้ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว';
        setInviteError(msg);
      })
      .finally(() => {
        setIsVerifyingInvite(false);
      });
  }, [token]);

  const getInputCls = (name: string) => {
    const isMissing = missingFields.includes(name);
    return `w-full rounded-2xl border px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 disabled:opacity-50 ${
      isMissing
        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:border-[#4A154B] focus:ring-4 focus:ring-[#4A154B]/10'
    }`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMissingFields(prev => prev.filter(f => f !== name));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const missing: string[] = [];
    if (!formData.first_name.trim()) missing.push('first_name');
    if (!formData.last_name.trim()) missing.push('last_name');
    if (!formData.password) missing.push('password');
    if (!formData.confirm_password) missing.push('confirm_password');

    if (!isInviteMode) {
      if (!formData.email.trim()) missing.push('email');
      if (!formData.birthdate) missing.push('birthdate');
      if (!formData.public_user_type_id) missing.push('public_user_type_id');
      if (!pdpaConsent) missing.push('pdpaConsent');
    }

    if (missing.length > 0) {
      setMissingFields(missing);
      if (missing.includes('pdpaConsent') && missing.length === 1) {
        setError('คุณต้องยอมรับนโยบายความเป็นส่วนตัว (PDPA) เพื่อสมัครสมาชิก');
      } else {
        setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      }
      return;
    }

    if (!isInviteMode) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setMissingFields(['email']);
        setError('รูปแบบอีเมลไม่ถูกต้อง');
        return;
      }
    }

    // Check all 5 Password requirements
    const allCriteriaMet =
      criteria.minLength &&
      criteria.hasUpperLower &&
      criteria.hasNumber &&
      criteria.hasSpecial &&
      criteria.isMatch;

    if (!allCriteriaMet) {
      if (!criteria.isMatch) {
        setMissingFields(['confirm_password']);
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      } else {
        setMissingFields(['password']);
        setError('กรุณาตั้งรหัสผ่านให้ตรงตามข้อกำหนดความปลอดภัยครบทุกข้อ (อย่างน้อย 8 ตัวอักษร, พิมพ์ใหญ่-เล็ก, ตัวเลข และอักขระพิเศษ)');
      }
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (isInviteMode) {
        const payload = {
          token: token,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          password: formData.password,
          phone: formData.phone.trim() === '' ? null : formData.phone.trim(),
        };
        res = await axios.post(`${API_URL}/users/register-invite`, payload);
      } else {
        const payload = {
          email: formData.email.trim(),
          password: formData.password,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          birthdate: formData.birthdate ? formData.birthdate.format('YYYY-MM-DD') : null,
          phone: formData.phone.trim() === '' ? null : formData.phone.trim(),
          public_user_type_id: Number(formData.public_user_type_id),
          pdpa_consent: pdpaConsent,
        };
        res = await axios.post(`${API_BASE}/register/public`, payload);
      }

      if (res.data?.success) {
        setSuccessMsg(
          isInviteMode
            ? 'ลงทะเบียนและเปิดใช้งานบัญชีผู้ดูแลระบบสำเร็จ! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...'
            : 'ลงทะเบียนสมาชิกสำเร็จ! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...'
        );
        setTimeout(() => {
          navigate('/login');
        }, 2200);
      } else {
        setError(parseError(res.data));
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("FastAPI Error Detail:", err.response?.data);
        const data = err.response?.data;
        if (data?.detail) {
          const detail = data.detail;
          setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } else if (data?.message) {
          if (data.message === "User with this email already exists.") {
            setError("อีเมลของคำเชิญนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลดังกล่าว");
          } else if (data.message === "Invalid or expired invitation token.") {
            setError("ลิงก์คำเชิญสมัครสมาชิกไม่ถูกต้องหรือหมดอายุแล้ว");
          } else if (data.message === "Invitation has already been accepted or revoked.") {
            setError("คำเชิญนี้ถูกใช้งานหรือถูกยกเลิกไปแล้ว");
          } else {
            setError(data.message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50/50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl shadow-purple-950/10 border border-purple-100/70 p-6 sm:p-9 transition-all">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#2B164D] via-[#4A154B] to-[#6D28D9] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-3xl font-black text-white tracking-tighter">UP</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FED65B] rounded-full flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-purple-950 text-xs font-bold">verified</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            {isInviteMode ? 'ลงทะเบียนรับคำเชิญ' : 'ลงทะเบียนบุคคลทั่วไป'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-normal">
            {isInviteMode
              ? 'ตั้งรหัสผ่านความปลอดภัยเพื่อเปิดใช้งานบัญชีผู้ดูแลระบบ UP Voice'
              : 'สร้างบัญชีเพื่อติดตามและแจ้งเรื่องร้องเรียน มหาวิทยาลัยพะเยา'}
          </p>
        </div>

        {/* Verification Loader / Invalid Invite State */}
        {isInviteMode && isVerifyingInvite && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-50/80 border border-purple-100 flex items-center justify-center gap-3 text-purple-800 text-sm animate-pulse">
            <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
            <span>กำลังตรวจสอบสิทธิ์คำเชิญผู้ดูแลระบบ...</span>
          </div>
        )}

        {isInviteMode && !isVerifyingInvite && inviteError && (
          <div className="mb-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="font-bold text-rose-800 mb-1">ไม่สามารถใช้คำเชิญนี้ได้</h3>
            <p className="text-xs text-rose-600 mb-4">{inviteError}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        )}

        {/* Verified Invite Card (Displays Role, Category, and Assigned Email) */}
        {isInviteMode && !isVerifyingInvite && inviteData && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white border border-purple-100 p-4 sm:p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2B164D] text-[#FED65B] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-700 text-white shadow-xs">
                    {inviteData.display_role}
                  </span>
                  {inviteData.category_name && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                      <span className="material-symbols-outlined text-[13px]">folder</span>
                      {inviteData.category_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  คำเชิญสำหรับ: <strong className="text-slate-800 font-semibold">{inviteData.email}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          
          {/* Name Fields (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อจริง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                placeholder="ระบุชื่อจริง"
                value={formData.first_name}
                onChange={handleChange}
                className={getInputCls('first_name')}
                disabled={isLoading || !!successMsg}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                placeholder="ระบุนามสกุล"
                value={formData.last_name}
                onChange={handleChange}
                className={getInputCls('last_name')}
                disabled={isLoading || !!successMsg}
              />
            </div>
          </div>

          {/* Email & Public User Type (Only for Public User Registration) */}
          {!isInviteMode && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  อีเมล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={getInputCls('email')}
                  disabled={isLoading || !!successMsg}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ประเภทบุคคล <span className="text-rose-500">*</span>
                </label>
                <select
                  name="public_user_type_id"
                  value={formData.public_user_type_id}
                  onChange={handleChange}
                  className={getInputCls('public_user_type_id')}
                  disabled={isLoading || !!successMsg || types.length === 0}
                >
                  <option value="">-- เลือกประเภทบุคคลทั่วไป --</option>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Phone (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              เบอร์โทรศัพท์ <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="08X-XXX-XXXX"
              value={formData.phone}
              onChange={handleChange}
              className={getInputCls('phone')}
              disabled={isLoading || !!successMsg}
            />
          </div>

          {/* Password Input Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                รหัสผ่านใหม่ <span className="text-rose-500">*</span>
              </label>
              {pwd.length > 0 && (
                <span className={`text-[11px] font-bold ${strengthMeta.text}`}>
                  {strengthMeta.label}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร"
                value={formData.password}
                onChange={handleChange}
                className={`${getInputCls('password')} pr-12`}
                disabled={isLoading || !!successMsg}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center transition-colors"
                disabled={isLoading || !!successMsg}
                title={showPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Password Strength Progress Bar */}
            {pwd.length > 0 && (
              <div className="mt-2">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${strengthMeta.color}`}
                    style={{ width: `${strengthMeta.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPwd ? 'text' : 'password'}
                name="confirm_password"
                placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                value={formData.confirm_password}
                onChange={handleChange}
                className={`${getInputCls('confirm_password')} pr-12 ${
                  confirmPwd.length > 0
                    ? criteria.isMatch
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-rose-400 bg-rose-50/30'
                    : ''
                }`}
                disabled={isLoading || !!successMsg}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center transition-colors"
                disabled={isLoading || !!successMsg}
                title={showConfirmPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Password Requirements Checklist Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs transition-all duration-300">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-2.5">
              <span className="material-symbols-outlined text-base text-purple-700">shield</span>
              <span>ข้อกำหนดความปลอดภัยของรหัสผ่าน</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* Requirement 1: Min length 8 */}
              <div className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                criteria.minLength ? 'text-emerald-700 bg-emerald-50/80 font-medium' : 'text-slate-500'
              }`}>
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${
                  criteria.minLength ? 'text-emerald-600' : 'text-slate-300'
                }`}>
                  {criteria.minLength ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>ความยาวตั้งแต่ 8 ตัวขึ้นไป</span>
              </div>

              {/* Requirement 2: Upper and Lowercase */}
              <div className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                criteria.hasUpperLower ? 'text-emerald-700 bg-emerald-50/80 font-medium' : 'text-slate-500'
              }`}>
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${
                  criteria.hasUpperLower ? 'text-emerald-600' : 'text-slate-300'
                }`}>
                  {criteria.hasUpperLower ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>มีพิมพ์ใหญ่ (A-Z) และพิมพ์เล็ก (a-z)</span>
              </div>

              {/* Requirement 3: Number */}
              <div className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                criteria.hasNumber ? 'text-emerald-700 bg-emerald-50/80 font-medium' : 'text-slate-500'
              }`}>
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${
                  criteria.hasNumber ? 'text-emerald-600' : 'text-slate-300'
                }`}>
                  {criteria.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>มีตัวเลขอย่างน้อย 1 ตัว (0-9)</span>
              </div>

              {/* Requirement 4: Special Characters */}
              <div className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                criteria.hasSpecial ? 'text-emerald-700 bg-emerald-50/80 font-medium' : 'text-slate-500'
              }`}>
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${
                  criteria.hasSpecial ? 'text-emerald-600' : 'text-slate-300'
                }`}>
                  {criteria.hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>มีอักขระพิเศษ (!@#$%^&*)</span>
              </div>

              {/* Requirement 5: Confirm Match */}
              <div className={`sm:col-span-2 flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                criteria.isMatch
                  ? 'text-emerald-700 bg-emerald-50/80 font-medium'
                  : confirmPwd.length > 0
                  ? 'text-rose-600 bg-rose-50/80 font-medium'
                  : 'text-slate-500'
              }`}>
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${
                  criteria.isMatch
                    ? 'text-emerald-600'
                    : confirmPwd.length > 0
                    ? 'text-rose-500'
                    : 'text-slate-300'
                }`}>
                  {criteria.isMatch
                    ? 'check_circle'
                    : confirmPwd.length > 0
                    ? 'cancel'
                    : 'radio_button_unchecked'}
                </span>
                <span>
                  {criteria.isMatch
                    ? 'รหัสผ่านทั้งสองช่องตรงกันเรียบร้อย'
                    : confirmPwd.length > 0
                    ? 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'
                    : 'รหัสผ่านทั้งสองช่องต้องตรงกัน'}
                </span>
              </div>

            </div>
          </div>

          {/* Birthdate (Only for Public User Registration) */}
          {!isInviteMode && (
            <div className="relative z-50">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                วันเกิด <span className="text-rose-500">*</span>
              </label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  disableFuture
                  openTo="year"
                  views={['year', 'month', 'day']}
                  format="DD/MM/YYYY"
                  value={formData.birthdate}
                  onChange={(newValue) => {
                    setFormData(prev => ({ ...prev, birthdate: newValue }));
                    setMissingFields(prev => prev.filter(f => f !== 'birthdate'));
                  }}
                  slotProps={{
                    textField: {
                      required: true,
                      className: getInputCls('birthdate'),
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'transparent',
                          '& fieldset': { border: 'none' },
                        },
                        '& .MuiInputBase-input': {
                          padding: '0',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                        }
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </div>
          )}

          {/* PDPA Consent (Only for Public User Registration) */}
          {!isInviteMode && (
            <label className="flex items-start gap-3 mt-1 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={pdpaConsent}
                  onChange={(e) => {
                    setPdpaConsent(e.target.checked);
                    if (e.target.checked) setMissingFields(prev => prev.filter(f => f !== 'pdpaConsent'));
                  }}
                  disabled={isLoading || !!successMsg}
                  className={`peer appearance-none w-5 h-5 border-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 checked:bg-[#2B164D] checked:border-[#2B164D] ${
                    missingFields.includes('pdpaConsent') ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                  }`}
                />
                <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-xs text-slate-600 leading-relaxed select-none group-hover:text-slate-800 transition-colors">
                ฉันยินยอมให้จัดเก็บและประมวลผลข้อมูลตาม <strong className="text-slate-800 font-semibold underline decoration-slate-300 underline-offset-2">นโยบายความเป็นส่วนตัว (PDPA)</strong> เพื่อความปลอดภัยในการใช้งานระบบ *
              </span>
            </label>
          )}

          {/* Alert Messages */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium px-4 py-3 rounded-2xl animate-shake">
              <span className="material-symbols-outlined text-[18px] text-rose-500 shrink-0 mt-0.5">error</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold px-4 py-3.5 rounded-2xl">
              <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !!successMsg || (isInviteMode && !!inviteError)}
            className="w-full h-12 mt-2 rounded-2xl bg-gradient-to-r from-[#2B164D] via-[#4A154B] to-[#6D28D9] hover:opacity-95 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <>
                <span>{isInviteMode ? 'ยืนยันและเปิดใช้งานบัญชี' : 'สมัครสมาชิก'}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 text-center pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            มีบัญชีผู้ใช้งานอยู่แล้ว?{' '}
            <Link to="/login" className="text-[#4A154B] font-bold hover:underline transition">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
