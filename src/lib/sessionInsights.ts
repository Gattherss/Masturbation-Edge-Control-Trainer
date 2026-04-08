import type { Session } from '@/types/models';
import { weekKey } from '@/lib/time';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SessionFilters {
  porn: 'any' | 'yes' | 'no';
  ej: 'any' | 'yes' | 'no';
  minMinutes: number;
  days: number;
  now?: number;
}

export interface WeeklyMinutesPoint {
  weekKey: string;
  minutes: number;
}

export interface DailyMinutesPoint {
  dateKey: string;
  minutes: number;
}

export interface DailyCeiPoint {
  dateKey: string;
  cei: number;
}

export function filterSessions(sessions: Session[], filters: SessionFilters): Session[] {
  const cutoff = (filters.now ?? Date.now()) - filters.days * DAY_MS;

  return sessions.filter((session) => {
    if (Date.parse(session.startAt) < cutoff) return false;
    if (filters.porn !== 'any' && session.usedPorn !== (filters.porn === 'yes')) return false;
    if (filters.ej !== 'any' && session.ejaculated !== (filters.ej === 'yes')) return false;
    if (filters.minMinutes > 0 && session.durationMs / 60000 < filters.minMinutes) return false;
    return true;
  });
}

export function getRecentSessionsFromList(sessions: Session[], limit = 5): Session[] {
  return [...sessions]
    .sort((left, right) => Date.parse(right.startAt) - Date.parse(left.startAt))
    .slice(0, limit);
}

export function buildWeeklyMinutesSeries(
  sessions: Session[],
  limit = 8
): WeeklyMinutesPoint[] {
  const grouped = new Map<string, number>();

  sessions.forEach((session) => {
    const key = weekKey(new Date(session.startAt));
    grouped.set(key, (grouped.get(key) ?? 0) + session.durationMs / 60000);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([key, minutes]) => ({ weekKey: key, minutes }));
}

export function buildDailyMinutesSeries(
  sessions: Session[],
  limit = 28
): DailyMinutesPoint[] {
  const grouped = new Map<string, number>();

  sessions.forEach((session) => {
    grouped.set(session.dateKey, (grouped.get(session.dateKey) ?? 0) + session.durationMs / 60000);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([dateKey, minutes]) => ({ dateKey, minutes }));
}

export function buildDailyCeiSeries(sessions: Session[], limit = 28): DailyCeiPoint[] {
  const grouped = new Map<string, { sum: number; count: number }>();

  sessions.forEach((session) => {
    const cei = session.metrics?.cei;
    if (typeof cei !== 'number') {
      return;
    }

    const previous = grouped.get(session.dateKey) ?? { sum: 0, count: 0 };
    previous.sum += cei;
    previous.count += 1;
    grouped.set(session.dateKey, previous);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([dateKey, value]) => ({
      dateKey,
      cei: Math.round(value.sum / value.count)
    }));
}
