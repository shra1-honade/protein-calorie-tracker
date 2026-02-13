import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import api from '../api';

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    const { data } = await api.get<{ url: string }>('/auth/google/login');
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-gray-900 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        {/* Animated icon cluster */}
        <div className="relative mb-8">
          <div className="w-28 h-28 bg-primary-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary-400/30">
            <span className="text-6xl">🥗</span>
          </div>
          <span className="absolute -top-2 -right-2 text-3xl animate-bounce">💪</span>
          <span className="absolute -bottom-1 -left-3 text-2xl animate-pulse">🔥</span>
        </div>

        <h1 className="text-4xl font-extrabold text-white text-center leading-tight">
          Protein &<br />Calorie Tracker
        </h1>
        <p className="mt-3 text-primary-200 text-center max-w-xs text-lg">
          Fuel your gains. Track every bite. Crush your goals.
        </p>

        {/* Feature cards */}
        <div className="mt-10 w-full max-w-sm space-y-3">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <div className="w-10 h-10 bg-primary-500/30 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl">📸</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Food Detection</p>
              <p className="text-primary-300 text-xs">Snap a photo, get instant nutrition info</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <div className="w-10 h-10 bg-primary-500/30 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Daily & Weekly Stats</p>
              <p className="text-primary-300 text-xs">Visualize your protein and calorie trends</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
            <div className="w-10 h-10 bg-primary-500/30 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Compete with Friends</p>
              <p className="text-primary-300 text-xs">Create groups and climb the leaderboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={handleGoogleLogin}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-white rounded-xl px-4 py-4 font-semibold text-gray-800 hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg shadow-black/20"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-primary-400/60 text-xs mt-4">
          Free forever. No credit card needed.
        </p>
      </div>
    </div>
  );
}
