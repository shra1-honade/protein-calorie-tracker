import { useAdminStats } from '../hooks/useAdminStats';
import Layout from '../components/Layout';

export default function AdminPage() {
  const { stats, loading, error } = useAdminStats();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading stats...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </Layout>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users,
      icon: '👥',
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      title: 'New Users (24h)',
      value: stats.new_users_last_24h,
      icon: '✨',
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-700',
    },
    {
      title: 'New Users (7d)',
      value: stats.new_users_last_7_days,
      icon: '📈',
      color: 'bg-indigo-50 border-indigo-200',
      textColor: 'text-indigo-700',
    },
    {
      title: 'Total Food Entries',
      value: stats.total_food_entries,
      icon: '🍽️',
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
    },
    {
      title: 'Total Groups',
      value: stats.total_groups,
      icon: '👨‍👩‍👧‍👦',
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_last_7_days,
      icon: '⚡',
      color: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700',
    },
    {
      title: 'Total Protein Logged',
      value: `${stats.total_protein_logged_all_time.toLocaleString()}g`,
      icon: '💪',
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
    },
    {
      title: 'Total Calories Logged',
      value: stats.total_calories_logged_all_time.toLocaleString(),
      icon: '🔥',
      color: 'bg-pink-50 border-pink-200',
      textColor: 'text-pink-700',
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Statistics</h1>
          <p className="text-gray-600">Real-time analytics for your protein tracking platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div
              key={card.title}
              className={`${card.color} border-2 rounded-xl p-6 transition-transform hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gradient-to-r from-primary-50 to-green-50 border-2 border-primary-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Quick Insights</h2>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong>User Engagement:</strong>{' '}
              {stats.total_users > 0
                ? `${((stats.active_users_last_7_days / stats.total_users) * 100).toFixed(1)}%`
                : '0%'}{' '}
              of users are active (logged food in the last 7 days)
            </p>
            <p>
              <strong>Average per User:</strong>{' '}
              {stats.total_users > 0
                ? `${(stats.total_protein_logged_all_time / stats.total_users).toFixed(1)}g protein, ${Math.round(
                    stats.total_calories_logged_all_time / stats.total_users
                  )} calories`
                : 'N/A'}
            </p>
            <p>
              <strong>Average per Entry:</strong>{' '}
              {stats.total_food_entries > 0
                ? `${(stats.total_protein_logged_all_time / stats.total_food_entries).toFixed(1)}g protein, ${Math.round(
                    stats.total_calories_logged_all_time / stats.total_food_entries
                  )} calories`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
