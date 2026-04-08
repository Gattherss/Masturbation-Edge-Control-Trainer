import { useMemo } from "react";
import { STRINGS } from "@/constants/strings";
import { listSessions } from "@/data/repositories/sessionRepo";
import type { Session } from "@/types/models";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function toWeeklyMinutes(sessions: Session[], weeks = 8) {
  const map = new Map<string, number>();
  sessions.forEach((session) => {
    const ts = Date.parse(session.startAt);
    if (!Number.isFinite(ts)) return;
    const weekStart = startOfWeek(new Date(ts));
    const key = weekStart.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + session.durationMs / 60000);
  });

  const results: { weekLabel: string; minutes: number }[] = [];
  let cursor = startOfWeek(new Date());
  for (let i = 0; i < weeks; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const minutes = Math.round(map.get(key) ?? 0);
    const label = `${cursor.getMonth() + 1}/${cursor.getDate()}`;
    results.unshift({ weekLabel: label, minutes });
    cursor.setDate(cursor.getDate() - 7);
  }

  return results;
}

export function WeeklyMinutes() {
  const data = useMemo(() => toWeeklyMinutes(listSessions(), 8), []);
  const hasActivity = data.some((item) => item.minutes > 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
      <h3 className="text-sm font-semibold text-white">{STRINGS.charts.weeklyMinutesTitle}</h3>
      {!hasActivity ? (
        <p className="mt-2 text-xs">{STRINGS.charts.weeklyMinutesEmpty}</p>
      ) : (
        <div className="mt-3 h-48">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="weekLabel" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="minutes" fill="#22c55e" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} animationBegin={150} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}