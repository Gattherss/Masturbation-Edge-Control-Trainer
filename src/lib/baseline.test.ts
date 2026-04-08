import { describe, expect, it } from 'vitest';
import { buildBaselineFromSession, compareToBaseline, pickBestOfLast7Days } from './baseline';
import { scoreSession } from './eval';
import type { Plan, Session } from '@/types/models';

const plan: Plan = {
  id: 'basic',
  targetStim: [55, 85],
  targetRest: [30, 90]
};

function createSession(id: string, stimSec: number, restSec: number, edges = 1): Session {
  const stimMs = stimSec * 1000;
  const restMs = restSec * 1000;
  const baseTs = Date.now();
  const startIso = new Date(baseTs).toISOString();
  const stimEndIso = new Date(baseTs + stimMs).toISOString();
  const endIso = new Date(baseTs + stimMs + restMs).toISOString();

  return {
    id,
    schemaVersion: 'v1',
    startAt: startIso,
    endAt: endIso,
    createdAt: startIso,
    updatedAt: startIso,
    dateKey: '2025-01-01',
    durationMs: stimMs + restMs,
    edges,
    usedPorn: true,
    ejaculated: false,
    segments: [
      {
        seq: 1,
        type: 'stim',
        startAt: startIso,
        endAt: stimEndIso,
        durationMs: stimMs,
        hitTarget: true
      },
      {
        seq: 2,
        type: 'rest',
        startAt: stimEndIso,
        endAt: endIso,
        durationMs: restMs,
        suggestedSec: restSec
      }
    ],
    events: [],
    note: undefined,
    perceivedArousal: undefined,
    stopReason: undefined,
    metrics: undefined,
    scores: undefined
  };
}

describe('baseline helpers', () => {
  it('builds baseline snapshots from sessions', () => {
    const session = createSession('s-1', 60, 40);
    const scored = scoreSession(session, plan);
    session.metrics = scored;
    session.scores = {
      total: scored.total,
      grade: scored.grade,
      PDI_score: scored.PDI_score,
      RCI_score: scored.RCI_score,
      CEI_score: scored.CEI_score
    };

    const baseline = buildBaselineFromSession(session);

    expect(baseline.metrics.cei).toBe(scored.cei);
    expect(baseline.sourceSessionId).toBe(session.id);
  });

  it('compares new sessions to baseline metrics', () => {
    const baseSession = createSession('s-base', 60, 40);
    const scoredBase = scoreSession(baseSession, plan);
    baseSession.metrics = scoredBase;
    baseSession.scores = {
      total: scoredBase.total,
      grade: scoredBase.grade,
      PDI_score: scoredBase.PDI_score,
      RCI_score: scoredBase.RCI_score,
      CEI_score: scoredBase.CEI_score
    };

    const baseline = buildBaselineFromSession(baseSession);

    const nextSession = createSession('s-next', 90, 30);
    const scoredNext = scoreSession(nextSession, plan);
    nextSession.metrics = scoredNext;

    const comparison = compareToBaseline(baseline, nextSession);

    expect(comparison).not.toBeNull();
    expect(comparison?.cei).toBeGreaterThanOrEqual(0);
  });

  it('picks the strongest session in the last 7 days', () => {
    const sessions: Session[] = [];
    for (let i = 0; i < 3; i++) {
      const session = createSession(`s-${i}`, 60 + i * 10, 40);
      session.startAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
      const result = scoreSession(session, plan);
      session.metrics = result;
      session.scores = {
        total: result.total + i * 5,
        grade: result.grade,
        PDI_score: result.PDI_score,
        RCI_score: result.RCI_score,
        CEI_score: result.CEI_score
      };
      sessions.push(session);
    }

    const best = pickBestOfLast7Days(sessions);
    expect(best?.id).toBe('s-2');
  });
});
