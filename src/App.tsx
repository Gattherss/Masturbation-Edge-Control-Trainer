import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { TrainingView } from '@/features/training/TrainingView';
import { useTrainingMachine } from '@/features/training/useTrainingMachine';
import { getPlan, loadCustomPlan, saveCustomPlan } from '@/lib/plans';
import { loadSettings, saveSettings } from '@/lib/settings';
import { Modal } from '@/components/Modal';
import SessionsDetailsTable from '@/components/SessionsDetailsTable';
import { formatDuration, todayKey } from '@/lib/time';
import { listSessions } from '@/data/repositories/sessionRepo';
import { compareToBaseline } from '@/lib/baseline';
import { evaluateBadges, getFeaturedBadge, getNextBadgeCandidates } from '@/lib/badges';
import { loadBadges, loadBaseline } from '@/lib/storage';
import { buildMasterySnapshot } from '@/lib/mastery';
import { buildLeaderboard, buildLadderRating, getCurrentSeason } from '@/lib/ladder';
import { loadProfile, persistProfile } from '@/lib/profile';
import { getSyncState, persistSyncState } from '@/lib/sync';
import { getSupabaseEnv } from '@/lib/supabase';
import { MedalCard } from '@/components/MedalCard';
import type { Badge, Baseline, LeaderboardEntry, PublicProfile, Session, Settings as AppSettings, SyncState } from '@/types/models';
import {
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

interface NoteForm {
  note: string;
  perceivedArousal: number | null;
  stopReason: string;
}

function mergeUnlockedMedals(existing: Badge[], generated: Badge[]): Badge[] {
  const map = new Map<string, Badge>();

  existing.forEach((medal) => {
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

  return Array.from(map.values()).sort((a, b) => Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt));
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
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md transform-gpu">
      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400 drop-shadow-md">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [customPlan, setCustomPlan] = useState(() => loadCustomPlan());
  const [sessions, setSessions] = useState<Session[]>(() => listSessions());
  const [baseline, setBaseline] = useState<Baseline | null>(() => loadBaseline());
  const [medals, setMedals] = useState<Badge[]>(() =>
    mergeUnlockedMedals(loadBadges() as Badge[], evaluateBadges(listSessions()))
  );
  const [profile, setProfile] = useState<PublicProfile>(() => loadProfile());
  const [syncState, setSyncState] = useState<SyncState>(() => getSyncState());
  const [narrative, setNarrative] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState<NoteForm>({ note: '', perceivedArousal: null, stopReason: '' });
  const [view, setView] = useState<ViewTab>('training');
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [remoteLeaderboardStatus, setRemoteLeaderboardStatus] = useState<RemoteLeaderboardStatus>('idle');
  const [remoteLeaderboardError, setRemoteLeaderboardError] = useState<string | null>(null);

  const plan = useMemo(
    () => (settings.mode === 'custom' ? customPlan : getPlan(settings.mode)),
    [settings.mode, customPlan]
  );
  const machine = useTrainingMachine({ plan });

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
      setRemoteLeaderboardError(error instanceof Error ? error.message : '公开榜单读取失败');
    }
  }, [supabaseReady]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

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
          lastError: error instanceof Error ? error.message : 'Supabase 会话恢复失败'
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (view !== 'training') return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        machine.switchPhase();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [machine, view]);

  const refreshAppState = useCallback(() => {
    const nextSessions = listSessions();
    const nextBaseline = loadBaseline();
    const mergedMedals = mergeUnlockedMedals(loadBadges() as Badge[], evaluateBadges(nextSessions));

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
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Magic Link 发送失败'
      });
      setToast(error instanceof Error ? error.message : 'Magic Link 发送失败');
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
      handleSyncStateChange({
        ...syncState,
        provider: 'supabase',
        status: 'error',
        lastError: error instanceof Error ? error.message : '同步失败'
      });
      setToast(error instanceof Error ? error.message : '同步失败');
    }
  }, [currentSeason, handleSyncStateChange, ladderRating, medals, profile, refreshRemoteLeaderboard, sessions, syncState]);

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
      handleSyncStateChange({
        ...syncState,
        status: 'error',
        lastError: error instanceof Error ? error.message : '退出 Supabase 失败'
      });
      setToast(error instanceof Error ? error.message : '退出 Supabase 失败');
    }
  }, [handleSyncStateChange, refreshRemoteLeaderboard, syncState]);

  const openFinalizeModal = () => {
    const handle = machine.requestFinalize();
    if (!handle) {
      setToast('当前没有可保存的训练数据');
      return;
    }
    setNoteModalOpen(true);
  };

  const finalizeSession = (payload: NoteForm) => {
    try {
      const normalizedPayload = settings.collectArousalOnFinish
        ? payload
        : { ...payload, perceivedArousal: null };
      const result = machine.finalize(normalizedPayload);

      const mergedMedals = mergeUnlockedMedals(medals, evaluateBadges(result.sessions));
      const existingCodes = new Set(medals.map((medal) => medal.code));
      const newMedals = mergedMedals.filter((medal) => !existingCodes.has(medal.code));

      setSessions(result.sessions);
      setBaseline(result.baseline);
      setMedals(mergedMedals);
      setNarrative(result.narrative);
      setSuggestions(result.suggestions);
      setNoteModalOpen(false);
      setNoteForm({ note: '', perceivedArousal: null, stopReason: '' });

      if (newMedals.length > 0) {
        const names = newMedals.slice(0, 2).map((medal) => medal.name).join('、');
        const more = newMedals.length > 2 ? ' …' : '';
        const prefix = result.baselineMessage ? `${result.baselineMessage} ` : '';
        setToast(`${prefix}新勋章：${names}${more}`);
      } else {
        setToast(result.baselineMessage ?? '已保存训练记录');
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : '保存失败');
      machine.cancelFinalize();
    }
  };

  const trainingCompanion = (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
        <h2 className="text-2xl font-semibold text-white drop-shadow-md">当赛季表现 (S{currentSeason.name})</h2>
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
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.36em] text-sky-400 drop-shadow-md">Edging Trainer V2</p>
              <h1 className="mt-3 text-4xl font-bold tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">边缘控制训练</h1>
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
                  'rounded-full px-4 py-2 text-sm transition ' +
                  (view === item.key
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]')
                }
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mt-6 space-y-6">
          {view === 'training' ? <TrainingView machine={machine} onFinish={openFinalizeModal} restBeepEnabled={settings.restBeep} /> : null}
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
                onSyncNow={handleSyncNow}
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
            <span className="text-sm font-semibold">{item.short}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <Modal
        open={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          machine.cancelFinalize();
        }}
        title="记录训练"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200"
              onClick={() => finalizeSession({ note: '', perceivedArousal: null, stopReason: '' })}
            >
              跳过
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              onClick={() => finalizeSession(noteForm)}
            >
              提交并保存
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-300">训练备注</span>
            <textarea
              className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              value={noteForm.note}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
          {settings.collectArousalOnFinish ? (
            <label className="block text-sm">
              <span className="text-slate-300">主观强度（1-10）</span>
              <input
                type="number"
                min={1}
                max={10}
                value={noteForm.perceivedArousal ?? ''}
                onChange={(event) =>
                  setNoteForm((prev) => ({
                    ...prev,
                    perceivedArousal: event.target.value ? Number(event.target.value) : null
                  }))
                }
                className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-slate-300">停止原因</span>
            <select
              className="mt-2 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200"
              value={noteForm.stopReason}
              onChange={(event) => setNoteForm((prev) => ({ ...prev, stopReason: event.target.value }))}
            >
              <option value="">未选择</option>
              {['自然结束', '达到目标', '疲劳', '无聊', '射精', '其他'].map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>

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
