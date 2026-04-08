import { useMemo } from "react";
import { STRINGS } from "@/constants/strings";
import { listSessions } from "@/data/repositories/sessionRepo";
import type { Session } from "@/types/models";

const DAY_LABELS = ["\u5468\u4e00", "\u5468\u4e8c", "\u5468\u4e09", "\u5468\u56db", "\u5468\u4e94", "\u5468\u516d", "\u5468\u65e5"];

function toHeatmap(sessions: Session[], days = 28) {
  const map = new Map<string, number>();
  sessions.forEach((session) => {
    const key = session.dateKey;
    map.set(key, (map.get(key) ?? 0) + session.durationMs / 60000);
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const cells: Array<{
    key: string;
    week: number;
    row: number;
    minutes: number;
    label: string;
  }> = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    const minutes = Math.round(map.get(key) ?? 0);
    const week = Math.floor(i / 7);
    const dayIndex = (date.getDay() + 6) % 7; // Monday first
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    cells.push({ key, week, row: dayIndex, minutes, label });
  }

  return cells;
}

function heatClass(minutes: number) {
  if (minutes >= 90) return "bg-emerald-500";
  if (minutes >= 60) return "bg-emerald-500/80";
  if (minutes >= 30) return "bg-emerald-400/70";
  if (minutes >= 10) return "bg-emerald-300/60";
  if (minutes > 0) return "bg-emerald-200/40";
  return "bg-slate-800/60";
}

export function DailyHeatmap28() {
  const cells = useMemo(() => toHeatmap(listSessions(), 28), []);
  const hasActivity = cells.some((cell) => cell.minutes > 0);
  const columns = Math.ceil(cells.length / 7);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
      <h3 className="text-sm font-semibold text-white">{STRINGS.charts.dailyHeatmapTitle}</h3>
      {!hasActivity ? (
        <p className="mt-2 text-xs">{STRINGS.charts.dailyHeatmapEmpty}</p>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-slate-800/60" />
              <span>0m</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-200/40" />
              <span>10m</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-400/70" />
              <span>30m</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              <span>90m+</span>
            </span>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {cells.map((cell) => (
              <div
                key={cell.key}
                className={`aspect-square rounded ${heatClass(cell.minutes)} relative`}
                style={{ gridColumn: cell.week + 1, gridRow: cell.row + 1 }}
                title={`${cell.label} · ${cell.minutes}m`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-col text-[10px] text-slate-500">
            {DAY_LABELS.map((label, index) => (
              <span key={label} className="leading-4">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}