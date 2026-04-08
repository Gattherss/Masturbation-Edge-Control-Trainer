export default function StandardsPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm leading-6 text-slate-300">
      <h2 className="text-lg font-semibold text-white">评估标准</h2>

      <p className="mt-2">术语采用本应用统一约定，尽量通俗直观，便于自我复盘。</p>

      <div className="mt-3 space-y-3">
        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3" open>
          <summary className="cursor-pointer font-semibold text-slate-200">Hw（时间命中率）</summary>
          <div className="mt-2 text-slate-300">
            刺激段处于目标窗口的时间占比。超过上限（通常 90 秒）部分按半权重计入，用来鼓励更长且更稳定的刺激。
            <div className="mt-1 text-xs text-slate-500">示例：刺激 100 秒，命中 30 秒 + 拉伸 15 秒 ×0.5 ⇒ Hw = (30+7.5)/100 = 0.375</div>
          </div>
        </details>

        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <summary className="cursor-pointer font-semibold text-slate-200">RCI（休息依从度）</summary>
          <div className="mt-2 text-slate-300">
            每段按 1 − |实际 − 建议| / 建议 计算依从度，再按时长加权平均，范围 [0,1]。越接近 1 表示越遵守建议休息时长。
            <div className="mt-1 text-xs text-slate-500">提示：可开启“休息超时提示音”，超过 60 秒每分钟提醒一次。</div>
          </div>
        </details>

        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <summary className="cursor-pointer font-semibold text-slate-200">PDI（刺激稳定性）</summary>
          <div className="mt-2 text-slate-300">刺激段秒数的变异系数（标准差 / 均值），越小越稳定。样本数少于 2 段时忽略。</div>
        </details>

        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <summary className="cursor-pointer font-semibold text-slate-200">CEI（控制效率）</summary>
          <div className="mt-2 text-slate-300">CEI = 0.6 × Hw + 0.4 × normR，并乘以休息惩罚；若前半程射精会轻度降分（×0.9）。</div>
        </details>

        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <summary className="cursor-pointer font-semibold text-slate-200">ODF（过度驱动）</summary>
          <div className="mt-2 text-slate-300">每 10 分钟内停止次数超过 6 的超额比例，用于提醒过频，不直接计入总分。</div>
        </details>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">总分与等级</h3>
      <p className="mt-1">总分构成：数量（时长）60% + 质量（CEI）25% + 稳定性 15%。等级：A ≥ 85，B ≥ 70，C ≥ 55，低于 55 为 D。</p>

      <h3 className="mt-4 text-sm font-semibold text-white">术语对照</h3>
      <ul className="mt-1 list-disc pl-5 text-slate-300">
        <li>刺激（S）/ 休息（R）：绿色/黄色分段</li>
        <li>命中窗口：刺激时保持在建议强度范围内</li>
        <li>建议时长：每段推荐的 S/R 秒数，用于计算 RCI 与命中率</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold text-white">训练建议</h3>
      <ul className="mt-1 list-disc pl-5 text-slate-300">
        <li>优先提高 Hw 与 RCI，再逐步延长总时长。</li>
        <li>刺激过长但命中率低时，缩短单段并提高命中。</li>
        <li>若 ODF 偏高，降低切换频率并拉长休息。</li>
      </ul>
    </section>
  );
}
