export type SegmentType = 'stim' | 'rest';
export type EventType = 'STIM_START' | 'REST_START' | 'EJACULATION';
export type MedalFamily = 'rhythm' | 'control' | 'endurance' | 'progression' | 'streak';
export type MedalTier = 'black_iron' | 'forged_iron' | 'steel' | 'titanium_black';
export type SyncProvider = 'local' | 'supabase';
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
export type AppThemeId = 'midnight' | 'ember' | 'tide';

export interface Segment {
  seq: number;
  type: SegmentType;
  startAt: string; // ISO timestamp
  endAt: string; // ISO timestamp
  durationMs: number;
  suggestedSec?: number; // only for rest segments
  hitTarget?: boolean;
}

export interface Event<T = unknown> {
  seq: number;
  ts: string;
  type: EventType;
  payload?: T;
}

export interface Session {
  id: string;
  schemaVersion: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  dateKey: string;
  durationMs: number;
  edges: number;
  usedPorn: boolean;
  ejaculated: boolean;
  note?: string;
  perceivedArousal?: number;
  stopReason?: string;
  segments: Segment[];
  events: Event[];
  planSnapshot?: Plan;
  metrics?: SessionMetrics;
  scores?: SessionScores;
}

export interface Plan {
  id: 'basic' | 'endurance' | 'wave' | 'custom';
  targetStim: [number, number];
  targetRest: [number, number];
  restMinAdjust?: number;
  promptFreqPct?: number;
}

export interface Baseline {
  createdAt: string;
  sourceSessionId: string;
  metrics: {
    cei: number;
    Hw: number;
    stimMinutes: number;
    rci: number | null;
    pdi: number | null;
  };
}

export interface SessionMetrics {
  lfeSec: number | null;
  pdi: number | null;
  rci: number | null;
  cei: number;
  odf: number;
  sessionMinutes: number;
  hitRatio: number;
  H: number;
  Hw: number;
  Rn: number;
  stretchPct: number;
  stimMedianSec: number | null;
  restMedianSec: number | null;
  restPenalty: number;
  stimMinutes: number;
  controlScore?: number;
  capacityScore?: number;
  stabilityScore?: number;
}

export interface SessionScores {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D';
  PDI_score: number | null;
  RCI_score: number | null;
  CEI_score: number;
  control?: number;
  capacity?: number;
  stability?: number;
}

export interface Settings {
  mode: 'basic' | 'endurance' | 'wave' | 'custom';
  collectArousalOnFinish: boolean;
  restBeep: boolean;
  defaultUsedPorn: boolean;
  reduceMotion: boolean;
  theme: AppThemeId;
}

export interface MedalCatalogItem {
  code: string;
  family: MedalFamily;
  tier: MedalTier;
  name: string;
  desc: string;
  motto: string;
  flavorText: string;
  publicVisible: boolean;
}

export interface MedalUnlock extends MedalCatalogItem {
  unlockedAt: string; // ISO 时间
  sourceSessionId?: string; // 触发来源会话 id
}

export type Badge = MedalUnlock;

export interface PublicProfile {
  displayName: string;
  avatarSeed: string;
  tagline: string;
  featuredMedalCode?: string;
  visibility: 'public' | 'private';
  updatedAt: string;
}

export interface SyncState {
  provider: SyncProvider;
  status: SyncStatus;
  lastSyncedAt?: string;
  lastError?: string;
  userId?: string;
  email?: string;
}

export type WelcomePromptMode = 'guest' | 'later';

export interface WelcomePromptState {
  mode: WelcomePromptMode;
  updatedAt: string;
  remindAfter?: string;
}

export interface MasteryWindow {
  key: 'recent' | 'current' | 'anchor';
  label: string;
  startAt: string;
  endAt: string;
  sessionIds: string[];
  sampleCount: number;
  ceiMedian: number;
  hwMedian: number;
  rciMedian: number | null;
  pdiMedian: number | null;
  restMedianSec: number | null;
  stimMedianSec: number | null;
  controlMedian: number;
  capacityMedian: number;
  stabilityMedian: number;
  scoreMedian: number;
  volatility: number;
}

export interface MasterySnapshot {
  createdAt: string;
  windows: MasteryWindow[];
  masteryScore: number;
  growthScore: number | null;
  consistencyScore: number;
  confidenceScore: number;
  ladderScore: number;
  provisional: boolean;
  anchorMonth?: string;
}

export interface LadderSeason {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  isCurrent: boolean;
}

export interface LadderRating {
  seasonId: string;
  score: number;
  tier: string;
  division: string;
  percentile: number;
  progressToNext: number;
  change: number;
  promotionZone: boolean;
  relegationZone: boolean;
  provisional: boolean;
  masteryScore: number;
  growthScore: number | null;
  consistencyScore: number;
  confidenceScore: number;
  updatedAt: string;
  rank?: number;
  totalPlayers?: number;
}

export interface LeaderboardEntry {
  id: string;
  profile: PublicProfile;
  ladder: LadderRating;
  featuredMedal?: MedalUnlock | null;
}

export interface SessionDraft {
  id: string;
  startedAt: string;
  lastTouchedAt: string;
  phase: SegmentType;
  isRunning: boolean;
  isPaused: boolean;
  edges: number;
  segments: Segment[];
  events: Event[];
  usedPorn: boolean;
  ejaculated: boolean;
  elapsedMs: number;
  restCountdownSec: number | null;
  plan: Plan;
}

export interface DailyAggregate {
  dateKey: string;
  sessionCount: number;
  totalMinutes: number;
  ceiSum: number;
  ceiCount: number;
}

export type DailyAggregateMap = Record<string, DailyAggregate>;
