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
      ? '这里显示公开榜单，别人能看到的只有你愿意公开的资料。'
      : '登录并同步后，这里会换成公开榜单。现在先看一份本地示例。';

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.36em] text-slate-500">天梯</p>
            <h1 className="mt-3 text-3xl font-semibold text-white drop-shadow-md">赛季排名</h1>
            <p className="mt-2 text-sm text-slate-400">这里会显示本赛季的积分、状态和公开资料。</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-3 text-right text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">本赛季 · {season.name}</div>
            <div className="mt-2 text-3xl font-semibold text-white">{rating.score}</div>
            <div className="mt-1 text-xs text-slate-400">{rating.tier} {rating.division} · 百分位 {rating.percentile}%</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">晋级进度</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.progressToNext}%</div>
            <p className="mt-2 text-[11px] text-slate-400">离下一档还有多远</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">最近变化</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.change >= 0 ? `+${rating.change}` : rating.change}</div>
            <p className="mt-2 text-[11px] text-slate-400">最近这段时间的起伏</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">可信度</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{Math.round(rating.confidenceScore)}%</div>
            <p className="mt-2 text-[11px] text-slate-400">这份评估目前有多稳</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-inner">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">当前状态</div>
            <div className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{rating.provisional ? '暂定' : '已定级'}</div>
            <p className="mt-2 text-[11px] text-slate-400">{rating.provisional ? '记录还在继续累积' : '这一季已经有正式段位了'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white drop-shadow-md">本赛季榜单</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{leaderboardDescription}</p>
            </div>
            <div className="w-fit rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-400">
              {leaderboard.length} 名可见玩家
            </div>
          </div>
          {leaderboardStatus === 'loading' ? (
            <div className="mt-4 rounded-[18px] border border-sky-300/15 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
              正在更新榜单，请稍等一下。
            </div>
          ) : null}
          {leaderboardStatus === 'empty' ? (
            <div className="mt-4 rounded-[18px] border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              公开榜单里还没有内容，先看看这份示例榜单。
            </div>
          ) : null}
          {leaderboardStatus === 'error' ? (
            <div className="mt-4 rounded-[18px] border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              榜单暂时没有更新：{leaderboardError ?? '未知错误'}。先看看当前这份示例榜单。
            </div>
          ) : null}
          <div className="mt-5 space-y-3">
            {leaderboard.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  {entry.ladder.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{entry.profile.displayName}</div>
                  <div className="mt-1 truncate text-xs text-slate-400">{entry.profile.tagline}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-white">{entry.ladder.score}</div>
                  <div className="mt-1 text-xs text-slate-400">{entry.ladder.tier} {entry.ladder.division}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
            <h2 className="text-2xl font-semibold text-white">我的公开资料</h2>
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
