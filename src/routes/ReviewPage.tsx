import type { Baseline, LadderRating, MedalCatalogItem, MedalUnlock, MasterySnapshot, Session, Settings } from '@/types/models';
import TrendsPage from './TrendsPage';
import { BaselineCard } from '@/components/BaselineCard';
import { Calendar } from '@/components/Calendar';
import SessionsDetailsTable from '@/components/SessionsDetailsTable';
import { MedalCard } from '@/components/MedalCard';
import { StreakCard } from '@/components/StreakCard';
import { findMasteryWindow } from '@/lib/mastery';

interface ReviewPageProps {
  sessions: Session[];
  baseline: Baseline | null;
  baselineComparison: { cei: number; Hw: number; stimMinutes: number; rci: number } | null;
  snapshot: MasterySnapshot;
  ladderRating: LadderRating;
  featuredMedal: MedalUnlock | null;
  nextMedal: { medal: MedalCatalogItem | null; progressHint: string; progressPercent: number } | null;
  currentPlan: Session['planSnapshot'];
  settings: Settings;
  onDataChanged: () => void;
  onDeleteSession: (session: Session) => void;
}

function SnapshotTile({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{help}</p>
    </div>
  );
}

export default function ReviewPage({
  sessions,
  baseline,
  baselineComparison,
  snapshot,
  ladderRating,
  featuredMedal,
  nextMedal,
  currentPlan,
  settings,
  onDataChanged,
  onDeleteSession
}: ReviewPageProps) {
  const recentWindow = findMasteryWindow(snapshot, 'recent');
  const currentWindow = findMasteryWindow(snapshot, 'current');
  const anchorWindow = findMasteryWindow(snapshot, 'anchor');
  const fallbackPlan = currentPlan ?? {
    id: settings.mode,
    targetStim: [55, 85] as [number, number],
    targetRest: [30, 90] as [number, number]
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.36em] text-slate-500">复盘</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">复盘与走势</h1>
            <p className="mt-2 text-sm text-slate-400">把最近一段时间的状态放在一起看。</p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              这里会把最近几周、这段时间的整体表现，还有更早之前的记录放在一起。看完这一页，你会更容易判断自己是稳稳往上走，还是只是偶尔状态好。
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">当前段位</div>
            <div className="mt-2 text-2xl font-semibold text-white">{ladderRating.tier} {ladderRating.division}</div>
            <div className="mt-1 text-xs text-slate-400">积分 {ladderRating.score} · 百分位 {ladderRating.percentile}%</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotTile
            label="长期分"
            value={String(Math.round(snapshot.masteryScore))}
            help="这里看的是一段时间里的整体状态，不只是单次发挥。"
          />
          <SnapshotTile
            label="成长"
            value={snapshot.growthScore == null ? '临时评估' : String(Math.round(snapshot.growthScore))}
            help={snapshot.growthScore == null ? '历史记录还不够多，先按这段时间的整体表现来估算。' : '这里会把现在和更早之前的记录对照起来，看进步有没有真正留下来。'}
          />
          <SnapshotTile
            label="稳定度"
            value={String(Math.round(snapshot.consistencyScore))}
            help="波动越小，这一项越高，它能帮你看出状态是不是越来越稳。"
          />
          <SnapshotTile
            label="可信度"
            value={`${Math.round(snapshot.confidenceScore)}%`}
            help="记录越多、波动越小，这里的判断就越有把握。"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <TrendsPage sessions={sessions} title="最近走势" />

          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">三个时间窗</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[recentWindow, currentWindow, anchorWindow].filter(Boolean).map((window) => (
                <div key={window?.key} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">{window?.label}</div>
                  <div className="mt-2 text-xs text-slate-400">{window?.sampleCount} 次记录</div>
                  <dl className="mt-4 space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <dt>CEI 中位</dt>
                      <dd>{Math.round(window?.ceiMedian ?? 0)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Hw 中位</dt>
                      <dd>{Math.round(window?.hwMedian ?? 0)}%</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>控制分中位</dt>
                      <dd>{Math.round(window?.controlMedian ?? 0)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>波动</dt>
                      <dd>{window?.volatility.toFixed(1)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">日历与记录</h2>
            <p className="mt-2 text-sm text-slate-400">先看日历，再往下翻最近的记录，会更轻松一些。</p>
            <div className="mt-5">
              <Calendar sessions={sessions} onDeleteSession={onDeleteSession} />
            </div>
            <div className="mt-6">
              <SessionsDetailsTable
                sessions={sessions}
                settings={settings}
                baseline={baseline}
                currentPlan={fallbackPlan}
                onDataChanged={onDataChanged}
                onDeleteSession={onDeleteSession}
                limit={20}
                title="训练记录"
                showTransferTools={false}
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <BaselineCard baseline={baseline} comparison={baselineComparison} />
          </section>
          <StreakCard />
          {featuredMedal ? (
            <MedalCard medal={featuredMedal} unlocked />
          ) : null}
          {nextMedal?.medal ? (
            <MedalCard
              medal={nextMedal.medal}
              unlocked={false}
              progressPercent={nextMedal.progressPercent}
              hint={nextMedal.progressHint}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
