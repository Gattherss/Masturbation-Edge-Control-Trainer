import type { Baseline } from '@/types/models';
import type { Event, Plan, Segment, Session } from '@/types/models';
import { todayKey } from '@/lib/time';
import { scoreSession, buildNarrative, buildSuggestions } from '@/lib/eval';
import { validateSession } from '@/lib/validators';
import { saveSession } from '@/data/repositories/sessionRepo';
import { handleBaselineAfterSave } from './baselineService';
import { addCheckin } from '@/lib/storage';

export interface TrainingSnapshot {
  plan: Plan;
  segments: Segment[];
  events: Event[];
  edges: number;
  usedPorn: boolean;
  ejaculated: boolean;
  startAt: string;
  durationMs: number;
}

export interface NotePayload {
  note: string;
  perceivedArousal: number | null;
  stopReason: string;
}

export interface FinalizeResult {
  session: Session;
  sessions: Session[];
  narrative: string;
  suggestions: string[];
  baseline: Baseline | null;
  baselineComparison: ReturnType<typeof handleBaselineAfterSave>['comparison'];
  baselineMessage?: string;
}

export function finalizeAndPersist(
  snapshot: TrainingSnapshot,
  note: NotePayload
): FinalizeResult {
  const baseSession = buildSessionFromSnapshot(snapshot, note);
  const validationErrors = validateSession(baseSession);

  if (validationErrors.length > 0) {
    throw new Error(`保存失败：${validationErrors.join('；')}`);
  }

  const scored = scoreSession(baseSession, snapshot.plan);

  baseSession.metrics = scored;
  baseSession.scores = {
    total: scored.total,
    grade: scored.grade,
    PDI_score: scored.PDI_score,
    RCI_score: scored.RCI_score,
    CEI_score: scored.CEI_score,
    control: scored.control,
    capacity: scored.capacity,
    stability: scored.stability
  };

  const { sessions } = saveSession(baseSession);
  const baselineResult = handleBaselineAfterSave(baseSession, sessions);
  addCheckin(baseSession.dateKey);

  const narrative = buildNarrative(scored);
  const suggestions = buildSuggestions(scored);

  return {
    session: baseSession,
    sessions,
    narrative,
    suggestions,
    baseline: baselineResult.baseline,
    baselineComparison: baselineResult.comparison,
    baselineMessage: baselineResult.message
  };
}

function buildSessionFromSnapshot(snapshot: TrainingSnapshot, note: NotePayload): Session {
  const startAt = snapshot.startAt;
  const durationMs = snapshot.durationMs;
  const endAt = new Date(Date.parse(startAt) + durationMs).toISOString();
  const identifier = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}`;

  const session: Session = {
    id: identifier,
    schemaVersion: 'v1',
    startAt,
    endAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dateKey: todayKey(new Date(startAt)),
    durationMs,
    edges: snapshot.edges,
    usedPorn: snapshot.usedPorn,
    ejaculated: snapshot.ejaculated,
    note: note.note || undefined,
    perceivedArousal: note.perceivedArousal ?? undefined,
    stopReason: note.stopReason || undefined,
    segments: snapshot.segments,
    events: snapshot.events,
    planSnapshot: snapshot.plan,
    metrics: undefined,
    scores: undefined
  };

  return session;
}
