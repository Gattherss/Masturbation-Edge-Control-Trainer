import type { Session } from '@/types/models';
import { SegmentsBar } from './SegmentsBar';
import { formatDuration } from '@/lib/time';
import { useState } from 'react';

interface DayViewProps {
  dateKey: string;
  sessions: Session[];
  onSelect?: (session: Session) => void;
  onDelete?: (session: Session) => void;
}

export function DayView({ dateKey, sessions, onSelect, onDelete }: DayViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{dateKey}</h3>
        <p className="text-xs text-slate-500">共 {sessions.length} 场训练</p>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-[24px] border border-white/10 bg-black/25 p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>{new Date(session.startAt).toLocaleTimeString()}</span>
              <div className="flex items-center gap-2">
                <span>{formatDuration(session.durationMs)}</span>
                <button
                  type="button"
                  className="rounded-full bg-rose-500/20 px-2 py-1 text-rose-300 hover:bg-rose-500/30"
                  onClick={() => onDelete?.(session)}
                >
                  删除
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setExpandedId((prev) => (prev === session.id ? null : session.id));
                onSelect?.(session);
              }}
              className="mt-3 block w-full rounded-[20px] border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-white/15"
            >
              <div>
                <SegmentsBar
                  segments={session.segments}
                  totalDurationMs={session.durationMs}
                  currentPhase={null}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-400 sm:text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-stim" />
                  <span className="text-slate-300">刺激</span>
                  <span>
                    {formatDuration(
                      session.segments
                        .filter((s) => s.type === 'stim')
                        .reduce((acc, s) => acc + s.durationMs, 0)
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-rest" />
                  <span className="text-slate-300">休息</span>
                  <span>
                    {formatDuration(
                      session.segments
                        .filter((s) => s.type === 'rest')
                        .reduce((acc, s) => acc + s.durationMs, 0)
                    )}
                  </span>
                </div>
              </div>

              {expandedId === session.id ? (
                <div className="mt-3 flex flex-wrap gap-1 text-[10px] sm:text-xs">
                  {session.segments.map((seg, idx) => (
                    <span
                      key={`${seg.seq}-${seg.startAt}-${idx}`}
                      className={
                        'rounded-full px-2 py-1 ' +
                        (seg.type === 'stim'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-400/15 text-amber-300')
                      }
                      title={`${seg.type === 'stim' ? '刺激' : '休息'}: ${formatDuration(seg.durationMs)} (${Math.round(
                        seg.durationMs / 1000
                      )}s)`}
                    >
                      {seg.type === 'stim' ? '刺激' : '休息'} {Math.round(seg.durationMs / 1000)}s
                    </span>
                  ))}
                </div>
              ) : null}
              {session.metrics ? (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>CEI {session.metrics.cei}</span>
                  <span>{session.metrics.Hw ? Math.round(session.metrics.Hw * 100) : 0}% 命中</span>
                </div>
              ) : null}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
