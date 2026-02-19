import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GoalSettingModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [protein, setProtein] = useState(String(user?.protein_goal ?? 150));
  const [calories, setCalories] = useState(String(user?.calorie_goal ?? 2000));
  const [carbs, setCarbs] = useState(String(user?.carb_goal ?? 200));
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me/goals', {
        protein_goal: parseFloat(protein),
        calorie_goal: parseFloat(calories),
        carb_goal: parseFloat(carbs),
      });
      await refreshUser();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 my-auto shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Set Daily Goals</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protein Goal (g)
            </label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="input"
              min="0"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calorie Goal
            </label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="input"
              min="0"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carb Goal (g)
            </label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="input"
              min="0"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
      </div>
    </div>
  );
}
