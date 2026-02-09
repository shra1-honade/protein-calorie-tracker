import { Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: number;
}

const rankColors: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  2: 'bg-gray-100 text-gray-600 border-gray-300',
  3: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">No data yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isTop3 = entry.rank <= 3;
        const isMe = entry.user_id === currentUserId;
        return (
          <div
            key={entry.user_id}
            className={`card flex items-center gap-3 ${
              isMe ? 'ring-2 ring-primary-300' : ''
            } ${isTop3 ? rankColors[entry.rank] ?? '' : ''}`}
          >
            <div className="w-8 h-8 flex items-center justify-center font-bold text-sm">
              {entry.rank <= 3 ? (
                <Trophy
                  size={20}
                  className={
                    entry.rank === 1
                      ? 'text-yellow-500'
                      : entry.rank === 2
                      ? 'text-gray-400'
                      : 'text-amber-600'
                  }
                />
              ) : (
                <span className="text-gray-500">#{entry.rank}</span>
              )}
            </div>
            {entry.avatar_url ? (
              <img
                src={entry.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-700">
                {entry.display_name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {entry.display_name}
                {isMe && (
                  <span className="text-xs text-primary-600 ml-1">(you)</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {Math.round(entry.total_protein)}g
              </p>
              <p className="text-xs text-gray-500">protein</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
