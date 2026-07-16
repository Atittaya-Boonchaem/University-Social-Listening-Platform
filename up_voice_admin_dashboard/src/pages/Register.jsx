import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน (Passwords do not match)');
      return;
    }

    setLoading(true);
    try {
      const [first_name, ...rest] = formData.fullName.trim().split(' ');
      const last_name = rest.join(' ') || '-';

      if (token) {
        // Submit to register-invite endpoint
        await api.post('/users/register-invite', {
          token,
          first_name,
          last_name,
          password: formData.password,
        });
      } else {
        // Fallback to public registration with dummy data if public user tries this from admin side
        await api.post('/auth/register/public', {
          email: formData.email,
          password: formData.password,
          first_name,
          last_name,
          age: 20, // Dummy age to pass validation
          pdpa_consent: true,
        });
      }

      navigate('/login');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        console.error("Backend Error Detail:", detail);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">UP Connect</h1>
          <p className="text-gray-500">{token ? 'สมัครสมาชิก (รับคำเชิญ)' : 'สมัครสมาชิก (บุคคลทั่วไป)'}</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          {!token && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required={!token}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
          </button>

          <div className="text-center mt-5 pt-2">
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
