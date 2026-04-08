import { describe, expect, it } from 'vitest';
import { mapRemoteLeaderboardRows } from '@/services/syncService';

describe('mapRemoteLeaderboardRows', () => {
  it('sorts remote rows by ladder score and assigns ladder rank metadata', () => {
    const rows = [
      {
        season_id: '2026-S2',
        user_id: 'user-b',
        display_name: 'Forge B',
        avatar_seed: 'forge-b',
        tagline: 'Steady climb.',
        featured_medal_code: 'rhythm_steel',
        ladder_score: 702,
        tier: '钛曜',
        division: 'III',
        percentile: 84,
        progress_to_next: 63,
        change_value: 8,
        promotion_zone: false,
        relegation_zone: false,
        provisional: false,
        mastery_score: 72.4,
        growth_score: 65.2,
        consistency_score: 70.1,
        confidence_score: 88.5,
        updated_at: '2026-04-08T10:00:00.000Z'
      },
      {
        season_id: '2026-S2',
        user_id: 'user-a',
        display_name: 'Forge A',
        avatar_seed: 'forge-a',
        tagline: 'Short rests, long form.',
        featured_medal_code: null,
        ladder_score: 812,
        tier: '钛曜',
        division: 'II',
        percentile: 92,
        progress_to_next: 44,
        change_value: 15,
        promotion_zone: true,
        relegation_zone: false,
        provisional: false,
        mastery_score: 81.1,
        growth_score: 74.8,
        consistency_score: 79.6,
        confidence_score: 93.2,
        updated_at: '2026-04-08T09:00:00.000Z'
      }
    ];

    const entries = mapRemoteLeaderboardRows(rows);

    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe('user-a');
    expect(entries[0].ladder.rank).toBe(1);
    expect(entries[0].ladder.totalPlayers).toBe(2);
    expect(entries[1].id).toBe('user-b');
    expect(entries[1].ladder.rank).toBe(2);
  });

  it('maps profile and ladder fields into the public leaderboard shape', () => {
    const [entry] = mapRemoteLeaderboardRows([
      {
        season_id: '2026-S2',
        user_id: 'user-c',
        display_name: 'Forge C',
        avatar_seed: 'forge-c',
        tagline: 'Measured and calm.',
        featured_medal_code: 'control_titanium_black',
        ladder_score: '905',
        tier: '宗师',
        division: 'I',
        percentile: '98',
        progress_to_next: '100',
        change_value: '-4',
        promotion_zone: true,
        relegation_zone: false,
        provisional: false,
        mastery_score: '90.4',
        growth_score: null,
        consistency_score: '87.2',
        confidence_score: '95.0',
        updated_at: '2026-04-08T12:00:00.000Z'
      }
    ]);

    expect(entry.profile.displayName).toBe('Forge C');
    expect(entry.profile.visibility).toBe('public');
    expect(entry.profile.featuredMedalCode).toBe('control_titanium_black');
    expect(entry.ladder.score).toBe(905);
    expect(entry.ladder.percentile).toBe(98);
    expect(entry.ladder.change).toBe(-4);
    expect(entry.ladder.growthScore).toBeNull();
  });
});
