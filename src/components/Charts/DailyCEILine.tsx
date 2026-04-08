import { useMemo } from "react";
import { STRINGS } from "@/constants/strings";
import { listSessions } from "@/data/repositories/sessionRepo";
import type { Session } from "@/types/models";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

function toDailyCEI(sessions: Session[], days = 28) {
  const map = new Map<string, { sum: number; count: number }>();
  sessions.forEach((session) => {
    const cei = session.metrics?.cei;
    if (typeof cei === "number") {
      const key = session.dateKey;
      const prev = map.get(key) ?? { sum: 0, count: 0 };
      prev.sum += cei;
      prev.count += 1;
      map.set(key, prev);
    }
  });

  const entries = Array.from(map.entries()).map(([dateKey, value]) => ({
    dateKey,
    cei: Math.round(value.sum / value.count)
  }));
  entries.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  return entries.slice(-days);
}

export function DailyCEILine() {
  const data = useMemo(() => toDailyCEI(listSessions(), 28), []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
      <h3 className="text-sm font-semibold text-white">{STRINGS.charts.dailyCEITitle}</h3>
      {data.length === 0 ? (
        <p className="mt-2 text-xs">{STRINGS.charts.dailyCEIEmpty}</p>
      ) : (
        <div className="mt-3 h-48">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="dateKey" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line dataKey="cei" stroke="#60a5fa" isAnimationActive animationDuration={600} animationBegin={120} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}