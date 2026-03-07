import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import DailySummaryCard from '../components/DailySummaryCard';
import MealList from '../components/MealList';
import WeeklyPlanDayPreview from '../components/WeeklyPlanDayPreview';
import GoalSettingModal from '../components/GoalSettingModal';
import api from '../api';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

export default function DashboardPage() {
  const location = useLocation();
  const today = toLocalDateStr(new Date());
  const [date, setDate] = useState(today);
  const [showGoals, setShowGoals] = useState(false);
  const [goalsTab, setGoalsTab] = useState<'manual' | 'auto' | 'preferences' | 'notifications'>('manual');
  const [showNotifBanner, setShowNotifBanner] = useState(() => {
    const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    return supported && Notification.permission === 'default' && !localStorage.getItem('notif_prompt_dismissed');
  });

  useEffect(() => {
    if ((location.state as { showGoals?: boolean })?.showGoals) {
      setShowGoals(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  const { daily, weekly, loading, refresh } = useDashboard(date);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/food/entries/${id}`);
    refresh();
  };

  const dismissNotifBanner = () => {
    localStorage.setItem('notif_prompt_dismissed', '1');
    setShowNotifBanner(false);
  };

  const openNotifSettings = () => {
    setGoalsTab('notifications');
    setShowGoals(true);
    dismissNotifBanner();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Notification prompt banner */}
      {showNotifBanner && (
        <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 gap-3">
          <p className="text-sm text-primary-800 flex-1">Enable meal reminders?</p>
          <button onClick={openNotifSettings} className="text-xs font-semibold text-primary-700 whitespace-nowrap">
            Set up
          </button>
          <button onClick={dismissNotifBanner} className="text-primary-400 hover:text-primary-600">
            ✕
          </button>
        </div>
      )}
      {/* Header with user greeting & logout */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Hi, <span className="font-medium text-gray-800">{user?.display_name?.split(' ')[0]}</span></p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(shiftDate(date, -1))} className="p-2">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">{formatDate(date)}</h1>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date >= today}
          className="p-2 disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && !daily ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : daily ? (
        <>
          <DailySummaryCard summary={daily} />

          {/* Weekly mini chart */}
          {weekly && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">This Week</h3>
              <div className="flex items-end gap-1 h-20">
                {weekly.days.map((day) => {
                  const pct = Math.min(100, (day.total_protein / weekly.protein_goal) * 100);
                  const isToday = day.date === today;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '60px' }}>
                        <div
                          className={`absolute bottom-0 w-full rounded-t transition-all ${
                            isToday ? 'bg-primary-500' : 'bg-primary-200'
                          }`}
                          style={{ height: `${pct * 0.6}px` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isToday ? 'font-bold text-primary-600' : 'text-gray-400'}`}>
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <MealList entries={daily.entries} onDelete={handleDelete} />

          <WeeklyPlanDayPreview date={date} />
        </>
      ) : null}

      <GoalSettingModal open={showGoals} initialTab={goalsTab} onClose={() => { setShowGoals(false); setGoalsTab('manual'); refresh(); }} />
    </div>
  );
}
