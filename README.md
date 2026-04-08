# 边缘控制训练 / Edge Control Trainer

这是一个自慰边缘寸止训练系统。
每次自慰如果不做训练是一种浪费。你可以边自慰边记录时间与状态，切实提升自己的控射能力和持久度。这个系统的目标非常明确且原始：让你越来越延时，越来越猛。

This is an edging control training system.
Masturbating without training is a waste. You can log your times and physical state as you masturbate to effectively build your ejaculatory control and endurance. The goal of this system is straightforward and primal: to make you last profoundly longer and become consistently stronger.

## 项目简介 / Overview

训练系统的操作极其平实。开始训练后，你持续自慰至接近高潮的绝顶边缘（寸止），接着点击休息按钮进入休息阶段。在休息区间内等待冲动平复，随后再次点击继续按钮，重新自慰至边缘。在一次训练中反复数次这样的循环，就能有效训练身体的控射极限。

The operation is entirely straightforward. Once you start a session, you masturbate continuously until reaching the very edge of climax. You then click the rest button to enter a recovery phase. After letting the urge subside, you click resume and masturbate to the edge again. Repeating this cycle several times in one session effectively trains your body's ejaculatory limits.

系统会将这些纯粹的生理数据全面记录并追踪。你承受高强度刺激的时间、你恢复平静的速度，将被数学模型接管。所有的训练增量最终都会被折算成分数，转化为证明实力的重金属勋章，并直接挂靠在真实的天梯段位序列中。

The system records and tracks all these pure physiological data points. The duration you endure intense stimulation and your recovery speed are managed by mathematical models. All your genuine improvements are ultimately quantified into scores, translated into heavy metallic medals, and ranked on an absolute competitive ladder.

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

