import type { MedalUnlock, Session } from '@/types/models';
import { getAllBadgeDefs, getMedalFamilies, getNextBadgeCandidates, normalizeMedalUnlocks } from '@/lib/badges';
import { MedalCard } from '@/components/MedalCard';

interface MedalsPageProps {
  sessions: Session[];
  medals: MedalUnlock[];
}

export default function MedalsPage({ sessions, medals }: MedalsPageProps) {
  const safeMedals = normalizeMedalUnlocks(medals);
  const unlockedCodes = new Set(safeMedals.map((medal) => medal.code));
  const upcoming = getNextBadgeCandidates(sessions, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.36em] text-slate-500">Metal Archive</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Metal Medal Gallery</h1>
        <p className="mt-2 text-sm text-slate-400">勋章陈列墙</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          每个家族都有四个材质层级，形状、纹章和铭带文字一起变化。这里不是“完成过什么”的流水账，而是你已经把哪些能力真正锻造成形。
        </p>
      </section>

      {getMedalFamilies().map((family) => {
        const defs = getAllBadgeDefs().filter((item) => item.family === family.key);
        const unlockedCount = defs.filter((item) => unlockedCodes.has(item.code)).length;

        return (
          <section key={family.key} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">{family.label}</h2>
                <p className="mt-2 text-sm text-slate-400">{unlockedCount}/{defs.length} 已解锁</p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-400">
                {family.label} 家族
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {defs.map((def) => {
                const unlocked = safeMedals.find((medal) => medal.code === def.code);
                const upcomingItem = upcoming.find((item) => item.def.code === def.code);
                return (
                  <MedalCard
                    key={def.code}
                    medal={unlocked ?? def}
                    unlocked={Boolean(unlocked)}
                    progressPercent={upcomingItem?.progress.percent ?? 0}
                    hint={upcomingItem?.progress.hint}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
