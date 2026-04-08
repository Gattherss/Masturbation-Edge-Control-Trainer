# Edging Trainer V2 Release Checklist

更新时间：2026-04-08

这份清单比路线图更偏执行，它的作用是在真正推送 GitHub、接通 Supabase、准备外部访问之前，给你一条可以逐项勾选的发布路径。路线图关心的是阶段顺序，而这份清单关心的是每一步有没有真实完成。

## 一、代码树与构建链

- [ ] 确认 `src` 中 `.js` 镜像文件的来源，并决定保留策略或清理策略。
- [ ] 再跑一遍 `npm.cmd test -- --run`，确认测试仍全绿。
- [ ] 再跑一遍 `npm.cmd run build`，确认构建通过。
- [ ] 记录当前构建警告，尤其是 `baseline-browser-mapping`、`caniuse-lite` 和 `supabase` 空 chunk。
- [ ] 确认 `dist` 产物可被正常预览。

## 二、Supabase 与数据边界

- [ ] 基于 [.env.example](d:/desk/新建文件夹/edging-trainer/.env.example) 创建 `.env.local`。
- [ ] 填入 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
- [ ] 在 Supabase 项目执行 [20260408_v2_bootstrap.sql](d:/desk/新建文件夹/edging-trainer/supabase/migrations/20260408_v2_bootstrap.sql)。
- [ ] 用邮箱魔法链接完成一次真实登录。
- [ ] 验证私有 session 能写入 `sessions_private`。
- [ ] 验证派生指标能写入 `session_metrics`。
- [ ] 验证勋章解锁能写入 `medal_unlocks`。
- [ ] 验证赛季评分能写入 `season_ratings`。
- [ ] 验证 `leaderboard_public` 只暴露公开字段，不含备注、segments、events、色情标记与射精标记。

## 三、产品体验回归

- [ ] 走通一条完整流程：训练 -> 保存 -> 勋章解锁 -> 复盘 -> 天梯。
- [ ] 检查训练页主操作区在桌面与手机上都清楚可用。
- [ ] 检查勋章页的材质层级、图形差异和文案是否足够明显。
- [ ] 检查复盘页是否能解释本次成绩、历史锚点对比和下一枚勋章进度。
- [ ] 检查天梯页是否能展示赛季、段位、阶位分、百分位与最近变动。
- [ ] 检查设置页中的账号、同步、导入导出与公开资料项是否都能进入正确状态。

## 四、移动端与 PWA

- [ ] 在常见手机尺寸下检查底部导航、顶部摘要、卡片间距和安全区。
- [ ] 检查 manifest、图标与 theme color 是否正常加载。
- [ ] 检查安装为 PWA 后首页图标、启动页与基本路由是否正常。
- [ ] 检查离线壳层是否至少能打开基础界面。
- [ ] 如果 Playwright 手机流程已写好，确认它可以在本地跑通。

## 五、Git 与 GitHub

- [ ] 检查 `.gitignore` 是否已经排除 `.env.local`、构建产物与本地日志。
- [ ] 复查 [README.md](d:/desk/新建文件夹/edging-trainer/README.md)、[progress.md](d:/desk/新建文件夹/edging-trainer/progress.md)、[roadmap.md](d:/desk/新建文件夹/edging-trainer/roadmap.md) 与这份清单是否彼此一致。
- [ ] 执行第一次正式提交，提交信息清楚描述当前版本。
- [ ] 绑定 GitHub 远端仓库。
- [ ] 推送 `main` 分支。
- [ ] 检查 [ci.yml](d:/desk/新建文件夹/edging-trainer/.github/workflows/ci.yml) 在 GitHub Actions 中是否通过。

## 六、公开发布前最后确认

- [ ] 明确哪些字段允许出现在公开资料页和排行榜中。
- [ ] 明确哪些字段永远只保留在私有层。
- [ ] 再看一遍排行榜与公开资料页，确认没有敏感信息漏出。
- [ ] 确认你准备使用的部署平台与 Supabase 环境变量配置方式。
- [ ] 做一次外部访问试跑，确保别人打开时不是本地地址，而是真实部署地址。

## 推荐的执行顺序

1. 先完成 Supabase 配置与 migration。
2. 再做一次本地全流程回归。
3. 然后处理 GitHub 提交、推送与 CI。
4. 最后再做公开部署与外部访问验证。
