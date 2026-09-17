import React, { useEffect } from 'react';

const Login = () => {
  useEffect(() => {
    // Redirect to the centralized Public Web Login page (Local vs Production)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const targetUrl = import.meta.env.VITE_PUBLIC_WEB_URL || 
                      (isLocal ? 'http://localhost:5174/login' : 'https://university-social-listening-platfor.vercel.app/login');
    window.location.href = targetUrl;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default Login;
