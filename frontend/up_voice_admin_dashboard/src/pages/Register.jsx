import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Circle, 
  XCircle, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  FolderCheck,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(!!token);
  const [inviteError, setInviteError] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Verify invite token
  useEffect(() => {
    if (!token) return;
    setInviteLoading(true);
    setInviteError('');

    api.get(`/users/invites/verify/${token}`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setInviteInfo(res.data.data);
          if (res.data.data.email) {
            setFormData(prev => ({ ...prev, email: res.data.data.email }));
          }
        }
      })
      .catch(err => {
        const detail = err.response?.data?.detail;
        setInviteError(typeof detail === 'string' ? detail : 'ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
      })
      .finally(() => {
        setInviteLoading(false);
      });
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Password Criteria
  const pwd = formData.password;
  const confirmPwd = formData.confirmPassword;

  const criteria = useMemo(() => {
    return {
      minLength: pwd.length >= 8,
      hasUpperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd),
      isMatch: pwd.length > 0 && confirmPwd.length > 0 && pwd === confirmPwd,
    };
  }, [pwd, confirmPwd]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLength) score += 1;
    if (criteria.hasUpperLower) score += 1;
    if (criteria.hasNumber) score += 1;
    if (criteria.hasSpecial) score += 1;
    return score;
  }, [criteria]);

  const strengthMeta = useMemo(() => {
    if (!pwd) return { label: 'กรุณากรอกรหัสผ่าน', percent: 0, color: 'bg-slate-200', text: 'text-slate-400' };
    if (strengthScore <= 1) return { label: 'ความปลอดภัยต่ำ (ง่ายเกินไป)', percent: 25, color: 'bg-rose-500', text: 'text-rose-500' };
    if (strengthScore === 2) return { label: 'ความปลอดภัยปานกลาง', percent: 50, color: 'bg-amber-500', text: 'text-amber-500' };
    if (strengthScore === 3) return { label: 'ความปลอดภัยดี', percent: 75, color: 'bg-blue-500', text: 'text-blue-500' };
    return { label: 'ความปลอดภัยสูงมาก (พร้อมใช้งาน)', percent: 100, color: 'bg-emerald-500', text: 'text-emerald-600' };
  }, [pwd, strengthScore]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.fullName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    const allCriteriaMet = 
      criteria.minLength && 
      criteria.hasUpperLower && 
      criteria.hasNumber && 
      criteria.hasSpecial && 
      criteria.isMatch;

    if (!allCriteriaMet) {
      if (!criteria.isMatch) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      } else {
        setError('กรุณาตั้งรหัสผ่านให้ตรงตามข้อกำหนดความปลอดภัยครบทุกข้อ (อย่างน้อย 8 ตัวอักษร, พิมพ์ใหญ่-เล็ก, ตัวเลข, อักขระพิเศษ)');
      }
      return;
    }

    setLoading(true);
    try {
      const parts = formData.fullName.trim().split(' ');
      const first_name = parts[0];
      const last_name = parts.slice(1).join(' ') || '-';

      if (token) {
        await api.post('/users/register-invite', {
          token,
          first_name,
          last_name,
          password: formData.password,
        });
      } else {
        await api.post('/auth/register/public', {
          email: formData.email,
          password: formData.password,
          first_name,
          last_name,
          age: 20,
          pdpa_consent: true,
        });
      }

      setSuccessMsg('ลงทะเบียนสำเร็จ! กำลังนำทางไปหน้าเข้าสู่ระบบ...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#1e0836] to-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-purple-100">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#340866] to-[#7c3aed] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-900/30 mb-3 transform -rotate-2">
            <span className="text-2xl font-black text-[#fed65b] tracking-tight">UP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {token ? 'ลงทะเบียนรับคำเชิญผู้ดูแลระบบ' : 'สมัครสมาชิกผู้ดูแลระบบ'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {token ? 'ตั้งรหัสผ่านความปลอดภัยเพื่อเปิดใช้งานบัญชีของคุณ' : 'ระบบรับเรื่องร้องเรียน UP Voice'}
          </p>
        </div>

        {/* Invite Verification Loading */}
        {token && inviteLoading && (
          <div className="mb-5 p-4 rounded-xl bg-purple-50 text-purple-800 text-xs flex items-center justify-center gap-2 animate-pulse">
            <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
            <span>กำลังตรวจสอบสิทธิ์คำเชิญผู้ดูแลระบบ...</span>
          </div>
        )}

        {/* Invite Error */}
        {token && !inviteLoading && inviteError && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-1" />
            <h4 className="font-bold text-rose-800 text-sm">ไม่สามารถใช้คำเชิญนี้ได้</h4>
            <p className="text-xs text-rose-600 mt-0.5 mb-3">{inviteError}</p>
            <Link to="/login" className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900">
              กลับสู่หน้าเข้าสู่ระบบ
            </Link>
          </div>
        )}

        {/* Invite Info Card */}
        {token && !inviteLoading && inviteInfo && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/40 border border-purple-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#340866] text-[#fed65b] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-700 text-white">
                  {inviteInfo.display_role}
                </span>
                {inviteInfo.category_name && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                    <FolderCheck className="w-3 h-3" />
                    {inviteInfo.category_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                อีเมล: <strong className="text-slate-800 font-semibold">{inviteInfo.email}</strong>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="fullName"
                placeholder="เช่น สมชาย ใจดี"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition"
                required
                disabled={loading || !!successMsg}
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Email (If not invite) */}
          {!token && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมล <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  placeholder="admin@up.ac.th"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition"
                  required={!token}
                  disabled={loading || !!successMsg}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
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
                placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition"
                required
                disabled={loading || !!successMsg}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter bar */}
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPwd ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-purple-600 focus:bg-white outline-none transition ${
                  confirmPwd.length > 0
                    ? criteria.isMatch
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-200'
                }`}
                required
                disabled={loading || !!successMsg}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>ข้อกำหนดความปลอดภัยของรหัสผ่าน</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              
              <div className={`flex items-center gap-1.5 p-1 rounded ${criteria.minLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {criteria.minLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span>ความยาวตั้งแต่ 8 ตัวขึ้นไป</span>
              </div>

              <div className={`flex items-center gap-1.5 p-1 rounded ${criteria.hasUpperLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {criteria.hasUpperLower ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span>มีพิมพ์ใหญ่ (A-Z) และเล็ก (a-z)</span>
              </div>

              <div className={`flex items-center gap-1.5 p-1 rounded ${criteria.hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {criteria.hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span>มีตัวเลขอย่างน้อย 1 ตัว (0-9)</span>
              </div>

              <div className={`flex items-center gap-1.5 p-1 rounded ${criteria.hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                {criteria.hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span>มีอักขระพิเศษ (!@#$%^&*)</span>
              </div>

              <div className={`sm:col-span-2 flex items-center gap-1.5 p-1 rounded ${
                criteria.isMatch
                  ? 'text-emerald-700 font-medium'
                  : confirmPwd.length > 0
                  ? 'text-rose-600 font-medium'
                  : 'text-slate-500'
              }`}>
                {criteria.isMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : confirmPwd.length > 0 ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
                <span>
                  {criteria.isMatch
                    ? 'รหัสผ่านทั้งสองช่องตรงกันเรียบร้อย'
                    : confirmPwd.length > 0
                    ? 'รหัสผ่านไม่ตรงกัน'
                    : 'รหัสผ่านทั้งสองช่องต้องตรงกัน'}
                </span>
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!successMsg || (token && !!inviteError)}
            className="w-full bg-gradient-to-r from-[#340866] to-[#6d28d9] text-white py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all shadow-lg shadow-purple-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{token ? 'ยืนยันและเปิดใช้งานบัญชี' : 'สมัครสมาชิก'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors">
              มีบัญชีผู้ใช้งานอยู่แล้ว? เข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
