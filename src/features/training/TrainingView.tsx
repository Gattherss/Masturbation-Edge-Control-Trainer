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
  const { state, elapsedMs, currentPhaseElapsedMs, restCountdown, pendingFinalize } = machine;

  const { plan, isRunning, isPaused, phase, segments, edges, usedPorn, ejaculated } = state;

  const statusLabel = (() => {
    if (pendingFinalize) {
      return '可以保存';
    }
    if (isRunning) {
      return phase === 'stim' ? '刺激阶段' : '休息阶段';
    }
    if (isPaused) {
      return '已暂停';
    }
    if (segments.length > 0) {
      return '可以结束';
    }
    return '待开始';
  })();

  const stimWindowLabel = `${plan.targetStim[0]}s ~ ${plan.targetStim[1]}s`;
  const restWindowLabel = `${plan.targetRest[0]}s ~ ${plan.targetRest[1]}s`;
  const phaseButtonLabel = phase === 'stim' ? '切到休息' : '切到刺激';

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/40 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl xl:p-7">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <header className="relative overflow-hidden rounded-[30px] border border-white/5 bg-black/40 p-6 shadow-2xl xl:p-8">
            <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-sky-500/10 blur-[80px] pointer-events-none" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">训练</p>
              <p className="mt-3 text-7xl font-semibold leading-none text-white sm:text-8xl xl:text-[6.5rem]">{formatDuration(elapsedMs)}</p>
              <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300">
                {statusLabel}
              </p>
            </div>
            <dl className="grid gap-2 text-right text-base text-slate-400 xl:text-lg">
              <div>
                <dt className="inline text-slate-500">刺激区间: </dt>
                <dd className="inline">{stimWindowLabel}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">休息区间: </dt>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">节律提示</p>
              <SuggestionTimer
                plan={{ stim: plan.targetStim, rest: plan.targetRest }}
                phase={phase}
                running={isRunning && !isPaused}
                currentPhaseElapsedMs={currentPhaseElapsedMs}
                restSuggestedSec={state.restSuggestedSec}
                restCountdown={restCountdown}
                restBeepEnabled={restBeepEnabled}
              />
              <p className="mt-3 text-base text-slate-400">边数：<span className="font-semibold text-white">{edges}</span></p>
            </div>

            <div className="rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl transition hover:bg-black/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">本局标记</p>
              <label className="mt-3 flex items-center gap-2 text-base text-slate-300">
                <input
                  type="checkbox"
                  checked={usedPorn}
                  onChange={(event) => machine.toggleUsedPorn(event.target.checked)}
                />
                使用成人视频
              </label>
              <p className="mt-4 text-base text-slate-400">
                是否射精：{' '}
                <span className={ejaculated ? 'text-rose-300' : 'text-slate-500'}>
                  {ejaculated ? '是' : '否'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-500/80">操作</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!isRunning && !isPaused && segments.length === 0 ? (
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-amber-200 via-slate-50 to-cyan-200 px-6 py-3 text-base font-semibold text-slate-950 transition hover:opacity-95"
                  onClick={machine.start}
                  aria-label="Start training"
                >
                  开始
                </button>
              ) : null}
              {isRunning ? (
                <>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-slate-200 transition hover:bg-white/10"
                    onClick={machine.switchPhase}
                    aria-label="Switch phase"
                  >
                    {phaseButtonLabel}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-slate-200 transition hover:bg-white/10"
                    onClick={machine.pause}
                  >
                    暂停
                  </button>
                </>
              ) : null}
              {isPaused ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-emerald-950 transition hover:bg-emerald-300"
                  onClick={machine.resume}
                >
                  继续
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full bg-amber-400 px-5 py-3 text-base font-semibold text-amber-950 transition hover:bg-amber-300"
                onClick={onFinish}
              >
                结束并保存
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-slate-200 transition hover:bg-white/10"
                onClick={machine.reset}
              >
                重置
              </button>
              <button
                type="button"
                className={clsx(
                  'rounded-full px-5 py-3 text-base font-semibold transition-colors',
                  ejaculated
                    ? 'bg-rose-500 text-rose-50 hover:bg-rose-400'
                    : 'bg-rose-500/25 text-rose-200 hover:bg-rose-500/35'
                )}
                aria-pressed={ejaculated}
                onClick={() => machine.toggleEjaculated(!ejaculated)}
              >
                {ejaculated ? '已标记射精' : '标记射精'}
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
  currentPhaseElapsedMs: number;
  restSuggestedSec: number;
  restCountdown: number | null;
  restBeepEnabled: boolean;
}) {
  const {
    plan,
    phase,
    running,
    currentPhaseElapsedMs,
    restSuggestedSec,
    restCountdown,
    restBeepEnabled
  } = props;
  const elapsedSec = running ? Math.floor(currentPhaseElapsedMs / 1000) : 0;

  const lastBucketRef = useRef<number>(-1);
  useEffect(() => {
    if (phase !== 'rest' || !running) {
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
  }, [phase, running, elapsedSec, restSuggestedSec, restBeepEnabled]);

  if (phase === 'rest') {
    return <p className="mt-2 text-base text-slate-400">建议休息：{restCountdown ?? '—'}s</p>;
  }

  const [stimMin, stimMax] = plan.stim;
  if (elapsedSec < stimMin) {
    return (
      <p className="mt-2 text-base text-slate-400">
        距离目标区间还有 {stimMin - elapsedSec}s
      </p>
    );
  }
  if (elapsedSec <= stimMax) {
    return (
      <p className="mt-2 text-base text-emerald-400">
        已进入目标区间，还可以继续 {stimMax - elapsedSec}s
      </p>
    );
  }
  return (
    <p className="mt-2 text-base text-amber-400">已经超出目标区间 {elapsedSec - stimMax}s</p>
  );
}
