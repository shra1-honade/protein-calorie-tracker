import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLeaderboard } from '../hooks/useGroups';
import { useAuth } from '../hooks/useAuth';
import LeaderboardTable from '../components/LeaderboardTable';

export default function LeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const { entries, loading } = useLeaderboard(id ? parseInt(id) : null, period);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Leaderboard</h1>
      </div>

      <div className="flex rounded-lg bg-gray-100 p-1">
        {(['daily', 'weekly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              period === p
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <LeaderboardTable entries={entries} currentUserId={user?.id ?? 0} />
      )}
    </div>
  );
}
