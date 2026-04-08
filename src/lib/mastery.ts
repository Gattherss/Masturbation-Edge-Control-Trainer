import type { MasterySnapshot, MasteryWindow, Session } from '@/types/models';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 14;
const CURRENT_WINDOW_DAYS = 56;
const ANCHOR_MIN_AGE_DAYS = 120;
const ANCHOR_MAX_AGE_DAYS = 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function medianNullable(values: Array<number | null | undefined>): number | null {
  const compact = values.filter((value): value is number => typeof value === 'number');
  if (compact.length === 0) {
    return null;
  }
  return round(median(compact), 2);
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const mean = values.reduce((acc, cur) => acc + cur, 0) / values.length;
  const variance = values.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function toIso(ts: number) {
  return new Date(ts).toISOString();
}

function parseTs(value: string) {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function filterWindow(sessions: Session[], startTs: number, endTs: number) {
  return sessions.filter((session) => {
    const ts = parseTs(session.startAt || session.createdAt);
    return ts >= startTs && ts <= endTs && session.metrics && session.scores;
  });
}

function buildWindow(
  key: MasteryWindow['key'],
  label: string,
  sessions: Session[],
  startTs: number,
  endTs: number
): MasteryWindow {
  const scored = sessions.filter((session) => session.metrics && session.scores);
  const controlValues = scored.map((session) => session.metrics?.controlScore ?? 0);
  const capacityValues = scored.map((session) => session.metrics?.capacityScore ?? 0);
  const stabilityValues = scored.map((session) => session.metrics?.stabilityScore ?? 0);
  const scoreValues = scored.map((session) => session.scores?.total ?? 0);

  return {
    key,
    label,
    startAt: toIso(startTs),
    endAt: toIso(endTs),
    sessionIds: scored.map((session) => session.id),
    sampleCount: scored.length,
    ceiMedian: round(median(scored.map((session) => session.metrics?.cei ?? 0)), 1),
    hwMedian: round(median(scored.map((session) => (session.metrics?.Hw ?? 0) * 100)), 1),
    rciMedian: medianNullable(scored.map((session) => session.metrics?.rci == null ? null : session.metrics.rci * 100)),
    pdiMedian: medianNullable(scored.map((session) => session.metrics?.pdi)),
    restMedianSec: medianNullable(scored.map((session) => session.metrics?.restMedianSec)),
    stimMedianSec: medianNullable(scored.map((session) => session.metrics?.stimMedianSec)),
    controlMedian: round(median(controlValues), 1),
    capacityMedian: round(median(capacityValues), 1),
    stabilityMedian: round(median(stabilityValues), 1),
    scoreMedian: round(median(scoreValues), 1),
    volatility: round(standardDeviation(scoreValues), 2)
  };
}

function monthKeyFromTs(ts: number) {
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function selectAnchorBucket(sessions: Session[], nowTs: number) {
  const minTs = nowTs - ANCHOR_MAX_AGE_DAYS * DAY_MS;
  const maxTs = nowTs - ANCHOR_MIN_AGE_DAYS * DAY_MS;

  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const ts = parseTs(session.startAt || session.createdAt);
    if (ts < minTs || ts > maxTs || !session.metrics || !session.scores) {
      continue;
    }
    const key = monthKeyFromTs(ts);
    const list = groups.get(key) ?? [];
    list.push(session);
    groups.set(key, list);
  }

  const ranked = Array.from(groups.entries()).sort((a, b) => {
    if (b[1].length !== a[1].length) {
      return b[1].length - a[1].length;
    }
    return b[0].localeCompare(a[0]);
  });

  if (ranked.length === 0) {
    return null;
  }

  const [anchorMonth, bucket] = ranked[0];
  return { anchorMonth, bucket };
}

function computeWindowScore(window: MasteryWindow) {
  return round(
    0.4 * window.controlMedian + 0.35 * window.capacityMedian + 0.25 * window.stabilityMedian,
    1
  );
}

function computeConsistencyScore(window: MasteryWindow) {
  const volatilityPenalty = clamp(window.volatility / 18, 0, 1);
  const sampleFactor = clamp(window.sampleCount / 10, 0, 1);
  return round(clamp((1 - volatilityPenalty) * 70 + sampleFactor * 30, 0, 100), 1);
}

function computeConfidenceScore(
  recentWindow: MasteryWindow,
  currentWindow: MasteryWindow,
  anchorWindow: MasteryWindow | null
) {
  const recentFactor = clamp(recentWindow.sampleCount / 5, 0, 1);
  const currentFactor = clamp(currentWindow.sampleCount / 10, 0, 1);
  const anchorFactor = anchorWindow ? clamp(anchorWindow.sampleCount / 8, 0, 1) : 0;
  const volatilityFactor = 1 - clamp(currentWindow.volatility / 25, 0, 1);

  return round(
    clamp(
      (recentFactor * 0.3 + currentFactor * 0.35 + anchorFactor * 0.2 + volatilityFactor * 0.15) * 100,
      0,
      100
    ),
    1
  );
}

function computeGrowthScore(currentWindow: MasteryWindow, anchorWindow: MasteryWindow | null) {
  if (!anchorWindow) {
    return null;
  }

  const ceiDelta = (currentWindow.ceiMedian - anchorWindow.ceiMedian) / 20;
  const hwDelta = (currentWindow.hwMedian - anchorWindow.hwMedian) / 18;
  const rciDelta =
    currentWindow.rciMedian == null || anchorWindow.rciMedian == null
      ? 0
      : (currentWindow.rciMedian - anchorWindow.rciMedian) / 15;
  const pdiDelta =
    currentWindow.pdiMedian == null || anchorWindow.pdiMedian == null
      ? 0
      : (anchorWindow.pdiMedian - currentWindow.pdiMedian) / 0.12;
  const restDelta =
    currentWindow.restMedianSec == null || anchorWindow.restMedianSec == null
      ? 0
      : (anchorWindow.restMedianSec - currentWindow.restMedianSec) / 30;
  const stimDelta =
    currentWindow.stimMedianSec == null || anchorWindow.stimMedianSec == null
      ? 0
      : (currentWindow.stimMedianSec - anchorWindow.stimMedianSec) / 45;
  const volatilityDelta = (anchorWindow.volatility - currentWindow.volatility) / 20;

  const composite =
    0.24 * ceiDelta +
    0.18 * hwDelta +
    0.12 * rciDelta +
    0.16 * stimDelta +
    0.12 * restDelta +
    0.1 * pdiDelta +
    0.08 * volatilityDelta;

  return round(clamp(50 + composite * 22, 0, 100), 1);
}

export function buildMasterySnapshot(
  sessions: Session[],
  now: Date = new Date()
): MasterySnapshot {
  const nowTs = now.getTime();
  const recentStart = nowTs - RECENT_WINDOW_DAYS * DAY_MS;
  const currentStart = nowTs - CURRENT_WINDOW_DAYS * DAY_MS;

  const recentSessions = filterWindow(sessions, recentStart, nowTs);
  const currentSessions = filterWindow(sessions, currentStart, nowTs);
  const anchorSelection = selectAnchorBucket(sessions, nowTs);

  const recentWindow = buildWindow('recent', '近 14 天', recentSessions, recentStart, nowTs);
  const currentWindow = buildWindow('current', '近 56 天', currentSessions, currentStart, nowTs);
  const anchorWindow = anchorSelection
    ? buildWindow(
        'anchor',
        `${anchorSelection.anchorMonth} 锚点`,
        anchorSelection.bucket,
        parseTs(anchorSelection.bucket[0]?.startAt ?? toIso(nowTs)),
        parseTs(anchorSelection.bucket[anchorSelection.bucket.length - 1]?.endAt ?? toIso(nowTs))
      )
    : null;

  const recentScore = computeWindowScore(recentWindow);
  const currentScore = computeWindowScore(currentWindow);
  const masteryScore = round(recentScore * 0.65 + currentScore * 0.35, 1);
  const consistencyScore = computeConsistencyScore(currentWindow);
  const growthScore = computeGrowthScore(currentWindow, anchorWindow);
  const confidenceScore = computeConfidenceScore(recentWindow, currentWindow, anchorWindow);
  const provisional = !anchorWindow || currentWindow.sampleCount < 5 || confidenceScore < 45;
  const ladderScore = provisional
    ? Math.round(masteryScore * 10)
    : Math.round((0.55 * masteryScore + 0.3 * (growthScore ?? 0) + 0.15 * consistencyScore) * 10);

  return {
    createdAt: now.toISOString(),
    windows: anchorWindow ? [recentWindow, currentWindow, anchorWindow] : [recentWindow, currentWindow],
    masteryScore,
    growthScore,
    consistencyScore,
    confidenceScore,
    ladderScore,
    provisional,
    anchorMonth: anchorSelection?.anchorMonth
  };
}

export function findMasteryWindow(
  snapshot: MasterySnapshot,
  key: MasteryWindow['key']
) {
  return snapshot.windows.find((window) => window.key === key) ?? null;
}

