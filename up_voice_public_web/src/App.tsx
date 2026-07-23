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
import OnboardingPage from './pages/OnboardingPage';
import RegisterPage from './pages/RegisterPage';
import IssueDetailPage from './pages/IssueDetailPage';
import SsoSuccessPage from './pages/SsoSuccessPage';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function getRoleIdFromToken(token: string | null): number {
  if (!token) return 0;
  const payload = parseJwt(token);
  if (!payload || !payload.role) {
    return Number(localStorage.getItem('role_id') || 0);
  }
  const roleMap: Record<string, number> = {
    'student': 1,
    'staff': 2,
    'public': 3,
    'super_admin': 4,
    'category_admin': 5,
    'anonymous': 6
  };
  return roleMap[payload.role] || Number(localStorage.getItem('role_id') || 0);
}

// ─── Global Auth Guard ────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  allowedRoles?: number[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token');
  const isAuthed = !!token;
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getRoleIdFromToken(token);
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />; // Or an unauthorized page
    }
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
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/sso-success" element={<SsoSuccessPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomeFeed />} />
            <Route path="/issue/:id" element={<IssueDetailPage />} />
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
