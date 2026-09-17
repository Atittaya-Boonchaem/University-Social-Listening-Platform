import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import api from '../services/api';

export default function ExecutiveLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('executive@up.ac.th');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // Attempt live login to Backend
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data?.success && response.data?.data?.access_token) {
        const token = response.data.data.access_token;
        const userObj = response.data.data.user || {};
        const profile = userObj.profile || {};

        const userData = {
          email: userObj.email || email,
          name: userObj.display_name || profile.staff_name || 'ศ.ดร.เสมอ ถาน้อย',
          roleLabel: profile.position || 'รองอธิการบดี ม.พะเยา',
          department: profile.department || 'สำนักงานอธิการบดี',
        };

        localStorage.setItem('executive_token', token);
        localStorage.setItem('executive_user', JSON.stringify(userData));
        if (onLoginSuccess) onLoginSuccess(userData);
        navigate('/');
        return;
      }
    } catch (err) {
      console.warn('Backend login error:', err?.response?.data?.detail || err.message);
      setErrorMsg(err?.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const fillTestAccount = () => {
    setEmail('executive@up.ac.th');
    setPassword('password123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#1b082e] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 z-10 border border-purple-100">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2d0c52] to-[#7c3aed] mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-900/30 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            UP Connect Executive
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            ระบบเข้าสู่ระบบสำหรับผู้บริหาร มหาวิทยาลัยพะเยา
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real Account Credentials Info Box */}
        <div className="mb-5 p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-950">
          <div className="flex items-center justify-between mb-1.5 font-bold text-purple-900">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-700" />
              บัญชีผู้บริหารในฐานข้อมูลจริง:
            </span>
            <button
              type="button"
              onClick={fillTestAccount}
              className="text-[11px] font-semibold text-purple-700 hover:text-purple-950 underline"
            >
              กรอกอัตโนมัติ
            </button>
          </div>
          <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
            <div>อีเมล: <strong className="text-purple-950">executive@up.ac.th</strong></div>
            <div>รหัสผ่าน: <strong className="text-purple-950">password123</strong></div>
          </div>
          <div className="mt-1 text-[10px] text-purple-600">
            * สิทธิ์: ศ.ดร.เสมอ ถาน้อย (รองอธิการบดีฝ่ายวิจัยและนวัตกรรม)
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              อีเมลมหาวิทยาลัย (@up.ac.th)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="executive@up.ac.th"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-700 text-slate-800 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-700 text-slate-800 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2d0c52] hover:bg-[#3f1373] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>เข้าสู่ระบบด้วยบัญชีจริง (Login)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Assistance Links */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
          เข้าสู่ระบบด้วยการยืนยันตัวตน JWT ผ่านระบบส่วนกลาง
        </div>
      </div>

      <div className="mt-8 text-center text-purple-300/60 text-xs z-10">
        © 2024 มหาวิทยาลัยพะเยา สงวนลิขสิทธิ์ • ระบบเวอร์ชัน 4.2.1-stable
      </div>
    </div>
  );
}
