import { useMemo, useState } from 'react';
import type { Session } from '@/types/models';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, LineChart, Line } from 'recharts';
import {
  buildDailyCeiSeries,
  buildDailyMinutesSeries,
  buildWeeklyMinutesSeries,
  filterSessions,
  getRecentSessionsFromList
} from '@/lib/sessionInsights';

type PornFilter = 'any' | 'yes' | 'no';
type EjFilter = 'any' | 'yes' | 'no';

interface TrendsPageProps {
  sessions: Session[];
  title?: string;
}

export default function TrendsPage({ sessions, title = '洞察与成就' }: TrendsPageProps) {
  const [days, setDays] = useState(28);
  const [porn, setPorn] = useState<PornFilter>('any');
  const [ej, setEj] = useState<EjFilter>('any');
  const [minMinutes, setMinMinutes] = useState(0);

  const filtered = useMemo(
    () => filterSessions(sessions, { porn, ej, minMinutes, days }),
    [sessions, porn, ej, minMinutes, days]
  );

  const weeksData = useMemo(() => buildWeeklyMinutesSeries(filtered, 8), [filtered]);
  const heatmapData = useMemo(() => buildDailyMinutesSeries(filtered, days), [filtered, days]);
  const ceiData = useMemo(() => buildDailyCeiSeries(filtered, days), [filtered, days]);
  const recentMini = useMemo(() => getRecentSessionsFromList(filtered, 5), [filtered]);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-400">筛选条件一旦变化，周图、日图和最近记录会一起响应，保持口径一致。</p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-400">
            {filtered.length} 条符合筛选
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm text-slate-300">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs">
            时间范围
            <select
              className="ml-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>近 7 天</option>
              <option value={28}>近 28 天</option>
              <option value={90}>近 90 天</option>
            </select>
          </label>
          <label className="text-xs">
            使用 Porn
            <select
              className="ml-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5"
              value={porn}
              onChange={(e) => setPorn(e.target.value as PornFilter)}
            >
              <option value="any">任意</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </label>
          <label className="text-xs">
            是否射精
            <select
              className="ml-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5"
              value={ej}
              onChange={(e) => setEj(e.target.value as EjFilter)}
            >
              <option value="any">任意</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </label>
          <label className="text-xs">
            时长阈值
            <input
              type="number"
              className="ml-2 w-24 rounded-full border border-white/10 bg-black/30 px-3 py-1.5"
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value || 0))}
            />
            分钟
          </label>
        </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
          <h3 className="text-sm font-semibold text-white">近 8 周时长</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer>
              <BarChart data={weeksData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="weekKey" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="minutes" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
          <h3 className="text-sm font-semibold text-white">近 {days} 天热力（分钟）</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer>
              <AreaChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dateKey" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area dataKey="minutes" stroke="#f59e0b" fill="#f59e0b55" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-white">近 {days} 天 CEI 平均</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer>
              <LineChart data={ceiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="dateKey" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line dataKey="cei" stroke="#60a5fa" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">最近 5 条</h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-300">
          {recentMini.length === 0 ? (
            <li className="text-slate-500">暂无记录</li>
          ) : (
            recentMini.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>{new Date(s.startAt).toLocaleString()}</span>
                <span>{Math.round(s.durationMs / 60000)}m</span>
                <span>{s.metrics ? `CEI ${s.metrics.cei}` : '未评分'}</span>
              </li>
            ))
          )}
        </ul>
        </div>
      </section>
    </div>
  );
}
