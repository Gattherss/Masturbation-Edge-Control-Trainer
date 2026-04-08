import { describe, expect, it } from 'vitest';
import { evaluateBadges, getAllBadgeDefs, getBadgeProgress } from './badges';
import { scoreSession } from './eval';
import type { Plan, Session } from '@/types/models';

const NOW = new Date('2026-04-08T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const plan: Plan = {
  id: 'basic',
  targetStim: [55, 85],
  targetRest: [30, 90]
};

function sessionAt(id: string, daysAgo: number, stimSec: number, restSec: number): Session {
  const startTs = NOW.getTime() - daysAgo * DAY_MS;
  const startAt = new Date(startTs).toISOString();
  const restStart = new Date(startTs + stimSec * 1000).toISOString();
  const endAt = new Date(startTs + (stimSec + restSec) * 1000).toISOString();
  const session: Session = {
    id,
    schemaVersion: 'v1',
    startAt,
    endAt,
    createdAt: startAt,
    updatedAt: startAt,
    dateKey: startAt.slice(0, 10),
    durationMs: (stimSec + restSec) * 1000,
    edges: 2,
    usedPorn: false,
    ejaculated: false,
    segments: [
      { seq: 1, type: 'stim', startAt, endAt: restStart, durationMs: stimSec * 1000, hitTarget: true },
      { seq: 2, type: 'rest', startAt: restStart, endAt, durationMs: restSec * 1000, suggestedSec: 40 }
    ],
    events: [
      { seq: 1, ts: startAt, type: 'STIM_START' },
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

describe('medal catalog', () => {
  it('defines a 5 family × 4 tier medal matrix', () => {
    const defs = getAllBadgeDefs();
    expect(defs).toHaveLength(20);
    expect(new Set(defs.map((def) => `${def.family}:${def.tier}`)).size).toBe(20);
  });

  it('unlocks performance medals and reports progress for upcoming ones', () => {
    const sessions = [
      sessionAt('s1', 2, 92, 30),
      sessionAt('s2', 5, 88, 32),
      sessionAt('s3', 8, 86, 30),
      sessionAt('s4', 12, 90, 28),
      sessionAt('s5', 18, 84, 34),
      sessionAt('s6', 130, 60, 56),
      sessionAt('s7', 140, 62, 54)
    ];

    const unlocked = evaluateBadges(sessions).map((badge) => badge.code);
    const progress = getBadgeProgress('progression_black_iron', sessions);

    expect(unlocked).toContain('rhythm_black_iron');
    expect(progress.percent).toBeGreaterThan(0);
  });
});
