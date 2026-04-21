export function MetricCard({ title, value, caption }) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="font-mono text-sm text-cyan-100">{value}</p>
      {caption ? <p className="mt-1 text-xs text-slate-400">{caption}</p> : null}
    </article>
  );
}
