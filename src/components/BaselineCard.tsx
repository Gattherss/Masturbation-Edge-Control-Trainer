import type { Baseline } from '@/types/models';

interface BaselineDiff {
  cei: number;
  Hw: number;
  stimMinutes: number;
  rci: number;
}

interface BaselineCardProps {
  baseline: Baseline | null;
  comparison: BaselineDiff | null;
}

function formatDelta(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

export function BaselineCard({ baseline, comparison }: BaselineCardProps) {
  if (!baseline) {
    return (
      <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-slate-200">基准</h3>
        <p className="mt-2 text-xs leading-6 text-slate-400">保存首个训练后会自动创建基准。现在它只负责轻量即时对比，长期进步已经交给 mastery 锚点系统。</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">当前基准</h3>
          <p className="text-xs text-slate-500">
            {new Date(baseline.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <span className="rounded-full border border-indigo-300/15 bg-indigo-300/10 px-3 py-1 text-xs font-medium text-indigo-100">
          CEI {Math.round(baseline.metrics.cei)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
        <div>
          <dt className="text-slate-500">命中 Hw</dt>
          <dd className="font-semibold">{Math.round(baseline.metrics.Hw * 100)}%</dd>
          {comparison ? (
            <dd className={comparison.Hw >= 0 ? 'text-emerald-300' : 'text-amber-300'}>{formatDelta(comparison.Hw, '%')}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-slate-500">刺激分钟</dt>
          <dd className="font-semibold">{baseline.metrics.stimMinutes.toFixed(1)}m</dd>
          {comparison ? (
            <dd className={comparison.stimMinutes >= 0 ? 'text-emerald-300' : 'text-amber-300'}>{formatDelta(comparison.stimMinutes, 'm')}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-slate-500">RCI</dt>
          <dd className="font-semibold">
            {baseline.metrics.rci === null ? '—' : Math.round(baseline.metrics.rci * 100)}
          </dd>
          {comparison ? (
            <dd className={comparison.rci >= 0 ? 'text-emerald-300' : 'text-amber-300'}>{formatDelta(comparison.rci, '%')}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-slate-500">PDI</dt>
          <dd className="font-semibold">
            {baseline.metrics.pdi === null ? '—' : baseline.metrics.pdi.toFixed(2)}
          </dd>
        </div>
        {comparison ? (
          <div className={`col-span-2 mt-2 rounded-[18px] border px-3 py-2 ${comparison.cei >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
            CEI {formatDelta(comparison.cei)}
          </div>
        ) : null}
      </dl>
    </div>
  );
}
