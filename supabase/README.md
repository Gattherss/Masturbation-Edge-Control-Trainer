# Supabase Bootstrap

1. 在 Supabase 项目里执行 `supabase/migrations/20260408_v2_bootstrap.sql`
2. 把项目 URL 和 anon key 填入 `.env.local`
3. 在设置页使用邮箱 Magic Link 登录
4. 完成一次训练后，点击“立即同步”

公开排行榜只读取 `leaderboard_public` 视图，私有原始数据只保存在 `sessions_private`。

