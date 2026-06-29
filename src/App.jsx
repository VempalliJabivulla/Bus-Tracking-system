import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import LiveMapPage from './pages/LiveMapPage';
import DriverDashboard from './pages/DriverDashboard';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopBar from './components/TopBar';

function ProtectedRoute({ allowedRoles }) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-label-bold text-label-bold text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If user hasn't set role yet, redirect to register to complete profile
  if (!userRole) {
    return <Navigate to="/register" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'driver' ? '/driver' : '/student'} replace />;
  }

  return <Outlet />;
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <TopBar />
      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}

function PublicRoute() {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-label-bold text-label-bold text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && userRole) {
    return <Navigate to={userRole === 'driver' ? '/driver' : '/student'} replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/routes" element={<StudentDashboard />} />
              <Route path="/student/schedules" element={<StudentDashboard />} />
              <Route path="/student/alerts" element={<StudentDashboard />} />
              <Route path="/student/planner" element={<StudentDashboard />} />
            </Route>
            <Route path="/student/live/:routeId" element={<LiveMapPage />} />
          </Route>

          {/* Driver routes */}
          <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
            <Route element={<AppLayout />}>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/route" element={<DriverDashboard />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
