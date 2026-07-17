import React, { useEffect } from 'react';

const Login = () => {
  useEffect(() => {
    // Redirect to the centralized Public Web Login page
    window.location.href = 'https://university-social-listening-platfor.vercel.app/login';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default Login;
