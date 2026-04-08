import { beforeEach, describe, expect, it } from 'vitest';
import {
  save,
  load,
  saveDraft,
  loadDraft,
  persistSessionWrite,
  loadIndexByDate,
  loadRecentSessionIds,
  STORAGE_KEYS,
  removeSessionEverywhere
} from './storage';
import type { Session, SessionDraft } from '@/types/models';

const sessionFixture = (): Session => ({
  id: 's-1',
  schemaVersion: 'v1',
  startAt: new Date().toISOString(),
  endAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dateKey: '2025-01-01',
  durationMs: 60_000,
  edges: 1,
  usedPorn: true,
  ejaculated: false,
  segments: [],
  events: [],
  planSnapshot: undefined,
  metrics: undefined,
  scores: undefined,
  note: undefined,
  perceivedArousal: undefined,
  stopReason: undefined
});

const draftFixture = (): SessionDraft => ({
  id: 'draft-1',
  startedAt: new Date().toISOString(),
  lastTouchedAt: new Date().toISOString(),
  phase: 'stim',
  isRunning: true,
  isPaused: false,
  edges: 0,
  segments: [],
  events: [],
  usedPorn: true,
  ejaculated: false,
  elapsedMs: 0,
  restCountdownSec: null,
  plan: {
    id: 'basic',
    targetStim: [55, 85],
    targetRest: [30, 90]
  }
});

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

describe('storage primitives', () => {
  it('saves and loads arbitrary JSON values', () => {
    save(STORAGE_KEYS.plan, { foo: 'bar' });
    const value = load(STORAGE_KEYS.plan, {});
    expect(value).toMatchObject({ foo: 'bar' });
  });

  it('persists drafts', () => {
    const draft = draftFixture();
    saveDraft(draft);
    expect(loadDraft()).toMatchObject({ id: draft.id });
    saveDraft(null);
    expect(loadDraft()).toBeNull();
  });

  it('keeps date index and recent list consistent', () => {
    const session = sessionFixture();
    persistSessionWrite(session, 5);

    const index = loadIndexByDate();
    expect(index[session.dateKey]).toContain(session.id);

    const recent = loadRecentSessionIds();
    expect(recent[0]).toBe(session.id);

    removeSessionEverywhere(session.id, session.dateKey);
    const afterIndex = loadIndexByDate();
    expect(afterIndex[session.dateKey]).toBeUndefined();
  });
});
