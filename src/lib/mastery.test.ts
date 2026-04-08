import { describe, expect, it } from 'vitest';
import { scoreSession } from './eval';
import { buildMasterySnapshot, findMasteryWindow } from './mastery';
import type { Plan, Session } from '@/types/models';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-04-08T12:00:00.000Z');

const plan: Plan = {
  id: 'basic',
  targetStim: [55, 85],
  targetRest: [30, 90]
};

function buildSession(id: string, daysAgo: number, stimSec: number, restSec: number, edges = 2): Session {
  const startTs = NOW.getTime() - daysAgo * DAY_MS;
  const stimStart = new Date(startTs).toISOString();
  const restStart = new Date(startTs + stimSec * 1000).toISOString();
  const endAt = new Date(startTs + (stimSec + restSec) * 1000).toISOString();

  const session: Session = {
    id,
    schemaVersion: 'v1',
    startAt: stimStart,
    endAt,
    createdAt: stimStart,
    updatedAt: stimStart,
    dateKey: stimStart.slice(0, 10),
    durationMs: (stimSec + restSec) * 1000,
    edges,
    usedPorn: false,
    ejaculated: false,
    segments: [
      {
        seq: 1,
        type: 'stim',
        startAt: stimStart,
        endAt: restStart,
        durationMs: stimSec * 1000,
        hitTarget: stimSec >= 55 && stimSec <= 85
      },
      {
        seq: 2,
        type: 'rest',
        startAt: restStart,
        endAt,
        durationMs: restSec * 1000,
        suggestedSec: 40
      }
    ],
    events: [
      { seq: 1, ts: stimStart, type: 'STIM_START' },
      { seq: 2, ts: restStart, type: 'REST_START' }
    ]
  };

  const scored = scoreSession(session, plan);
  session.metrics = scored;
  session.scores = {
    total: scored.total,
    grade: scored.grade,
    PDI_score: scored.PDI_score,
    RCI_score: scored.RCI_score,
    CEI_score: scored.CEI_score,
    control: scored.control,
    capacity: scored.capacity,
    stability: scored.stability
  };

  return session;
}

describe('buildMasterySnapshot', () => {
  it('builds recent/current/anchor windows and picks a monthly anchor bucket', () => {
    const sessions = [
      buildSession('recent-1', 2, 88, 32),
      buildSession('recent-2', 5, 92, 30),
      buildSession('recent-3', 7, 86, 28),
      buildSession('recent-4', 10, 90, 26),
      buildSession('recent-5', 12, 84, 30),
      buildSession('current-1', 21, 80, 35),
      buildSession('current-2', 30, 78, 38),
      buildSession('current-3', 35, 82, 34),
      buildSession('current-4', 44, 74, 42),
      buildSession('anchor-1', 130, 62, 55),
      buildSession('anchor-2', 138, 64, 52),
      buildSession('anchor-3', 145, 60, 58)
    ];

    const snapshot = buildMasterySnapshot(sessions, NOW);
    const recentWindow = findMasteryWindow(snapshot, 'recent');
    const currentWindow = findMasteryWindow(snapshot, 'current');
    const anchorWindow = findMasteryWindow(snapshot, 'anchor');

    expect(recentWindow?.sampleCount).toBe(5);
    expect(currentWindow?.sampleCount).toBe(9);
    expect(anchorWindow?.sampleCount).toBe(3);
    expect(snapshot.anchorMonth).toBe('2025-11');
    expect(snapshot.masteryScore).toBeGreaterThan(35);
    expect(snapshot.growthScore).not.toBeNull();
    expect(snapshot.provisional).toBe(false);
  });

  it('falls back to a provisional mastery-only ladder score when history is thin', () => {
    const sessions = [
      buildSession('recent-1', 2, 70, 35),
      buildSession('recent-2', 5, 72, 34),
      buildSession('recent-3', 8, 69, 36)
    ];

    const snapshot = buildMasterySnapshot(sessions, NOW);

    expect(snapshot.growthScore).toBeNull();
    expect(snapshot.provisional).toBe(true);
    expect(snapshot.ladderScore).toBe(Math.round(snapshot.masteryScore * 10));
    expect(snapshot.confidenceScore).toBeLessThan(70);
  });
});
