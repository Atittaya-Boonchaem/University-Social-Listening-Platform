// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// ── Existing layouts / pages ───────────────────────────────────
import Sidebar           from './components/Sidebar';
import Navbar            from './components/Navbar';
import Login             from './pages/Login';
import Register          from './pages/Register';
import Dashboard         from './pages/Dashboard';
import UserManagement    from './pages/UserManagement';
import ManageProblems    from './pages/ManageProblems';
import Reports           from './pages/Reports';

// ── Super Admin layout & pages ─────────────────────────────────
import SuperAdminLayout        from './layouts/SuperAdminLayout';
import GlobalHeatmap           from './pages/super-admin/GlobalHeatmap';
import SAUserManagement        from './pages/super-admin/UserManagement';
import AuditLogs               from './pages/super-admin/AuditLogs';
import CategoryAdminInvites    from './pages/super-admin/CategoryAdminInvites';
import LLMSettings             from './pages/super-admin/LLMSettings';
import CategoryManagement      from './pages/super-admin/CategoryManagement';
import BuildingManagement      from './pages/super-admin/BuildingManagement';

// ── Category Admin layout & pages ──────────────────────────────
import CategoryAdminLayout     from './layouts/CategoryAdminLayout';
import CategoryAdminDashboard  from './pages/category-admin/CategoryAdminDashboard';

// ── JWT helper ─────────────────────────────────────────────────
function getTokenPayload() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

// ── Generic auth guard (staff + super_admin) ───────────────────
const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// ── Super Admin guard ──────────────────────────────────────────
const SuperAdminRoute = () => {
  const payload = getTokenPayload();
  if (!payload) return <Navigate to="/login" replace />;

  const role = payload.role;
  // Allow super_admin; also allow staff for read-only pages
  if (role !== 'super_admin' && role !== 'staff' && role !== 'category_admin') {
    return <Navigate to="/" replace />;
  }

  return <SuperAdminLayout />;
};

// ── Category Admin guard ───────────────────────────────────────
const CategoryAdminRoute = () => {
  const payload = getTokenPayload();
  if (!payload) return <Navigate to="/login" replace />;
  const role = payload.role;
  if (role !== 'category_admin' && role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }
  return <CategoryAdminLayout />;
};

// ──────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Existing Category Admin / Staff routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/problems"  element={<ManageProblems />} />
          <Route path="/users"     element={<UserManagement />} />
          <Route path="/reports"   element={<Reports />} />
        </Route>

        {/* Super Admin section */}
        <Route path="/super-admin" element={<SuperAdminRoute />}>
          <Route index                  element={<GlobalHeatmap />} />
          <Route path="users"           element={<SAUserManagement />} />
          <Route path="audit-logs"      element={<AuditLogs />} />
          <Route path="category-admins" element={<CategoryAdminInvites />} />
          <Route path="llm-settings"    element={<LLMSettings />} />
          <Route path="categories"      element={<CategoryManagement />} />
          <Route path="buildings"       element={<BuildingManagement />} />
        </Route>

        {/* Category Admin section */}
        <Route path="/category-admin" element={<CategoryAdminRoute />}>
          <Route index element={<CategoryAdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
