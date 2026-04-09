import { useEffect, useMemo, useState } from 'react';
import type { Badge, Session } from '@/types/models';
import { computeLevelAndXP, evaluateBadges, getMedalFamilies, getMedalSummary, getNextBadgeCandidates, normalizeMedalUnlocks } from '@/lib/badges';
import { loadBadges, saveBadges } from '@/lib/storage';
import { MedalCard } from './MedalCard';

interface Props {
  sessions: Session[];
  previewCount?: number;
}

export function BadgesPanel({ sessions, previewCount = 2 }: Props) {
  const generated = useMemo(() => evaluateBadges(sessions), [sessions]);
  const [minted, setMinted] = useState<Badge[]>(() => normalizeMedalUnlocks(loadBadges()));
  const level = useMemo(() => computeLevelAndXP(sessions), [sessions]);
  const summary = useMemo(() => getMedalSummary(sessions), [sessions]);
  const upcoming = useMemo(() => getNextBadgeCandidates(sessions, previewCount), [sessions, previewCount]);

  useEffect(() => {
    const byCode = new Map<string, Badge>();
    [...minted, ...generated].forEach((badge) => {
      const previous = byCode.get(badge.code);
      byCode.set(badge.code, previous ?? badge);
    });
    const next = normalizeMedalUnlocks(Array.from(byCode.values()));
    setMinted(next);
    saveBadges(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated.length]);

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Medal Vault</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">勋章与层级</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            奖励系统现在不再只是列表标签，而是按照家族与材质逐级锻造。你每一块进步，都会在这里留下更像样的形状。
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-right text-sm text-slate-300">
          <div className="text-xs uppercase tracking-[0.32em] text-slate-500">Current Ladder</div>
          <div className="mt-2 text-3xl font-semibold text-white">Lv.{level.level}</div>
          <div className="mt-1 text-xs text-slate-400">mastery {Math.round(level.masteryScore)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {summary.byFamily.map((family) => (
          <div key={family.key} className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-3">
            <div className="text-sm font-semibold text-white">{family.label}</div>
            <div className="mt-1 text-xs text-slate-400">{family.unlocked}/{family.total} 已解锁</div>
            <div className="mt-3 h-2 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-200 via-slate-100 to-cyan-300"
                style={{ width: `${family.total ? (family.unlocked / family.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {summary.featured ? (
        <div className="mt-6">
          <MedalCard medal={summary.featured} unlocked />
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
          还没有已铸成的勋章。完成几轮训练后，节律、控稳、耐力、进阶和连胜会开始一枚枚亮起来。
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {upcoming.map(({ def, progress }) => (
          <MedalCard
            key={def.code}
            medal={def}
            unlocked={false}
            progressPercent={progress.percent}
            hint={progress.hint}
            compact
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
        {getMedalFamilies().map((family) => (
          <span key={family.key} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            {family.label}
          </span>
        ))}
      </div>
    </section>
  );
}
