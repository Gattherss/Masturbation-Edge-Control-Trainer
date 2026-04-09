import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrainingWorkspace } from '@/features/training/TrainingWorkspace';
import { getPlan, loadCustomPlan, saveCustomPlan } from '@/lib/plans';
import { loadSettings, saveSettings } from '@/lib/settings';
import SessionsDetailsTable from '@/components/SessionsDetailsTable';
import { todayKey } from '@/lib/time';
import { listSessions } from '@/data/repositories/sessionRepo';
import { compareToBaseline } from '@/lib/baseline';
import { evaluateBadges, getFeaturedBadge, getNextBadgeCandidates, normalizeMedalUnlocks } from '@/lib/badges';
import { loadBadges, loadBaseline } from '@/lib/storage';
import { buildMasterySnapshot } from '@/lib/mastery';
import { buildLeaderboard, buildLadderRating, getCurrentSeason } from '@/lib/ladder';
import { loadProfile, persistProfile } from '@/lib/profile';
import { getSyncState, persistSyncState } from '@/lib/sync';
import { getSupabaseEnv } from '@/lib/supabase';
import { MedalCard } from '@/components/MedalCard';
import type { Badge, Baseline, LadderRating, LeaderboardEntry, PublicProfile, Session, Settings as AppSettings, SyncState } from '@/types/models';
import type { FinalizeResult } from '@/services/scoringPipeline';
import {
  describeSupabaseError,
  fetchLeaderboard,
  listenToSupabaseAuth,
  requestMagicLink,
  restoreSupabaseUser,
  signOutSupabase,
  syncLocalArtifacts
} from '@/services/syncService';

const ReviewPage = lazy(() => import('@/routes/ReviewPage'));
const MedalsPage = lazy(() => import('@/routes/MedalsPage'));
const LadderPage = lazy(() => import('@/routes/LadderPage'));
const SettingsPage = lazy(() => import('@/routes/SettingsPage'));

type ViewTab = 'training' | 'review' | 'medals' | 'ladder' | 'settings';
type RemoteLeaderboardStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function mergeUnlockedMedals(existing: Badge[], generated: Badge[]): Badge[] {
  const map = new Map<string, Badge>();

  normalizeMedalUnlocks(existing).forEach((medal) => {
    map.set(medal.code, medal);
  });

  generated.forEach((medal) => {
    const previous = map.get(medal.code);
    map.set(
      medal.code,
      previous
        ? { ...medal, unlockedAt: previous.unlockedAt, sourceSessionId: previous.sourceSessionId ?? medal.sourceSessionId }
        : medal
    );
  });

  return normalizeMedalUnlocks(Array.from(map.values()));
}

const NAV_ITEMS: Array<{ key: ViewTab; label: string; short: string }> = [
  { key: 'training', label: '训练', short: '训' },
  { key: 'review', label: '复盘', short: '复' },
  { key: 'medals', label: '勋章', short: '章' },
  { key: 'ladder', label: '天梯', short: '梯' },
  { key: 'settings', label: '设置', short: '设' }
];

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
      <div className="text-[13px] uppercase tracking-[0.3em] text-slate-400 drop-shadow-md xl:text-sm">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white xl:text-3xl">{value}</div>
    </div>
  );
}

function getEnglishTabLabel(key: ViewTab) {
  switch (key) {
    case 'training':
      return { label: 'Training', short: 'TR' };
    case 'review':
      return { label: 'Review', short: 'RV' };
    case 'medals':
      return { label: 'Medals', short: 'MD' };
    case 'ladder':
      return { label: 'Ladder', short: 'LD' };
    case 'settings':
      return { label: 'Settings', short: 'ST' };
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [customPlan, setCustomPlan] = useState(() => loadCustomPlan());
  const [sessions, setSessions] = useState<Session[]>(() => listSessions());
  const [baseline, setBaseline] = useState<Baseline | null>(() => loadBaseline());
  const [medals, setMedals] = useState<Badge[]>(() =>
    mergeUnlockedMedals(loadBadges(), evaluateBadges(listSessions()))
  );
  const [profile, setProfile] = useState<PublicProfile>(() => loadProfile());
  const [syncState, setSyncState] = useState<SyncState>(() => getSyncState());
  const [narrative, setNarrative] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewTab>('training');
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [remoteLeaderboardStatus, setRemoteLeaderboardStatus] = useState<RemoteLeaderboardStatus>('idle');
  const [remoteLeaderboardError, setRemoteLeaderboardError] = useState<string | null>(null);
  const autoSyncInFlightRef = useRef(false);

  const plan = useMemo(
    () => (settings.mode === 'custom' ? customPlan : getPlan(settings.mode)),
    [settings.mode, customPlan]
  );

  const baselineComparison = useMemo(
    () => (baseline && sessions.length ? compareToBaseline(baseline, sessions[sessions.length - 1]) : null),
    [baseline, sessions]
  );
  const snapshot = useMemo(() => buildMasterySnapshot(sessions), [sessions]);
  const currentSeason = useMemo(() => getCurrentSeason(), []);
  const supabaseEnv = useMemo(() => getSupabaseEnv(), []);
  const supabaseReady = supabaseEnv.enabled;
  const ladderRating = useMemo(() => buildLadderRating(snapshot), [snapshot]);
  const featuredMedal = useMemo(
    () => medals.find((medal) => medal.code === profile.featuredMedalCode) ?? getFeaturedBadge(medals),
    [medals, profile.featuredMedalCode]
  );
  const previewLeaderboard = useMemo(
    () => buildLeaderboard(profile, ladderRating, featuredMedal),
    [profile, ladderRating, featuredMedal]
  );
  const leaderboard = useMemo(
    () => (remoteLeaderboardStatus === 'ready' && remoteLeaderboard ? remoteLeaderboard : previewLeaderboard),
    [previewLeaderboard, remoteLeaderboard, remoteLeaderboardStatus]
  );
  const leaderboardSource = remoteLeaderboardStatus === 'ready' ? 'supabase' : 'preview';
  const nextMedal = useMemo(() => {
    const candidate = getNextBadgeCandidates(sessions, 1)[0];
    return candidate
      ? {
          medal: candidate.def,
          progressHint: candidate.progress.hint,
          progressPercent: candidate.progress.percent
        }
      : null;
  }, [sessions]);

  const handleSyncStateChange = useCallback((nextSyncState: SyncState) => {
    setSyncState(nextSyncState);
  }, []);

  const refreshRemoteLeaderboard = useCallback(async () => {
    if (!supabaseReady) {
      setRemoteLeaderboard(null);
      setRemoteLeaderboardStatus('idle');
      setRemoteLeaderboardError(null);
      return;
    }

    try {
      setRemoteLeaderboardStatus('loading');
      setRemoteLeaderboardError(null);
      const entries = await fetchLeaderboard(50);
      setRemoteLeaderboard(entries);
      setRemoteLeaderboardStatus(entries.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setRemoteLeaderboard(null);
      setRemoteLeaderboardStatus('error');
      setRemoteLeaderboardError(describeSupabaseError(error));
    }
  }, [supabaseReady]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';

    return () => {
      delete document.documentElement.dataset.reduceMotion;
    };
  }, [settings.reduceMotion]);

  useEffect(() => {
    persistSyncState(syncState);
  }, [syncState]);

  useEffect(() => {
    if (supabaseReady) {
      return;
    }

    setSyncState((prev) => ({
      ...prev,
      provider: 'local',
      status: prev.status === 'error' ? 'error' : 'idle',
      userId: undefined
    }));
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) return;

    let active = true;
    const applyUser = (user: { id: string; email?: string | null } | null) => {
      if (!active) return;
      setSyncState((prev) => ({
        ...prev,
        provider: user ? 'supabase' : 'local',
        status: prev.status === 'syncing' ? 'syncing' : 'idle',
        userId: user?.id,
        email: user?.email ?? prev.email,
        lastError: undefined
      }));
    };

    restoreSupabaseUser()
      .then((user) => applyUser(user))
      .catch((error) => {
        if (!active) return;
        setSyncState((prev) => ({
          ...prev,
          provider: 'local',
          status: 'error',
          lastError: describeSupabaseError(error)
        }));
      });

    const unsubscribe = listenToSupabaseAuth((user) => applyUser(user));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [supabaseReady]);

  useEffect(() => {
    void refreshRemoteLeaderboard();
  }, [refreshRemoteLeaderboard, syncState.userId]);

  const refreshAppState = useCallback(() => {
    const nextSessions = listSessions();
    const nextBaseline = loadBaseline();
    const mergedMedals = mergeUnlockedMedals(loadBadges(), evaluateBadges(nextSessions));

    setSessions(nextSessions);
    setBaseline(nextBaseline);
    setSettings(loadSettings());
    setCustomPlan(loadCustomPlan());
    setMedals(mergedMedals);
    setProfile(loadProfile());
    setSyncState(getSyncState());
  }, []);

  const handleSettingsChange = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  }, []);

  const handleCustomPlanChange = useCallback((nextPlan: typeof customPlan) => {
    setCustomPlan(nextPlan);
    saveCustomPlan(nextPlan.targetStim, nextPlan.targetRest);
  }, []);

  const handleProfileChange = useCallback((nextProfile: PublicProfile) => {
    const normalized = { ...nextProfile, updatedAt: new Date().toISOString() };
    setProfile(normalized);
    persistProfile(normalized);
  }, []);

  const handleRequestMagicLink = useCallback(async () => {
    if (!syncState.email) {
      setToast('先填写登录邮箱，再发送 Magic Link。');
      return;
    }

    try {
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'syncing',
        lastError: undefined
      });
      await requestMagicLink(syncState.email);
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'idle',
        lastError: undefined
      });
      setToast('Magic Link 已发送，请去邮箱完成登录。');
    } catch (error) {
      const message = describeSupabaseError(error);
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'error',
        lastError: message
      });
      setToast(message);
    }
  }, [handleSyncStateChange, syncState]);

  const handleSyncNow = useCallback(async () => {
    try {
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'syncing',
        lastError: undefined
      });

      const result = await syncLocalArtifacts({
        syncState,
        profile,
        sessions,
        medals,
        ladderRating,
        season: currentSeason
      });

      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'idle',
        lastSyncedAt: new Date().toISOString(),
        lastError: undefined
      });

      void refreshRemoteLeaderboard();
      setToast(`已同步 ${result.syncedSessions} 条记录和 ${result.syncedMedals} 枚勋章。`);
    } catch (error) {
      const message = describeSupabaseError(error);
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'error',
        lastError: message
      });
      setToast(message);
    }
  }, [currentSeason, handleSyncStateChange, ladderRating, medals, profile, refreshRemoteLeaderboard, sessions, syncState]);

  const syncArtifacts = useCallback(async (payload?: {
    sessions?: Session[];
    medals?: Badge[];
    ladderRating?: LadderRating;
    successMessage?: string;
    failureMessage?: string;
    silentSuccess?: boolean;
  }) => {
    if (!supabaseReady || !syncState.userId || autoSyncInFlightRef.current) {
      return false;
    }

    autoSyncInFlightRef.current = true;

    try {
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'syncing',
        lastError: undefined
      });

      const sessionsToSync = payload?.sessions ?? sessions;
      const medalsToSync = payload?.medals ?? medals;
      const ladderToSync = payload?.ladderRating ?? ladderRating;
      const result = await syncLocalArtifacts({
        syncState,
        profile,
        sessions: sessionsToSync,
        medals: medalsToSync,
        ladderRating: ladderToSync,
        season: currentSeason
      });

      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'idle',
        lastSyncedAt: new Date().toISOString(),
        lastError: undefined
      });

      void refreshRemoteLeaderboard();

      if (!payload?.silentSuccess) {
        setToast(payload?.successMessage ?? `已同步 ${result.syncedSessions} 条记录和 ${result.syncedMedals} 枚勋章。`);
      }

      return true;
    } catch (error) {
      const message = describeSupabaseError(error);
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'error',
        lastError: message
      });
      setToast(payload?.failureMessage ?? message);
      return false;
    } finally {
      autoSyncInFlightRef.current = false;
    }
  }, [currentSeason, handleSyncStateChange, ladderRating, medals, profile, refreshRemoteLeaderboard, sessions, supabaseReady, syncState]);

  const handleDisconnectSupabase = useCallback(async () => {
    try {
      await signOutSupabase();
      handleSyncStateChange({
        ...syncState,
        provider: 'local',
        status: 'idle',
        userId: undefined,
        lastError: undefined
      });
      void refreshRemoteLeaderboard();
      setToast('已退出 Supabase，会继续保留本地数据。');
    } catch (error) {
      const message = describeSupabaseError(error);
      handleSyncStateChange({
        ...syncState,
        status: 'error',
        lastError: message
      });
      setToast(message);
    }
  }, [handleSyncStateChange, refreshRemoteLeaderboard, syncState]);

  const handleTrainingSaved = useCallback((result: FinalizeResult) => {
      const mergedMedals = mergeUnlockedMedals(medals, evaluateBadges(result.sessions));
      const existingCodes = new Set(medals.map((medal) => medal.code));
      const newMedals = mergedMedals.filter((medal) => !existingCodes.has(medal.code));
      const nextSnapshot = buildMasterySnapshot(result.sessions);
      const nextLadderRating = buildLadderRating(nextSnapshot);

      setSessions(result.sessions);
      setBaseline(result.baseline);
      setMedals(mergedMedals);
      setNarrative(result.narrative);
      setSuggestions(result.suggestions);

      let savedMessage = result.baselineMessage ?? '已保存训练记录';

      if (newMedals.length > 0) {
        const names = newMedals.slice(0, 2).map((medal) => medal.name).join('、');
        const more = newMedals.length > 2 ? ' …' : '';
        const prefix = result.baselineMessage ? `${result.baselineMessage} ` : '';
        savedMessage = `${prefix}新勋章：${names}${more}`;
      }

      if (supabaseReady && syncState.userId) {
        setToast(`${savedMessage} 正在同步到云端…`);
        void syncArtifacts({
          sessions: result.sessions,
          medals: mergedMedals,
          ladderRating: nextLadderRating,
          successMessage: `${savedMessage} 已同步到云端。`,
          failureMessage: `${savedMessage} 已保存在当前设备，云端同步稍后再试。`
        });
        return;
      }

      setToast(savedMessage);
    },
    [medals, supabaseReady, syncState.userId, syncArtifacts]
  );

  const trainingCompanion = (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
        <h2 className="text-3xl font-semibold text-white drop-shadow-md xl:text-4xl">Season Snapshot / 当赛季表现 (S{currentSeason.name})</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SummaryChip label="Mastery" value={String(Math.round(snapshot.masteryScore))} />
          <SummaryChip label="Ladder" value={`${ladderRating.tier} ${ladderRating.division}`} />
          <SummaryChip label="Score" value={String(ladderRating.score)} />
          <SummaryChip label="Today" value={todayKey()} />
        </div>
        {narrative ? (
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">最近一次总结</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{narrative}</p>
            {suggestions.length ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {suggestions.map((item) => (
                  <li key={item} className="rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {featuredMedal ? (
        <MedalCard medal={featuredMedal} unlocked />
      ) : nextMedal?.medal ? (
        <MedalCard
          medal={nextMedal.medal}
          unlocked={false}
          progressPercent={nextMedal.progressPercent}
          hint={nextMedal.progressHint}
        />
      ) : null}
    </div>
  );

  const settingsDataPanel = (
    <SessionsDetailsTable
      sessions={sessions}
      settings={settings}
      baseline={baseline}
      currentPlan={plan}
      profile={profile}
      syncState={syncState}
      onDataChanged={refreshAppState}
      limit={20}
      title="数据账本与导入导出"
      showTransferTools
    />
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-4 sm:px-6 xl:px-10 2xl:px-12">
        <header className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.36em] text-sky-400 drop-shadow-md">寸止边缘训练器 / Edge Control Trainer</p>
              <h1 className="mt-3 text-5xl font-bold tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] xl:text-6xl">Edge Control Trainer</h1>
              <p className="mt-3 text-lg text-slate-300 xl:text-xl">寸止边缘训练器</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryChip label="Season" value={currentSeason.name} />
              <SummaryChip label="Sync" value={`${syncState.provider} · ${syncState.status}`} />
              <SummaryChip label="Sessions" value={`${sessions.length} 回合`} />
            </div>
          </div>

          <nav className="mt-6 hidden flex-wrap gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={
                  'rounded-full px-4 py-2.5 text-base transition ' +
                  (view === item.key
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]')
                }
                onClick={() => setView(item.key)}
              >
                <span className="font-semibold">{getEnglishTabLabel(item.key).label}</span>
                <span className="ml-2 text-sm text-slate-500">{item.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="mt-6 space-y-6">
          {view === 'training' ? (
            <TrainingWorkspace
              plan={plan}
              settings={settings}
              onSaved={handleTrainingSaved}
              onToast={(message) => setToast(message)}
            />
          ) : null}
          {view === 'training' ? trainingCompanion : null}

          <Suspense
            fallback={
              <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-400 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                页面正在装配中……
              </section>
            }
          >
            {view === 'review' ? (
              <ReviewPage
                sessions={sessions}
                baseline={baseline}
                baselineComparison={baselineComparison}
                snapshot={snapshot}
                ladderRating={ladderRating}
                featuredMedal={featuredMedal}
                nextMedal={nextMedal}
                currentPlan={plan}
                settings={settings}
                onDataChanged={refreshAppState}
              />
            ) : null}

            {view === 'medals' ? <MedalsPage sessions={sessions} medals={medals} /> : null}

            {view === 'ladder' ? (
              <LadderPage
                season={currentSeason}
                rating={ladderRating}
                leaderboard={leaderboard}
                leaderboardSource={leaderboardSource}
                leaderboardStatus={remoteLeaderboardStatus}
                leaderboardError={remoteLeaderboardError}
                profile={profile}
                featuredMedal={featuredMedal}
              />
            ) : null}

            {view === 'settings' ? (
              <SettingsPage
                settings={settings}
                customPlan={customPlan}
                profile={profile}
                syncState={syncState}
                medals={medals}
                dataPanel={settingsDataPanel}
                supabaseReady={supabaseReady}
                supabaseProjectHost={supabaseEnv.projectHost ?? undefined}
                supabaseMissingKeys={supabaseEnv.missingKeys}
                hasSupabaseSession={Boolean(syncState.userId)}
                remoteLeaderboardStatus={remoteLeaderboardStatus}
                remoteLeaderboardCount={remoteLeaderboard?.length ?? 0}
                remoteLeaderboardError={remoteLeaderboardError}
                onSettingsChange={handleSettingsChange}
                onCustomPlanChange={handleCustomPlanChange}
                onProfileChange={handleProfileChange}
                onSyncStateChange={handleSyncStateChange}
                onRequestMagicLink={handleRequestMagicLink}
                onSyncNow={() => void syncArtifacts()}
                onSignOutSupabase={handleDisconnectSupabase}
              />
            ) : null}
          </Suspense>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-50 mx-auto flex w-[min(94vw,720px)] items-center justify-between rounded-full border border-white/10 bg-slate-950/90 px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={
              'flex min-w-[56px] flex-col items-center rounded-full px-3 py-2 text-[11px] transition ' +
              (view === item.key
                ? 'bg-white text-slate-950'
                : 'text-slate-300')
            }
            onClick={() => setView(item.key)}
          >
            <span className="text-sm font-semibold">{getEnglishTabLabel(item.key).short}</span>
            <span>{getEnglishTabLabel(item.key).label}</span>
          </button>
        ))}
      </nav>

      {toast ? (
        <div className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/92 px-4 py-2 text-sm text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {toast}
          <button type="button" className="ml-3 text-xs text-slate-400 underline" onClick={() => setToast(null)}>
            关闭
          </button>
        </div>
      ) : null}
    </div>
  );
}
