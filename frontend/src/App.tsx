import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import InstallPWAPrompt from './components/InstallPWAPrompt';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LogFoodPage from './pages/LogFoodPage';
import GroupPage from './pages/GroupPage';
import LeaderboardPage from './pages/LeaderboardPage';
import JoinGroupPage from './pages/JoinGroupPage';
import AdminPage from './pages/AdminPage';

function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      login(token);
      navigate('/', { replace: true });
    }
  }, [params, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InstallPWAPrompt />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/join/:code"
            element={
              <ProtectedRoute>
                <JoinGroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/log" element={<LogFoodPage />} />
            <Route path="/groups" element={<GroupPage />} />
            <Route path="/groups/:id/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
