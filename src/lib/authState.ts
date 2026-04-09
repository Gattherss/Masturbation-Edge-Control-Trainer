import type { SyncState, WelcomePromptState } from '@/types/models';
import { shouldShowWelcomePrompt } from '@/lib/welcomePrompt';

interface AuthUserLike {
  id: string;
  email?: string | null;
}

export function applySupabaseUserSyncState(prev: SyncState, user: AuthUserLike | null): SyncState {
  return {
    ...prev,
    provider: user ? 'supabase' : 'local',
    status: prev.status === 'syncing' ? 'syncing' : 'idle',
    userId: user?.id,
    email: user?.email ?? prev.email,
    lastError: undefined
  };
}

export function applySupabaseRestoreErrorSyncState(prev: SyncState, message: string): SyncState {
  return {
    ...prev,
    provider: 'local',
    status: 'error',
    userId: undefined,
    lastError: message
  };
}

export function shouldOpenWelcomeGate(params: {
  supabaseReady: boolean;
  authBootstrapComplete: boolean;
  syncState: Pick<SyncState, 'userId'>;
  welcomePromptState: WelcomePromptState | null;
  forcedOpen?: boolean;
}, now = new Date()) {
  if (params.syncState.userId) {
    return false;
  }

  if (params.forcedOpen) {
    return true;
  }

  return (
    params.supabaseReady &&
    params.authBootstrapComplete &&
    shouldShowWelcomePrompt(params.welcomePromptState, now)
  );
}
