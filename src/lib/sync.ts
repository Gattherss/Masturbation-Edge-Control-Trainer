import type { SyncState } from '@/types/models';
import { loadSyncState, saveSyncState } from './storage';

export const DEFAULT_SYNC_STATE: SyncState = {
  provider: 'local',
  status: 'idle'
};

export function getSyncState() {
  return loadSyncState(DEFAULT_SYNC_STATE);
}

export function persistSyncState(syncState: SyncState) {
  saveSyncState(syncState);
}

