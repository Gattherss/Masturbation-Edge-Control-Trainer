import type { Baseline, Plan, PublicProfile, Session, Settings, SyncState } from '@/types/models';

export function toDataJSON(
  version: string,
  plan: Plan,
  settings: Settings,
  baseline: Baseline | null,
  sessions: Session[],
  profile?: PublicProfile,
  syncState?: SyncState
) {
  return {
    version,
    exported_at: new Date().toISOString(),
    plan,
    settings,
    baseline,
    profile,
    syncState,
    sessions
  };
}
