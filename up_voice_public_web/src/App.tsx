/**
 * App.tsx — Root router configuration
 *
 * Implements a strict Login First policy.
 * - /login is public.
 * - All other routes require authentication (access_token or guest role_id).
 */

import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ReportProblem from './components/ReportProblem';
import HomeFeed from './pages/HomeFeed';
import TrackingPage from './pages/TrackingPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';

// ─── Global Auth Guard ────────────────────────────────────────────────────────
function ProtectedRoute() {
  const isAuthed = !!(localStorage.getItem('access_token') || localStorage.getItem('role_id'));
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <Outlet />;
}

// ─── App Component ────────────────────────────────────────────────────────────
function App() {
  const roleId = Number(localStorage.getItem('role_id') ?? 0);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomeFeed />} />
            <Route
              path="/report"
              element={
                <ReportProblem
                  roleId={roleId}
                  onSuccess={() => {
                    console.log('Problem submitted!');
                  }}
                  onUnauthorized={() => {
                    window.location.href = '/login';
                  }}
                />
              }
            />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Catch-all inside protected layout */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
