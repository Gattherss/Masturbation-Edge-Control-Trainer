import { beforeEach, describe, expect, it } from 'vitest';
import {
  updateDailyAggOnSave,
  getLastNDaysHeatmap,
  removeSessionFromAgg
} from './aggregator';
import { saveDailyAggregates } from '@/lib/storage';
import type { Session } from '@/types/models';

function createSession(id: string, dateKey: string, durationMinutes: number, cei = 80): Session {
  const minutesMs = durationMinutes * 60000;
  const start = new Date(`${dateKey}T10:00:00.000Z`).toISOString();
  const end = new Date(Date.parse(start) + minutesMs).toISOString();
  return {
    id,
    schemaVersion: 'v1',
    startAt: start,
    endAt: end,
    createdAt: start,
    updatedAt: end,
    dateKey,
    durationMs: minutesMs,
    edges: 1,
    usedPorn: true,
    ejaculated: false,
    segments: [],
    events: [],
    planSnapshot: undefined,
    metrics: {
      cei,
      Hw: 0.8,
      H: 0.8,
      hitRatio: 0.8,
      pdi: 0.2,
      rci: 0.9,
      lfeSec: 10,
      odf: 0,
      sessionMinutes: durationMinutes,
      stretchPct: 0.1,
      stimMedianSec: null,
      restMedianSec: null,
      restPenalty: 1,
      stimMinutes: durationMinutes,
      Rn: 1
    },
    scores: {
      total: 90,
      grade: 'A',
      PDI_score: 90,
      RCI_score: 90,
      CEI_score: 90
    },
    note: undefined,
    perceivedArousal: undefined,
    stopReason: undefined
  };
}

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  saveDailyAggregates({});
});

describe('aggregator service', () => {
  it('updates daily aggregates on save', () => {
    const session = createSession('s1', '2025-01-01', 20, 85);
    updateDailyAggOnSave(session);

    const heatmap = getLastNDaysHeatmap(7);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].dateKey).toBe('2025-01-01');
    expect(Math.round(heatmap[0].totalMinutes)).toBe(20);
    expect(heatmap[0].ceiAvg).toBeCloseTo(85);
  });

  it('removes aggregates when session deleted', () => {
    const session = createSession('s1', '2025-01-01', 20, 85);
    updateDailyAggOnSave(session);
    removeSessionFromAgg(session);
    const heatmap = getLastNDaysHeatmap(7);
    expect(heatmap).toHaveLength(0);
  });
});
