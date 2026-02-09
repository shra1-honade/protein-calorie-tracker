import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import { Group } from '../types';

export default function JoinGroupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');
  const [group, setGroup] = useState<Group | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user || !code) return;
    const join = async () => {
      try {
        const { data } = await api.post<Group>('/groups/join', { invite_code: code });
        setGroup(data);
        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(msg ?? 'Failed to join group');
      }
    };
    join();
  }, [user, code]);

  if (status === 'joining') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <p className="text-gray-600">Joining group...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <p className="text-red-600 font-medium">{errorMsg}</p>
        <button onClick={() => navigate('/groups')} className="btn-primary">
          Go to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <div className="text-4xl">🎉</div>
      <h1 className="text-xl font-bold">Joined {group?.name}!</h1>
      <p className="text-gray-500">
        You're in! Start logging protein to climb the leaderboard.
      </p>
      <button onClick={() => navigate('/groups')} className="btn-primary">
        View Groups
      </button>
    </div>
  );
}
