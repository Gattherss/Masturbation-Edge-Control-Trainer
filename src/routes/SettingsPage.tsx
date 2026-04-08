import type { Badge, Plan, PublicProfile, Settings, SyncState } from '@/types/models';

interface SettingsPageProps {
  settings: Settings;
  customPlan: Plan;
  profile: PublicProfile;
  syncState: SyncState;
  medals: Badge[];
  dataPanel: React.ReactNode;
  supabaseReady: boolean;
  supabaseProjectHost?: string;
  supabaseMissingKeys: string[];
  hasSupabaseSession: boolean;
  remoteLeaderboardStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  remoteLeaderboardCount: number;
  remoteLeaderboardError: string | null;
  onSettingsChange: (settings: Settings) => void;
  onCustomPlanChange: (plan: Plan) => void;
  onProfileChange: (profile: PublicProfile) => void;
  onSyncStateChange: (syncState: SyncState) => void;
  onRequestMagicLink: () => void;
  onSyncNow: () => void;
  onSignOutSupabase: () => void;
}

function SectionShell({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage({
  settings,
  customPlan,
  profile,
  syncState,
  medals,
  dataPanel,
  supabaseReady,
  supabaseProjectHost,
  supabaseMissingKeys,
  hasSupabaseSession,
  remoteLeaderboardStatus,
  remoteLeaderboardCount,
  remoteLeaderboardError,
  onSettingsChange,
  onCustomPlanChange,
  onProfileChange,
  onSyncStateChange,
  onRequestMagicLink,
  onSyncNow,
  onSignOutSupabase
}: SettingsPageProps) {
  const providerLabel = !supabaseReady
    ? '纯本地模式'
    : hasSupabaseSession
      ? 'Supabase 已连接'
      : '本地模式，可连接 Supabase';
  const syncStatusLabel =
    syncState.status === 'syncing'
      ? '正在同步'
      : syncState.status === 'error'
        ? '发生错误'
        : hasSupabaseSession
          ? '已登录，可同步'
          : supabaseReady
            ? '环境已就绪，等待登录'
            : '等待配置环境变量';
  const leaderboardLabel =
    remoteLeaderboardStatus === 'ready'
      ? `已读取 ${remoteLeaderboardCount} 名公开玩家`
      : remoteLeaderboardStatus === 'loading'
        ? '正在读取远端公开榜单'
        : remoteLeaderboardStatus === 'error'
          ? '远端榜单读取失败，当前会退回本地预演榜'
          : remoteLeaderboardStatus === 'empty'
            ? '远端榜单目前为空，当前会退回本地预演榜'
            : '尚未开始读取远端榜单';

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.36em] text-slate-500">Control Room</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">设置与同步</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          这里已经不只是训练开关，而是整套产品的控制台。训练参数、公开资料、同步状态、导入导出和未来 Supabase 登录都会从这里进入。
        </p>
      </section>

      <SectionShell title="训练模式" description="训练页负责执行，设置页负责把节律规则和默认行为明确下来。">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { key: 'basic', label: '基础', desc: '55–85 秒刺激，30–90 秒休息，适合把节律先练准。' },
            { key: 'endurance', label: '耐力', desc: '70–110 秒刺激，40–90 秒休息，适合往更长刺激推进。' },
            { key: 'wave', label: '波浪', desc: '50–120 秒刺激，节律更有起伏，适合做密度变化。' },
            { key: 'custom', label: '自定义', desc: '自己指定刺激/休息窗，把训练推到更贴身的节奏。' }
          ].map((mode) => (
            <label key={mode.key} className="rounded-[24px] border border-white/8 bg-black/20 p-4 transition hover:border-white/15">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="mode"
                  checked={settings.mode === mode.key}
                  onChange={() => onSettingsChange({ ...settings, mode: mode.key as Settings['mode'] })}
                />
                <span className="font-medium text-white">{mode.label}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{mode.desc}</p>
            </label>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="训练偏好" description="这里的开关决定记录方式、提示方式和移动端动画密度。">
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              key: 'collectArousalOnFinish',
              label: '结束时采集主观强度',
              desc: '保存时记录 1–10 的主观强度，便于复盘时看主观感受与客观分数是否一致。'
            },
            {
              key: 'restBeep',
              label: '休息超时提示音',
              desc: '休息超过建议时，每进入新的 60 秒惩罚段播放一次提示音。'
            },
            {
              key: 'defaultUsedPorn',
              label: '默认使用 Porn',
              desc: '新回合默认勾选“使用 Porn”，如果你平时多数训练会用到，这样更省操作。'
            },
            {
              key: 'reduceMotion',
              label: '减少动画',
              desc: '移动端和低性能设备可以把勋章、切页和浮层的动效收一收。'
            }
          ].map((item) => (
            <label key={item.key} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof Settings] as boolean}
                  onChange={(event) =>
                    onSettingsChange({
                      ...settings,
                      [item.key]: event.target.checked
                    })
                  }
                />
                <span className="font-medium text-white">{item.label}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.desc}</p>
            </label>
          ))}
        </div>
      </SectionShell>

      {settings.mode === 'custom' ? (
        <SectionShell title="自定义节律窗" description="自定义模式下，刺激和休息会直接使用这里的区间。">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-sm font-medium text-white">刺激窗（秒）</div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                  value={customPlan.targetStim[0]}
                  onChange={(e) =>
                    onCustomPlanChange({
                      ...customPlan,
                      targetStim: [Number(e.target.value || 0), customPlan.targetStim[1]]
                    })
                  }
                />
                <span className="text-slate-500">到</span>
                <input
                  type="number"
                  className="w-28 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                  value={customPlan.targetStim[1]}
                  onChange={(e) =>
                    onCustomPlanChange({
                      ...customPlan,
                      targetStim: [customPlan.targetStim[0], Number(e.target.value || 0)]
                    })
                  }
                />
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="text-sm font-medium text-white">休息窗（秒）</div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                  value={customPlan.targetRest[0]}
                  onChange={(e) =>
                    onCustomPlanChange({
                      ...customPlan,
                      targetRest: [Number(e.target.value || 0), customPlan.targetRest[1]]
                    })
                  }
                />
                <span className="text-slate-500">到</span>
                <input
                  type="number"
                  className="w-28 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                  value={customPlan.targetRest[1]}
                  onChange={(e) =>
                    onCustomPlanChange({
                      ...customPlan,
                      targetRest: [customPlan.targetRest[0], Number(e.target.value || 0)]
                    })
                  }
                />
              </div>
            </div>
          </div>
        </SectionShell>
      ) : null}

      <SectionShell title="公开资料" description="真实天梯只公开昵称、头像种子、代表勋章和派生指标，不展示原始训练细节。">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <label className="block text-sm text-slate-400">
              昵称
              <input
                className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                value={profile.displayName}
                onChange={(event) => onProfileChange({ ...profile, displayName: event.target.value })}
              />
            </label>
            <label className="mt-4 block text-sm text-slate-400">
              头像种子
              <input
                className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                value={profile.avatarSeed}
                onChange={(event) => onProfileChange({ ...profile, avatarSeed: event.target.value })}
              />
            </label>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <label className="block text-sm text-slate-400">
              一句话简介
              <textarea
                className="mt-2 min-h-[110px] w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                value={profile.tagline}
                onChange={(event) => onProfileChange({ ...profile, tagline: event.target.value })}
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={profile.visibility === 'public'}
                onChange={(event) =>
                  onProfileChange({
                    ...profile,
                    visibility: event.target.checked ? 'public' : 'private'
                  })
                }
              />
              公开进入天梯资料页
            </label>
          </div>
        </div>
        <div className="mt-4 rounded-[24px] border border-white/8 bg-black/20 p-4">
          <label className="block text-sm text-slate-400">
            代表勋章
            <select
              className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              value={profile.featuredMedalCode ?? ''}
              onChange={(event) =>
                onProfileChange({
                  ...profile,
                  featuredMedalCode: event.target.value || undefined
                })
              }
            >
              <option value="">自动选择最高级勋章</option>
              {medals.map((medal) => (
                <option key={medal.code} value={medal.code}>
                  {medal.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionShell>

      <SectionShell title="同步状态" description="Supabase 登录和同步边界已经预留好；如果当前还没有配置环境变量，这里会先以本地模式运行。">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="text-sm font-medium text-white">当前提供方</div>
            <div className="mt-3 text-2xl font-semibold text-white">{providerLabel}</div>
            <div className="mt-1 text-sm text-slate-400">状态：{syncStatusLabel}</div>
            <div className="mt-2 text-xs text-slate-500">
              {supabaseReady
                ? `Supabase 项目已检测到${supabaseProjectHost ? `：${supabaseProjectHost}` : '。'}`
                : '尚未检测到完整的 Supabase 环境变量。'}
            </div>
            {syncState.lastSyncedAt ? <div className="mt-2 text-xs text-slate-500">最近同步：{new Date(syncState.lastSyncedAt).toLocaleString()}</div> : null}
            {syncState.userId ? <div className="mt-2 text-xs text-slate-500">用户 ID：{syncState.userId}</div> : null}
            {syncState.email ? <div className="mt-2 text-xs text-slate-500">账号邮箱：{syncState.email}</div> : null}
            <div className="mt-2 text-xs text-slate-500">公开榜单：{leaderboardLabel}</div>
            {syncState.lastError ? <div className="mt-2 text-xs text-rose-300">{syncState.lastError}</div> : null}
            {remoteLeaderboardError ? <div className="mt-2 text-xs text-amber-300">{remoteLeaderboardError}</div> : null}
            {!supabaseReady && supabaseMissingKeys.length > 0 ? (
              <div className="mt-3 rounded-[18px] border border-amber-300/20 bg-amber-400/10 px-3 py-3 text-xs leading-6 text-amber-100">
                还缺少这些环境变量：{supabaseMissingKeys.join('、')}
              </div>
            ) : null}
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="text-sm font-medium text-white">同步操作</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              这里现在已经不只是占位入口，而是完整的联调控制区。先发 Magic Link 完成登录，再把本地训练、派生指标和公开资料同步到 Supabase。
            </p>
            <label className="mt-4 block text-sm text-slate-400">
              登录邮箱
              <input
                className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                value={syncState.email ?? ''}
                onChange={(event) =>
                  onSyncStateChange({
                    ...syncState,
                    email: event.target.value
                  })
                }
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRequestMagicLink}
                disabled={!supabaseReady || syncState.status === 'syncing'}
              >
                发送 Magic Link
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onSyncNow}
                disabled={!supabaseReady || !hasSupabaseSession || syncState.status === 'syncing'}
              >
                立即同步
              </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onSignOutSupabase}
                disabled={!hasSupabaseSession || syncState.status === 'syncing'}
              >
                退出 Supabase
              </button>
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              逻辑上仍然会保留本地存储，所以即使退出 Supabase，设备上的本地记录也不会丢失；变化只在于云端登录、同步与公开榜单是否真正接入。
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell title="数据管理" description="导入、导出和账本式浏览都在这里处理，这样复盘页可以更专注于阅读与判断。">
        {dataPanel}
      </SectionShell>
    </div>
  );
}
