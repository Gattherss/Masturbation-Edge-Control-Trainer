import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';
import { SegmentsBar } from '@/components/SegmentsBar';
import { formatDuration } from '@/lib/time';
import { beep } from '@/lib/beep';
import type { MachineResult } from './useTrainingMachine';

interface TrainingViewProps {
  machine: MachineResult;
  onFinish: () => void;
  restBeepEnabled: boolean;
}

interface MobileAction {
  label: string;
  onClick: () => void;
  tone: 'ghost' | 'warm' | 'danger';
  active?: boolean;
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

  const primaryMobileAction = useMemo(() => {
    if (!isRunning && !isPaused && segments.length === 0) {
      return {
        label: '开始训练',
        onClick: machine.start,
        tone: 'start' as const
      };
    }

    if (isPaused) {
      return {
        label: '继续训练',
        onClick: machine.resume,
        tone: 'resume' as const
      };
    }

    if (isRunning) {
      return {
        label: phaseButtonLabel,
        onClick: machine.switchPhase,
        tone: 'switch' as const
      };
    }

    return {
      label: '结束并保存',
      onClick: onFinish,
      tone: 'finish' as const
    };
  }, [isPaused, isRunning, machine.resume, machine.start, machine.switchPhase, onFinish, phaseButtonLabel, segments.length]);

  const mobileSecondaryActions = useMemo<MobileAction[]>(() => {
    const actions: MobileAction[] = [];

    if (isRunning) {
      actions.push({ label: '暂停', onClick: machine.pause, tone: 'ghost' });
    }

    if (segments.length > 0) {
      actions.push({ label: '结束保存', onClick: onFinish, tone: 'warm' });
      actions.push({ label: '重置', onClick: machine.reset, tone: 'ghost' });
    }

    if (isRunning || isPaused || segments.length > 0 || ejaculated) {
      actions.push({
        label: ejaculated ? '已标记射精' : '标记射精',
        onClick: () => machine.toggleEjaculated(!ejaculated),
        tone: 'danger',
        active: ejaculated
      });
    }

    return actions;
  }, [ejaculated, isPaused, isRunning, machine.pause, machine.reset, machine.toggleEjaculated, onFinish, segments.length]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/40 p-4 pb-[11.75rem] shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl md:rounded-[34px] md:p-5 md:pb-5 xl:p-7">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
      <div className="relative flex flex-col gap-4 md:gap-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] xl:gap-6">
          <header className="relative overflow-hidden rounded-[26px] border border-white/5 bg-black/40 p-4 shadow-2xl sm:p-5 xl:rounded-[30px] xl:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 -translate-y-1/3 translate-x-1/4 rounded-full bg-sky-500/10 blur-[70px] sm:h-64 sm:w-64 sm:-translate-y-1/2 sm:translate-x-1/3 sm:blur-[80px]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">训练</p>
                <p className="mt-3 text-5xl font-semibold leading-none text-white sm:text-7xl xl:text-[6.5rem]">
                  {formatDuration(elapsedMs)}
                </p>
                <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300">
                  {statusLabel}
                </p>
              </div>

              <dl className="grid gap-2 text-left text-sm text-slate-400 sm:text-right sm:text-base xl:text-lg">
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

          <div className="hidden gap-4 md:grid">
            <TrainingSupportCard title="节律提示" accent="text-sky-500/80">
              <SuggestionTimer
                plan={{ stim: plan.targetStim, rest: plan.targetRest }}
                phase={phase}
                running={isRunning && !isPaused}
                currentPhaseElapsedMs={currentPhaseElapsedMs}
                restSuggestedSec={state.restSuggestedSec}
                restCountdown={restCountdown}
                restBeepEnabled={restBeepEnabled}
              />
              <p className="mt-3 text-base text-slate-400">
                边数: <span className="font-semibold text-white">{edges}</span>
              </p>
            </TrainingSupportCard>

            <TrainingSupportCard title="本局标记" accent="text-sky-500/80">
              <label className="mt-3 flex items-center gap-2 text-base text-slate-300">
                <input
                  type="checkbox"
                  checked={usedPorn}
                  onChange={(event) => machine.toggleUsedPorn(event.target.checked)}
                />
                使用成人视频
              </label>
              <p className="mt-4 text-base text-slate-400">
                是否射精:{' '}
                <span className={ejaculated ? 'text-rose-300' : 'text-slate-500'}>
                  {ejaculated ? '是' : '否'}
                </span>
              </p>
            </TrainingSupportCard>
          </div>
        </div>

        <div
          className="md:hidden -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-swipe-lock="true"
        >
          <TrainingSupportCard
            title="节律提示"
            accent="text-sky-500/80"
            className="min-w-[82vw] snap-start p-4"
          >
            <SuggestionTimer
              plan={{ stim: plan.targetStim, rest: plan.targetRest }}
              phase={phase}
              running={isRunning && !isPaused}
              currentPhaseElapsedMs={currentPhaseElapsedMs}
              restSuggestedSec={state.restSuggestedSec}
              restCountdown={restCountdown}
              restBeepEnabled={restBeepEnabled}
            />
            <p className="mt-3 text-sm text-slate-400">
              边数: <span className="font-semibold text-white">{edges}</span>
            </p>
          </TrainingSupportCard>

          <TrainingSupportCard
            title="本局标记"
            accent="text-sky-500/80"
            className="min-w-[82vw] snap-start p-4"
          >
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={usedPorn}
                onChange={(event) => machine.toggleUsedPorn(event.target.checked)}
              />
              使用成人视频
            </label>
            <p className="mt-4 text-sm text-slate-400">
              是否射精:{' '}
              <span className={ejaculated ? 'text-rose-300' : 'text-slate-500'}>
                {ejaculated ? '是' : '否'}
              </span>
            </p>
          </TrainingSupportCard>
        </div>

        <div className="hidden rounded-[30px] border border-white/5 bg-black/30 p-6 shadow-2xl md:block">
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

      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.65rem)] z-40 md:hidden">
        <div
          className="pointer-events-auto rounded-[28px] border border-white/10 bg-slate-950/92 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          data-swipe-lock="true"
        >
          <button
            type="button"
            className={clsx(
              'w-full rounded-[22px] px-4 py-4 text-base font-semibold transition',
              primaryMobileAction.tone === 'start' && 'bg-gradient-to-r from-amber-200 via-slate-50 to-cyan-200 text-slate-950',
              primaryMobileAction.tone === 'resume' && 'bg-emerald-400 text-emerald-950',
              primaryMobileAction.tone === 'switch' && 'bg-white text-slate-950',
              primaryMobileAction.tone === 'finish' && 'bg-amber-400 text-amber-950'
            )}
            onClick={primaryMobileAction.onClick}
          >
            {primaryMobileAction.label}
          </button>

          {mobileSecondaryActions.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mobileSecondaryActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={clsx(
                    'min-w-fit flex-none snap-start rounded-full px-4 py-2.5 text-sm font-medium transition',
                    action.tone === 'ghost' && 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
                    action.tone === 'warm' && 'bg-amber-400 text-amber-950 hover:bg-amber-300',
                    action.tone === 'danger' &&
                      (action.active
                        ? 'bg-rose-500 text-rose-50 hover:bg-rose-400'
                        : 'bg-rose-500/25 text-rose-200 hover:bg-rose-500/35')
                  )}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TrainingSupportCard({
  title,
  accent,
  children,
  className
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('rounded-[26px] border border-white/5 bg-black/30 p-6 shadow-2xl transition hover:bg-black/40', className)}>
      <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.35em]', accent)}>{title}</p>
      {children}
    </div>
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
    return <p className="mt-2 text-sm text-slate-400 sm:text-base">建议休息: {restCountdown ?? '--'}s</p>;
  }

  const [stimMin, stimMax] = plan.stim;
  if (elapsedSec < stimMin) {
    return (
      <p className="mt-2 text-sm text-slate-400 sm:text-base">
        距离目标区间还有 {stimMin - elapsedSec}s
      </p>
    );
  }
  if (elapsedSec <= stimMax) {
    return (
      <p className="mt-2 text-sm text-emerald-400 sm:text-base">
        已进入目标区间，还可以继续 {stimMax - elapsedSec}s
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-amber-400 sm:text-base">已经超出目标区间 {elapsedSec - stimMax}s</p>
  );
}
