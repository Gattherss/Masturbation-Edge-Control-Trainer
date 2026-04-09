import { Modal } from '@/components/Modal';

interface WelcomeGateProps {
  open: boolean;
  email: string;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onSendMagicLink: () => void | Promise<void>;
  onContinueAsGuest: () => void;
  onMaybeLater: () => void;
}

export function WelcomeGate({
  open,
  email,
  loading,
  error,
  onClose,
  onEmailChange,
  onSendMagicLink,
  onContinueAsGuest,
  onMaybeLater
}: WelcomeGateProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="先选一种进入方式"
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.08]"
            onClick={onContinueAsGuest}
          >
            以游客继续
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
            onClick={onMaybeLater}
          >
            暂时不登录
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[26px] border border-sky-300/15 bg-sky-400/10 p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-sky-200/80">Sync First</div>
          <h3 className="mt-3 text-2xl font-semibold text-white">登录后可以把训练记录同步到你的账号</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            这里用的是邮箱 Magic Link，不需要记密码。你在这台设备上的训练、勋章和赛季数据会继续保留；登录之后，再换手机或浏览器也更容易接上之前的进度。
          </p>

          <label className="mt-5 block text-sm text-slate-300">
            登录邮箱
            <input
              type="email"
              className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {error ? (
            <div className="mt-3 rounded-[18px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs leading-6 text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onSendMagicLink()}
              disabled={loading}
            >
              {loading ? '发送中...' : '发送登录链接'}
            </button>
            <p className="text-xs leading-6 text-slate-400">如果你只是想先体验一下，也可以直接走游客模式，本地记录照样能用。</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
            <div className="text-sm font-semibold text-white">游客模式</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              先直接进入训练，记录保存在当前浏览器里。适合先看界面、先试流程，或者暂时不想把邮箱填进来。
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
            <div className="text-sm font-semibold text-white">稍后再决定</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              现在先关掉也可以。我们会把这次选择记住，短时间里不再反复打扰你；等你想同步时，仍然可以去设置页登录。
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
