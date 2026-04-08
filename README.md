# 寸止边缘训练器 / Edge Control Trainer

`寸止边缘训练器` 是一套围绕节律训练、长期成长追踪、奖励反馈与公开竞技秩序构建的前端产品。它把单次训练记录、长期算法评估、金属勋章体系、赛季天梯、移动端 PWA 壳层和 Supabase 云端同步边界组织成了一条完整链路，因此这个项目既可以作为本地训练工具来使用，也已经具备继续推进为一套公开产品的结构基础。

`Edge Control Trainer` is a frontend product built around rhythm training, long-horizon progress tracking, reward design, and a publishable competitive ladder. It connects session logging, deterministic scoring, metallic medals, seasonal ladder progression, a mobile-first PWA shell, and Supabase sync boundaries into one coherent system.

## 项目简介 / Overview

这个项目试图回答的，不只是“今天练了多久”，而是更细也更难的问题：休息是否在缩短、持续刺激是否在变长、控制与稳定性是否在同步提高、这些变化在几个月的跨度上是否仍然成立，以及这些结果怎样被转译成勋章、段位和公开排行榜中的位置。

This project is not only about counting time. It is designed to answer a harder set of questions: whether rest windows are shrinking, whether sustained stimulation is extending, whether control and stability are improving together, whether those changes still hold across months, and how those results can be translated into medals, tier movement, and public ladder placement.

## 主要功能 / Core Features

- 训练主舞台 / Training stage:
  `训练 / 复盘 / 勋章 / 天梯 / 设置` 五段式信息架构，刺激与休息的状态机流程，基础、耐力、波浪和自定义节律模式。
- 单次评分 / Session scoring:
  把一次训练拆成 `control / capacity / stability` 三个子分项，同时保留 `CEI / Hw / RCI / PDI / ODF` 等派生指标。
- 长期成长算法 / Long-term mastery model:
  使用稳健中位数、滚动窗口和历史锚点，而不是简单平均数，默认窗口是 `14 天 / 56 天 / 120–180 天前锚点`。
- 金属勋章系统 / Metallic medal system:
  五个勋章家族，四个材质等级，支持陈列、解锁进度、代表勋章和多页面承接。
- 真实天梯结构 / Ladder system:
  赛季、段位、阶位分、晋级区、保级区、百分位与最近变动，并区分本地预演榜和远端公开榜。
- 数据管理与同步 / Data management and sync:
  本地 `localStorage`、CSV / JSON 导入导出、Supabase Magic Link 登录、私有原始数据与公开派生指标的分层同步。
- 手机版与 PWA / Mobile and PWA:
  响应式布局、底部导航、safe-area、manifest、图标和 service worker。

## 评分与成长逻辑 / Scoring and Progress Logic

当前算法层已经形成了两层结构。第一层负责理解单次训练，把一次会话拆成 `control`、`capacity`、`stability` 三个子分项；第二层负责理解长期成长，用更宽的时间窗口把“偶然一次发挥”与“真正的长期推进”区分开来。

The scoring model is currently organized in two layers. The first layer interprets one session and decomposes it into `control`, `capacity`, and `stability`. The second layer interprets long-term progress and uses wider windows to distinguish a one-off spike from a genuine sustained improvement.

默认窗口如下 / Default windows:

- 近期状态窗口 / Recent window: `14 days`
- 当前能力块 / Current block: `56 days`
- 历史锚点 / Historical anchor: `monthly anchor from 120–180 days earlier`

## 勋章与天梯 / Medals and Ladder

勋章系统目前按五个家族组织：`节律 / 控稳 / 耐力 / 进阶 / 连胜`，并且每个家族都有 `黑铁 / 锻铁 / 精钢 / 钛黑` 四个材质层级。它的作用不只是做视觉奖励，而是把长期成长结果转成一种更容易被感知、被记住、也更适合公开展示的语言。

The medal system is organized into five families: `rhythm / control / endurance / progression / streak`, and each family has four material tiers: `black iron / forged iron / steel / titanium black`. Its purpose is not only visual reward, but to turn long-term improvement into something visible, memorable, and suitable for public presentation.

天梯系统则继续往前一步，把长期表现转成公开可比较的赛季分数与阶位结构。当前界面既支持本地预演榜，也支持在 Supabase 公开视图可用时自动切换到远端榜单。

The ladder system takes one further step and converts long-term performance into a seasonal score and tier structure that can be compared publicly. The current app supports both a local preview ladder and an automatic switch to a remote Supabase-backed public ladder when the view is available.

## 技术栈 / Tech Stack

- Frontend: `React 18 + TypeScript + Vite`
- Styling: `Tailwind CSS`
- Motion: `Framer Motion`
- Charts: `Recharts`
- Cloud backend: `Supabase`
- Testing: `Vitest + Testing Library + Playwright config`

## 隐私边界 / Privacy Boundaries

这个项目从一开始就把“公开什么、不公开什么”当作产品结构的一部分，而不是上线前临时补的一层遮挡。因此现在的原则是：私有层保留原始训练记录，包括备注、segments、events 和其他敏感字段；公开层只展示公开资料、勋章、阶位分与派生指标；排行榜视图不直接暴露原始训练细节。

Privacy is treated as a structural design concern from the beginning, not as a last-minute mask. The current rule is simple: private storage keeps the raw session data, including notes, segments, events, and other sensitive fields; the public layer only exposes public profile data, medals, ladder scores, and derived metrics; the leaderboard view does not expose raw session details.

Supabase migration:

`supabase/migrations/20260408_v2_bootstrap.sql`

核心数据库对象 / Core database objects:

- `profiles`
- `sessions_private`
- `session_metrics`
- `medal_unlocks`
- `season_ratings`
- `seasons`
- `leaderboard_public`

## 本地运行 / Local Development

安装依赖 / Install dependencies:

```bash
npm install
```

启动开发环境 / Start the dev server:

```bash
npm run dev
```

类型检查、测试与构建 / Typecheck, test, and build:

```bash
npm run typecheck
npm run test -- --run
npm run build
```

默认开发地址通常是 `http://127.0.0.1:5173/`，如果端口被占用，Vite 会自动切换到相邻端口。

The default dev address is usually `http://127.0.0.1:5173/`, and Vite will move to a nearby port if that one is already occupied.

## 环境变量 / Environment Variables

把 `.env.example` 复制为 `.env.local`，然后填入你的 Supabase 项目配置。

Copy `.env.example` to `.env.local`, then fill in your Supabase project settings.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

如果这两个变量没有配置，应用会自动退回本地模式。训练、复盘、勋章和本地预演天梯仍然可以使用，只是不会尝试连接 Supabase、发送 Magic Link 或读取远端公开榜单。

If these variables are not configured, the app automatically falls back to local-only mode. Training, review, medals, and the local preview ladder still work, but Supabase login, sync, and remote leaderboard reads remain disabled.

## 当前状态 / Current Status

当前版本已经具备这些能力：

The current version already includes:

- 完整的信息架构重组 / full information architecture restructure
- 单次评分与长期成长模型 / session scoring and long-term mastery logic
- 金属勋章系统 / metallic medal system
- 天梯页与公开资料页 / ladder and public profile pages
- Supabase 会话恢复、Magic Link 入口、远端榜单读取与本地回退 / Supabase session restore, Magic Link flow, remote leaderboard reads, and local fallback
- 响应式 PWA 壳层 / responsive PWA shell
- CI、进度文档与发布清单 / CI, progress docs, and release checklist

更细的状态可以看：

For more detailed status tracking:

- [progress.md](./progress.md)
- [roadmap.md](./roadmap.md)
- [release-checklist.md](./release-checklist.md)

## 当前已知事项 / Known Issues

- `charts` chunk 仍然偏大，后面值得继续观察分包策略。
- `baseline-browser-mapping` 与 `caniuse-lite` 还有版本提醒。
- 真正的 Supabase 联调还需要你填入 `.env.local` 并执行 migration。
- GitHub 远端还没有绑定，也还没有完成第一次正式推送。

- The `charts` chunk is still relatively large and may deserve more bundle splitting work.
- `baseline-browser-mapping` and `caniuse-lite` still report version-age warnings.
- Real Supabase integration still requires a populated `.env.local` and a migration run.
- The GitHub remote has not been bound yet, and the first public push has not happened.

## 下一步 / Next Steps

1. 在 Supabase 中执行 migration。 / Run the Supabase migration.
2. 填好 `.env.local`。 / Fill in `.env.local`.
3. 本地走通 Magic Link 登录与同步。 / Verify Magic Link login and sync locally.
4. 绑定 GitHub 远端并做第一次提交与推送。 / Bind the GitHub remote and perform the first push.
5. 再决定是否用 Vercel 或 Netlify 做公开部署。 / Decide whether to deploy publicly with Vercel or Netlify.
