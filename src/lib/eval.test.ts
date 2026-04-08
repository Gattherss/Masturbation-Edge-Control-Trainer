import { describe, expect, it } from 'vitest';
import { scoreSession, buildNarrative, buildSuggestions } from './eval';
import type { Plan, Session, Segment, Event } from '@/types/models';

const basePlan: Plan = {
  id: 'basic',
  targetStim: [55, 85],
  targetRest: [30, 90]
};

function createSegment(
  overrides: Partial<Segment> & Pick<Segment, 'type' | 'durationMs'>
): Segment {
  const now = Date.now();
  const start = new Date(now).toISOString();
  const end = new Date(now + overrides.durationMs).toISOString();
  return {
    seq: overrides.seq ?? 0,
    type: overrides.type,
    startAt: overrides.startAt ?? start,
    endAt: overrides.endAt ?? end,
    durationMs: overrides.durationMs,
    suggestedSec: overrides.suggestedSec,
    hitTarget: overrides.hitTarget
  };
}

function createEvent(overrides: Partial<Event> & Pick<Event, 'type'>): Event {
  const now = Date.now();
  return {
    seq: overrides.seq ?? 0,
    type: overrides.type,
    ts: overrides.ts ?? new Date(now).toISOString(),
    payload: overrides.payload
  };
}

function createSession(overrides: Partial<Session>): Session {
  const startAt = overrides.startAt ?? new Date().toISOString();
  const durationMs =
    overrides.durationMs ??
    overrides.segments?.reduce((acc, segment) => acc + segment.durationMs, 0) ??
    0;
  const endAt = overrides.endAt ?? new Date(Date.parse(startAt) + durationMs).toISOString();
  return {
    id: overrides.id ?? 'session-1',
    schemaVersion: overrides.schemaVersion ?? 'v1',
    startAt,
    endAt,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    dateKey: overrides.dateKey ?? '2025-01-01',
    durationMs,
    edges: overrides.edges ?? 1,
    usedPorn: overrides.usedPorn ?? true,
    ejaculated: overrides.ejaculated ?? false,
    note: overrides.note,
    perceivedArousal: overrides.perceivedArousal,
    stopReason: overrides.stopReason,
    segments: overrides.segments ?? [],
    events: overrides.events ?? [],
    planSnapshot: overrides.planSnapshot,
    metrics: overrides.metrics,
    scores: overrides.scores
  };
}

describe('scoreSession', () => {
  it('counts only the in-window portion of a stim segment and preserves exact rest', () => {
    const stimSegment = createSegment({ seq: 1, type: 'stim', durationMs: 60_000 });
    const restSegment = createSegment({
      seq: 2,
      type: 'rest',
      durationMs: 40_000,
      suggestedSec: 40
    });

    const session = createSession({
      segments: [stimSegment, restSegment],
      edges: 1,
      durationMs: stimSegment.durationMs + restSegment.durationMs,
      events: [
        createEvent({ seq: 1, type: 'STIM_START', ts: stimSegment.startAt }),
        createEvent({ seq: 2, type: 'REST_START', ts: restSegment.startAt })
      ]
    });

    const result = scoreSession(session, basePlan);

    expect(result.Hw).toBeCloseTo(5 / 60, 4);
    expect(result.restPenalty).toBe(1);
    expect(result.CEI_score).toBeGreaterThan(0);
  });

  it('applies the gentler rest-overrun schedule and keeps instability measurable', () => {
    const stimSegments = [
      createSegment({ seq: 1, type: 'stim', durationMs: 30_000 }),
      createSegment({ seq: 2, type: 'stim', durationMs: 110_000 })
    ];
    const restSegments = [
      createSegment({ seq: 3, type: 'rest', durationMs: 180_000, suggestedSec: 60 })
    ];

    const session = createSession({
      segments: [...stimSegments, ...restSegments],
      edges: 2,
      durationMs: stimSegments.reduce((acc, seg) => acc + seg.durationMs, 0) + restSegments[0].durationMs,
      events: [
        createEvent({ seq: 1, type: 'STIM_START', ts: stimSegments[0].startAt }),
        createEvent({ seq: 2, type: 'REST_START', ts: restSegments[0].startAt })
      ]
    });

    const result = scoreSession(session, basePlan);

    expect(result.restPenalty).toBeCloseTo(0.9, 2);
    expect(result.Hw).toBeLessThan(1);
    expect(result.pdi).not.toBeNull();
    expect(result.grade).toBeDefined();
  });

  it('reduces CEI when ejaculation occurs early', () => {
    const stimSegment = createSegment({ seq: 1, type: 'stim', durationMs: 90_000 });
    const restSegment = createSegment({
      seq: 2,
      type: 'rest',
      durationMs: 30_000,
      suggestedSec: 45
    });

    const startAt = new Date().toISOString();
    const ejTs = new Date(Date.parse(startAt) + 40_000).toISOString();

    const session = createSession({
      startAt,
      segments: [stimSegment, restSegment],
      durationMs: stimSegment.durationMs + restSegment.durationMs,
      edges: 1,
      ejaculated: true,
      events: [
        createEvent({ seq: 1, type: 'STIM_START', ts: stimSegment.startAt }),
        createEvent({ seq: 2, type: 'EJACULATION', ts: ejTs }),
        createEvent({ seq: 3, type: 'REST_START', ts: restSegment.startAt })
      ]
    });

    const result = scoreSession(session, basePlan);

    expect(result.CEI_score).toBeLessThan(100);
    expect(result.CEI_score).toBeGreaterThan(0);
  });
});

describe('buildNarrative & buildSuggestions', () => {
  it('produces human-readable copy', () => {
    const stimSegment = createSegment({ seq: 1, type: 'stim', durationMs: 60_000 });
    const restSegment = createSegment({
      seq: 2,
      type: 'rest',
      durationMs: 35_000,
      suggestedSec: 40
    });

    const result = scoreSession(
      createSession({
        segments: [stimSegment, restSegment],
        durationMs: stimSegment.durationMs + restSegment.durationMs,
        edges: 1,
        events: [
          createEvent({ seq: 1, type: 'STIM_START', ts: stimSegment.startAt }),
          createEvent({ seq: 2, type: 'REST_START', ts: restSegment.startAt })
        ]
      }),
      basePlan
    );

    const narrative = buildNarrative(result);
    const suggestions = buildSuggestions(result);

    expect(narrative.length).toBeGreaterThan(0);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
