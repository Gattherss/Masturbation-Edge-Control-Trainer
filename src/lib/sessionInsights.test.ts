import { describe, expect, it } from 'vitest';
import type { Session } from '@/types/models';
import {
  buildDailyCeiSeries,
  buildDailyMinutesSeries,
  buildWeeklyMinutesSeries,
  filterSessions,
  getRecentSessionsFromList
} from './sessionInsights';

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? 'session-1',
    schemaVersion: 'v1',
    startAt: overrides.startAt ?? '2025-10-01T10:00:00.000Z',
    endAt: overrides.endAt ?? '2025-10-01T10:10:00.000Z',
    createdAt: overrides.createdAt ?? '2025-10-01T10:10:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-10-01T10:10:00.000Z',
    dateKey: overrides.dateKey ?? '2025-10-01',
    durationMs: overrides.durationMs ?? 10 * 60 * 1000,
    edges: overrides.edges ?? 2,
    usedPorn: overrides.usedPorn ?? false,
    ejaculated: overrides.ejaculated ?? false,
    segments: overrides.segments ?? [],
    events: overrides.events ?? [],
    metrics: overrides.metrics,
    scores: overrides.scores,
    note: overrides.note,
    perceivedArousal: overrides.perceivedArousal,
    stopReason: overrides.stopReason,
    planSnapshot: overrides.planSnapshot
  };
}

describe('sessionInsights', () => {
  it('filters sessions by time window and flags', () => {
    const sessions = [
      createSession({
        id: 'recent-kept',
        startAt: '2025-10-10T08:00:00.000Z',
        dateKey: '2025-10-10',
        durationMs: 15 * 60 * 1000,
        usedPorn: false,
        ejaculated: false
      }),
      createSession({
        id: 'recent-filtered',
        startAt: '2025-10-09T08:00:00.000Z',
        dateKey: '2025-10-09',
        durationMs: 20 * 60 * 1000,
        usedPorn: true,
        ejaculated: false
      }),
      createSession({
        id: 'old',
        startAt: '2025-09-20T08:00:00.000Z',
        dateKey: '2025-09-20',
        durationMs: 20 * 60 * 1000
      })
    ];

    const filtered = filterSessions(sessions, {
      porn: 'no',
      ej: 'any',
      minMinutes: 10,
      days: 7,
      now: Date.parse('2025-10-11T00:00:00.000Z')
    });

    expect(filtered.map((session) => session.id)).toEqual(['recent-kept']);
  });

  it('builds weekly and daily series strictly from the provided sessions', () => {
    const sessions = [
      createSession({
        id: 'wk1-a',
        startAt: '2025-10-01T08:00:00.000Z',
        dateKey: '2025-10-01',
        durationMs: 30 * 60 * 1000,
        metrics: { cei: 70 } as Session['metrics']
      }),
      createSession({
        id: 'wk1-b',
        startAt: '2025-10-02T08:00:00.000Z',
        dateKey: '2025-10-02',
        durationMs: 15 * 60 * 1000,
        metrics: { cei: 90 } as Session['metrics']
      }),
      createSession({
        id: 'wk2',
        startAt: '2025-10-08T08:00:00.000Z',
        dateKey: '2025-10-08',
        durationMs: 45 * 60 * 1000,
        metrics: { cei: 80 } as Session['metrics']
      })
    ];

    expect(buildWeeklyMinutesSeries(sessions)).toEqual([
      { weekKey: '2025-W40', minutes: 45 },
      { weekKey: '2025-W41', minutes: 45 }
    ]);

    expect(buildDailyMinutesSeries(sessions, 10)).toEqual([
      { dateKey: '2025-10-01', minutes: 30 },
      { dateKey: '2025-10-02', minutes: 15 },
      { dateKey: '2025-10-08', minutes: 45 }
    ]);

    expect(buildDailyCeiSeries(sessions, 10)).toEqual([
      { dateKey: '2025-10-01', cei: 70 },
      { dateKey: '2025-10-02', cei: 90 },
      { dateKey: '2025-10-08', cei: 80 }
    ]);
  });

  it('returns the newest sessions first for recent summaries', () => {
    const sessions = [
      createSession({ id: 'older', startAt: '2025-10-01T08:00:00.000Z' }),
      createSession({ id: 'newer', startAt: '2025-10-03T08:00:00.000Z' }),
      createSession({ id: 'newest', startAt: '2025-10-05T08:00:00.000Z' })
    ];

    expect(getRecentSessionsFromList(sessions, 2).map((session) => session.id)).toEqual([
      'newest',
      'newer'
    ]);
  });
});
