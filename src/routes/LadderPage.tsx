import type { LadderRating, LadderSeason, LeaderboardEntry, MedalUnlock, PublicProfile } from '@/types/models';
import { MedalCard } from '@/components/MedalCard';

interface LadderPageProps {
  season: LadderSeason;
  rating: LadderRating;
  leaderboard: LeaderboardEntry[];
  leaderboardSource: 'preview' | 'supabase';
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  leaderboardError: string | null;
  profile: PublicProfile;
  featuredMedal: MedalUnlock | null;
}

export default function LadderPage({
  season,
  rating,
  leaderboard,
  leaderboardSource,
  leaderboardStatus,
  leaderboardError,
  profile,
  featuredMedal
}: LadderPageProps) {
  const leaderboardDescription =
    leaderboardSource === 'supabase'
      ? '当前榜单来自 Supabase 的公开视图，展示的已经是远端赛季排名。'
      : '当前仍在展示本地预演榜；只要远端公开视图可用，这里就会自动切换成真实赛季榜。';

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.36em] text-slate-500">Season Ladder</p>
            <h1 className="mt-3 text-3xl font-semibold text-white drop-shadow-md">真实天梯与公开资料</h1>
            <p className="mt-2 text-sm text-slate-400">基于 Master 模型进行数据转换，自动同步分段</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-3 text-right text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">{season.name}</div>
            <div className="mt-2 text-3xl font-semibold text-white">{rating.score}</div>
            <div className="mt-1 text-xs text-slate-400">{rating.tier} {rating.division} · 百分位 {rating.percentile}%</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Promotion</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.progressToNext}%</div>
            <p className="mt-2 text-[11px] text-slate-400">本阶段晋级进度</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Change</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.change >= 0 ? `+${rating.change}` : rating.change}</div>
            <p className="mt-2 text-[11px] text-slate-400">近期 Mastery 浮动趋势</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Confidence</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{Math.round(rating.confidenceScore)}%</div>
            <p className="mt-2 text-[11px] text-slate-400">模型评估置信度</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Status</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.provisional ? '临时评估' : '正式排名'}</div>
            <p className="mt-2 text-[11px] text-slate-400">{rating.provisional ? '定级赛进行中' : '已获得正式段位'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white drop-shadow-md">本赛季榜单</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{leaderboardDescription}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-400">
              {leaderboard.length} 名可见玩家
            </div>
          </div>
          {leaderboardStatus === 'loading' ? (
            <div className="mt-4 rounded-[18px] border border-sky-300/15 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              正在读取 Supabase 公开榜单，如果远端数据可用，这里会自动切换到真实赛季排行。
            </div>
          ) : null}
          {leaderboardStatus === 'empty' ? (
            <div className="mt-4 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              远端公开榜单目前还是空的，所以这里暂时继续显示本地预演榜。
            </div>
          ) : null}
          {leaderboardStatus === 'error' ? (
            <div className="mt-4 rounded-[18px] border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              远端榜单读取失败：{leaderboardError ?? '未知错误'}。当前已自动退回本地预演榜。
            </div>
          ) : null}
          <div className="mt-5 space-y-3">
            {leaderboard.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  {entry.ladder.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{entry.profile.displayName}</div>
                  <div className="mt-1 truncate text-xs text-slate-400">{entry.profile.tagline}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{entry.ladder.score}</div>
                  <div className="mt-1 text-xs text-slate-400">{entry.ladder.tier} {entry.ladder.division}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
            <h2 className="text-2xl font-semibold text-white">公开资料</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">昵称</dt>
                <dd className="font-medium text-white">{profile.displayName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">头像种子</dt>
                <dd>{profile.avatarSeed}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">公开状态</dt>
                <dd>{profile.visibility === 'public' ? '公开' : '私密'}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-400">{profile.tagline}</p>
          </section>

          {featuredMedal ? <MedalCard medal={featuredMedal} unlocked /> : null}
        </div>
      </div>
    </div>
  );
}
