import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';

const API_BASE = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:8000/api/v1/auth';

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

export default function RegisterPage() {
  const navigate = useNavigate();
  
  // Safely extract token from URL to avoid any React Router context crashes
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const isInviteMode = !!token;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    birthdate: null as Dayjs | null,
    phone: '',
    public_user_type_id: '',
  });

  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);

  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getInputCls = (name: string) => {
    const isMissing = missingFields.includes(name);
    return `w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition disabled:opacity-50 ${isMissing ? 'border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 bg-slate-50 focus:border-[#2B164D] focus:ring-2 focus:ring-[#2B164D]/20'}`;
  };

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/public-user-types`)
      .then(res => {
        if (res.data?.success) {
          setTypes(res.data.data);
        }
      })
      .catch(err => console.error('Failed to load user types', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMissingFields(prev => prev.filter(f => f !== name));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const missing: string[] = [];
    if (!formData.first_name) missing.push('first_name');
    if (!formData.last_name) missing.push('last_name');
    if (!formData.password) missing.push('password');
    
    if (!isInviteMode) {
      if (!formData.email) missing.push('email');
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

    if (formData.password.length < 6) {
      setMissingFields(['password']);
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (isInviteMode) {
        const payload = {
          token: token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          phone: formData.phone.trim() === '' ? null : formData.phone.trim(),
        };
        res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/users/register-invite`, payload);
      } else {
        // Explicitly construct payload to perfectly match PublicUserRegisterCreate
        const payload = {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          birthdate: formData.birthdate ? formData.birthdate.format('YYYY-MM-DD') : null,
          phone: formData.phone.trim() === '' ? null : formData.phone.trim(),
          public_user_type_id: Number(formData.public_user_type_id),
          pdpa_consent: pdpaConsent,
        };
        res = await axios.post(`${API_BASE}/register/public`, payload);
      }
      
      if (res.data.success) {
        setSuccessMsg('ลงทะเบียนสำเร็จ! กำลังพากลับไปยังหน้าเข้าสู่ระบบ...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(parseError(res.data));
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("FastAPI Error Detail:", err.response?.data?.detail || err.response?.data);
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } else {
          setError(err.message);
        }
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#2B164D] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#2B164D]/30 mb-4 transform -rotate-3">
            <span className="text-3xl font-bold text-white tracking-tighter">UP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isInviteMode ? 'ลงทะเบียนรับคำเชิญ' : 'ลงทะเบียนบุคคลทั่วไป'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {isInviteMode ? 'กรอกข้อมูลส่วนตัวเพื่อเปิดใช้งานบัญชีของคุณ' : 'สร้างบัญชีเพื่อติดตามและแจ้งปัญหา (Role 3)'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="first_name"
              placeholder="ชื่อจริง *"
              value={formData.first_name}
              onChange={handleChange}
              className={getInputCls('first_name')}
              disabled={isLoading || !!successMsg}
            />
            <input
              type="text"
              name="last_name"
              placeholder="นามสกุล *"
              value={formData.last_name}
              onChange={handleChange}
              className={getInputCls('last_name')}
              disabled={isLoading || !!successMsg}
            />
          </div>

          {!isInviteMode && (
            <>
              <input
                type="email"
                name="email"
                placeholder="อีเมล *"
                value={formData.email}
                onChange={handleChange}
                className={getInputCls('email')}
                disabled={isLoading || !!successMsg}
              />

              <select
                name="public_user_type_id"
                value={formData.public_user_type_id}
                onChange={handleChange}
                className={getInputCls('public_user_type_id')}
                disabled={isLoading || !!successMsg || types.length === 0}
              >
                <option value="">-- เลือกประเภทบุคคลทั่วไป * --</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          )}

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              placeholder="รหัสผ่าน *"
              value={formData.password}
              onChange={handleChange}
              className={getInputCls('password')}
              disabled={isLoading || !!successMsg}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-medium text-sm"
              disabled={isLoading || !!successMsg}
            >
              {showPwd ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>

          {!isInviteMode && (
            <div className="relative z-50">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="วันเกิดของคุณ *"
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
                        }
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </div>
          )}

          {!isInviteMode && (
            <label className="flex items-start gap-3 mt-2 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={pdpaConsent}
                  onChange={(e) => {
                    setPdpaConsent(e.target.checked);
                    if (e.target.checked) setMissingFields(prev => prev.filter(f => f !== 'pdpaConsent'));
                  }}
                  disabled={isLoading || !!successMsg}
                  className={`peer appearance-none w-5 h-5 border-2 rounded-md transition-all cursor-pointer disabled:opacity-50 checked:bg-[#2B164D] checked:border-[#2B164D] ${missingFields.includes('pdpaConsent') ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                />
                <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-sm text-slate-600 leading-relaxed select-none group-hover:text-slate-800 transition-colors">
                ฉันยอมรับนโยบายความเป็นส่วนตัว (PDPA) *
              </span>
            </label>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-600 text-sm font-medium px-4 py-3 rounded-xl">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !!successMsg}
            className="w-full h-12 mt-2 rounded-xl bg-[#2B164D] hover:bg-[#3d2268] text-white font-bold transition shadow-lg shadow-[#2B164D]/25 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'สมัครสมาชิก'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            มีบัญชีผู้ใช้งานอยู่แล้ว?{' '}
            <Link to="/login" className="text-[#2B164D] font-bold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
