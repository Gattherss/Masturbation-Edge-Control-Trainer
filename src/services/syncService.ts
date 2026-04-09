import type {
  Badge,
  LadderRating,
  LadderSeason,
  LeaderboardEntry,
  PublicProfile,
  Session,
  SyncState
} from '@/types/models';
import { getSupabaseClient, getSupabaseEnv } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface RemoteLeaderboardRow {
  season_id: string;
  user_id: string;
  display_name: string;
  avatar_seed: string;
  tagline: string;
  featured_medal_code: string | null;
  ladder_score: number | string;
  tier: string;
  division: string;
  percentile: number | string;
  progress_to_next: number | string;
  change_value: number | string;
  promotion_zone: boolean;
  relegation_zone: boolean;
  provisional: boolean;
  mastery_score: number | string;
  growth_score: number | string | null;
  consistency_score: number | string;
  confidence_score: number | string;
  updated_at: string;
}

export function describeSupabaseError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: string;
      message?: string;
      details?: string | null;
      hint?: string | null;
    };

    if (candidate.code === 'PGRST205' || candidate.code === '42P01') {
      return '云端数据库还没有准备好，请先在 Supabase 里执行初始化 SQL。';
    }

    if (candidate.code === '42501') {
      return '当前账号暂时没有这项权限，请检查 Supabase 的访问策略。';
    }

    if (candidate.message === 'Auth session missing!') {
      return '请先登录 Supabase，再继续同步。';
    }

    if (candidate.message) {
      return candidate.message;
    }
  }

  return '同步暂时失败，请稍后再试。';
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 环境变量未配置，当前只能使用本地模式。');
  }
  return client;
}

export function buildPrivateSessionRow(session: Session, userId: string) {
  return {
    id: session.id,
    user_id: userId,
    schema_version: session.schemaVersion,
    start_at: session.startAt,
    end_at: session.endAt,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    date_key: session.dateKey,
    duration_ms: session.durationMs,
    edges: session.edges,
    used_porn: session.usedPorn,
    ejaculated: session.ejaculated,
    note: session.note ?? null,
    perceived_arousal: session.perceivedArousal ?? null,
    stop_reason: session.stopReason ?? null,
    segments: session.segments,
    events: session.events,
    plan_snapshot: session.planSnapshot ?? null
  };
}

export function buildSessionMetricRow(session: Session, userId: string) {
  return {
    session_id: session.id,
    user_id: userId,
    date_key: session.dateKey,
    total_score: session.scores?.total ?? null,
    grade: session.scores?.grade ?? null,
    control_score: session.metrics?.controlScore ?? null,
    capacity_score: session.metrics?.capacityScore ?? null,
    stability_score: session.metrics?.stabilityScore ?? null,
    cei_score: session.metrics?.cei ?? null,
    rci_score: session.metrics?.rci ?? null,
    pdi_score: session.metrics?.pdi ?? null,
    hw: session.metrics?.Hw ?? null,
    stim_minutes: session.metrics?.stimMinutes ?? null,
    rest_penalty: session.metrics?.restPenalty ?? null
  };
}

export function buildMedalUnlockRow(medal: Badge, userId: string, seasonId: string) {
  return {
    medal_code: medal.code,
    user_id: userId,
    season_id: seasonId,
    family: medal.family,
    tier: medal.tier,
    name: medal.name,
    description: medal.desc,
    motto: medal.motto,
    public_visible: medal.publicVisible,
    unlocked_at: medal.unlockedAt,
    source_session_id: medal.sourceSessionId ?? null
  };
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (value === null || typeof value === 'undefined') {
    return fallback;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function mapRemoteLeaderboardRows(rows: RemoteLeaderboardRow[]): LeaderboardEntry[] {
  const entries = rows
    .map((row) => ({
      id: row.user_id,
      profile: {
        displayName: row.display_name,
        avatarSeed: row.avatar_seed,
        tagline: row.tagline,
        featuredMedalCode: row.featured_medal_code ?? undefined,
        visibility: 'public' as const,
        updatedAt: row.updated_at
      },
      ladder: {
        seasonId: row.season_id,
        score: Math.round(toNumber(row.ladder_score)),
        tier: row.tier,
        division: row.division,
        percentile: Math.round(toNumber(row.percentile)),
        progressToNext: Math.round(toNumber(row.progress_to_next)),
        change: Math.round(toNumber(row.change_value)),
        promotionZone: row.promotion_zone,
        relegationZone: row.relegation_zone,
        provisional: row.provisional,
        masteryScore: toNumber(row.mastery_score),
        growthScore: row.growth_score === null ? null : toNumber(row.growth_score),
        consistencyScore: toNumber(row.consistency_score),
        confidenceScore: toNumber(row.confidence_score),
        updatedAt: row.updated_at
      },
      featuredMedal: null
    }))
    .sort((a, b) => {
      if (b.ladder.score !== a.ladder.score) {
        return b.ladder.score - a.ladder.score;
      }
      return Date.parse(b.ladder.updatedAt) - Date.parse(a.ladder.updatedAt);
    });

  return entries.map((entry, index) => ({
    ...entry,
    ladder: {
      ...entry.ladder,
      rank: index + 1,
      totalPlayers: entries.length
    }
  }));
}

export async function requestMagicLink(email: string) {
  const client = requireClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  if (error) {
    throw error;
  }
}

export async function restoreSupabaseUser() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export function listenToSupabaseAuth(onUserChange: (user: User | null) => void) {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const {
    data: { subscription }
  } = client.auth.onAuthStateChange((_event, session) => {
    onUserChange(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

export async function signOutSupabase() {
  const client = requireClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function fetchLeaderboard(limit = 50) {
  const client = requireClient();
  const { data, error } = await client
    .from('leaderboard_public')
    .select('*')
    .order('ladder_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return mapRemoteLeaderboardRows((data ?? []) as RemoteLeaderboardRow[]);
}

export async function syncLocalArtifacts(params: {
  syncState: SyncState;
  profile: PublicProfile;
  sessions: Session[];
  medals: Badge[];
  ladderRating: LadderRating;
  season: LadderSeason;
}) {
  const client = requireClient();
  const user = await restoreSupabaseUser();

  if (!user) {
    throw new Error('尚未登录 Supabase，无法开始同步。');
  }

  const privateRows = params.sessions.map((session) => buildPrivateSessionRow(session, user.id));
  const metricRows = params.sessions.map((session) => buildSessionMetricRow(session, user.id));
  const medalRows = params.medals.map((medal) => buildMedalUnlockRow(medal, user.id, params.season.id));

  const seasonRow = {
    id: params.season.id,
    name: params.season.name,
    start_at: params.season.startAt,
    end_at: params.season.endAt,
    is_current: params.season.isCurrent
  };

  const profileRow = {
    user_id: user.id,
    display_name: params.profile.displayName,
    avatar_seed: params.profile.avatarSeed,
    tagline: params.profile.tagline,
    featured_medal_code: params.profile.featuredMedalCode ?? null,
    visibility: params.profile.visibility,
    updated_at: params.profile.updatedAt
  };

  const seasonRatingRow = {
    user_id: user.id,
    season_id: params.season.id,
    ladder_score: params.ladderRating.score,
    tier: params.ladderRating.tier,
    division: params.ladderRating.division,
    percentile: params.ladderRating.percentile,
    progress_to_next: params.ladderRating.progressToNext,
    change_value: params.ladderRating.change,
    promotion_zone: params.ladderRating.promotionZone,
    relegation_zone: params.ladderRating.relegationZone,
    provisional: params.ladderRating.provisional,
    mastery_score: params.ladderRating.masteryScore,
    growth_score: params.ladderRating.growthScore,
    consistency_score: params.ladderRating.consistencyScore,
    confidence_score: params.ladderRating.confidenceScore,
    updated_at: params.ladderRating.updatedAt
  };

  const { error: seasonError } = await client.from('seasons').upsert(seasonRow, { onConflict: 'id' });
  if (seasonError) throw seasonError;

  const { error: profileError } = await client.from('profiles').upsert(profileRow, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  const { data: existingSessionRows, error: existingSessionRowsError } = await client
    .from('sessions_private')
    .select('id')
    .eq('user_id', user.id);
  if (existingSessionRowsError) throw existingSessionRowsError;

  const localSessionIds = new Set(params.sessions.map((session) => session.id));
  const obsoleteSessionIds = (existingSessionRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !localSessionIds.has(id));

  if (obsoleteSessionIds.length > 0) {
    const { error: deleteMetricsError } = await client
      .from('session_metrics')
      .delete()
      .eq('user_id', user.id)
      .in('session_id', obsoleteSessionIds);
    if (deleteMetricsError) throw deleteMetricsError;

    const { error: deleteSessionsError } = await client
      .from('sessions_private')
      .delete()
      .eq('user_id', user.id)
      .in('id', obsoleteSessionIds);
    if (deleteSessionsError) throw deleteSessionsError;
  }

  const { data: existingMedalRows, error: existingMedalRowsError } = await client
    .from('medal_unlocks')
    .select('medal_code')
    .eq('user_id', user.id);
  if (existingMedalRowsError) throw existingMedalRowsError;

  const localMedalCodes = new Set(params.medals.map((medal) => medal.code));
  const obsoleteMedalCodes = (existingMedalRows ?? [])
    .map((row) => row.medal_code as string)
    .filter((code) => !localMedalCodes.has(code));

  if (obsoleteMedalCodes.length > 0) {
    const { error: deleteMedalsError } = await client
      .from('medal_unlocks')
      .delete()
      .eq('user_id', user.id)
      .in('medal_code', obsoleteMedalCodes);
    if (deleteMedalsError) throw deleteMedalsError;
  }

  if (privateRows.length > 0) {
    const { error: privateError } = await client.from('sessions_private').upsert(privateRows, { onConflict: 'id' });
    if (privateError) throw privateError;
  }

  if (metricRows.length > 0) {
    const { error: metricsError } = await client.from('session_metrics').upsert(metricRows, { onConflict: 'session_id' });
    if (metricsError) throw metricsError;
  }

  if (medalRows.length > 0) {
    const { error: medalsError } = await client
      .from('medal_unlocks')
      .upsert(medalRows, { onConflict: 'user_id,medal_code' });
    if (medalsError) throw medalsError;
  }

  const { error: ratingError } = await client
    .from('season_ratings')
    .upsert(seasonRatingRow, { onConflict: 'user_id,season_id' });
  if (ratingError) throw ratingError;

  return {
    syncedSessions: privateRows.length,
    syncedMedals: medalRows.length
  };
}

export function getSupabaseReadiness() {
  return getSupabaseEnv().enabled;
}
