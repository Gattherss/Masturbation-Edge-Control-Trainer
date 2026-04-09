import type { Baseline, Plan, PublicProfile, Session, Settings, SyncState } from '@/types/models';
import { formatDuration } from '@/lib/time';
import { sessionsToCSV, segmentsToCSV } from '@/data/exporters/csv';
import { toDataJSON } from '@/data/exporters/json';
import { downloadText } from '@/lib/download';
import { importDataJSON } from '@/data/importers/json';
import { importSessionsAndSegmentsCSV } from '@/data/importers/csv';
import { useMemo, useRef, useState } from 'react';

interface Props {
  sessions: Session[];
  settings: Settings;
  baseline: Baseline | null;
  currentPlan: Plan;
  profile?: PublicProfile;
  syncState?: SyncState;
  onDataChanged?: () => void;
  limit?: number;
  title?: string;
  showTransferTools?: boolean;
}

type SortKey = 'time_desc' | 'time_asc' | 'cei_desc' | 'stim_desc' | 'rest_desc' | 'dur_desc';

export default function SessionsDetailsTable({
  sessions,
  settings,
  baseline,
  currentPlan,
  profile,
  syncState,
  onDataChanged,
  limit = 10,
  title = '详细数据',
  showTransferTools = true
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('time_desc');
  const [onlyMonth, setOnlyMonth] = useState<boolean>(false);
  const [ejFilter, setEjFilter] = useState<'any'|'yes'|'no'>('any');
  const [report, setReport] = useState<string | null>(null);
  const inputCsvRef = useRef<HTMLInputElement>(null);
  const inputJsonRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const all = onlyMonth ? sessions.filter((s) => {
      const d = new Date(s.startAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }) : sessions;
    return all.filter((s) => ejFilter === 'any' ? true : s.ejaculated === (ejFilter==='yes'));
  }, [sessions, onlyMonth, ejFilter]);

  const rows = useMemo(() => {
    const withAgg = filtered.map((s) => {
      const stimMs = s.segments.filter((x) => x.type==='stim').reduce((a,x)=>a+x.durationMs,0);
      const restMs = s.segments.filter((x) => x.type==='rest').reduce((a,x)=>a+x.durationMs,0);
      const cei = s.metrics?.cei ?? null;
      return { s, stimMs, restMs, cei };
    });
    const sorted = [...withAgg].sort((a,b)=>{
      switch(sortKey){
        case 'time_asc': return Date.parse(a.s.startAt)-Date.parse(b.s.startAt);
        case 'cei_desc': return (b.cei??-Infinity)-(a.cei??-Infinity);
        case 'stim_desc': return b.stimMs-a.stimMs;
        case 'rest_desc': return b.restMs-a.restMs;
        case 'dur_desc': return b.s.durationMs-a.s.durationMs;
        case 'time_desc': default: return Date.parse(b.s.startAt)-Date.parse(a.s.startAt);
      }
    });
    return sorted.slice(0, limit);
  }, [filtered, sortKey, limit]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center justify-between gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-slate-400 sm:justify-start sm:rounded sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">范围
            <select className="rounded border border-slate-700 bg-slate-900 px-2 py-1" value={onlyMonth? 'month':'all'} onChange={(e)=> setOnlyMonth(e.target.value==='month')}>
              <option value="all">全部</option>
              <option value="month">本月</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-slate-400 sm:justify-start sm:rounded sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">筛选
            <select className="rounded border border-slate-700 bg-slate-900 px-2 py-1" value={ejFilter} onChange={(e)=> setEjFilter(e.target.value as any)}>
              <option value="any">任意</option>
              <option value="yes">已射精</option>
              <option value="no">未射精</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-slate-400 sm:justify-start sm:rounded sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">排序
            <select className="rounded border border-slate-700 bg-slate-900 px-2 py-1" value={sortKey} onChange={(e)=> setSortKey(e.target.value as SortKey)}>
              <option value="time_desc">时间 ↓</option>
              <option value="time_asc">时间 ↑</option>
              <option value="cei_desc">CEI ↓</option>
              <option value="stim_desc">刺激时长 ↓</option>
              <option value="rest_desc">休息时长 ↓</option>
              <option value="dur_desc">总时长 ↓</option>
            </select>
          </label>
          <button
            className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 sm:rounded sm:px-2 sm:py-1"
            onClick={() => {
              const now = new Date();
              const monthSessions = sessions.filter((s)=>{ const d = new Date(s.startAt); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); });
              if(monthSessions.length===0){ setReport('本月暂无数据'); return; }
              const byDay = new Map<string, { ceiSum:number; ceiCount:number; dur:number }>();
              monthSessions.forEach(s=>{
                const d = s.dateKey; const m=s.metrics?.cei; const e = byDay.get(d) ?? { ceiSum:0, ceiCount:0, dur:0 };
                if(typeof m==='number'){ e.ceiSum += m; e.ceiCount += 1; }
                e.dur += s.durationMs; byDay.set(d,e);
              });
              const entries = Array.from(byDay.entries()).map(([day,v])=>({day, avg: v.ceiCount? v.ceiSum/v.ceiCount : 0, dur:v.dur}));
              const avgMonth = entries.reduce((a,b)=>a+b.avg,0)/entries.length;
              entries.sort((a,b)=> b.avg-a.avg);
              const best = entries[0];
              const above = entries.filter(x=> x.avg>avgMonth).map(x=> x.day);
              setReport(`本月最佳：${best.day}（CEI ${Math.round(best.avg)}）；高于月均的日期：${above.join('，')||'无'}`);
            }}
            type="button"
          >
            每月评估
          </button>
          {showTransferTools ? (
            <>
              <button
                className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 sm:rounded sm:px-2 sm:py-1"
                onClick={() => downloadText(sessionsToCSV(sessions), `sessions_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv')}
                type="button"
              >
                导出训练 CSV（全部）
              </button>
              <button
                className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 sm:rounded sm:px-2 sm:py-1"
                onClick={() => downloadText(segmentsToCSV(sessions), `segments_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv')}
                type="button"
              >
                导出分段 CSV（全部）
              </button>
              <button
                className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700 sm:rounded sm:px-2 sm:py-1"
                onClick={() =>
                  downloadText(
                    JSON.stringify(
                      toDataJSON('v1', currentPlan, settings, baseline, sessions, profile, syncState),
                      null,
                      2
                    ),
                    `data_${new Date().toISOString().slice(0, 10)}.json`,
                    'application/json'
                  )
                }
                type="button"
              >
                导出 JSON（全部）
              </button>
              <button
                className="rounded-lg bg-emerald-600/80 px-3 py-2 text-emerald-950 hover:bg-emerald-500 sm:rounded sm:px-2 sm:py-1"
                type="button"
                onClick={() => inputCsvRef.current?.click()}
              >导入 CSV</button>
              <button
                className="rounded-lg bg-emerald-600/80 px-3 py-2 text-emerald-950 hover:bg-emerald-500 sm:rounded sm:px-2 sm:py-1"
                type="button"
                onClick={() => inputJsonRef.current?.click()}
              >导入 JSON</button>
              <input
                ref={inputCsvRef}
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  try {
                    const result = await importSessionsAndSegmentsCSV(files as File[]);
                    setReport(`CSV 导入完成：新增/更新 ${result.sessions} 条训练，分段 ${result.segments} 条。`);
                    onDataChanged?.();
                  } catch (error) {
                    setReport(
                      error instanceof Error ? `CSV 导入失败：${error.message}` : 'CSV 导入失败。'
                    );
                  }

                  e.currentTarget.value = '';
                }}
              />
              <input
                ref={inputJsonRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const text = await file.text();
                    const result = importDataJSON(JSON.parse(text));
                    setReport(
                      `JSON 导入完成：新增 ${result.added} 条，更新 ${result.updated} 条，跳过 ${result.skipped} 条。`
                    );
                    onDataChanged?.();
                  } catch (error) {
                    setReport(
                      error instanceof Error ? `JSON 导入失败：${error.message}` : 'JSON 导入失败。'
                    );
                  }

                  e.currentTarget.value = '';
                }}
              />
            </>
          ) : null}
        </div>
      </div>
      {report ? <p className="mt-2 text-xs text-slate-300">{report}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">暂无数据</p>
      ) : (
        <>
        <div className="mt-3 space-y-3 md:hidden">
          {rows.map(({ s, stimMs, restMs }, idx) => {
            const prev = rows[idx + 1]?.s;
            const delta = prev ? s.durationMs - prev.durationMs : 0;

            return (
              <article key={s.id} className="rounded-[22px] border border-slate-800 bg-black/20 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{new Date(s.startAt).toLocaleDateString()}</div>
                    <div className="mt-1 text-xs text-slate-400">{new Date(s.startAt).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{formatDuration(s.durationMs)}</div>
                    <div className={"mt-1 text-xs " + (delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-amber-300' : 'text-slate-500')}>
                      {delta === 0 ? '持平' : `${delta > 0 ? '+' : ''}${Math.round(delta / 1000)}s`}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="text-slate-500">刺激</div>
                    <div className="mt-1 text-sm font-medium text-white">{formatDuration(stimMs)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="text-slate-500">休息</div>
                    <div className="mt-1 text-sm font-medium text-white">{formatDuration(restMs)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="text-slate-500">CEI</div>
                    <div className="mt-1 text-sm font-medium text-white">{s.metrics ? Math.round(s.metrics.cei) : '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="text-slate-500">结果</div>
                    <div className="mt-1 text-sm font-medium text-white">{s.ejaculated ? '已射精' : '未射精'}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.segments.map((seg) => (
                    <span
                      key={`${seg.seq}-${seg.startAt}`}
                      className={
                        'rounded-full px-2.5 py-1 text-[11px] ' +
                        (seg.type === 'stim'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-400/15 text-amber-300')
                      }
                    >
                      {seg.type === 'stim' ? '刺激' : '休息'} {Math.round(seg.durationMs / 1000)}s
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-3 hidden max-h-96 overflow-auto md:block">
          <table className="w-full table-fixed border-collapse text-xs text-slate-300">
            <thead className="sticky top-0 bg-slate-900/80 text-slate-400">
              <tr>
                <th className="w-32 p-2 text-left">时间</th>
                <th className="w-16 p-2 text-right">总时长</th>
                <th className="w-14 p-2 text-right">Δ时长</th>
                <th className="w-28 p-2 text-right">刺激</th>
                <th className="w-28 p-2 text-right">休息</th>
                <th className="w-14 p-2 text-right">CEI</th>
                <th className="p-2 text-left">分段</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, stimMs, restMs }, idx) => {
                const prev = rows[idx + 1]?.s;
                const delta = prev ? s.durationMs - prev.durationMs : 0;
                return (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="p-2 text-slate-400">{new Date(s.startAt).toLocaleString()}</td>
                    <td className="p-2 text-right">{formatDuration(s.durationMs)}</td>
                    <td className={"p-2 text-right " + (delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-amber-300' : 'text-slate-400')}>
                      {delta === 0 ? '0s' : `${delta > 0 ? '+' : ''}${Math.round(delta / 1000)}s`}
                    </td>
                    <td className="p-2 text-right">
                      {formatDuration(stimMs)} ({Math.round(stimMs / 1000)}s)
                    </td>
                    <td className="p-2 text-right">
                      {formatDuration(restMs)} ({Math.round(restMs / 1000)}s)
                    </td>
                    <td className="p-2 text-right">{s.metrics ? Math.round(s.metrics.cei) : '-'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {s.segments.map((seg) => (
                          <span
                            key={`${seg.seq}-${seg.startAt}`}
                            className={
                              'rounded px-1.5 py-0.5 text-[10px] ' +
                              (seg.type === 'stim'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-400/15 text-amber-300')
                            }
                            title={`${seg.type === 'stim' ? '刺激' : '休息'} ${formatDuration(seg.durationMs)}`}
                          >
                            {seg.type === 'stim' ? 'S' : 'R'} {Math.round(seg.durationMs / 1000)}s
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
