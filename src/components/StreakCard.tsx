import { loadCheckins } from '@/lib/storage';

function computeStreak(checkins: string[]) {
  if (checkins.length === 0) return { current: 0, longest: 0 };
  const dates = Array.from(new Set(checkins)).map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      current += 1;
    } else if (diff === 0) {
      continue;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  longest = Math.max(longest, current);
  return { current, longest };
}

export function StreakCard() {
  const checkins = loadCheckins();
  const { current, longest } = computeStreak(checkins);
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm text-slate-300">
      <h3 className="text-sm font-semibold text-white">连续打卡</h3>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div>
          <div className="text-slate-500">当前</div>
          <div className="text-lg font-semibold text-emerald-400">{current} 天</div>
        </div>
        <div>
          <div className="text-slate-500">最长</div>
          <div className="text-lg font-semibold text-indigo-400">{longest} 天</div>
        </div>
      </div>
    </div>
  );
}
