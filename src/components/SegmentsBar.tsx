import type { Segment, SegmentType } from '@/types/models';
import clsx from 'clsx';
import { formatDuration } from '@/lib/time';

interface SegmentsBarProps {
  segments: Segment[];
  totalDurationMs: number;
  currentPhase: SegmentType | null;
}

export function SegmentsBar({ segments, totalDurationMs, currentPhase }: SegmentsBarProps) {
  const finalizedTotal = segments.reduce((acc, s) => acc + s.durationMs, 0);
  const liveDuration = Math.max(0, totalDurationMs - finalizedTotal);

  const pieces: Array<{ key: string; type: SegmentType; durationMs: number; active?: boolean }> = [
    ...segments.map((s, idx) => ({
      key: `${s.seq}-${s.startAt}`,
      type: s.type,
      durationMs: s.durationMs,
      active: idx === segments.length - 1 && s.type === currentPhase
    }))
  ];

  if (currentPhase && liveDuration > 0) {
    pieces.push({ key: `live-${pieces.length + 1}`, type: currentPhase, durationMs: liveDuration, active: true });
  }

  return (
    <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-800 select-none">
      {pieces.length === 0 ? (
        <div className="h-full w-0 rounded-full" />
      ) : (
        pieces.map((p) => {
          const width = `${(p.durationMs / Math.max(totalDurationMs, 1)) * 100}%`;
          const label = `${Math.round(p.durationMs / 1000)}s`;
          return (
            <div
              key={p.key}
              className={clsx(
                'relative flex h-full items-center justify-center overflow-hidden transition-[width] duration-1000 ease-linear',
                p.type === 'stim' ? 'bg-stim' : 'bg-rest',
                p.active && 'saturate-[1.25] brightness-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
              )}
              style={{ width }}
              title={`${p.type === 'stim' ? '刺激' : '休息'}: ${formatDuration(p.durationMs)} (${Math.round(
                p.durationMs / 1000
              )}s)`}
            >
              <span
                className={clsx(
                  'pointer-events-none select-none whitespace-nowrap px-1 text-[10px] leading-none',
                  p.type === 'stim' ? 'text-emerald-50/90' : 'text-amber-950/80'
                )}
              >
                {label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
