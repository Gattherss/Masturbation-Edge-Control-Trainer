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
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-slate-200 transition hover:bg-white/[0.08] sm:w-auto sm:px-4 sm:py-3 sm:text-sm"
            onClick={onContinueAsGuest}
          >
            以游客继续
          </button>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200 sm:w-auto sm:px-4 sm:py-3 sm:text-sm"
            onClick={onMaybeLater}
          >
            稍后再决定
          </button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <section className="rounded-[22px] border border-sky-300/15 bg-sky-400/10 p-3.5 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/80">Sync First</div>
              <h3 className="mt-1.5 text-lg font-semibold text-white sm:mt-2 sm:text-2xl">
                登录后可以把训练记录同步到你的账号
              </h3>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 sm:block">
              Magic Link
            </div>
          </div>

          <p className="mt-2.5 text-[13px] leading-6 text-slate-300 sm:mt-3 sm:text-sm sm:leading-7">
            这里用的是邮箱 Magic Link，不需要密码。你在这台设备上的训练、勋章和赛季数据会继续保留；登录之后，再换手机或浏览器也更容易接上之前的进度。
          </p>

          <label className="mt-3 block text-sm text-slate-300">
            登录邮箱
            <input
              type="email"
              className="mt-2 w-full rounded-[16px] border border-white/10 bg-black/30 px-4 py-2.5 text-[15px] text-white outline-none transition focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20 sm:py-3 sm:text-base"
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

          <button
            type="button"
            className="mt-3 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-4 sm:px-5 sm:py-3.5 sm:text-base"
            onClick={() => void onSendMagicLink()}
            disabled={loading}
          >
            {loading ? '发送中...' : '发送登录链接'}
          </button>

          <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:mt-3 sm:text-xs sm:leading-6">
            如果你只想先体验一下，也可以直接走游客模式，本地记录照样能用。
          </p>
        </section>

        <section className="hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-4 sm:block sm:p-5">
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">What This Is</div>
          <h3 className="mt-2 text-lg font-semibold text-white sm:text-2xl">这是一套边缘控制训练记录器</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:leading-7">
            你可以在训练过程中记录每一轮刺激与休息的时间、状态和结果，把原本零散的体验变成可追踪、可复盘的训练数据，从而更具体地提升控制力、耐力和长期表现。
          </p>
          <p className="mt-2 hidden text-sm leading-7 text-slate-400 sm:block">
            它不只是计时器。系统会把单次训练拆成节律、容量和稳定性的变化，再继续累计成勋章、赛季评分和长期成长轨迹，让你更清楚自己到底在怎样进步。
          </p>
        </section>

        <div className="hidden gap-3 sm:grid sm:grid-cols-2">
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
