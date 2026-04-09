import { describe, expect, it } from 'vitest';
import type { SyncState, WelcomePromptState } from '@/types/models';
import {
  applySupabaseRestoreErrorSyncState,
  applySupabaseUserSyncState,
  shouldOpenWelcomeGate
} from '@/lib/authState';

describe('applySupabaseUserSyncState', () => {
  it('clears the persisted user id when no Supabase user is available', () => {
    const previous: SyncState = {
      provider: 'supabase',
      status: 'idle',
      userId: 'stale-user',
      email: 'person@example.com'
    };

    expect(applySupabaseUserSyncState(previous, null)).toEqual({
      provider: 'local',
      status: 'idle',
      userId: undefined,
      email: 'person@example.com',
      lastError: undefined
    });
  });

  it('keeps the syncing state while a fresh user is being applied', () => {
    const previous: SyncState = {
      provider: 'local',
      status: 'syncing',
      email: 'person@example.com'
    };

    expect(
      applySupabaseUserSyncState(previous, {
        id: 'user-1',
        email: 'person@example.com'
      })
    ).toEqual({
      provider: 'supabase',
      status: 'syncing',
      userId: 'user-1',
      email: 'person@example.com',
      lastError: undefined
    });
  });
});

describe('applySupabaseRestoreErrorSyncState', () => {
  it('removes stale auth identity after a restore failure', () => {
    const previous: SyncState = {
      provider: 'supabase',
      status: 'idle',
      userId: 'stale-user',
      email: 'person@example.com'
    };

    expect(
      applySupabaseRestoreErrorSyncState(previous, 'Auth session missing!')
    ).toEqual({
      provider: 'local',
      status: 'error',
      userId: undefined,
      email: 'person@example.com',
      lastError: 'Auth session missing!'
    });
  });
});

describe('shouldOpenWelcomeGate', () => {
  it('opens when the dialog is manually requested even after a guest snooze', () => {
    const welcomePromptState: WelcomePromptState = {
      mode: 'guest',
      updatedAt: '2026-04-09T00:00:00.000Z'
    };

    expect(
      shouldOpenWelcomeGate({
        supabaseReady: true,
        authBootstrapComplete: true,
        syncState: {},
        welcomePromptState,
        forcedOpen: true
      })
    ).toBe(true);
  });

  it('stays closed when a user session already exists', () => {
    expect(
      shouldOpenWelcomeGate({
        supabaseReady: true,
        authBootstrapComplete: true,
        syncState: { userId: 'user-1' },
        welcomePromptState: null,
        forcedOpen: true
      })
    ).toBe(false);
  });
});
