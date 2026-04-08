import clsx from 'clsx';
import type { MachineResult } from './useTrainingMachine';
import { SegmentsBar } from '@/components/SegmentsBar';
import { formatDuration } from '@/lib/time';
import { useEffect, useRef } from 'react';
import { beep } from '@/lib/beep';

interface TrainingViewProps {
  machine: MachineResult;
  onFinish: () => void;
  restBeepEnabled: boolean;
}

export function TrainingView({ machine, onFinish, restBeepEnabled }: TrainingViewProps) {
  const { state, elapsedMs, restCountdown, pendingFinalize } = machine;

  const { plan, isRunning, isPaused, phase, segments, edges, usedPorn, ejaculated } = state;

  const statusLabel = (() => {
    if (pendingFinalize) {
      return '待保存';
    }
    if (isRunning) {
      return phase === 'stim' ? '刺激阶段' : '休息阶段';
    }
    if (isPaused) {
      return '已暂停';
    }
    if (segments.length > 0) {
      return '可结束记录';
    }
    return '待机';
  })();

  const stimWindowLabel = `${plan.targetStim[0]}s ~ ${plan.targetStim[1]}s`;
  const restWindowLabel = `${plan.targetRest[0]}s ~ ${plan.targetRest[1]}s`;
  const phaseButtonLabel = phase === 'stim' ? '进入休息' : '进入刺激';

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/40 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <header className="relative overflow-hidden rounded-[30px] border border-white/5 bg-black/40 p-6 shadow-2xl">
            <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-sky-500/10 blur-[80px] pointer-events-none" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Training Core</p>
              <p className="mt-3 text-6xl font-semibold text-white sm:text-7xl">{formatDuration(elapsedMs)}</p>
              <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {statusLabel}
              </p>
            </div>
            <dl className="grid gap-2 text-right text-sm text-slate-400 sm:text-base">
              <div>
                <dt className="inline text-slate-500">刺激窗口：</dt>
                <dd className="inline">{stimWindowLabel}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">休息窗口：</dt>
                <dd className="inline">{restWindowLabel}</dd>
              </div>
            </dl>
            </div>

            <div className="mt-5">
              <SegmentsBar
                segments={segments}
                totalDurationMs={Math.max(elapsedMs, 1)}
                currentPhase={isRunning ? phase : null}
              />
            </div>
          </header>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl transition hover:bg-black/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">Pacing Guide</p>
              <SuggestionTimer
                plan={{ stim: plan.targetStim, rest: plan.targetRest }}
                phase={phase}
                running={isRunning && !isPaused}
                currentSegmentStart={state.currentSegmentStart}
                restSuggestedSec={state.restSuggestedSec}
                restCountdown={restCountdown}
                restBeepEnabled={restBeepEnabled}
              />
              <p className="mt-3 text-sm text-slate-400">寸止次数：<span className="font-semibold text-white">{edges}</span></p>
            </div>

            <div className="rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl transition hover:bg-black/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">Session Flags</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={usedPorn}
                  onChange={(event) => machine.toggleUsedPorn(event.target.checked)}
                />
                使用色情内容
              </label>
              <p className="mt-4 text-sm text-slate-400">
                是否射精：{' '}
                <span className={ejaculated ? 'text-rose-300' : 'text-slate-500'}>
                  {ejaculated ? '是' : '否'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">Main Controls</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!isRunning && !isPaused && segments.length === 0 ? (
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-amber-200 via-slate-50 to-cyan-200 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
                  onClick={machine.start}
                  aria-label="开始训练"
                >
                  开始训练
                </button>
              ) : null}
              {isRunning ? (
                <>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    onClick={machine.switchPhase}
                    aria-label="切换刺激或休息阶段"
                  >
                    {phaseButtonLabel}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                    onClick={machine.pause}
                  >
                    暂停
                  </button>
                </>
              ) : null}
              {isPaused ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                  onClick={machine.resume}
                >
                  继续
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
                onClick={onFinish}
              >
                结束并记录
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                onClick={machine.reset}
              >
                重置
              </button>
              <button
                type="button"
                className={clsx(
                  'rounded-full px-5 py-3 text-sm font-semibold transition-colors',
                  ejaculated
                    ? 'bg-rose-500 text-rose-50 hover:bg-rose-400'
                    : 'bg-rose-500/25 text-rose-200 hover:bg-rose-500/35'
                )}
                aria-pressed={ejaculated}
                onClick={() => machine.toggleEjaculated(!ejaculated)}
              >
                {ejaculated ? '已标记射精' : '本次射了'}
              </button>
            </div>
        </div>
      </div>
    </section>
  );
}

function SuggestionTimer(props: {
  plan: { stim: [number, number]; rest: [number, number] };
  phase: 'stim' | 'rest';
  running: boolean;
  currentSegmentStart: number | null;
  restSuggestedSec: number;
  restCountdown: number | null;
  restBeepEnabled: boolean;
}) {
  const {
    plan,
    phase,
    running,
    currentSegmentStart,
    restSuggestedSec,
    restCountdown,
    restBeepEnabled
  } = props;
  const now = Date.now();
  const elapsedSec =
    running && currentSegmentStart ? Math.floor((now - currentSegmentStart) / 1000) : 0;

  const lastBucketRef = useRef<number>(-1);
  useEffect(() => {
    if (phase !== 'rest' || !running || !currentSegmentStart) {
      lastBucketRef.current = -1;
      return;
    }
    if (!restBeepEnabled) return;
    const over = elapsedSec - restSuggestedSec;
    const bucket = over > 0 ? Math.floor(over / 60) : -1;
    if (bucket > lastBucketRef.current) {
      beep(120, 880 + bucket * 100, 'square');
      lastBucketRef.current = bucket;
    }
  }, [phase, running, currentSegmentStart, elapsedSec, restSuggestedSec, restBeepEnabled]);

  if (phase === 'rest') {
    return <p className="mt-2 text-sm text-slate-400">建议倒计时：{restCountdown ?? '—'}</p>;
  }

  const [stimMin, stimMax] = plan.stim;
  if (elapsedSec < stimMin) {
    return (
      <p className="mt-2 text-sm text-slate-400">
        建议倒计时：{stimMin - elapsedSec}s 达到目标窗口
      </p>
    );
  }
  if (elapsedSec <= stimMax) {
    return (
      <p className="mt-2 text-sm text-emerald-400">
        已在目标窗口，{stimMax - elapsedSec}s 后建议进入休息
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-amber-400">已超出 {elapsedSec - stimMax}s（超出目标窗口）</p>
  );
}
