import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'manual' | 'auto' | 'preferences';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type GoalType = 'lose' | 'maintain' | 'gain' | 'recomp';
type Sex = 'male' | 'female';

interface CalcResult {
  bmr: number;
  tdee: number;
  protein_goal: number;
  calorie_goal: number;
  carb_goal: number;
}

function calculateMacros(
  age: number,
  weight_kg: number,
  height_cm: number,
  sex: Sex,
  activity_level: ActivityLevel,
  goal: GoalType,
): CalcResult {
  const bmr =
    sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const factors: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * factors[activity_level];

  const calorie_goal = Math.round(
    goal === 'lose' ? tdee - 500 : goal === 'gain' ? tdee + 250 : tdee,
  );
  // Recomp needs highest protein (2.6g/kg per research); gain/lose use 2.0g/kg; maintain uses 1.6g/kg
  const protein_per_kg = goal === 'recomp' ? 2.6 : goal === 'maintain' ? 1.6 : 2.0;
  const protein_goal = Math.round(weight_kg * protein_per_kg);
  // Recomp lowers fat floor slightly (0.7g/kg) to fit higher protein within maintenance calories
  const fat_g = Math.round(weight_kg * (goal === 'recomp' ? 0.7 : 0.8));
  const carb_goal = Math.max(
    50,
    Math.round((calorie_goal - protein_goal * 4 - fat_g * 9) / 4),
  );

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), protein_goal, calorie_goal, carb_goal };
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',  label: 'Sedentary',         desc: 'Desk job, no exercise' },
  { value: 'light',      label: 'Lightly Active',    desc: '1–3 days/week' },
  { value: 'moderate',   label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'active',     label: 'Very Active',       desc: '6–7 days/week' },
  { value: 'very_active',label: 'Athlete',           desc: '2× daily training' },
];

const GOAL_OPTIONS: { value: GoalType; label: string; emoji: string }[] = [
  { value: 'lose',     label: 'Lose Weight',   emoji: '📉' },
  { value: 'maintain', label: 'Maintain',      emoji: '⚖️' },
  { value: 'gain',     label: 'Gain Muscle',   emoji: '💪' },
  { value: 'recomp',   label: 'Recomp',        emoji: '🔄' },
];

export default function GoalSettingModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();

  // Manual tab state
  const [protein, setProtein] = useState(String(user?.protein_goal ?? 150));
  const [calories, setCalories] = useState(String(user?.calorie_goal ?? 2000));
  const [carbs, setCarbs] = useState(String(user?.carb_goal ?? 200));
  const [saving, setSaving] = useState(false);

  // Tab
  const [tab, setTab] = useState<Tab>('manual');

  // Auto-calculate tab state (pre-fill from saved profile)
  const [age, setAge] = useState(String(user?.age ?? ''));
  const [weight, setWeight] = useState(String(user?.weight_kg ?? ''));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState(String(user?.height_cm ?? ''));
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [sex, setSex] = useState<Sex>((user?.sex as Sex) ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (user?.activity_level as ActivityLevel) ?? 'moderate',
  );
  const [goalType, setGoalType] = useState<GoalType>(
    (user?.goal_type as GoalType) ?? 'maintain',
  );
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [applying, setApplying] = useState(false);

  // Preferences tab state
  const [dietaryPref, setDietaryPref] = useState(user?.dietary_preference ?? 'non_vegetarian');
  const [foodDislikes, setFoodDislikes] = useState(user?.food_dislikes ?? '');
  const [savingPrefs, setSavingPrefs] = useState(false);

  if (!open) return null;

  // --- Manual tab handlers ---
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

  // --- Auto-calculate handlers ---
  const getWeightKg = () => {
    const val = parseFloat(weight);
    return weightUnit === 'lbs' ? val / 2.205 : val;
  };

  const getHeightCm = () => {
    if (heightUnit === 'ft') {
      const ft = parseFloat(heightFt) || 0;
      const inches = parseFloat(heightIn) || 0;
      return ft * 30.48 + inches * 2.54;
    }
    return parseFloat(height);
  };

  const handleCalculate = () => {
    const ageNum = parseInt(age);
    const weight_kg = getWeightKg();
    const height_cm = getHeightCm();
    if (!ageNum || !weight_kg || !height_cm) return;
    const result = calculateMacros(ageNum, weight_kg, height_cm, sex, activityLevel, goalType);
    setCalcResult(result);
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await api.put('/auth/me/profile', {
        dietary_preference: dietaryPref,
        food_dislikes: foodDislikes || null,
      });
      await refreshUser();
      onClose();
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleApply = async () => {
    if (!calcResult) return;
    setApplying(true);
    try {
      const weight_kg = getWeightKg();
      const height_cm = getHeightCm();
      await api.put('/auth/me/profile', {
        age: parseInt(age),
        weight_kg,
        height_cm,
        sex,
        activity_level: activityLevel,
        goal_type: goalType,
        protein_goal: calcResult.protein_goal,
        calorie_goal: calcResult.calorie_goal,
        carb_goal: calcResult.carb_goal,
      });
      await refreshUser();
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm my-auto shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-semibold">Set Daily Goals</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-5 mt-4 rounded-lg bg-gray-100 p-1">
          {(['manual', 'auto', 'preferences'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'manual' ? 'Manual' : t === 'auto' ? 'Auto-Calc' : 'Preferences'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* ── MANUAL TAB ── */}
          {tab === 'manual' && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protein Goal (g)</label>
                  <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
                    className="input" min="0" inputMode="numeric" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calorie Goal</label>
                  <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
                    className="input" min="0" inputMode="numeric" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carb Goal (g)</label>
                  <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                    className="input" min="0" inputMode="numeric" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save Goals'}
              </button>
            </>
          )}

          {/* ── PREFERENCES TAB ── */}
          {tab === 'preferences' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preference</label>
                <div className="flex gap-2">
                  {[
                    { value: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
                    { value: 'vegan', label: 'Vegan', emoji: '🌱' },
                    { value: 'non_vegetarian', label: 'Non-Veg', emoji: '🍗' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDietaryPref(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        dietaryPref === opt.value
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={foodDislikes}
                  onChange={(e) => setFoodDislikes(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. avoid mushrooms, prefer Indian food, lactose intolerant, low sodium, high fibre"
                />
                <p className="text-xs text-gray-400 mt-1">Any dietary notes or preferences for the AI</p>
              </div>

              <button onClick={handleSavePreferences} disabled={savingPrefs} className="btn-primary w-full">
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </button>
            </>
          )}

          {/* ── AUTO-CALCULATE TAB ── */}
          {tab === 'auto' && (
            <>
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age (years)</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="input" min="10" max="100" inputMode="numeric" placeholder="e.g. 25" />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <div className="flex gap-2">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="input flex-1" min="0" step="0.1" inputMode="decimal"
                    placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'} />
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    {(['kg', 'lbs'] as const).map((u) => (
                      <button key={u} onClick={() => setWeightUnit(u)}
                        className={`px-3 py-2 text-sm font-medium ${weightUnit === u ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <div className="flex gap-2">
                  {heightUnit === 'cm' ? (
                    <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                      className="input flex-1" min="0" inputMode="decimal" placeholder="e.g. 175" />
                  ) : (
                    <div className="flex gap-1 flex-1">
                      <input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
                        className="input flex-1" min="0" inputMode="numeric" placeholder="ft" />
                      <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
                        className="input flex-1" min="0" max="11" inputMode="numeric" placeholder="in" />
                    </div>
                  )}
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    {(['cm', 'ft'] as const).map((u) => (
                      <button key={u} onClick={() => setHeightUnit(u)}
                        className={`px-3 py-2 text-sm font-medium ${heightUnit === u ? 'bg-primary-600 text-white' : 'text-gray-600'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biological Sex</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as Sex[]).map((s) => (
                    <button key={s} onClick={() => setSex(s)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        sex === s ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-600'
                      }`}>
                      {s === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
                <div className="space-y-1.5">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setActivityLevel(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        activityLevel === opt.value
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-gray-200 text-gray-600'
                      }`}>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-gray-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">My Goal</label>
                <div className="flex gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setGoalType(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        goalType === opt.value
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-gray-200 text-gray-600'
                      }`}>
                      <span className="text-lg">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate button */}
              <button onClick={handleCalculate} className="btn-primary w-full">
                Calculate My Goals
              </button>

              {/* Results panel */}
              {calcResult && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gray-500 text-center">
                    BMR: <span className="font-semibold text-gray-700">{calcResult.bmr} cal</span>
                    {' · '}
                    TDEE: <span className="font-semibold text-gray-700">{calcResult.tdee} cal</span>
                  </p>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 text-center">
                      Recommended Daily Targets
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <p className="text-lg font-bold text-green-600">{calcResult.protein_goal}g</p>
                        <p className="text-xs text-gray-500">Protein</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <p className="text-lg font-bold text-amber-600">{calcResult.calorie_goal}</p>
                        <p className="text-xs text-gray-500">Calories</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-200">
                        <p className="text-lg font-bold text-blue-600">{calcResult.carb_goal}g</p>
                        <p className="text-xs text-gray-500">Carbs</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleApply} disabled={applying} className="btn-primary w-full">
                    {applying ? 'Applying...' : 'Apply These Goals'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
