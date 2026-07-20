import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * SsoSuccessPage.tsx
 * 
 * Landing page at /sso-success?token=<jwt>
 * Receives the JWT from the backend after Microsoft SSO callback,
 * saves it to localStorage, decodes the role, then redirects accordingly.
 */

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return JSON.parse(decodeURIComponent(window.atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
  } catch {
    return null;
  }
}

const ROLE_MAP: Record<string, number> = {
  student: 1,
  staff: 2,
  public: 3,
  super_admin: 4,
  category_admin: 5,
  anonymous: 6,
};

export default function SsoSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setError('ไม่พบ Token จาก SSO กรุณาลองเข้าสู่ระบบใหม่');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const payload = parseJwt(token);
    if (!payload) {
      setError('Token ไม่ถูกต้อง กรุณาลองใหม่');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Save token and user info to localStorage
    localStorage.setItem('access_token', token);
    const role = payload['role'] as string;
    const roleId = ROLE_MAP[role] ?? 1;
    const isNewUser = payload['is_new_user'] === true;

    localStorage.setItem('role_id', String(roleId));
    if (payload['user_id']) localStorage.setItem('user_id', String(payload['user_id']));
    if (payload['email']) localStorage.setItem('email', String(payload['email']));
    if (payload['display_name']) localStorage.setItem('display_name', String(payload['display_name']));

    // Redirect based on role
    if (roleId === 4 || roleId === 5) {
      // Super Admin      // Redirect to the Admin Dashboard
      window.location.href = `https://university-social-listening-platfor-olive.vercel.app/sso?token=${token}`;
    } else if (isNewUser) {
      // New user → onboarding page to collect extra profile info
      const type = role === 'staff' ? 'staff' : 'student';
      navigate(`/onboarding?type=${type}`, { replace: true });
    } else {
      // Returning user → Public feed
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">เข้าสู่ระบบไม่สำเร็จ</h1>
        <p className="text-slate-500 text-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-2">กำลังพาคุณกลับไปหน้าเข้าสู่ระบบ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6">
      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#2B164D] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">กำลังเข้าสู่ระบบ...</h1>
      <p className="text-slate-500 text-sm">ตรวจสอบข้อมูลบัญชีมหาวิทยาลัยของคุณ</p>
    </div>
  );
}
