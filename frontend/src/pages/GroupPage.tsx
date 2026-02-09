import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import ShareLinkButton from '../components/ShareLinkButton';

export default function GroupPage() {
  const navigate = useNavigate();
  const { groups, loading, createGroup } = useGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createGroup(name.trim());
      setName('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Groups</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-1 text-sm py-1.5 px-3"
        >
          <Plus size={16} /> New Group
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="input"
            autoFocus
          />
          <button type="submit" disabled={creating} className="btn-primary w-full">
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Users size={40} className="mx-auto text-gray-300" />
          <p className="text-gray-500">No groups yet</p>
          <p className="text-sm text-gray-400">
            Create a group to compete with friends!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-gray-500">
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShareLinkButton inviteCode={group.invite_code} />
                  <button
                    onClick={() => navigate(`/groups/${group.id}/leaderboard`)}
                    className="p-2 text-gray-400 hover:text-primary-600"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
