import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Save,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWeeklyMealPlan } from '../hooks/useWeeklyMealPlan';
import { MealPlanMeal, WeeklyDayPlan, ConversationMessage } from '../types';

// ---- helpers ----

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}`;
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🍱',
  dinner: '🌙',
  snack: '🍎',
};

// ---- sub-components ----

function MealRow({ meal }: { meal: MealPlanMeal }) {
  const [tipOpen, setTipOpen] = useState(false);
  const emoji = MEAL_EMOJI[meal.meal_type] ?? '🍽️';

  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm capitalize text-gray-800">
          {emoji} {meal.meal_type}
        </span>
        <span className="text-xs text-gray-500">
          {meal.meal_protein.toFixed(0)}g P · {meal.meal_calories.toFixed(0)} cal
        </span>
      </div>
      {meal.items.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-gray-700">{item.food}</span>
          <span className="text-gray-400 ml-2 shrink-0">{item.quantity}</span>
        </div>
      ))}
      {meal.meal_tip && (
        <div>
          <button
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
            onClick={() => setTipOpen(o => !o)}
          >
            💡 Tip {tipOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {tipOpen && <p className="text-xs text-amber-700 mt-1">{meal.meal_tip}</p>}
        </div>
      )}
    </div>
  );
}

function DayPanel({ dayPlan }: { dayPlan: WeeklyDayPlan }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-500 px-1">
        <span>Target summary</span>
        <span>
          {dayPlan.day_summary.total_protein.toFixed(0)}g P ·{' '}
          {dayPlan.day_summary.total_calories.toFixed(0)} cal ·{' '}
          {dayPlan.day_summary.total_carbs.toFixed(0)}g C
        </span>
      </div>
      {dayPlan.meal_plan.map((meal, i) => (
        <MealRow key={i} meal={meal} />
      ))}
      {dayPlan.nutritionist_note && (
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          💬 {dayPlan.nutritionist_note}
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  history,
  isRefining,
  onSend,
}: {
  history: ConversationMessage[];
  isRefining: boolean;
  onSend: (prompt: string) => void;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isRefining) return;
    onSend(trimmed);
    setInput('');
  };

  const placeholders = [
    'Make Tuesday dinner lower calorie',
    'Add more protein to Wednesday breakfast',
    'Replace all snacks with fruit options',
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Sparkles size={16} className="text-primary-500" />
        <span className="font-semibold text-sm text-gray-800">Refine Your Plan</span>
      </div>

      {history.length === 0 ? (
        <div className="px-4 py-5 text-center space-y-2">
          <p className="text-xs text-gray-400">
            Ask the AI to adjust any part of the plan. Examples:
          </p>
          {placeholders.map((p, i) => (
            <button
              key={i}
              className="block w-full text-left text-xs text-primary-600 hover:text-primary-700 px-3 py-1.5 bg-primary-50 rounded-lg"
              onClick={() => {
                setInput(p);
              }}
            >
              "{p}"
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 max-h-56 overflow-y-auto space-y-3">
          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isRefining && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
          placeholder="e.g. Make Monday lunch higher protein..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isRefining}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isRefining}
          className="bg-primary-500 text-white rounded-xl px-3 py-2 disabled:opacity-40 hover:bg-primary-600 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ---- main page ----

export default function WeeklyMealPlanPage() {
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState(0);
  const {
    plan,
    conversationHistory,
    isGenerating,
    isRefining,
    isSaving,
    error,
    generatePlan,
    loadSavedPlan,
    refinePlan,
    savePlan,
  } = useWeeklyMealPlan();

  const weekStart = toISODate(currentMonday);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Try to load saved plan when week changes
  useEffect(() => {
    loadSavedPlan(weekStart);
    setActiveDay(0);
  }, [weekStart, loadSavedPlan]);

  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };

  const activeDayPlan = plan?.plan[activeDay] ?? null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Meal Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan and refine your week's meals</p>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
        <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-sm text-gray-800">{formatWeekRange(currentMonday)}</p>
          <p className="text-xs text-gray-400">
            {plan?.saved ? '✅ Saved' : plan ? '● Unsaved changes' : 'No plan yet'}
          </p>
        </div>
        <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Action bar */}
      <div className="flex gap-2">
        <button
          onClick={() => generatePlan(weekStart)}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-60 hover:bg-primary-600 transition-colors"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Generating…
            </>
          ) : plan ? (
            <>
              <RefreshCw size={16} />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Week Plan
            </>
          )}
        </button>
        {plan && (
          <button
            onClick={savePlan}
            disabled={isSaving || plan.saved}
            className="flex items-center gap-1.5 bg-green-500 text-white rounded-xl px-4 py-3 font-semibold text-sm disabled:opacity-50 hover:bg-green-600 transition-colors"
          >
            <Save size={16} />
            {isSaving ? 'Saving…' : plan.saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!plan && !isGenerating && (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">📅</div>
          <p className="text-gray-500 text-sm">No plan for this week yet.</p>
          <p className="text-gray-400 text-xs">Click "Generate Week Plan" to get started.</p>
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center space-y-3">
          <div className="flex justify-center">
            <Sparkles size={32} className="text-primary-400 animate-pulse" />
          </div>
          <p className="font-semibold text-gray-700">Crafting your 7-day plan…</p>
          <p className="text-xs text-gray-400">This may take a moment</p>
        </div>
      )}

      {/* Plan view */}
      {plan && !isGenerating && (
        <>
          {/* Day tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {dayNames.map((name, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeDay === i
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Active day plan */}
          {activeDayPlan && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="font-bold text-gray-800 mb-3">{activeDayPlan.day}</h2>
              <DayPanel dayPlan={activeDayPlan} />
            </div>
          )}

          {/* Chat refinement panel */}
          <ChatPanel
            history={conversationHistory}
            isRefining={isRefining}
            onSend={refinePlan}
          />
        </>
      )}
    </div>
  );
}
