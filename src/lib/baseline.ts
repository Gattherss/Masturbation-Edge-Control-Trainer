import type { Baseline, Session } from '@/types/models';

export function buildBaselineFromSession(session: Session): Baseline {
  if (!session.metrics) {
    throw new Error('Cannot build baseline without session metrics');
  }

  return {
    createdAt: new Date().toISOString(),
    sourceSessionId: session.id,
    metrics: {
      cei: session.metrics.cei,
      Hw: session.metrics.Hw,
      stimMinutes: session.metrics.stimMinutes,
      rci: session.metrics.rci,
      pdi: session.metrics.pdi
    }
  };
}

export function compareToBaseline(
  baseline: Baseline | null,
  session: Session
): { cei: number; Hw: number; stimMinutes: number; rci: number } | null {
  if (!baseline || !session.metrics) {
    return null;
  }

  const ceiDelta = Math.round(session.metrics.cei - baseline.metrics.cei);
  const HwDelta = Math.round((session.metrics.Hw - baseline.metrics.Hw) * 100);
  const stimMinutesDelta = Math.round((session.metrics.stimMinutes - baseline.metrics.stimMinutes) * 10) / 10;
  const rciBaseline = baseline.metrics.rci ?? session.metrics.rci ?? 0;
  const rciSession = session.metrics.rci ?? rciBaseline;
  const rciDelta = Math.round((rciSession - rciBaseline) * 100);

  return {
    cei: ceiDelta,
    Hw: HwDelta,
    stimMinutes: stimMinutesDelta,
    rci: rciDelta
  };
}

export function pickBestOfLast7Days(sessions: Session[]): Session | null {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const cutoffTs = Date.now() - 7 * DAY_MS;

  const recentSessions = sessions.filter((session) => {
    const ts = Date.parse(session.startAt ?? session.createdAt);
    return Number.isFinite(ts) && ts >= cutoffTs;
  });

  if (recentSessions.length === 0) {
    return null;
  }

  const sorted = [...recentSessions].sort((a, b) => {
    const scoreA = a.scores?.total ?? -Infinity;
    const scoreB = b.scores?.total ?? -Infinity;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const ceiA = a.metrics?.cei ?? -Infinity;
    const ceiB = b.metrics?.cei ?? -Infinity;
    if (ceiA !== ceiB) {
      return ceiB - ceiA;
    }

    const stimA = a.metrics?.stimMinutes ?? -Infinity;
    const stimB = b.metrics?.stimMinutes ?? -Infinity;
    if (stimA !== stimB) {
      return stimB - stimA;
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return sorted[0] ?? null;
}
