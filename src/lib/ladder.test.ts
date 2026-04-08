import { describe, expect, it } from 'vitest';
import { buildLadderRating } from './ladder';
import type { MasterySnapshot } from '@/types/models';

function snapshot(overrides: Partial<MasterySnapshot>): MasterySnapshot {
  return {
    createdAt: '2026-04-08T12:00:00.000Z',
    windows: [],
    masteryScore: 82,
    growthScore: 74,
    consistencyScore: 79,
    confidenceScore: 81,
    ladderScore: 823,
    provisional: false,
    ...overrides
  };
}

describe('buildLadderRating', () => {
  it('normalizes mastery snapshot output into a 0-1000 ladder score and stable tier band', () => {
    const rating = buildLadderRating(snapshot({ ladderScore: 823 }));

    expect(rating.score).toBe(823);
    expect(rating.tier).toBe('钛曜');
    expect(rating.division).toBe('II');
    expect(rating.progressToNext).toBeGreaterThan(0);
    expect(rating.progressToNext).toBeLessThanOrEqual(100);
  });

  it('marks promotion and relegation zones around band edges', () => {
    const promotion = buildLadderRating(snapshot({ ladderScore: 882 }));
    const relegation = buildLadderRating(snapshot({ ladderScore: 322 }));

    expect(promotion.promotionZone).toBe(true);
    expect(relegation.relegationZone).toBe(true);
  });
});

