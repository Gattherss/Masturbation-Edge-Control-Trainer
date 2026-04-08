import type { Plan, Session, Segment, SessionMetrics, SessionScores } from '@/types/models';

const STRETCH_WINDOW_SEC = 90;
const GRADE_THRESHOLDS = [
  { grade: 'A' as const, min: 85 },
  { grade: 'B' as const, min: 70 },
  { grade: 'C' as const, min: 55 }
];

interface WeightedHitResult {
  totalSec: number;
  hitSec: number;
  stretchSec: number;
  H: number;
  Hw: number;
  stretchPct: number;
}

const sum = (values: number[]) => values.reduce((acc, cur) => acc + cur, 0);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const toSeconds = (ms: number) => ms / 1000;

export type ScoredSession = SessionMetrics &
  SessionScores & {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    firstRestSec: number | null;
  };

function resolveSuggestedRest(segment: Segment, plan: Plan | undefined): number {
  if (typeof segment.suggestedSec === 'number' && segment.suggestedSec >= 0) {
    return segment.suggestedSec;
  }

  if (plan?.targetRest?.length === 2) {
    return plan.targetRest[0];
  }

  return 0;
}

function weightedHitByTime(stimSeconds: number[], sMin: number, sMax: number): WeightedHitResult {
  const totalSec = sum(stimSeconds);

  if (totalSec <= 0) {
    return { totalSec: 0, hitSec: 0, stretchSec: 0, H: 0, Hw: 0, stretchPct: 0 };
  }

  let hitSec = 0;
  let stretchSec = 0;

  for (const sec of stimSeconds) {
    const hitContribution = clamp(sec, sMin, sMax) - sMin;
    if (hitContribution > 0) {
      hitSec += hitContribution;
    }

    if (sec > sMax) {
      stretchSec += Math.min(sec - sMax, STRETCH_WINDOW_SEC);
    }
  }

  const H = hitSec / totalSec;
  const Hw = Math.min(1, (hitSec + 0.5 * stretchSec) / totalSec);
  const stretchPct = stretchSec / totalSec;

  return { totalSec, hitSec, stretchSec, H, Hw, stretchPct };
}

function restPenaltyFactor(overrunSec: number): number {
  if (overrunSec <= 0) return 1;
  if (overrunSec <= 60) return 0.95;
  if (overrunSec <= 120) return 0.9;
  if (overrunSec <= 180) return 0.85;
  return 0.8;
}

function computeRestPenalty(restSegments: Segment[], plan: Plan | undefined) {
  if (restSegments.length === 0) {
    return { restPenalty: 1, restMedianSec: null };
  }

  const durations = restSegments.map((seg) => toSeconds(seg.durationMs));
  const totalRestMs = sum(restSegments.map((seg) => seg.durationMs));

  if (totalRestMs <= 0) {
    return { restPenalty: 1, restMedianSec: null };
  }

  let penaltyAccumulator = 0;

  restSegments.forEach((segment, index) => {
    const actualSec = durations[index];
    const suggested = resolveSuggestedRest(segment, plan);
    const overrunSec = Math.max(0, actualSec - suggested);
    const factor = restPenaltyFactor(overrunSec);
    const weight = segment.durationMs / totalRestMs;
    penaltyAccumulator += weight * factor;
  });

  return { restPenalty: penaltyAccumulator, restMedianSec: median(durations) };
}

function normR(stimMs: number, restMs: number): number {
  if (!Number.isFinite(stimMs) || stimMs <= 0) {
    return 0;
  }

  if (!Number.isFinite(restMs) || restMs <= 0) {
    return 0.2;
  }

  const ratio = stimMs / restMs;

  if (ratio <= 0.8) return 0;
  if (ratio >= 2.0) return 0.2;

  if (ratio >= 1.3 && ratio <= 1.5) {
    const peakWidth = 1.5 - 1.3;
    const distance = Math.abs(ratio - 1.4);
    return 1 - distance / peakWidth;
  }

  if (ratio < 1.3) {
    return (ratio - 0.8) / (1.3 - 0.8);
  }

  return 1 - ((ratio - 1.5) / (2.0 - 1.5)) * (1 - 0.2);
}

function computeRCI(restSegments: Segment[], plan: Plan | undefined): number | null {
  if (restSegments.length === 0) {
    return null;
  }

  let weighted = 0;
  let totalMs = 0;

  restSegments.forEach((segment) => {
    const actual = toSeconds(segment.durationMs);
    const suggested = resolveSuggestedRest(segment, plan);
    const denominator = Math.max(1, suggested);
    const adherence = 1 - Math.min(1, Math.abs(actual - suggested) / denominator);
    weighted += adherence * segment.durationMs;
    totalMs += segment.durationMs;
  });

  if (totalMs <= 0) {
    return null;
  }

  return clamp(weighted / totalMs, 0, 1);
}

function computePDI(stimSeconds: number[]): number | null {
  if (stimSeconds.length < 2) {
    return null;
  }

  const mean = sum(stimSeconds) / stimSeconds.length;
  if (mean <= 0) {
    return null;
  }

  const variance = stimSeconds.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / stimSeconds.length;
  return Math.sqrt(variance) / mean;
}

function computeLFE(session: Session): number | null {
  if (!session.events.length) {
    return null;
  }

  const restEvent = session.events.find((event) => event.type === 'REST_START');
  if (!restEvent) {
    return null;
  }

  const start = Date.parse(session.startAt);
  const firstRest = Date.parse(restEvent.ts);

  if (!Number.isFinite(start) || !Number.isFinite(firstRest)) {
    return null;
  }

  return Math.max(0, (firstRest - start) / 1000);
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeODF(edges: number, sessionMinutes: number): number {
  const minutes = Math.max(sessionMinutes, 1e-6);
  const per10 = edges * (10 / minutes);
  return Math.max(0, (per10 - 6) / 6);
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' {
  for (const { grade, min } of GRADE_THRESHOLDS) {
    if (score >= min) {
      return grade;
    }
  }
  return 'D';
}

export function scoreSession(session: Session, plan: Plan): ScoredSession {
  const stimSegments = session.segments.filter((segment) => segment.type === 'stim');
  const restSegments = session.segments.filter((segment) => segment.type === 'rest');
  const stimSeconds = stimSegments.map((segment) => toSeconds(segment.durationMs));
  const stimMs = sum(stimSegments.map((segment) => segment.durationMs));
  const restMs = sum(restSegments.map((segment) => segment.durationMs));

  const hitResult = weightedHitByTime(stimSeconds, plan.targetStim[0], plan.targetStim[1]);
  const { restPenalty, restMedianSec } = computeRestPenalty(restSegments, plan);
  const rci = computeRCI(restSegments, plan);
  const pdi = computePDI(stimSeconds);
  const lfeSec = computeLFE(session);
  const firstRestSec = lfeSec;
  const Rn = normR(stimMs, restMs);
  const sessionMinutes = session.durationMs / 60000;
  const stimMinutes = stimMs / 60000;
  const odf = computeODF(session.edges, sessionMinutes);
  const stimMedian = median(stimSeconds);

  const ceiRaw = 0.55 * hitResult.Hw + 0.45 * Rn;
  let restPenaltySafe = clamp(restPenalty, 0.5, 1);
  if (session.ejaculated) {
    restPenaltySafe = clamp(restPenaltySafe * 0.85, 0.4, 1);
  }

  let ceiAdjusted = ceiRaw;
  if (session.ejaculated) {
    const ejEvent = session.events.find((event) => event.type === 'EJACULATION');
    if (ejEvent) {
      const ejRatio = clamp(
        (Date.parse(ejEvent.ts) - Date.parse(session.startAt)) / Math.max(1, session.durationMs),
        0,
        1
      );
      if (ejRatio <= 0.5) {
        ceiAdjusted *= 0.9;
      }
    } else if (session.segments.length) {
      ceiAdjusted *= 0.9;
    }
  }

  const CEI_score = Math.round(clamp(ceiAdjusted * restPenaltySafe, 0, 1) * 100);
  const HwPercent = hitResult.Hw * 100;
  const PDI_score = pdi === null ? null : Math.round(clamp(1 - Math.min(1, pdi / 0.35), 0, 1) * 100);
  const RCI_score = rci === null ? null : Math.round(clamp(rci, 0, 1) * 100);
  const stabilityInputs = [PDI_score, RCI_score].filter((value): value is number => typeof value === 'number');
  const stabilityComponent = stabilityInputs.length
    ? stabilityInputs.reduce((acc, cur) => acc + cur, 0) / stabilityInputs.length
    : 0;

  const baseQuantity = clamp(stimMinutes / 20, 0, 1) * 100;
  const long60Frac = stimSeconds.length ? stimSeconds.filter((value) => value >= 60).length / stimSeconds.length : 0;
  const long90Frac = stimSeconds.length ? stimSeconds.filter((value) => value >= 90).length / stimSeconds.length : 0;
  const longBonus = 10 * long60Frac + 10 * long90Frac;
  const quantityCandidate1 = Math.min(100, baseQuantity + longBonus);
  const quantityCandidate2 = HwPercent;
  const firstRestComponent = firstRestSec == null
    ? 0
    : clamp(firstRestSec / Math.max(1, plan.targetStim[1]), 0, 1) * 100;
  const quantityComponent = 0.75 * quantityCandidate1 + 0.2 * quantityCandidate2 + 0.05 * firstRestComponent;

  const overdrivePenalty = clamp(odf * 18, 0, 18);
  const controlScore = Math.round(
    clamp(
      0.55 * CEI_score +
      0.25 * (RCI_score ?? CEI_score) +
      0.2 * Math.max(0, 100 - overdrivePenalty),
      0,
      100
    )
  );
  const capacityScore = Math.round(
    clamp(
      0.7 * quantityComponent +
      0.2 * Math.min(100, HwPercent + hitResult.stretchPct * 100 * 0.5) +
      0.1 * Math.min(100, stimMinutes * 4),
      0,
      100
    )
  );
  const stabilityScore = Math.round(
    clamp(
      0.55 * stabilityComponent +
      0.25 * Math.min(100, HwPercent) +
      0.2 * Math.max(0, 100 - Math.min(100, odf * 100)),
      0,
      100
    )
  );

  const totalScore = Math.round(
    0.45 * capacityScore +
    0.35 * controlScore +
    0.2 * stabilityScore
  );
  const grade = gradeFromScore(totalScore);

  return {
    lfeSec,
    pdi,
    rci,
    cei: CEI_score,
    odf,
    sessionMinutes,
    hitRatio: hitResult.H,
    H: hitResult.H,
    Hw: hitResult.Hw,
    Rn,
    stretchPct: hitResult.stretchPct,
    stimMedianSec: stimMedian,
    restMedianSec: restMedianSec,
    restPenalty: restPenaltySafe,
    stimMinutes,
    controlScore,
    capacityScore,
    stabilityScore,
    total: totalScore,
    grade,
    PDI_score,
    RCI_score,
    CEI_score,
    control: controlScore,
    capacity: capacityScore,
    stability: stabilityScore,
    score: totalScore,
    firstRestSec
  };
}

export function buildNarrative(result: ScoredSession): string {
  const parts: string[] = [];
  const controlScore = result.controlScore ?? 0;
  const capacityScore = result.capacityScore ?? 0;
  const stabilityScore = result.stabilityScore ?? 0;

  parts.push(`本轮总分 ${result.total}，等级 ${result.grade}。`);
  parts.push(`control ${controlScore}，capacity ${capacityScore}，stability ${stabilityScore}。`);
  parts.push(`CEI ${result.CEI_score}，Hw ${(result.Hw * 100).toFixed(1)}%。`);

  if (result.PDI_score !== null) {
    parts.push(`PDI 得分 ${result.PDI_score}。`);
  }

  if (result.RCI_score !== null) {
    parts.push(`RCI 得分 ${result.RCI_score}。`);
  }

  if (result.restPenalty < 1) {
    parts.push(`休息惩罚 ${(result.restPenalty * 100).toFixed(0)}%。`);
  }

  return parts.join(' ');
}

export function buildSuggestions(result: ScoredSession): string[] {
  const suggestions: string[] = [];
  const controlScore = result.controlScore ?? 0;
  const capacityScore = result.capacityScore ?? 0;
  const stabilityScore = result.stabilityScore ?? 0;

  if (controlScore < 75) {
    suggestions.push('把刺激更稳定地压进目标窗口，control 会先被明显抬起来。');
  }

  if (capacityScore < 70) {
    suggestions.push('下一轮优先追求更长的有效刺激总量，不要只靠频繁切换堆时长。');
  }

  if (stabilityScore < 72) {
    suggestions.push('刺激段长短还有些散，先把波动收小，再去追更高强度。');
  }

  if (result.firstRestSec !== null && result.firstRestSec < 30) {
    suggestions.push('第一段休息来得有些早，可以尝试把第一段刺激再延长一点。');
  }

  if (result.restPenalty < 0.95) {
    suggestions.push('休息超时仍在拖分，下一轮尽量把每次休息收在建议窗口附近。');
  }

  if (suggestions.length === 0) {
    suggestions.push('这一轮节律已经很成形了，继续用这种密度去累积长期 mastery。');
  }

  return suggestions;
}
