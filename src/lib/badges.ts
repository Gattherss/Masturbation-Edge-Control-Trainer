import type { Badge, MedalCatalogItem, MedalFamily, MedalUnlock, Session } from '@/types/models';
import { loadCheckins } from './storage';
import { buildMasterySnapshot } from './mastery';

export type BadgeDef = MedalCatalogItem & {
  calc: (sessions: Session[]) => { unlocked: boolean; percent: number; hint: string; sourceSessionId?: string };
};

function sortByStart(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

function avg(values: number[]): number {
  return values.length ? values.reduce((acc, cur) => acc + cur, 0) / values.length : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function minutes(ms: number) {
  return Math.max(0, ms) / 60000;
}

function countCheckinStreak(checkins: string[]) {
  if (!checkins.length) return 0;
  const sorted = Array.from(new Set(checkins))
    .map((value) => new Date(value).getTime())
    .sort((a, b) => a - b);

  let streak = 1;
  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const diff = Math.round((sorted[index] - sorted[index - 1]) / (24 * 60 * 60 * 1000));
    if (diff === 1) {
      streak += 1;
      continue;
    }
    if (diff === 0) {
      continue;
    }
    break;
  }

  return streak;
}

function getLatestSessionId(sessions: Session[]) {
  return sortByStart(sessions).at(-1)?.id;
}

function getLastN(sessions: Session[], count: number) {
  return sortByStart(sessions).slice(-count);
}

function makeMedal(
  code: string,
  family: MedalFamily,
  tier: MedalCatalogItem['tier'],
  name: string,
  desc: string,
  motto: string,
  flavorText: string,
  calc: BadgeDef['calc']
): BadgeDef {
  return {
    code,
    family,
    tier,
    name,
    desc,
    motto,
    flavorText,
    publicVisible: true,
    calc
  };
}

const MEDAL_DEFS: BadgeDef[] = [
  makeMedal(
    'rhythm_black_iron',
    'rhythm',
    'black_iron',
    '黑铁节律章',
    '完成 3 次守时节律训练',
    'Keep the window.',
    '外缘粗砺，提醒你先把节律做准。',
    (sessions) => {
      const count = sessions.filter((session) => (session.metrics?.restPenalty ?? 0) >= 0.92).length;
      return {
        unlocked: count >= 3,
        percent: Math.min(1, count / 3),
        hint: `${count}/3 次守时训练`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'rhythm_forged_iron',
    'rhythm',
    'forged_iron',
    '锻铁节律章',
    '近 5 次 RCI 平均达到 82',
    'Tempo becomes form.',
    '铆钉开始收紧，说明休息已不再散漫。',
    (sessions) => {
      const lastFive = getLastN(sessions, 5);
      const value = avg(lastFive.map((session) => (session.metrics?.rci ?? 0) * 100));
      return {
        unlocked: value >= 82,
        percent: Math.min(1, value / 82),
        hint: `近 5 次 RCI ${Math.round(value)}/82`,
        sourceSessionId: lastFive.at(-1)?.id
      };
    }
  ),
  makeMedal(
    'rhythm_steel',
    'rhythm',
    'steel',
    '精钢节律章',
    '近 7 次 RCI 平均达到 90',
    'Precision under calm.',
    '月桂边饰出现，意味着节律开始稳定成型。',
    (sessions) => {
      const lastSeven = getLastN(sessions, 7);
      const value = avg(lastSeven.map((session) => (session.metrics?.rci ?? 0) * 100));
      return {
        unlocked: value >= 90,
        percent: Math.min(1, value / 90),
        hint: `近 7 次 RCI ${Math.round(value)}/90`,
        sourceSessionId: lastSeven.at(-1)?.id
      };
    }
  ),
  makeMedal(
    'rhythm_titanium_black',
    'rhythm',
    'titanium_black',
    '钛黑节律章',
    '近 10 次 RCI 平均达到 94 且过频受控',
    'Rhythm without drag.',
    '黑色表面把高光压住，像把多余动作全部收了回去。',
    (sessions) => {
      const lastTen = getLastN(sessions, 10);
      const rci = avg(lastTen.map((session) => (session.metrics?.rci ?? 0) * 100));
      const edgesPer10 = avg(
        lastTen.map((session) => session.edges * (10 / Math.max(1e-6, minutes(session.durationMs))))
      );
      const percent = Math.min(1, Math.min(rci / 94, 5.5 / Math.max(edgesPer10, 5.5)));
      return {
        unlocked: rci >= 94 && edgesPer10 <= 5.5,
        percent,
        hint: `RCI ${Math.round(rci)}/94，频率 ${edgesPer10.toFixed(1)}/5.5`,
        sourceSessionId: lastTen.at(-1)?.id
      };
    }
  ),
  makeMedal(
    'control_black_iron',
    'control',
    'black_iron',
    '黑铁控稳章',
    '单次 CEI 达到 78',
    'Hold the line.',
    '中央纹章还是厚重的，但第一次控制感已经被刻了进去。',
    (sessions) => {
      const best = Math.max(0, ...sessions.map((session) => session.metrics?.cei ?? 0));
      return {
        unlocked: best >= 78,
        percent: Math.min(1, best / 78),
        hint: `最佳 CEI ${Math.round(best)}/78`,
        sourceSessionId: sessions.find((session) => (session.metrics?.cei ?? 0) === best)?.id
      };
    }
  ),
  makeMedal(
    'control_forged_iron',
    'control',
    'forged_iron',
    '锻铁控稳章',
    '单次 CEI 达到 86 且近 5 次 Hw 平均达到 88%',
    'Sharp form, quiet hands.',
    '金属纹路开始细起来，说明控制已经不只是一次幸运命中。',
    (sessions) => {
      const best = Math.max(0, ...sessions.map((session) => session.metrics?.cei ?? 0));
      const hw = avg(getLastN(sessions, 5).map((session) => (session.metrics?.Hw ?? 0) * 100));
      return {
        unlocked: best >= 86 && hw >= 88,
        percent: Math.min(1, Math.min(best / 86, hw / 88)),
        hint: `CEI ${Math.round(best)}/86，Hw ${Math.round(hw)}/88`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'control_steel',
    'control',
    'steel',
    '精钢控稳章',
    '近 7 次 control 平均达到 88',
    'Consistency with teeth.',
    '轮廓被抛亮了，意味着高质量表现不再是偶发现象。',
    (sessions) => {
      const lastSeven = getLastN(sessions, 7);
      const value = avg(lastSeven.map((session) => session.metrics?.controlScore ?? 0));
      return {
        unlocked: value >= 88,
        percent: Math.min(1, value / 88),
        hint: `近 7 次 control ${Math.round(value)}/88`,
        sourceSessionId: lastSeven.at(-1)?.id
      };
    }
  ),
  makeMedal(
    'control_titanium_black',
    'control',
    'titanium_black',
    '钛黑控稳章',
    '最佳 CEI 达到 96 且近 10 次 control 平均达到 92',
    'Pressure turned elegant.',
    '钛黑面层把锋利感藏在里面，是成熟控制的标志。',
    (sessions) => {
      const best = Math.max(0, ...sessions.map((session) => session.metrics?.cei ?? 0));
      const control = avg(getLastN(sessions, 10).map((session) => session.metrics?.controlScore ?? 0));
      return {
        unlocked: best >= 96 && control >= 92,
        percent: Math.min(1, Math.min(best / 96, control / 92)),
        hint: `CEI ${Math.round(best)}/96，control ${Math.round(control)}/92`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'endurance_black_iron',
    'endurance',
    'black_iron',
    '黑铁耐力章',
    '累计训练 120 分钟',
    'Stay with the set.',
    '份量先上来了，基础耐力开始有了存在感。',
    (sessions) => {
      const total = sessions.reduce((acc, session) => acc + minutes(session.durationMs), 0);
      return {
        unlocked: total >= 120,
        percent: Math.min(1, total / 120),
        hint: `${Math.round(total)}/120 分钟`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'endurance_forged_iron',
    'endurance',
    'forged_iron',
    '锻铁耐力章',
    '单次训练达到 30 分钟',
    'Hold the longer arc.',
    '铭带第一次拉长，告诉你时长已不只是起步水平。',
    (sessions) => {
      const best = Math.max(0, ...sessions.map((session) => minutes(session.durationMs)));
      return {
        unlocked: best >= 30,
        percent: Math.min(1, best / 30),
        hint: `最佳 ${Math.round(best)}/30 分钟`,
        sourceSessionId: sessions.find((session) => minutes(session.durationMs) === best)?.id
      };
    }
  ),
  makeMedal(
    'endurance_steel',
    'endurance',
    'steel',
    '精钢耐力章',
    '累计训练 500 分钟且单次达到 45 分钟',
    'Length without panic.',
    '月桂向外扩展，像把一段更长的耐力真正握住了。',
    (sessions) => {
      const total = sessions.reduce((acc, session) => acc + minutes(session.durationMs), 0);
      const best = Math.max(0, ...sessions.map((session) => minutes(session.durationMs)));
      return {
        unlocked: total >= 500 && best >= 45,
        percent: Math.min(1, Math.min(total / 500, best / 45)),
        hint: `累计 ${Math.round(total)}/500，单次 ${Math.round(best)}/45`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'endurance_titanium_black',
    'endurance',
    'titanium_black',
    '钛黑耐力章',
    '累计训练 1000 分钟且单次达到 75 分钟',
    'Long form, no drama.',
    '厚重外环和深色铭面，把持续性做成了真正的气质。',
    (sessions) => {
      const total = sessions.reduce((acc, session) => acc + minutes(session.durationMs), 0);
      const best = Math.max(0, ...sessions.map((session) => minutes(session.durationMs)));
      return {
        unlocked: total >= 1000 && best >= 75,
        percent: Math.min(1, Math.min(total / 1000, best / 75)),
        hint: `累计 ${Math.round(total)}/1000，单次 ${Math.round(best)}/75`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'progression_black_iron',
    'progression',
    'black_iron',
    '黑铁进阶章',
    '长期 growth 达到 55',
    'Improve on purpose.',
    '进步第一次被铸造成形，不再只是零散感觉。',
    (sessions) => {
      const snapshot = buildMasterySnapshot(sessions);
      const growth = snapshot.growthScore ?? 0;
      return {
        unlocked: growth >= 55,
        percent: Math.min(1, growth / 55),
        hint: `growth ${Math.round(growth)}/55`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'progression_forged_iron',
    'progression',
    'forged_iron',
    '锻铁进阶章',
    '长期 growth 达到 62 且 mastery 达到 68',
    'Climb with evidence.',
    '开始能看见旧锚点被持续超越的形状。',
    (sessions) => {
      const snapshot = buildMasterySnapshot(sessions);
      const growth = snapshot.growthScore ?? 0;
      const mastery = snapshot.masteryScore;
      return {
        unlocked: growth >= 62 && mastery >= 68,
        percent: Math.min(1, Math.min(growth / 62, mastery / 68)),
        hint: `growth ${Math.round(growth)}/62，mastery ${Math.round(mastery)}/68`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'progression_steel',
    'progression',
    'steel',
    '精钢进阶章',
    '长期 growth 达到 70 且 mastery 达到 75',
    'Forge the delta.',
    '锚点与当前窗口的距离已经拉得足够明显。',
    (sessions) => {
      const snapshot = buildMasterySnapshot(sessions);
      const growth = snapshot.growthScore ?? 0;
      const mastery = snapshot.masteryScore;
      return {
        unlocked: growth >= 70 && mastery >= 75,
        percent: Math.min(1, Math.min(growth / 70, mastery / 75)),
        hint: `growth ${Math.round(growth)}/70，mastery ${Math.round(mastery)}/75`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'progression_titanium_black',
    'progression',
    'titanium_black',
    '钛黑进阶章',
    '长期 growth 达到 78，mastery 达到 82，confidence 达到 65',
    'Advance with proof.',
    '这已经不是偶然好状态，而是被证据支撑的进步。',
    (sessions) => {
      const snapshot = buildMasterySnapshot(sessions);
      const growth = snapshot.growthScore ?? 0;
      const mastery = snapshot.masteryScore;
      const confidence = snapshot.confidenceScore;
      return {
        unlocked: growth >= 78 && mastery >= 82 && confidence >= 65,
        percent: Math.min(1, Math.min(growth / 78, mastery / 82, confidence / 65)),
        hint: `growth ${Math.round(growth)}/78，mastery ${Math.round(mastery)}/82`,
        sourceSessionId: getLatestSessionId(sessions)
      };
    }
  ),
  makeMedal(
    'streak_black_iron',
    'streak',
    'black_iron',
    '黑铁连胜章',
    '连续 3 天打卡',
    'Return tomorrow.',
    '很朴素，但它提醒你奖励机制的第一块基石永远是连续性。',
    () => {
      const streak = countCheckinStreak(loadCheckins());
      return {
        unlocked: streak >= 3,
        percent: Math.min(1, streak / 3),
        hint: `${streak}/3 天`
      };
    }
  ),
  makeMedal(
    'streak_forged_iron',
    'streak',
    'forged_iron',
    '锻铁连胜章',
    '连续 7 天打卡',
    'Keep showing up.',
    '边缘开始有纹理，因为连续性正在从习惯变成气候。',
    () => {
      const streak = countCheckinStreak(loadCheckins());
      return {
        unlocked: streak >= 7,
        percent: Math.min(1, streak / 7),
        hint: `${streak}/7 天`
      };
    }
  ),
  makeMedal(
    'streak_steel',
    'streak',
    'steel',
    '精钢连胜章',
    '连续 21 天打卡',
    'Routine with weight.',
    '这时连胜已经有分量了，不再只是短期热情。',
    () => {
      const streak = countCheckinStreak(loadCheckins());
      return {
        unlocked: streak >= 21,
        percent: Math.min(1, streak / 21),
        hint: `${streak}/21 天`
      };
    }
  ),
  makeMedal(
    'streak_titanium_black',
    'streak',
    'titanium_black',
    '钛黑连胜章',
    '连续 60 天打卡',
    'Habit turned metal.',
    '整枚勋章都被压成更深的色泽，像一段长期习惯真正沉了下来。',
    () => {
      const streak = countCheckinStreak(loadCheckins());
      return {
        unlocked: streak >= 60,
        percent: Math.min(1, streak / 60),
        hint: `${streak}/60 天`
      };
    }
  )
];

function toUnlock(def: BadgeDef, sourceSessionId?: string): MedalUnlock {
  return {
    ...def,
    unlockedAt: new Date().toISOString(),
    sourceSessionId
  };
}

export function getAllBadgeDefs(): BadgeDef[] {
  return MEDAL_DEFS;
}

export function getBadgeProgress(code: string, sessions: Session[]) {
  const def = MEDAL_DEFS.find((item) => item.code === code);
  if (!def) {
    return { unlocked: false, percent: 0, hint: '' };
  }
  return def.calc(sessions);
}

export function evaluateBadges(sessions: Session[]): Badge[] {
  return MEDAL_DEFS
    .map((def) => ({ def, progress: def.calc(sessions) }))
    .filter(({ progress }) => progress.unlocked)
    .map(({ def, progress }) => toUnlock(def, progress.sourceSessionId));
}

export function getFeaturedBadge(unlocks: MedalUnlock[]) {
  const tierOrder = ['black_iron', 'forged_iron', 'steel', 'titanium_black'] as const;
  return [...unlocks].sort((a, b) => {
    const tierDelta = tierOrder.indexOf(b.tier) - tierOrder.indexOf(a.tier);
    if (tierDelta !== 0) {
      return tierDelta;
    }
    return Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt);
  })[0] ?? null;
}

export function computeLevelAndXP(sessions: Session[]) {
  const snapshot = buildMasterySnapshot(sessions);
  const xp = sessions.reduce((acc, session) => acc + (session.scores?.total ?? 0), 0);
  const level = Math.max(1, Math.floor(snapshot.ladderScore / 125) + 1);
  const progress = snapshot.ladderScore % 125;
  return {
    level,
    xp: Math.round(xp),
    progress: Math.round(progress),
    masteryScore: snapshot.masteryScore
  };
}

export function getMedalFamilies() {
  return [
    { key: 'rhythm', label: '节律', accent: 'from-amber-300 via-stone-200 to-stone-500' },
    { key: 'control', label: '控稳', accent: 'from-slate-300 via-slate-100 to-cyan-400' },
    { key: 'endurance', label: '耐力', accent: 'from-orange-300 via-zinc-200 to-zinc-600' },
    { key: 'progression', label: '进阶', accent: 'from-violet-300 via-violet-100 to-indigo-500' },
    { key: 'streak', label: '连胜', accent: 'from-emerald-300 via-lime-100 to-emerald-600' }
  ] as const;
}

export function getNextBadgeCandidates(sessions: Session[], limit = 6) {
  const unlockedCodes = new Set(evaluateBadges(sessions).map((badge) => badge.code));
  return MEDAL_DEFS
    .filter((def) => !unlockedCodes.has(def.code))
    .map((def) => ({ def, progress: def.calc(sessions) }))
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .slice(0, limit);
}

export function getMedalSummary(sessions: Session[]) {
  const unlocked = evaluateBadges(sessions);
  const snapshot = buildMasterySnapshot(sessions);
  const byFamily = getMedalFamilies().map((family) => ({
    ...family,
    total: MEDAL_DEFS.filter((def) => def.family === family.key).length,
    unlocked: unlocked.filter((item) => item.family === family.key).length
  }));

  return {
    unlocked,
    byFamily,
    snapshot,
    featured: getFeaturedBadge(unlocked)
  };
}

