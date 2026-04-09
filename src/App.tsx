import { Suspense, lazy, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrainingWorkspace } from '@/features/training/TrainingWorkspace';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { getPlan, loadCustomPlan, saveCustomPlan } from '@/lib/plans';
import { loadSettings, saveSettings } from '@/lib/settings';
import SessionsDetailsTable from '@/components/SessionsDetailsTable';
import { WelcomeGate } from '@/components/WelcomeGate';
import { todayKey } from '@/lib/time';
import { listSessions, removeSession as removeStoredSession } from '@/data/repositories/sessionRepo';
import { compareToBaseline } from '@/lib/baseline';
import { evaluateBadges, getFeaturedBadge, getNextBadgeCandidates, normalizeMedalUnlocks } from '@/lib/badges';
import { loadBadges, loadBaseline, saveBadges } from '@/lib/storage';
import { buildMasterySnapshot } from '@/lib/mastery';
import { buildLeaderboard, buildLadderRating, getCurrentSeason } from '@/lib/ladder';
import { loadProfile, persistProfile } from '@/lib/profile';
import { getSyncState, persistSyncState } from '@/lib/sync';
import { getSupabaseEnv } from '@/lib/supabase';
import {
  applySupabaseRestoreErrorSyncState,
  applySupabaseUserSyncState,
  shouldOpenWelcomeGate
} from '@/lib/authState';
import {
  buildGuestWelcomePromptState,
  buildLaterWelcomePromptState,
  getWelcomePromptState,
  persistWelcomePromptState
} from '@/lib/welcomePrompt';
import { MedalCard } from '@/components/MedalCard';
import type {
  AppThemeId,
  Badge,
  Baseline,
  LadderRating,
  LeaderboardEntry,
  PublicProfile,
  Session,
  Settings as AppSettings,
  SyncState
} from '@/types/models';
import type { FinalizeResult } from '@/services/scoringPipeline';
import { handleBaselineAfterDelete } from '@/services/baselineService';
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

const VIEW_SEQUENCE: ViewTab[] = ['training', 'review', 'medals', 'ladder', 'settings'];

const THEME_OPTIONS: Array<{
  id: AppThemeId;
  label: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    id: 'midnight',
    label: 'Midnight',
    activeClass: 'bg-sky-100 text-slate-950 shadow-[0_12px_36px_rgba(125,211,252,0.24)]',
    dotClass: 'bg-sky-400'
  },
  {
    id: 'ember',
    label: 'Ember',
    activeClass: 'bg-amber-100 text-stone-950 shadow-[0_12px_36px_rgba(251,191,36,0.24)]',
    dotClass: 'bg-amber-400'
  },
  {
    id: 'tide',
    label: 'Tide',
    activeClass: 'bg-emerald-100 text-emerald-950 shadow-[0_12px_36px_rgba(45,212,191,0.22)]',
    dotClass: 'bg-emerald-400'
  }
];

const VIEW_META: Record<
  ViewTab,
  {
    eyebrowClass: string;
    headerShellClass: string;
    activeNavClass: string;
    pageAuraClass: string;
    pageGlowTopClass: string;
    pageGlowBottomClass: string;
    railClass: string;
  }
> = {
  training: {
    eyebrowClass: 'text-sky-300',
    headerShellClass: 'border-sky-300/18 bg-gradient-to-br from-sky-400/[0.14] via-white/[0.05] to-white/[0.03]',
    activeNavClass: 'bg-sky-100 text-slate-950 shadow-[0_14px_40px_rgba(56,189,248,0.24)]',
    pageAuraClass: 'from-sky-400/18 via-cyan-300/10 to-transparent',
    pageGlowTopClass: 'bg-sky-400/16',
    pageGlowBottomClass: 'bg-cyan-400/14',
    railClass: 'border-sky-300/18 bg-sky-400/10 text-sky-100'
  },
  review: {
    eyebrowClass: 'text-amber-300',
    headerShellClass: 'border-amber-300/18 bg-gradient-to-br from-amber-300/[0.16] via-white/[0.05] to-white/[0.03]',
    activeNavClass: 'bg-amber-100 text-stone-950 shadow-[0_14px_40px_rgba(251,191,36,0.22)]',
    pageAuraClass: 'from-amber-300/18 via-orange-300/10 to-transparent',
    pageGlowTopClass: 'bg-amber-400/14',
    pageGlowBottomClass: 'bg-orange-400/12',
    railClass: 'border-amber-300/18 bg-amber-300/12 text-amber-50'
  },
  medals: {
    eyebrowClass: 'text-rose-200',
    headerShellClass: 'border-rose-300/18 bg-gradient-to-br from-rose-300/[0.16] via-white/[0.05] to-white/[0.03]',
    activeNavClass: 'bg-rose-100 text-rose-950 shadow-[0_14px_40px_rgba(251,113,133,0.22)]',
    pageAuraClass: 'from-rose-300/18 via-fuchsia-300/10 to-transparent',
    pageGlowTopClass: 'bg-rose-400/14',
    pageGlowBottomClass: 'bg-fuchsia-400/12',
    railClass: 'border-rose-300/18 bg-rose-300/12 text-rose-50'
  },
  ladder: {
    eyebrowClass: 'text-emerald-300',
    headerShellClass: 'border-emerald-300/18 bg-gradient-to-br from-emerald-300/[0.15] via-white/[0.05] to-white/[0.03]',
    activeNavClass: 'bg-emerald-100 text-emerald-950 shadow-[0_14px_40px_rgba(52,211,153,0.22)]',
    pageAuraClass: 'from-emerald-300/18 via-teal-300/10 to-transparent',
    pageGlowTopClass: 'bg-emerald-400/14',
    pageGlowBottomClass: 'bg-teal-400/12',
    railClass: 'border-emerald-300/18 bg-emerald-300/12 text-emerald-50'
  },
  settings: {
    eyebrowClass: 'text-indigo-200',
    headerShellClass: 'border-indigo-300/18 bg-gradient-to-br from-indigo-300/[0.14] via-white/[0.05] to-white/[0.03]',
    activeNavClass: 'bg-indigo-100 text-indigo-950 shadow-[0_14px_40px_rgba(165,180,252,0.22)]',
    pageAuraClass: 'from-indigo-300/18 via-sky-300/10 to-transparent',
    pageGlowTopClass: 'bg-indigo-400/14',
    pageGlowBottomClass: 'bg-sky-400/12',
    railClass: 'border-indigo-300/18 bg-indigo-300/12 text-indigo-50'
  }
};

function getAdjacentView(current: ViewTab, direction: 'prev' | 'next') {
  const currentIndex = VIEW_SEQUENCE.indexOf(current);
  if (currentIndex === -1) {
    return current;
  }

  const nextIndex =
    direction === 'next'
      ? Math.min(VIEW_SEQUENCE.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1);

  return VIEW_SEQUENCE[nextIndex];
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, input, textarea, select, a, [role="dialog"], [data-swipe-lock="true"]'))
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md md:rounded-[24px] md:px-5 md:py-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 drop-shadow-md md:text-[13px] xl:text-sm">{label}</div>
      <div className="mt-1.5 text-xl font-semibold text-white md:mt-2 md:text-2xl xl:text-3xl">{value}</div>
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

function getSyncSummaryValue(syncState: SyncState, supabaseReady: boolean) {
  if (syncState.status === 'syncing') return '同步中';
  if (syncState.status === 'error') return '稍后重试';
  if (syncState.userId) return '已连接';
  return supabaseReady ? '可同步' : '仅本地';
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
  const [welcomePromptState, setWelcomePromptState] = useState(() => getWelcomePromptState());
  const [authBootstrapComplete, setAuthBootstrapComplete] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewTab>('training');
  const [pageDirection, setPageDirection] = useState(1);
  const [welcomeGateManuallyOpen, setWelcomeGateManuallyOpen] = useState(false);
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = useState(false);
  const [remoteLeaderboard, setRemoteLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [remoteLeaderboardStatus, setRemoteLeaderboardStatus] = useState<RemoteLeaderboardStatus>('idle');
  const [remoteLeaderboardError, setRemoteLeaderboardError] = useState<string | null>(null);
  const autoSyncInFlightRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

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
  const activeTheme = useMemo(
    () => THEME_OPTIONS.find((theme) => theme.id === settings.theme) ?? THEME_OPTIONS[0],
    [settings.theme]
  );
  const activeViewMeta = VIEW_META[view];
  const welcomePromptOpen = useMemo(
    () =>
      shouldOpenWelcomeGate({
        supabaseReady,
        authBootstrapComplete,
        syncState,
        welcomePromptState,
        sessionCount: sessions.length,
        forcedOpen: welcomeGateManuallyOpen
      }),
    [authBootstrapComplete, sessions.length, supabaseReady, syncState, welcomeGateManuallyOpen, welcomePromptState]
  );
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

  const handleWelcomePromptStateChange = useCallback((nextState: ReturnType<typeof getWelcomePromptState>) => {
    setWelcomePromptState(nextState);
    persistWelcomePromptState(nextState);
  }, []);

  const navigateToView = useCallback(
    (nextView: ViewTab) => {
      if (nextView === view) {
        return;
      }

      setPageDirection(VIEW_SEQUENCE.indexOf(nextView) > VIEW_SEQUENCE.indexOf(view) ? 1 : -1);
      setView(nextView);
    },
    [view]
  );

  const handleThemeChange = useCallback(
    (theme: AppThemeId) => {
      if (theme === settings.theme) {
        return;
      }

      const nextSettings = { ...settings, theme };
      setSettings(nextSettings);
      saveSettings(nextSettings);
    },
    [settings]
  );

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
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = settings.theme;

    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [settings.theme]);

  useEffect(() => {
    persistSyncState(syncState);
  }, [syncState]);

  useEffect(() => {
    if (!syncState.userId) {
      return;
    }

    setWelcomeGateManuallyOpen(false);
    setMobileHeaderExpanded(false);
    handleWelcomePromptStateChange(null);
  }, [handleWelcomePromptStateChange, syncState.userId]);

  useEffect(() => {
    if (supabaseReady) {
      return;
    }

    setAuthBootstrapComplete(true);
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
    setAuthBootstrapComplete(false);

    const applyUser = (user: { id: string; email?: string | null } | null) => {
      if (!active) return;
      setSyncState((prev) => applySupabaseUserSyncState(prev, user));
    };

    restoreSupabaseUser()
      .then((user) => {
        applyUser(user);
        if (!active) return;
        setAuthBootstrapComplete(true);
      })
      .catch((error) => {
        if (!active) return;
        setSyncState((prev) => applySupabaseRestoreErrorSyncState(prev, describeSupabaseError(error)));
        setAuthBootstrapComplete(true);
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
      setToast('先填登录邮箱，再发送登录链接。');
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
      setToast('登录链接已发送，请去邮箱完成确认。');
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

  const handleWelcomeEmailChange = useCallback(
    (email: string) => {
      handleSyncStateChange({
        ...syncState,
        email
      });
    },
    [handleSyncStateChange, syncState]
  );

  const snoozeWelcomePrompt = useCallback(
    (showToast: boolean) => {
      setWelcomeGateManuallyOpen(false);
      setMobileHeaderExpanded(false);
      handleWelcomePromptStateChange(buildLaterWelcomePromptState());
      if (showToast) {
        setToast('先不登录也可以，我们今天先不再提醒你。');
      }
    },
    [handleWelcomePromptStateChange]
  );

  const handleContinueAsGuest = useCallback(() => {
    setWelcomeGateManuallyOpen(false);
    setMobileHeaderExpanded(false);
    handleWelcomePromptStateChange(buildGuestWelcomePromptState());
    setToast('当前将以游客模式继续，记录会先保存在这台设备上。');
  }, [handleWelcomePromptStateChange]);

  const handleOpenSyncAccess = useCallback(() => {
    if (syncState.userId || !supabaseReady) {
      navigateToView('settings');
      return;
    }

    setMobileHeaderExpanded(false);
    setWelcomeGateManuallyOpen(true);
  }, [navigateToView, supabaseReady, syncState.userId]);

  const handleCloseWelcomeGate = useCallback(() => {
    if (welcomeGateManuallyOpen) {
      setWelcomeGateManuallyOpen(false);
      return;
    }

    snoozeWelcomePrompt(false);
  }, [welcomeGateManuallyOpen, snoozeWelcomePrompt]);

  const handleMainTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    if (welcomePromptOpen || shouldIgnoreSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [welcomePromptOpen]);

  const handleMainTouchEnd = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || welcomePromptOpen || shouldIgnoreSwipeTarget(event.target)) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 72 || Math.abs(deltaY) > 56) {
      return;
    }

    navigateToView(getAdjacentView(view, deltaX < 0 ? 'next' : 'prev'));
  }, [navigateToView, view, welcomePromptOpen]);

  const handleWelcomeMagicLink = useCallback(async () => {
    if (!syncState.email) {
      setToast('请先填写登录邮箱，再发送登录链接。');
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
      snoozeWelcomePrompt(false);
      setToast('登录链接已经发出，请去邮箱完成确认。');
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
  }, [handleSyncStateChange, snoozeWelcomePrompt, syncState]);

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
      saveBadges(mergedMedals);
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

  const handleDeleteSession = useCallback((session: Session) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`确定删除 ${new Date(session.startAt).toLocaleString()} 这条记录吗？`);
        if (!confirmed) {
          return;
        }
      }

      const removed = removeStoredSession(session.id);

      if (!removed) {
        setToast('这条记录已经不在了。');
        return;
      }

      const nextSessions = listSessions();
      const baselineResult = handleBaselineAfterDelete(removed, nextSessions, baseline);
      const nextMedals = normalizeMedalUnlocks(evaluateBadges(nextSessions));
      const nextSnapshot = buildMasterySnapshot(nextSessions);
      const nextLadderRating = buildLadderRating(nextSnapshot);

      saveBadges(nextMedals);
      setSessions(nextSessions);
      setBaseline(baselineResult.baseline);
      setMedals(nextMedals);
      setNarrative(null);
      setSuggestions([]);

      const deletedMessage = baselineResult.message
        ? `已删除这条记录。${baselineResult.message}`
        : '已删除这条记录。';

      if (supabaseReady && syncState.userId) {
        setToast(`${deletedMessage} 正在同步变更…`);
        void syncArtifacts({
          sessions: nextSessions,
          medals: nextMedals,
          ladderRating: nextLadderRating,
          successMessage: `${deletedMessage} 云端也已更新。`,
          failureMessage: `${deletedMessage} 本地已经更新，云端稍后再试。`
        });
        return;
      }

      setToast(deletedMessage);
    },
    [baseline, supabaseReady, syncState.userId, syncArtifacts]
  );

  const trainingCompanion = (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
        <h2 className="text-3xl font-semibold text-white drop-shadow-md xl:text-4xl">当赛季表现</h2>
        <p className="mt-2 text-sm text-slate-400">看看这段时间的分数、段位和最近一次保存的内容。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SummaryChip label="长期分" value={String(Math.round(snapshot.masteryScore))} />
          <SummaryChip label="段位" value={`${ladderRating.tier} ${ladderRating.division}`} />
          <SummaryChip label="积分" value={String(ladderRating.score)} />
          <SummaryChip label="今天" value={todayKey()} />
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
      onDeleteSession={handleDeleteSession}
      limit={20}
      title="数据与记录"
      showTransferTools
    />
  );

  const summaryChips = [
    { label: 'Season', value: currentSeason.name },
    { label: 'Sync', value: getSyncSummaryValue(syncState, supabaseReady) },
    { label: 'Saved', value: `${sessions.length}` }
  ];

  const pageContent =
    view === 'training' ? (
      <>
        <TrainingWorkspace
          plan={plan}
          settings={settings}
          onSaved={handleTrainingSaved}
          onToast={(message) => setToast(message)}
        />
        {trainingCompanion}
      </>
    ) : view === 'review' ? (
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
        onDeleteSession={handleDeleteSession}
      />
    ) : view === 'medals' ? (
      <MedalsPage sessions={sessions} medals={medals} />
    ) : view === 'ladder' ? (
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
    ) : (
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
    );

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={`${settings.theme}-${view}`}
            className="absolute inset-0"
            initial={{ opacity: settings.reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: settings.reduceMotion ? 1 : 0 }}
            transition={{ duration: settings.reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={clsx('absolute -top-24 left-[6%] h-72 w-72 rounded-full blur-[110px]', activeViewMeta.pageGlowTopClass)} />
            <div className={clsx('absolute bottom-16 right-[2%] h-80 w-80 rounded-full blur-[120px]', activeViewMeta.pageGlowBottomClass)} />
            <div
              className={clsx(
                'absolute left-1/2 top-24 h-56 w-[82vw] -translate-x-1/2 rounded-full bg-gradient-to-r blur-[100px]',
                activeViewMeta.pageAuraClass
              )}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-28 pt-4 sm:px-6 xl:px-10 2xl:px-12">
        <header
          className={clsx(
            'rounded-[24px] border p-3 shadow-[0_30px_110px_rgba(0,0,0,0.34)] backdrop-blur-xl md:rounded-[36px] md:p-5',
            activeViewMeta.headerShellClass
          )}
        >
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={clsx('text-[10px] uppercase tracking-[0.3em] drop-shadow-md', activeViewMeta.eyebrowClass)}>
                  Edge Control
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-wide text-white">寸止边缘训练器</h1>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  {currentSeason.name} · {sessions.length} saves · {activeTheme.label}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={clsx(
                    'rounded-full border px-3 py-2 text-xs font-medium transition hover:border-white/30 hover:bg-white/[0.16]',
                    activeViewMeta.railClass
                  )}
                  onClick={handleOpenSyncAccess}
                >
                  {syncState.userId ? 'Account' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300 transition hover:bg-white/[0.08]"
                  onClick={() => setMobileHeaderExpanded((expanded) => !expanded)}
                  data-swipe-lock="true"
                >
                  {mobileHeaderExpanded ? '收起' : '展开'}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {mobileHeaderExpanded ? (
                <motion.div
                  key="mobile-header-expanded"
                  className="overflow-hidden"
                  initial={settings.reduceMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={settings.reduceMotion ? { opacity: 1, height: 0 } : { opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: settings.reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mt-3 space-y-3 border-t border-white/8 pt-3">
                    <div
                      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/25 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      data-swipe-lock="true"
                    >
                      <span className="px-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">Theme</span>
                      {THEME_OPTIONS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          className={clsx(
                            'flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition',
                            settings.theme === theme.id ? theme.activeClass : 'text-slate-300 hover:bg-white/[0.08]'
                          )}
                          onClick={() => handleThemeChange(theme.id)}
                        >
                          <span className={clsx('h-2 w-2 rounded-full', theme.dotClass)} />
                          <span>{theme.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {summaryChips.map((item) => (
                        <div key={item.label} className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                          <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] leading-5 text-slate-400">
                      {syncState.userId
                        ? syncState.email ?? 'Supabase sync is active.'
                        : supabaseReady
                          ? '需要的时候再点 Sign In 打开登录方式弹窗。'
                          : 'Supabase 还没配置好，所以当前设备会继续只保存在本地。'}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="hidden md:flex md:flex-col md:gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className={clsx('text-[11px] uppercase tracking-[0.36em] drop-shadow-md', activeViewMeta.eyebrowClass)}>
                寸止边缘训练器 / Edge Control Trainer
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-wide text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.14)] sm:text-5xl xl:text-6xl">
                Edge Control Trainer
              </h1>
              <p className="mt-2 text-sm text-slate-300 sm:text-base xl:text-xl">左右切页、底部常驻操作区，以及更轻的手机入口都收在这里。</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={clsx(
                    'rounded-full border px-4 py-2.5 text-sm font-medium transition hover:border-white/30 hover:bg-white/[0.16]',
                    activeViewMeta.railClass
                  )}
                  onClick={handleOpenSyncAccess}
                >
                  {syncState.userId ? 'Account' : 'Sign In'}
                </button>
                <div
                  className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/25 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  data-swipe-lock="true"
                >
                  <span className="px-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">Theme</span>
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={clsx(
                        'flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition',
                        settings.theme === theme.id ? theme.activeClass : 'text-slate-300 hover:bg-white/[0.08]'
                      )}
                      onClick={() => handleThemeChange(theme.id)}
                    >
                      <span className={clsx('h-2.5 w-2.5 rounded-full', theme.dotClass)} />
                      <span>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-slate-400 sm:text-sm">
                {syncState.userId
                  ? syncState.email ?? 'Supabase sync is active.'
                  : supabaseReady
                    ? 'Open the sign-in dialog any time to restore sync.'
                    : 'Supabase is not configured yet, so this device is staying in local mode.'}
                <span className="ml-2 text-slate-500">Theme {activeTheme.label}</span>
              </p>
            </div>
            <div className="hidden gap-2 md:grid md:grid-cols-3 md:gap-3">
              {summaryChips.map((item) => (
                <SummaryChip key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>

          <nav className="mt-5 hidden flex-wrap gap-2 md:flex" data-swipe-lock="true">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={clsx(
                  'rounded-full px-4 py-2.5 text-base transition',
                  view === item.key
                    ? VIEW_META[item.key].activeNavClass
                    : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                )}
                onClick={() => navigateToView(item.key)}
              >
                <span className="font-semibold">{getEnglishTabLabel(item.key).label}</span>
                <span className="ml-2 text-sm text-slate-500">{item.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="mt-5 md:mt-6" onTouchStart={handleMainTouchStart} onTouchEnd={handleMainTouchEnd}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={view}
              className="relative"
              initial={settings.reduceMotion ? { opacity: 1 } : { opacity: 0, x: pageDirection > 0 ? 28 : -28, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={settings.reduceMotion ? { opacity: 1 } : { opacity: 0, x: pageDirection > 0 ? -28 : 28, y: -10 }}
              transition={{ duration: settings.reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={clsx(
                  'pointer-events-none absolute inset-x-2 top-0 h-44 rounded-[36px] bg-gradient-to-r blur-3xl',
                  activeViewMeta.pageAuraClass
                )}
              />
              <div className="relative">
                <Suspense
                  fallback={
                    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-400 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                      页面加载中……
                    </section>
                  }
                >
                  {pageContent}
                </Suspense>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-50 mx-auto flex w-[min(94vw,720px)] items-center justify-between rounded-full border border-white/10 bg-slate-950/90 px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl md:hidden"
        data-swipe-lock="true"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={clsx(
              'flex min-w-[52px] flex-col items-center rounded-full px-2 py-2 text-[10px] transition',
              view === item.key ? VIEW_META[item.key].activeNavClass : 'text-slate-300'
            )}
            onClick={() => navigateToView(item.key)}
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

      <WelcomeGate
        open={welcomePromptOpen}
        email={syncState.email ?? ''}
        loading={syncState.status === 'syncing'}
        error={syncState.status === 'error' ? syncState.lastError : undefined}
        onClose={handleCloseWelcomeGate}
        onEmailChange={handleWelcomeEmailChange}
        onSendMagicLink={handleWelcomeMagicLink}
        onContinueAsGuest={handleContinueAsGuest}
        onMaybeLater={() => snoozeWelcomePrompt(true)}
      />
    </div>
  );
}
