# Edging Trainer V2 Progress

更新时间：2026-04-08

## 当前状态

`edging-trainer` 现在已经不再是一个零散的原型，而是进入了可以继续联调、可以准备上线的第二阶段版本。应用的主结构已经改成 `训练 / 复盘 / 勋章 / 天梯 / 设置`，视觉语言、长期成长算法、勋章体系、天梯体系、移动端壳层、Supabase 同步边界和 GitHub 发布基础设施都已经进入代码层，而不是只停留在讨论稿里。

## 已完成

1. 信息架构已经重组，旧的“洞察与成就 / 详细数据”叙事被收束为以训练、复盘、勋章、天梯为中心的新结构。
2. 训练评分已经从单一结果改成 `control / capacity / stability` 三个子分项，并在此之上生成长期成长分与天梯分。
3. 勋章系统已经升级为五大家族与四级材质的金属勋章体系，目录、规则和展示组件都已落地。
4. 天梯体系已经具备赛季、段位、阶位分、百分位、最近变动等核心对象与页面展示结构。
5. 移动端与 PWA 基础已经补齐，包括 manifest、图标、safe-area 与移动优先的壳层节奏。
6. Supabase 的客户端、类型边界、同步服务、环境变量样例和 SQL migration 已经写入项目。
7. Supabase 的会话恢复、Magic Link 登录状态承接、退出登录、远端公开榜单读取与本地预演榜回退逻辑已经接通，设置页和天梯页都能明确显示当前是在本地预演还是在读取远端公开视图。
8. Git 仓库已经初始化，CI 工作流已经写入，README 和公开仓库需要的基础说明文件也已补上。
9. 历史遗留的 `.bad` 备份稿已经清理掉，`src` 中那批 `.ts/.tsx` 对应的 `.js` 镜像文件也已经追查清楚并移除；根因是构建脚本原来直接执行 `tsc`，所以会把编译结果写回源码树，现在已经改成只做类型检查。

## 关键文件

- 入口与壳层：[App.tsx](d:/desk/新建文件夹/edging-trainer/src/App.tsx)
- 单次评分：[eval.ts](d:/desk/新建文件夹/edging-trainer/src/lib/eval.ts)
- 长期成长：[mastery.ts](d:/desk/新建文件夹/edging-trainer/src/lib/mastery.ts)
- 天梯算法：[ladder.ts](d:/desk/新建文件夹/edging-trainer/src/lib/ladder.ts)
- 勋章规则：[badges.ts](d:/desk/新建文件夹/edging-trainer/src/lib/badges.ts)
- 勋章组件：[MedalCard.tsx](d:/desk/新建文件夹/edging-trainer/src/components/MedalCard.tsx)
- 复盘页：[ReviewPage.tsx](d:/desk/新建文件夹/edging-trainer/src/routes/ReviewPage.tsx)
- 勋章页：[MedalsPage.tsx](d:/desk/新建文件夹/edging-trainer/src/routes/MedalsPage.tsx)
- 天梯页：[LadderPage.tsx](d:/desk/新建文件夹/edging-trainer/src/routes/LadderPage.tsx)
- 设置页：[SettingsPage.tsx](d:/desk/新建文件夹/edging-trainer/src/routes/SettingsPage.tsx)
- Supabase 客户端：[supabase.ts](d:/desk/新建文件夹/edging-trainer/src/lib/supabase.ts)
- 同步服务：[syncService.ts](d:/desk/新建文件夹/edging-trainer/src/services/syncService.ts)
- 环境变量样例：[.env.example](d:/desk/新建文件夹/edging-trainer/.env.example)
- 数据库迁移：[20260408_v2_bootstrap.sql](d:/desk/新建文件夹/edging-trainer/supabase/migrations/20260408_v2_bootstrap.sql)
- CI 配置：[ci.yml](d:/desk/新建文件夹/edging-trainer/.github/workflows/ci.yml)

## 已验证

1. `npm.cmd test -- --run` 已通过，当前测试结果为 10 个测试文件、26 个测试全部通过。
2. `npm.cmd run build` 已通过，产物已经完成按页面与库的分包。
3. `src` 在构建后不再重新生成 `.js` 镜像文件，这说明源码树污染问题已经从源头上被修正。
4. 构建过程中仍有依赖提醒，主要是 `baseline-browser-mapping` 与 `caniuse-lite` 版本偏旧，不过先前那个 `supabase` 空 chunk 提示已经消失，说明 Supabase 真实引用链路和分包关系都比之前更完整了。

## 仍待联调

1. 真实的 Supabase 环境变量还没有放进本地 `.env.local`，因此魔法链接登录和真实云同步还没有与线上库完成连通。
2. SQL migration 需要在 Supabase 项目中执行一次，之后公开排行榜视图和私有表策略才能进入真实验证。
3. GitHub 远端仓库还没有绑定，也还没有做第一次正式提交与推送。

## 建议的下一步

1. 创建 `.env.local`，填入 Supabase URL 与 anon key。
2. 在 Supabase 中执行 migration，完成数据库初始化。
3. 本地走一遍登录、同步、排行榜读取的联调流程。
4. 绑定 GitHub 远端并做第一次提交。
5. 视需要继续处理浏览器兼容性依赖提醒，并观察是否要消除 `supabase` 空 chunk。
