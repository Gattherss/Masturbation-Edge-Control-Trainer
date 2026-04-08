import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { reviveDraft, useTrainingMachine } from '@/features/training/useTrainingMachine';
import { PLANS } from '@/lib/plans';
import type { SessionDraft } from '@/types/models';

describe('useTrainingMachine', () => {
  it('provides a finalize handle after running for some time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTrainingMachine({ plan: PLANS.basic }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    let handle = null;
    act(() => {
      handle = result.current.requestFinalize();
    });

    expect(handle).not.toBeNull();

    vi.useRealTimers();
  });

  it('restores the active segment elapsed time from a running draft', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-10T10:00:00.000Z'));

    const draft: SessionDraft = {
      id: 'draft-1',
      startedAt: '2025-10-10T09:59:15.000Z',
      lastTouchedAt: '2025-10-10T09:59:45.000Z',
      phase: 'stim',
      isRunning: true,
      isPaused: false,
      edges: 1,
      segments: [
        {
          seq: 1,
          type: 'stim',
          startAt: '2025-10-10T09:59:15.000Z',
          endAt: '2025-10-10T09:59:45.000Z',
          durationMs: 30_000
        }
      ],
      events: [],
      usedPorn: false,
      ejaculated: false,
      elapsedMs: 45_000,
      restCountdownSec: null,
      plan: PLANS.basic
    };

    const restored = reviveDraft(PLANS.basic, draft);

    expect(restored.accumulatedMs).toBe(30_000);
    expect(restored.currentSegmentStart).toBe(Date.now() - 15_000);

    vi.useRealTimers();
  });
});
