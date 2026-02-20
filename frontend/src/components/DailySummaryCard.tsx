import { DailySummary } from '../types';

interface Props {
  summary: DailySummary;
}

export default function DailySummaryCard({ summary }: Props) {
  const proteinPct = Math.min(
    100,
    Math.round((summary.total_protein / summary.protein_goal) * 100)
  );
  const caloriePct = Math.min(
    100,
    Math.round((summary.total_calories / summary.calorie_goal) * 100)
  );
  const carbPct = Math.min(
    100,
    Math.round((summary.total_carbs / summary.carb_goal) * 100)
  );

  const proteinColor =
    proteinPct >= 100 ? 'text-primary-600' : 'text-gray-700';

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-lg">Daily Progress</h2>

      {/* Protein Ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#16a34a"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${proteinPct * 2.64} 264`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${proteinColor}`}>
              {Math.round(summary.total_protein)}
            </span>
            <span className="text-xs text-gray-500">
              / {summary.protein_goal}g
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Protein</span>
              <span className="text-gray-500">
                {Math.round(summary.total_protein)}g / {summary.protein_goal}g
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Calories</span>
              <span className="text-gray-500">
                {Math.round(summary.total_calories)} / {summary.calorie_goal}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${caloriePct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Carbs</span>
              <span className="text-gray-500">
                {Math.round(summary.total_carbs)}g / {summary.carb_goal}g
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${carbPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
