import type { Baseline, Session } from '@/types/models';
import {
  buildBaselineFromSession,
  compareToBaseline,
  pickBestOfLast7Days
} from '@/lib/baseline';
import {
  loadBaseline,
  loadBaselineWeekKey,
  saveBaseline,
  saveBaselineWeekKey
} from '@/lib/storage';
import { weekKey } from '@/lib/time';

export interface BaselineUpdateResult {
  baseline: Baseline | null;
  comparison: ReturnType<typeof compareToBaseline>;
  message?: string;
}

export function handleBaselineAfterSave(
  session: Session,
  allSessions: Session[]
): BaselineUpdateResult {
  let baseline = loadBaseline();
  let message: string | undefined;

  if (!baseline) {
    baseline = buildBaselineFromSession(session);
    saveBaseline(baseline);
    saveBaselineWeekKey(weekKey(new Date(session.startAt)));
    message = '已建立首个基准。';
  } else {
    const storedWeekKey = loadBaselineWeekKey();
    const currentWeekKey = weekKey(new Date());

    if (storedWeekKey !== currentWeekKey) {
      const candidate = pickBestOfLast7Days(allSessions);
      if (candidate) {
        baseline = buildBaselineFromSession(candidate);
        saveBaseline(baseline);
        saveBaselineWeekKey(currentWeekKey);
        message = '已根据近 7 天最佳回合更新基准。';
      } else {
        saveBaselineWeekKey(currentWeekKey);
      }
    } else {
      saveBaseline(baseline);
    }
  }

  const comparison = compareToBaseline(baseline, session);

  return {
    baseline,
    comparison,
    message
  };
}

export function setBaselineFromSession(session: Session): BaselineUpdateResult {
  const baseline = buildBaselineFromSession(session);
  saveBaseline(baseline);
  saveBaselineWeekKey(weekKey(new Date()));
  return {
    baseline,
    comparison: compareToBaseline(baseline, session),
    message: '已更新基准。'
  };
}

export function handleBaselineAfterDelete(
  removed: Session,
  allSessions: Session[],
  currentBaseline: Baseline | null
): BaselineUpdateResult {
  if (!currentBaseline) {
    return {
      baseline: null,
      comparison: null
    };
  }

  if (currentBaseline.sourceSessionId !== removed.id) {
    return {
      baseline: currentBaseline,
      comparison: null
    };
  }

  const fallback = pickBestOfLast7Days(allSessions) ?? allSessions[allSessions.length - 1] ?? null;

  if (!fallback?.metrics) {
    saveBaseline(null);
    saveBaselineWeekKey(weekKey(new Date()));

    return {
      baseline: null,
      comparison: null,
      message: '原基准已被删除，当前已清空基准。'
    };
  }

  const nextBaseline = buildBaselineFromSession(fallback);
  saveBaseline(nextBaseline);
  saveBaselineWeekKey(weekKey(new Date(fallback.startAt)));

  return {
    baseline: nextBaseline,
    comparison: compareToBaseline(nextBaseline, fallback),
    message: '原基准已被删除，已改用最近表现最佳的一条记录作为新基准。'
  };
}
