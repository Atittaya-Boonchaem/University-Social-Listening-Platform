import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // The backend wraps responses in { success, message, data: { access_token, user } }
      const payload = response.data?.data;

      if (payload?.access_token) {
        localStorage.setItem('token', payload.access_token);
        if (payload.user?.admin_category_name) {
          localStorage.setItem('admin_category_name', payload.user.admin_category_name);
        } else {
          localStorage.removeItem('admin_category_name');
        }

        // v2 API returns role as a string: 'super_admin' | 'staff' | 'category_admin' | ...
        const role = payload.user?.role;
        const allowedRoles = ['super_admin', 'staff', 'category_admin'];
        if (!allowedRoles.includes(role)) {
          localStorage.removeItem('token');
          setError('Access denied. This dashboard is for Staff and Admins only.');
          return;
        }

        // Super admins go directly to the super admin section
        if (role === 'super_admin') {
          navigate('/super-admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError('Login failed: unexpected server response.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">UP Voice</h1>
          <p className="text-gray-500">Admin Dashboard Login</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
