import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ExecutiveLoginPage from './pages/ExecutiveLoginPage';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('executive_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('executive_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setToken(localStorage.getItem('executive_token'));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('executive_token');
    localStorage.removeItem('executive_user');
    setToken(null);
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/" replace />
            ) : (
              <ExecutiveLoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/"
          element={
            token ? (
              <ExecutiveDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
