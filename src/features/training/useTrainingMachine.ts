import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Event, Plan, Segment, SessionDraft } from '@/types/models';
import { loadDraft, saveDraft } from '@/lib/storage';
import { loadSettings } from '@/lib/settings';
import { finalizeAndPersist, type TrainingSnapshot, type NotePayload } from '@/services/scoringPipeline';

type Phase = 'stim' | 'rest';

interface MachineOptions {
  plan: Plan;
}

interface MachineState {
  plan: Plan;
  phase: Phase;
  isRunning: boolean;
  isPaused: boolean;
  startAtIso: string | null;
  currentSegmentStart: number | null;
  segments: Segment[];
  events: Event[];
  accumulatedMs: number;
  edges: number;
  usedPorn: boolean;
  ejaculated: boolean;
  restSuggestedSec: number;
}

interface FinalizeHandle {
  snapshot: TrainingSnapshot;
  totalMs: number;
}

export interface MachineResult {
  state: MachineState;
  elapsedMs: number;
  currentPhaseElapsedMs: number;
  restCountdown: number | null;
  pendingFinalize: FinalizeHandle | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  switchPhase: () => void;
  reset: () => void;
  markEjaculation: () => void;
  toggleUsedPorn: (value: boolean) => void;
  toggleEjaculated: (value: boolean) => void;
  requestFinalize: () => FinalizeHandle | null;
  cancelFinalize: () => void;
  finalize: (note: NotePayload) => ReturnType<typeof finalizeAndPersist>;
}

function createEvent(sequence: number, type: Event['type'], timestamp: number): Event {
  return {
    seq: sequence,
    type,
    ts: new Date(timestamp).toISOString()
  };
}

function createSegment(
  sequence: number,
  type: Segment['type'],
  start: number,
  end: number,
  restSuggestedSec?: number
): Segment {
  return {
    seq: sequence,
    type,
    startAt: new Date(start).toISOString(),
    endAt: new Date(end).toISOString(),
    durationMs: Math.max(0, end - start),
    suggestedSec: type === 'rest' ? restSuggestedSec : undefined,
    hitTarget: undefined
  };
}

function computeElapsedMs(state: MachineState, now = Date.now()): number {
  const running =
    state.isRunning && !state.isPaused && typeof state.currentSegmentStart === 'number'
      ? now - state.currentSegmentStart
      : 0;
  return state.accumulatedMs + Math.max(0, running);
}

function toDraft(state: MachineState, elapsedMs: number): SessionDraft {
  return {
    id: state.startAtIso ?? new Date().toISOString(),
    startedAt: state.startAtIso ?? new Date().toISOString(),
    lastTouchedAt: new Date().toISOString(),
    phase: state.phase,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    edges: state.edges,
    segments: state.segments,
    events: state.events,
    usedPorn: state.usedPorn,
    ejaculated: state.ejaculated,
    elapsedMs,
    restCountdownSec: state.phase === 'rest' ? state.restSuggestedSec : null,
    plan: state.plan
  };
}

export function reviveDraft(plan: Plan, draft: SessionDraft | null): MachineState {
  if (!draft) {
    const defaultSettings = loadSettings();
    return {
      plan,
      phase: 'stim',
      isRunning: false,
      isPaused: false,
      startAtIso: null,
      currentSegmentStart: null,
      segments: [],
      events: [],
      accumulatedMs: 0,
      edges: 0,
      usedPorn: defaultSettings.defaultUsedPorn,
      ejaculated: false,
      restSuggestedSec: plan.targetRest[0]
    };
  }

  const resolvedPlan = draft.plan ?? plan;
  const finalizedMs = draft.segments.reduce((acc, seg) => acc + seg.durationMs, 0);
  const activeSegmentMs = draft.isRunning ? Math.max(0, draft.elapsedMs - finalizedMs) : 0;

  return {
    plan: resolvedPlan,
    phase: draft.phase,
    isRunning: draft.isRunning,
    isPaused: draft.isPaused,
    startAtIso: draft.startedAt,
    currentSegmentStart: draft.isRunning ? Date.now() - activeSegmentMs : null,
    segments: draft.segments,
    events: draft.events,
    accumulatedMs: draft.isRunning ? finalizedMs : draft.elapsedMs,
    edges: draft.edges,
    usedPorn: draft.usedPorn,
    ejaculated: draft.ejaculated,
    restSuggestedSec: resolvedPlan.targetRest[0]
  };
}

export function useTrainingMachine({ plan }: MachineOptions): MachineResult {
  const draft = useMemo(() => loadDraft(), []);
  const [state, setState] = useState<MachineState>(() => reviveDraft(plan, draft));
  const [elapsedMs, setElapsedMs] = useState(() => computeElapsedMs(reviveDraft(plan, draft)));
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [pendingFinalize, setPendingFinalize] = useState<FinalizeHandle | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const elapsedBucket = Math.floor(elapsedMs / 1000);
  const currentPhaseElapsedMs =
    state.isRunning && !state.isPaused ? Math.max(0, elapsedMs - state.accumulatedMs) : 0;

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      plan,
      restSuggestedSec: plan.targetRest[0]
    }));
  }, [plan]);

  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      const tick = () => {
        const nextElapsedMs = computeElapsedMs(state);
        setElapsedMs(nextElapsedMs);
        if (state.phase === 'rest' && state.currentSegmentStart) {
          const remainingMs =
            state.restSuggestedSec * 1000 - (Date.now() - state.currentSegmentStart);
          setRestCountdown(Math.max(0, Math.ceil(remainingMs / 1000)));
        } else {
          setRestCountdown(null);
        }

        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();

      return () => {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }

    setElapsedMs(computeElapsedMs(state));
    setRestCountdown(null);
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [
    state,
    state.isRunning,
    state.isPaused,
    state.phase,
    state.currentSegmentStart,
    state.restSuggestedSec
  ]);

  useEffect(() => {
    const draftState = toDraft(state, elapsedMs);
    if (!state.isRunning && state.segments.length === 0 && !pendingFinalize) {
      saveDraft(null);
    } else {
      saveDraft(draftState);
    }
  }, [state, elapsedBucket, pendingFinalize]);

  const finalizeCurrentSegment = useCallback(
    (targetState: MachineState, timestamp: number): MachineState => {
      if (!targetState.currentSegmentStart) {
        return targetState;
      }

      const duration = timestamp - targetState.currentSegmentStart;
      if (duration <= 0) {
        return targetState;
      }

      const nextSegment = createSegment(
        targetState.segments.length + 1,
        targetState.phase,
        targetState.currentSegmentStart,
        timestamp,
        targetState.phase === 'rest' ? targetState.restSuggestedSec : undefined
      );

      return {
        ...targetState,
        segments: [...targetState.segments, nextSegment],
        accumulatedMs: targetState.accumulatedMs + duration,
        currentSegmentStart: null,
        isRunning: false,
        isPaused: false
      };
    },
    []
  );

  const start = useCallback(() => {
    setState((prev) => {
      if (prev.isRunning) {
        return prev;
      }
      const now = Date.now();
      const startAtIso = prev.startAtIso ?? new Date(now).toISOString();
      const nextEdges = prev.phase === 'rest' ? prev.edges + 1 : prev.edges;
      return {
        ...prev,
        startAtIso,
        isRunning: true,
        isPaused: false,
        currentSegmentStart: now,
        restSuggestedSec:
          prev.phase === 'rest' ? prev.plan.targetRest[0] : prev.restSuggestedSec,
        edges: nextEdges,
        events: [
          ...prev.events,
          createEvent(
            prev.events.length + 1,
            prev.phase === 'rest' ? 'REST_START' : 'STIM_START',
            now
          )
        ]
      };
    });
  }, []);

  const pause = useCallback(() => {
    if (!state.isRunning || state.isPaused) {
      return;
    }
    const now = Date.now();
    setState((prev) => {
      const finalized = finalizeCurrentSegment(prev, now);
      return {
        ...finalized,
        isRunning: false,
        isPaused: true
      };
    });
  }, [state.isRunning, state.isPaused, finalizeCurrentSegment]);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.isRunning && !prev.isPaused) {
        return prev;
      }
      const now = Date.now();
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        currentSegmentStart: now,
        restSuggestedSec:
          prev.phase === 'rest' ? prev.plan.targetRest[0] : prev.plan.targetStim[0],
        events: [
          ...prev.events,
          createEvent(
            prev.events.length + 1,
            prev.phase === 'rest' ? 'REST_START' : 'STIM_START',
            now
          )
        ]
      };
    });
  }, []);

  const switchPhase = useCallback(() => {
    const now = Date.now();
    setState((prev) => {
      const finalized = finalizeCurrentSegment(prev, now);
      const newPhase = prev.phase === 'stim' ? 'rest' : 'stim';
      return {
        ...finalized,
        phase: newPhase,
        isRunning: true,
        isPaused: false,
        startAtIso: finalized.startAtIso ?? new Date(now).toISOString(),
        currentSegmentStart: now,
        restSuggestedSec:
          newPhase === 'rest' ? prev.plan.targetRest[0] : prev.plan.targetStim[0],
        edges: newPhase === 'rest' ? prev.edges + 1 : prev.edges,
        events: [
          ...prev.events,
          createEvent(
            prev.events.length + 1,
            newPhase === 'rest' ? 'REST_START' : 'STIM_START',
            now
          )
        ]
      };
    });
  }, [finalizeCurrentSegment]);

  const reset = useCallback(() => {
    setState(reviveDraft(plan, null));
    setElapsedMs(0);
    setRestCountdown(null);
    setPendingFinalize(null);
    saveDraft(null);
  }, [plan]);

  const markEjaculation = useCallback(() => {
    setState((prev) => {
      if (prev.ejaculated) {
        return prev;
      }
      const now = Date.now();
      return {
        ...prev,
        ejaculated: true,
        events: [...prev.events, createEvent(prev.events.length + 1, 'EJACULATION', now)]
      };
    });
  }, []);

  const toggleUsedPorn = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, usedPorn: value }));
  }, []);

  const toggleEjaculated = useCallback((value: boolean) => {
    setState((prev) => {
      if (prev.ejaculated === value) {
        return prev;
      }
      if (value) {
        const now = Date.now();
        return {
          ...prev,
          ejaculated: true,
          events: [...prev.events, createEvent(prev.events.length + 1, 'EJACULATION', now)]
        };
      }

      return {
        ...prev,
        ejaculated: false,
        events: prev.events.filter((event) => event.type !== 'EJACULATION')
      };
    });
  }, []);

  const requestFinalize = useCallback((): FinalizeHandle | null => {
    // Compute finalized snapshot from current state to avoid relying on
    // setState closure timing when determining handle/null.
    const now = Date.now();
    const finalized = finalizeCurrentSegment(state, now);
    const totalMs = finalized.accumulatedMs;
    const startAtIso = finalized.startAtIso ?? finalized.segments[0]?.startAt ?? null;
    if (!startAtIso || finalized.segments.length === 0 || totalMs <= 0) {
      return null;
    }

    const snapshot: TrainingSnapshot = {
      plan: finalized.plan,
      segments: finalized.segments,
      events: finalized.events,
      edges: finalized.edges,
      usedPorn: finalized.usedPorn,
      ejaculated: finalized.ejaculated,
      startAt: startAtIso,
      durationMs: totalMs
    };

    const handle: FinalizeHandle = { snapshot, totalMs };
    setState(finalized);
    setPendingFinalize(handle);
    return handle;
  }, [finalizeCurrentSegment, state]);

  const cancelFinalize = useCallback(() => {
    setPendingFinalize(null);
  }, []);

  const finalize = useCallback(
    (note: NotePayload) => {
      const handle = pendingFinalize ?? requestFinalize();
      if (!handle) {
        throw new Error('当前没有可保存的训练数据。');
      }

      const result = finalizeAndPersist(handle.snapshot, note);
      reset();
      setPendingFinalize(null);
      return result;
    },
    [pendingFinalize, requestFinalize, reset]
  );

  return {
    state,
    elapsedMs,
    currentPhaseElapsedMs,
    restCountdown,
    pendingFinalize,
    start,
    pause,
    resume,
    switchPhase,
    reset,
    markEjaculation,
    toggleUsedPorn,
    toggleEjaculated,
    requestFinalize,
    cancelFinalize,
    finalize
  };
}

