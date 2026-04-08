import type { Session } from '@/types/models';
import {
  loadIndexByDate,
  loadRecentSessionIds,
  loadSessions,
  saveIndexByDate,
  saveRecentSessionIds,
  saveSessions
} from '@/lib/storage';
import { updateDailyAggOnSave, removeSessionFromAgg } from '../services/aggregator';

export function listSessions(): Session[] {
  return loadSessions().sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

export function getSessionById(id: string): Session | undefined {
  return listSessions().find((session) => session.id === id);
}

export function listSessionsByDateRange(startKey: string, endKey: string): Session[] {
  const sessions = listSessions();
  return sessions.filter((session) => session.dateKey >= startKey && session.dateKey <= endKey);
}

export function getRecentSessions(limit = 20): Session[] {
  const sessions = listSessions();
  const recentIds = loadRecentSessionIds();
  const mapped = recentIds
    .map((id) => sessions.find((session) => session.id === id))
    .filter((session): session is Session => Boolean(session));
  return mapped.slice(0, limit);
}

interface SaveResult {
  sessions: Session[];
  current: Session;
  previous: Session | null;
}

export function saveSession(session: Session, recentLimit = 20): SaveResult {
  const sessions = loadSessions();
  const idx = sessions.findIndex((item) => item.id === session.id);
  const previous = idx >= 0 ? sessions[idx] : null;

  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }

  saveSessions(sessions);
  updateIndexes(session, previous, recentLimit);
  updateDailyAggOnSave(session, previous);

  return { sessions: listSessions(), current: session, previous };
}

function updateIndexes(session: Session, previous: Session | null, recentLimit: number) {
  const indexByDate = loadIndexByDate();
  if (previous && previous.dateKey !== session.dateKey) {
    indexByDate[previous.dateKey] = (indexByDate[previous.dateKey] ?? []).filter(
      (id) => id !== previous.id
    );
    if (indexByDate[previous.dateKey]?.length === 0) {
      delete indexByDate[previous.dateKey];
    }
  }

  const list = new Set(indexByDate[session.dateKey] ?? []);
  list.add(session.id);
  indexByDate[session.dateKey] = Array.from(list);
  saveIndexByDate(indexByDate);

  const recent = loadRecentSessionIds().filter((id) => id !== session.id);
  recent.unshift(session.id);
  saveRecentSessionIds(recent.slice(0, recentLimit));
}

export function removeSession(sessionId: string): Session | null {
  const sessions = loadSessions();
  const idx = sessions.findIndex((item) => item.id === sessionId);
  if (idx === -1) {
    return null;
  }

  const removed = sessions.splice(idx, 1)[0];
  saveSessions(sessions);

  const indexByDate = loadIndexByDate();
  if (indexByDate[removed.dateKey]) {
    indexByDate[removed.dateKey] = indexByDate[removed.dateKey].filter((id) => id !== sessionId);
    if (indexByDate[removed.dateKey].length === 0) {
      delete indexByDate[removed.dateKey];
    }
    saveIndexByDate(indexByDate);
  }

  const recent = loadRecentSessionIds().filter((id) => id !== sessionId);
  saveRecentSessionIds(recent);

  removeSessionFromAgg(removed);

  return removed;
}
