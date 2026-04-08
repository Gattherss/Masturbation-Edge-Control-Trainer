import type {
  LadderRating,
  LadderSeason,
  LeaderboardEntry,
  MasterySnapshot,
  MedalUnlock,
  PublicProfile
} from '@/types/models';

const TIER_BANDS = [
  { tier: '学徒', division: 'I', min: 0, max: 159 },
  { tier: '黑铁', division: 'III', min: 160, max: 309 },
  { tier: '黑铁', division: 'II', min: 310, max: 419 },
  { tier: '锻钢', division: 'III', min: 420, max: 549 },
  { tier: '锻钢', division: 'II', min: 550, max: 669 },
  { tier: '钛曜', division: 'III', min: 670, max: 789 },
  { tier: '钛曜', division: 'II', min: 790, max: 889 },
  { tier: '宗师', division: 'I', min: 890, max: 1000 }
] as const;

const SEEDED_LADDER = [
  { id: 'seed-1', displayName: 'Nocturne Forge', avatarSeed: 'forge-1', tagline: 'Rhythm first.', score: 934, percentile: 99, medalCode: 'control_titanium_black' },
  { id: 'seed-2', displayName: 'Iron Orbit', avatarSeed: 'forge-2', tagline: 'Consistency compounds.', score: 882, percentile: 96, medalCode: 'rhythm_steel' },
  { id: 'seed-3', displayName: 'Quiet Pulse', avatarSeed: 'forge-3', tagline: 'Longer, calmer, cleaner.', score: 816, percentile: 93, medalCode: 'endurance_steel' },
  { id: 'seed-4', displayName: 'Steel Lantern', avatarSeed: 'forge-4', tagline: 'Rest short, form sharp.', score: 772, percentile: 88, medalCode: 'progression_forged_iron' },
  { id: 'seed-5', displayName: 'Ash Meridian', avatarSeed: 'forge-5', tagline: 'Every session counts.', score: 721, percentile: 82, medalCode: 'streak_steel' },
  { id: 'seed-6', displayName: 'Tempo Mason', avatarSeed: 'forge-6', tagline: 'Build the window.', score: 668, percentile: 76, medalCode: 'rhythm_forged_iron' }
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBand(score: number) {
  return TIER_BANDS.find((band) => score >= band.min && score <= band.max) ?? TIER_BANDS[0];
}

export function getCurrentSeason(date: Date = new Date()): LadderSeason {
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const startAt = new Date(date.getFullYear(), quarterStartMonth, 1);
  const endAt = new Date(date.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
  const seasonIndex = Math.floor(month / 3) + 1;

  return {
    id: `${date.getFullYear()}-S${seasonIndex}`,
    name: `${date.getFullYear()} 赛季 ${seasonIndex}`,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    isCurrent: true
  };
}

export function buildLadderRating(
  snapshot: MasterySnapshot,
  totalPlayers = 128,
  percentileHint?: number
): LadderRating {
  const score = clamp(Math.round(snapshot.ladderScore), 0, 1000);
  const band = getBand(score);
  const bandSpan = Math.max(1, band.max - band.min);
  const bandProgress = clamp((score - band.min) / bandSpan, 0, 1);
  const percentile =
    typeof percentileHint === 'number'
      ? percentileHint
      : clamp(Math.round((score / 1000) * 100), 1, 99);
  const change = Math.round(snapshot.masteryScore - (snapshot.growthScore ?? snapshot.masteryScore));

  return {
    seasonId: getCurrentSeason().id,
    score,
    tier: band.tier,
    division: band.division,
    percentile,
    progressToNext: Math.round(bandProgress * 100),
    change,
    promotionZone: band.max - score <= 40,
    relegationZone: score - band.min <= 25 && score > 0,
    provisional: snapshot.provisional,
    masteryScore: snapshot.masteryScore,
    growthScore: snapshot.growthScore,
    consistencyScore: snapshot.consistencyScore,
    confidenceScore: snapshot.confidenceScore,
    updatedAt: snapshot.createdAt,
    totalPlayers
  };
}

function seedEntryToLeaderboard(seed: typeof SEEDED_LADDER[number]): LeaderboardEntry {
  const rating = buildLadderRating(
    {
      createdAt: new Date().toISOString(),
      windows: [],
      masteryScore: seed.score / 10,
      growthScore: Math.min(100, seed.score / 11),
      consistencyScore: Math.min(100, seed.score / 10.5),
      confidenceScore: 92,
      ladderScore: seed.score,
      provisional: false
    },
    128,
    seed.percentile
  );

  return {
    id: seed.id,
    profile: {
      displayName: seed.displayName,
      avatarSeed: seed.avatarSeed,
      tagline: seed.tagline,
      featuredMedalCode: seed.medalCode,
      visibility: 'public',
      updatedAt: rating.updatedAt
    },
    ladder: rating,
    featuredMedal: null
  };
}

export function buildLeaderboard(
  currentProfile: PublicProfile,
  currentRating: LadderRating,
  currentFeaturedMedal: MedalUnlock | null
): LeaderboardEntry[] {
  const entries = SEEDED_LADDER.map(seedEntryToLeaderboard);
  entries.push({
    id: 'self',
    profile: currentProfile,
    ladder: currentRating,
    featuredMedal: currentFeaturedMedal
  });

  const sorted = entries.sort((a, b) => b.ladder.score - a.ladder.score);

  return sorted.map((entry, index) => ({
    ...entry,
    ladder: {
      ...entry.ladder,
      rank: index + 1,
      totalPlayers: sorted.length,
      percentile:
        entry.id === 'self'
          ? clamp(Math.round(((sorted.length - index) / sorted.length) * 100), 1, 99)
          : entry.ladder.percentile
    }
  }));
}

