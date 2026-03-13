"use client";

interface ScoreBarProps {
  score: number; // 0–1
  showValue?: boolean;
}

export function ScoreBar({ score, showValue = false }: ScoreBarProps) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
        ? "bg-amber-400"
        : "bg-gray-300";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-gray-500 w-8 text-right">{pct}</span>
      )}
    </div>
  );
}
