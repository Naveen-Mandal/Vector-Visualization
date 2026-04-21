export function Toggle({ label, checked, onChange, swatch }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
      <span>{label}</span>
      <input type="checkbox" className="h-3.5 w-3.5 accent-orange-400" checked={checked} onChange={onChange} />
    </label>
  );
}
