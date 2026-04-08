import type { Baseline, Plan, PublicProfile, Session, Settings, SyncState } from '@/types/models';
import { listSessions, saveSession } from '@/data/repositories/sessionRepo';
import { saveBaseline, savePublicProfile, saveSyncState } from '@/lib/storage';
import { saveSettings } from '@/lib/settings';
import { saveCustomPlan } from '@/lib/plans';

export interface DataJSON {
  version: string;
  exported_at?: string;
  plan?: unknown;
  settings?: unknown;
  baseline?: Baseline | null;
  profile?: unknown;
  syncState?: unknown;
  sessions: Session[];
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
}

export function importDataJSON(data: DataJSON): ImportResult {
  const existing = listSessions();
  const byId = new Map(existing.map((s) => [s.id, s] as const));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const session of data.sessions || []) {
    if (!session || !session.id) {
      skipped++;
      continue;
    }
    const prev = byId.get(session.id);
    if (!prev) {
      saveSession(session);
      added++;
    } else {
      // prefer newer updatedAt if present
      const prevTs = Date.parse(prev.updatedAt || prev.endAt || prev.startAt);
      const nextTs = Date.parse(session.updatedAt || session.endAt || session.startAt);
      if (Number.isFinite(nextTs) && nextTs >= prevTs) {
        saveSession(session);
        updated++;
      } else {
        skipped++;
      }
    }
  }

  if (data.baseline) {
    saveBaseline(data.baseline);
  }

  if (isSettings(data.settings)) {
    saveSettings(data.settings);
  }

  if (isPlan(data.plan) && data.plan.id === 'custom') {
    saveCustomPlan(data.plan.targetStim, data.plan.targetRest);
  }

  if (isPublicProfile(data.profile)) {
    savePublicProfile(data.profile);
  }

  if (isSyncState(data.syncState)) {
    saveSyncState(data.syncState);
  }

  return { added, updated, skipped };
}

function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Settings>;
  return (
    typeof candidate.mode === 'string' &&
    typeof candidate.collectArousalOnFinish === 'boolean' &&
    typeof candidate.restBeep === 'boolean' &&
    typeof candidate.defaultUsedPorn === 'boolean' &&
    (typeof candidate.reduceMotion === 'boolean' || typeof candidate.reduceMotion === 'undefined')
  );
}

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Plan>;
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.targetStim) &&
    candidate.targetStim.length === 2 &&
    Array.isArray(candidate.targetRest) &&
    candidate.targetRest.length === 2 &&
    candidate.targetStim.every((item) => typeof item === 'number') &&
    candidate.targetRest.every((item) => typeof item === 'number')
  );
}

function isPublicProfile(value: unknown): value is PublicProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PublicProfile>;
  return (
    typeof candidate.displayName === 'string' &&
    typeof candidate.avatarSeed === 'string' &&
    typeof candidate.tagline === 'string' &&
    typeof candidate.visibility === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}

function isSyncState(value: unknown): value is SyncState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SyncState>;
  return typeof candidate.provider === 'string' && typeof candidate.status === 'string';
}
