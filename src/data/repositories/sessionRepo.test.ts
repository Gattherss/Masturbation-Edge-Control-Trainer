import { beforeEach, describe, expect, it } from 'vitest';
import { listSessions, removeSession, saveSession } from './sessionRepo';
import { loadIndexByDate, loadRecentSessionIds } from '@/lib/storage';
import type { Session } from '@/types/models';

function buildSession(id: string, dateKey = '2026-04-09'): Session {
  const iso = new Date(`${dateKey}T10:00:00.000Z`).toISOString();

  return {
    id,
    schemaVersion: 'v1',
    startAt: iso,
    endAt: iso,
    createdAt: iso,
    updatedAt: iso,
    dateKey,
    durationMs: 60_000,
    edges: 1,
    usedPorn: false,
    ejaculated: false,
    segments: [],
    events: []
  };
}

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

describe('sessionRepo.removeSession', () => {
  it('removes the session from the session list and derived indexes', () => {
    const sessionA = buildSession('session-a');
    const sessionB = buildSession('session-b');

    saveSession(sessionA);
    saveSession(sessionB);

    const removed = removeSession(sessionA.id);

    expect(removed?.id).toBe(sessionA.id);
    expect(listSessions().map((session) => session.id)).toEqual([sessionB.id]);
    expect(loadIndexByDate()[sessionA.dateKey]).toEqual([sessionB.id]);
    expect(loadRecentSessionIds()).not.toContain(sessionA.id);
  });
});
