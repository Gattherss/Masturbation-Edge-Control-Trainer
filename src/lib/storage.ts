import type {
  Baseline,
  DailyAggregateMap,
  MedalUnlock,
  PublicProfile,
  Session,
  SessionDraft,
  SyncState,
  WelcomePromptState
} from '@/types/models';

interface StorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();

const memoryDriver: StorageDriver = {
  getItem(key) {
    return memory.has(key) ? memory.get(key)! : null;
  },
  setItem(key, value) {
    memory.set(key, value);
  },
  removeItem(key) {
    memory.delete(key);
  }
};

function resolveDriver(): StorageDriver {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return memoryDriver;
  }

  return window.localStorage;
}

const storage = resolveDriver();

export const STORAGE_KEYS = {
  sessions: 'edgingSessions',
  plan: 'edgingPlan',
  badges: 'edgingBadges',
  medals: 'edgingMedals',
  checkins: 'edgingCheckins',
  goalPhase: 'edgingGoalPhase',
  baseline: 'edgingBaseline',
  baselineWeek: 'edgingBaselineWeekKey',
  settings: 'edgingSettings',
  publicProfile: 'edgingPublicProfile',
  syncState: 'edgingSyncState',
  welcomePrompt: 'edgingWelcomePrompt',
  version: 'edgingVersion',
  draft: 'edgingCurrentSession',
  dailyAgg: 'edgingDailyAgg',
  indexByDate: 'edgingIndexByDate',
  recent: 'edgingRecentIds'
} as const;

export function save<T>(key: string, val: T): void {
  try {
    if (typeof val === 'undefined') {
      storage.removeItem(key);
      return;
    }
    const payload = JSON.stringify(val);
    storage.setItem(key, payload);
  } catch (error) {
    console.warn(`Failed to save key "${key}"`, error);
  }
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to load key "${key}"`, error);
    return fallback;
  }
}

export function remove(key: string): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove key "${key}"`, error);
  }
}

export function loadDraft(): SessionDraft | null {
  return load<SessionDraft | null>(STORAGE_KEYS.draft, null);
}

export function saveDraft(draft: SessionDraft | null): void {
  if (draft === null) {
    remove(STORAGE_KEYS.draft);
  } else {
    save(STORAGE_KEYS.draft, draft);
  }
}

export function saveSessions(sessions: Session[]): void {
  save(STORAGE_KEYS.sessions, sessions);
}

export function loadSessions(): Session[] {
  return load<Session[]>(STORAGE_KEYS.sessions, []);
}

export function loadIndexByDate(): Record<string, string[]> {
  return load<Record<string, string[]>>(STORAGE_KEYS.indexByDate, {});
}

export function saveIndexByDate(index: Record<string, string[]>): void {
  save(STORAGE_KEYS.indexByDate, index);
}

export function loadRecentSessionIds(): string[] {
  return load<string[]>(STORAGE_KEYS.recent, []);
}

export function saveRecentSessionIds(ids: string[]): void {
  save(STORAGE_KEYS.recent, ids);
}

export function loadCheckins(): string[] {
  return load<string[]>(STORAGE_KEYS.checkins, []);
}

export function saveCheckins(keys: string[]): void {
  save(STORAGE_KEYS.checkins, keys);
}

export function addCheckin(dateKey: string): void {
  const list = loadCheckins();
  if (!list.includes(dateKey)) {
    list.push(dateKey);
    saveCheckins(list);
  }
}

export function loadDailyAggregates(): DailyAggregateMap {
  return load<DailyAggregateMap>(STORAGE_KEYS.dailyAgg, {});
}

export function saveDailyAggregates(map: DailyAggregateMap): void {
  save(STORAGE_KEYS.dailyAgg, map);
}

export function upsertSession(session: Session): Session[] {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  saveSessions(sessions);
  return sessions;
}

export function deleteSession(sessionId: string): Session[] {
  const sessions = loadSessions().filter((s) => s.id !== sessionId);
  saveSessions(sessions);
  return sessions;
}

export function persistSessionWrite(session: Session, recentLimit = 20): void {
  upsertSession(session);
  const indexByDate = loadIndexByDate();
  const existingList = new Set(indexByDate[session.dateKey] ?? []);
  existingList.add(session.id);
  indexByDate[session.dateKey] = Array.from(existingList);
  saveIndexByDate(indexByDate);

  const recent = loadRecentSessionIds().filter((id) => id !== session.id);
  recent.unshift(session.id);
  saveRecentSessionIds(recent.slice(0, recentLimit));
}

export function removeSessionEverywhere(sessionId: string, dateKey?: string): void {
  deleteSession(sessionId);

  if (dateKey) {
    const indexByDate = loadIndexByDate();
    if (indexByDate[dateKey]) {
      indexByDate[dateKey] = indexByDate[dateKey].filter((id) => id !== sessionId);
      if (indexByDate[dateKey].length === 0) {
        delete indexByDate[dateKey];
      }
      saveIndexByDate(indexByDate);
    }
  }

  const recent = loadRecentSessionIds().filter((id) => id !== sessionId);
  saveRecentSessionIds(recent);
}

export function loadBaseline(): Baseline | null {
  return load<Baseline | null>(STORAGE_KEYS.baseline, null);
}

export function saveBaseline(value: Baseline | null) {
  if (value === null) {
    remove(STORAGE_KEYS.baseline);
  } else {
    save(STORAGE_KEYS.baseline, value);
  }
}

export function loadBaselineWeekKey(): string | null {
  return load<string | null>(STORAGE_KEYS.baselineWeek, null);
}

export function saveBaselineWeekKey(key: string): void {
  save(STORAGE_KEYS.baselineWeek, key);
}

export function loadBadges() {
  return load<MedalUnlock[]>(STORAGE_KEYS.medals, load<MedalUnlock[]>(STORAGE_KEYS.badges, []));
}

export function saveBadges(badges: unknown) {
  save(STORAGE_KEYS.medals, badges as any);
  save(STORAGE_KEYS.badges, badges as any);
}

export function loadPublicProfile(defaultProfile: PublicProfile): PublicProfile {
  return {
    ...defaultProfile,
    ...load<Partial<PublicProfile>>(STORAGE_KEYS.publicProfile, defaultProfile)
  };
}

export function savePublicProfile(profile: PublicProfile) {
  save(STORAGE_KEYS.publicProfile, profile);
}

export function loadSyncState(defaultSyncState: SyncState): SyncState {
  return {
    ...defaultSyncState,
    ...load<Partial<SyncState>>(STORAGE_KEYS.syncState, defaultSyncState)
  };
}

export function saveSyncState(syncState: SyncState) {
  save(STORAGE_KEYS.syncState, syncState);
}

export function loadWelcomePromptState(): WelcomePromptState | null {
  return load<WelcomePromptState | null>(STORAGE_KEYS.welcomePrompt, null);
}

export function saveWelcomePromptState(state: WelcomePromptState | null) {
  if (state === null) {
    remove(STORAGE_KEYS.welcomePrompt);
    return;
  }

  save(STORAGE_KEYS.welcomePrompt, state);
}
