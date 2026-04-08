import type { DailyAggregate, DailyAggregateMap, Session } from '@/types/models';
import { loadDailyAggregates, saveDailyAggregates } from '@/lib/storage';
import { todayKey, weekKey } from '@/lib/time';

function cloneAgg(map: DailyAggregateMap): DailyAggregateMap {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, { ...value }]));
}

function ensureEntry(map: DailyAggregateMap, dateKey: string): DailyAggregate {
  if (!map[dateKey]) {
    map[dateKey] = {
      dateKey,
      sessionCount: 0,
      totalMinutes: 0,
      ceiSum: 0,
      ceiCount: 0
    };
  }
  return map[dateKey];
}

function minutes(durationMs: number): number {
  return Math.max(0, durationMs) / 60000;
}

function addSession(map: DailyAggregateMap, session: Session, direction: 1 | -1): DailyAggregateMap {
  const next = cloneAgg(map);
  const entry = ensureEntry(next, session.dateKey);
  entry.sessionCount = Math.max(0, entry.sessionCount + direction);
  entry.totalMinutes = Math.max(0, entry.totalMinutes + direction * minutes(session.durationMs));

  const cei = session.metrics?.cei;
  if (typeof cei === 'number' && Number.isFinite(cei)) {
    entry.ceiSum = Math.max(0, entry.ceiSum + direction * cei);
    entry.ceiCount = Math.max(0, entry.ceiCount + direction);
  }

  if (entry.sessionCount === 0 && entry.ceiCount === 0 && entry.totalMinutes === 0) {
    delete next[session.dateKey];
  }

  return next;
}

export function updateDailyAggOnSave(session: Session, previous?: Session | null): void {
  let agg = loadDailyAggregates();
  if (previous && previous.dateKey !== session.dateKey) {
    agg = addSession(agg, previous, -1);
  }

  if (previous && previous.dateKey === session.dateKey) {
    agg = addSession(agg, previous, -1);
  }

  agg = addSession(agg, session, 1);
  saveDailyAggregates(agg);
}

export function removeSessionFromAgg(session: Session): void {
  const agg = addSession(loadDailyAggregates(), session, -1);
  saveDailyAggregates(agg);
}

export function getDailyAggMap(): DailyAggregateMap {
  return loadDailyAggregates();
}

export function getLastNDaysHeatmap(n: number): Array<DailyAggregate & { ceiAvg: number | null }> {
  const entries = Object.values(loadDailyAggregates());
  const sorted = entries.sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1));
  const sliced = sorted.slice(-n);
  return sliced.map((entry) => ({
    ...entry,
    ceiAvg: entry.ceiCount > 0 ? entry.ceiSum / entry.ceiCount : null
  }));
}

export function getLastNDaysCEI(n: number): Array<{ dateKey: string; ceiAvg: number | null }> {
  return getLastNDaysHeatmap(n).map(({ dateKey, ceiCount, ceiSum }) => ({
    dateKey,
    ceiAvg: ceiCount > 0 ? ceiSum / ceiCount : null
  }));
}

export function getLastNWeeksMinutes(n: number): Array<{ weekKey: string; minutes: number }> {
  const dayAgg = getLastNDaysHeatmap(n * 7);
  const grouped = new Map<string, number>();

  dayAgg.forEach((entry) => {
    const wk = weekKey(new Date(entry.dateKey));
    grouped.set(wk, (grouped.get(wk) ?? 0) + entry.totalMinutes);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, totalMinutes]) => ({ weekKey: week, minutes: totalMinutes }));
}

export function getTodayStats() {
  const map = loadDailyAggregates();
  const entry = map[todayKey()] ?? null;
  if (!entry) {
    return null;
  }

  return {
    ...entry,
    ceiAvg: entry.ceiCount > 0 ? entry.ceiSum / entry.ceiCount : null
  };
}

export function rebuildDailyAggFromSessions(sessions: Session[]) {
  const map: DailyAggregateMap = {};
  sessions.forEach((s) => {
    const dateKey = s.dateKey;
    const entry = ensureEntry(map, dateKey);
    entry.sessionCount += 1;
    entry.totalMinutes += minutes(s.durationMs);
    const cei = s.metrics?.cei;
    if (typeof cei === 'number') {
      entry.ceiSum += cei;
      entry.ceiCount += 1;
    }
  });
  saveDailyAggregates(map);
  return map;
}

export function ensureAggBuilt(sessions: Session[]): DailyAggregateMap {
  const map = loadDailyAggregates();
  if (Object.keys(map).length === 0 && sessions.length > 0) {
    return rebuildDailyAggFromSessions(sessions);
  }
  return map;
}
