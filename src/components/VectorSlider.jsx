import { formatNumber, formatVector } from "../utils/vectorMath";

export function VectorSlider({ label, vector, setVector, color }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/5 p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-white">{label}</h3>
      </div>
      {["x", "y", "z"].map((axis, index) => (
        <label key={axis} className="mb-1.5 grid grid-cols-[22px_1fr_56px] items-center gap-2 text-xs text-slate-300">
          <span className="uppercase">{axis}</span>
          <input
            type="range"
            min="-24"
            max="24"
            step="0.1"
            value={vector[index]}
            onChange={(event) => {
              const next = [...vector];
              next[index] = Number(event.target.value);
              setVector(next);
            }}
          />
          <strong className="text-right font-mono text-[11px] text-cyan-100">{formatNumber(vector[index])}</strong>
        </label>
      ))}
      <p className="mt-2 rounded-2xl bg-slate-950/45 px-2.5 py-1.5 font-mono text-[11px] text-slate-200">{formatVector(vector)}</p>
    </div>
  );
}
