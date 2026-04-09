import { useId, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '@/components/Modal';
import type { MedalCatalogItem } from '@/types/models';

interface MedalCardProps {
  medal: MedalCatalogItem;
  unlocked: boolean;
  progressPercent?: number;
  hint?: string;
  compact?: boolean;
}

const TIER_LABELS = {
  black_iron: '黑铁',
  forged_iron: '锻铁',
  steel: '精钢',
  titanium_black: '钛黑'
} as const;

const TIER_CLASSES = {
  black_iron: 'from-zinc-700 via-zinc-500 to-zinc-900 text-zinc-100',
  forged_iron: 'from-stone-300 via-stone-100 to-amber-700 text-stone-900',
  steel: 'from-slate-100 via-cyan-50 to-sky-500 text-slate-900',
  titanium_black: 'from-slate-900 via-slate-700 to-violet-500 text-slate-50'
} as const;

const FAMILY_LABELS = {
  rhythm: '节律',
  control: '控稳',
  endurance: '耐力',
  progression: '进阶',
  streak: '连胜'
} as const;

function familyGlyph(family: MedalCatalogItem['family']) {
  switch (family) {
    case 'rhythm':
      return (
        <path
          d="M20 66c8-12 14-12 22 0s14 12 22 0 14-12 22 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      );
    case 'control':
      return (
        <>
          <circle cx="60" cy="60" r="24" fill="none" stroke="currentColor" strokeWidth="8" />
          <path d="M60 20v18M60 82v18M20 60h18M82 60h18" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        </>
      );
    case 'endurance':
      return (
        <>
          <rect x="28" y="52" width="14" height="34" rx="4" fill="currentColor" />
          <rect x="53" y="38" width="14" height="48" rx="4" fill="currentColor" />
          <rect x="78" y="24" width="14" height="62" rx="4" fill="currentColor" />
        </>
      );
    case 'progression':
      return (
        <path
          d="M26 78l20-20 16 10 28-28M74 40h16v16"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'streak':
      return (
        <>
          <path d="M40 30v58" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <path d="M60 20v68" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <path d="M80 36v52" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        </>
      );
  }
}

function tierFrame(tier: MedalCatalogItem['tier'], fillId: string) {
  switch (tier) {
    case 'black_iron':
      return (
        <polygon
          points="60,8 106,36 106,86 60,112 14,86 14,36"
          fill={`url(#${fillId})`}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="4"
        />
      );
    case 'forged_iron':
      return (
        <>
          <polygon
            points="60,8 96,20 112,54 96,96 60,112 24,96 8,54 24,20"
            fill={`url(#${fillId})`}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="4"
          />
          {[18, 102, 18, 102].map((cx, index) => (
            <circle
              key={`${tier}-rivet-${index}`}
              cx={cx}
              cy={index < 2 ? 54 : index === 2 ? 26 : 82}
              r="4"
              fill="rgba(255,255,255,0.55)"
            />
          ))}
        </>
      );
    case 'steel':
      return (
        <>
          <circle cx="60" cy="56" r="46" fill={`url(#${fillId})`} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
          <path d="M21 68c7 17 20 28 39 33 19-5 32-16 39-33" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'titanium_black':
      return (
        <>
          <path
            d="M60 6 104 26 96 92 60 118 24 92 16 26Z"
            fill={`url(#${fillId})`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="4"
          />
          <path
            d="M38 17h44l10 14-12 62-20 14-20-14-12-62z"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="3"
          />
        </>
      );
  }
}

export function MedalCard({ medal, unlocked, progressPercent = 0, hint, compact = false }: MedalCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const gradientBaseId = useId().replace(/:/g, '-');
  const cardFillId = `${gradientBaseId}-card-fill`;
  const modalFillId = `${gradientBaseId}-modal-fill`;
  const reduceMotion =
    typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true';
  const tier = medal.tier in TIER_CLASSES ? medal.tier : 'black_iron';
  const family = medal.family in FAMILY_LABELS ? medal.family : 'rhythm';
  const fillClass = TIER_CLASSES[tier];
  const tierLabel = TIER_LABELS[tier];
  const familyLabel = FAMILY_LABELS[family];

  return (
    <>
    <article
      onClick={() => setModalOpen(true)}
      className={clsx(
        'relative cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.4)] backdrop-blur-3xl transition-[border-color,background-color,box-shadow,opacity] duration-200',
        compact ? 'min-h-[250px]' : 'min-h-[290px]',
        !unlocked && 'opacity-80 saturate-50',
        !reduceMotion && 'hover:border-white/15 hover:bg-white/[0.055] hover:shadow-[0_28px_70px_rgba(0,0,0,0.44)]'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.07),transparent_42%,rgba(0,0,0,0.18))]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">{familyLabel}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{medal.name}</h3>
          <p className="mt-1 text-xs text-slate-400">{medal.desc}</p>
        </div>
        <span className={clsx('rounded-full px-3 py-1 text-[11px] font-semibold shadow-inner', `bg-gradient-to-br ${fillClass}`)}>
          {tierLabel}
        </span>
      </div>

      <div className="relative mt-5 flex items-center justify-center">
        <div className={clsx('relative flex h-36 w-32 items-center justify-center rounded-[32px] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_16px_40px_rgba(0,0,0,0.35)]', fillClass)}>
          <svg viewBox="0 0 120 140" className={clsx('h-32 w-28 drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]', unlocked ? 'opacity-100' : 'opacity-35')}>
            <defs>
              <linearGradient id={cardFillId} x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </linearGradient>
            </defs>
            {tierFrame(tier, cardFillId)}
            <g className="text-black/80">{familyGlyph(family)}</g>
            <path d="M26 112h68l-10 18H36z" fill="rgba(15,23,42,0.85)" />
            <text x="60" y="125" fill="white" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="2">
              {tierLabel}
            </text>
          </svg>
        </div>
      </div>

      <div className="relative mt-4 space-y-2">
        <p className="text-sm font-medium text-slate-200">{medal.motto}</p>
        <p className="text-xs leading-5 text-slate-400">{medal.flavorText}</p>
      </div>

      {!unlocked ? (
        <div className="relative mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-200 via-slate-100 to-cyan-300 transition-[width] duration-500"
              style={{ width: `${Math.round(progressPercent * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{hint}</p>
        </div>
      ) : (
        <div className="relative mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-200">
          已锻造成形
        </div>
      )}
    </article>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="勋章详情" size="sm">
      <div className="flex flex-col items-center pb-6 pt-4 text-center">
        <div className={clsx('relative flex h-48 w-44 items-center justify-center rounded-[40px] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_20px_50px_rgba(0,0,0,0.5)]', fillClass)}>
          <svg
            viewBox="0 0 120 140"
            className={clsx(
              'h-40 w-36 drop-shadow-[0_16px_24px_rgba(0,0,0,0.5)]',
              !reduceMotion && 'animate-spin-slow',
              unlocked ? 'opacity-100' : 'opacity-35 grayscale'
            )}
          >
            <defs>
              <linearGradient id={modalFillId} x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </linearGradient>
            </defs>
            {tierFrame(tier, modalFillId)}
            <g className="text-black/80">{familyGlyph(family)}</g>
          </svg>
        </div>

        <h3 className="mt-8 text-2xl font-bold text-white drop-shadow-md">{medal.name}</h3>
        <span className={clsx('mt-3 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-inner', `bg-gradient-to-br ${fillClass}`)}>
          {tierLabel} · {familyLabel}
        </span>

        <p className="mt-6 text-sm italic text-slate-300">"{medal.motto}"</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">{medal.flavorText}</p>

        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-300">考核条件</span>
            <span className={unlocked ? 'font-bold text-emerald-400' : 'font-bold text-amber-400'}>
              {unlocked ? '已达成' : '锻造中'}
            </span>
          </div>
          <p className="mt-2 text-left text-xs text-slate-400">{medal.desc}</p>
          
          {!unlocked && (
            <div className="mt-4 w-full text-left">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>当前进度</span>
                <span>{Math.round(progressPercent * 100)}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/40 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 transition-[width] duration-1000"
                  style={{ width: `${Math.round(progressPercent * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">{hint}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
    </>
  );
}
