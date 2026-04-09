import { useEffect, useMemo, useRef, useState } from "react";

const presets = {
  reset: { a: [4, 3, 2], b: [2, 5, 1], k: 1.5 },
  orthogonal: { a: [6, 0, 0], b: [0, 5, 0], k: 1.5 },
  parallel: { a: [3, 2, 1], b: [6, 4, 2], k: 2 },
  antiParallel: { a: [3, 2, 0], b: [-6, -4, 0], k: -1.5 },
  projection: { a: [7, 4, 0], b: [8, 0, 0], k: 0.8 },
  plane: { a: [5, 2, 1], b: [1, 4, 3], k: 1.1 },
  cross: { a: [4, 1, 0], b: [1, 3, 5], k: 1.2 },
  largeScale: { a: [18, 12, 6], b: [10, -15, 8], k: 2.6 },
};

const colors = {
  a: "#53d6ff",
  b: "#ff6f9f",
  sum: "#ffe066",
  diff: "#ff9f6e",
  proj: "#97ffc8",
  rej: "#bca4ff",
  scaledA: "#f6c7ff",
  scaledB: "#86efac",
  cross: "#fff4b3",
  grid: "rgba(147,191,224,0.12)",
};

function add(a, b) {
  return a.map((value, index) => value + b[index]);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function scale(v, k) {
  return v.map((value) => value * k);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function magnitude(v) {
  return Math.hypot(...v);
}

function normalize(v) {
  const mag = magnitude(v);
  return mag === 0 ? [0, 0, 0] : scale(v, 1 / mag);
}

function project(ofVector, ontoVector) {
  const denominator = dot(ontoVector, ontoVector);
  return denominator === 0 ? [0, 0, 0] : scale(ontoVector, dot(ofVector, ontoVector) / denominator);
}

function angleBetween(a, b) {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot(a, b) / denom));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function hadamard(a, b) {
  return a.map((value, index) => value * b[index]);
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function formatVector(vector) {
  return `(${vector.map(formatNumber).join(", ")})`;
}

function project3D([x, y, z]) {
  const yaw = Math.PI / 4;
  const pitch = Math.PI / 6;
  const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
  const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
  const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  return [x1, y1];
}

function drawGrid(ctx, width, height, centerX, centerY, pixelsPerUnit) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;

  for (let x = centerX; x < width; x += pixelsPerUnit) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let x = centerX; x > 0; x -= pixelsPerUnit) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = centerY; y < height; y += pixelsPerUnit) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let y = centerY; y > 0; y -= pixelsPerUnit) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(237,247,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();
}

function drawArrow2D(ctx, vector, centerX, centerY, pixelsPerUnit, color, label, dashed = false) {
  const [x, y] = vector;
  const tipX = centerX + x * pixelsPerUnit;
  const tipY = centerY - y * pixelsPerUnit;
  const angle = Math.atan2(tipY - centerY, tipX - centerX);

  ctx.save();
  if (dashed) ctx.setLineDash([8, 6]);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const head = 11;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - head * Math.cos(angle - Math.PI / 6), tipY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tipX - head * Math.cos(angle + Math.PI / 6), tipY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.font = "13px Consolas";
  ctx.fillText(label, tipX + 8, tipY - 8);
  ctx.restore();
}

function drawParallelogram(ctx, a, b, centerX, centerY, pixelsPerUnit) {
  const ax = centerX + a[0] * pixelsPerUnit;
  const ay = centerY - a[1] * pixelsPerUnit;
  const bx = centerX + b[0] * pixelsPerUnit;
  const by = centerY - b[1] * pixelsPerUnit;
  const sx = centerX + (a[0] + b[0]) * pixelsPerUnit;
  const sy = centerY - (a[1] + b[1]) * pixelsPerUnit;
  ctx.save();
  ctx.fillStyle = "rgba(255,224,102,0.08)";
  ctx.strokeStyle = "rgba(255,224,102,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(ax, ay);
  ctx.lineTo(sx, sy);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAngleArc(ctx, a, b, centerX, centerY, pixelsPerUnit) {
  const aAngle = Math.atan2(-a[1], a[0]);
  const bAngle = Math.atan2(-b[1], b[0]);
  const radius = Math.max(22, pixelsPerUnit * 1.15);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, aAngle, bAngle, false);
  ctx.stroke();
  ctx.restore();
}

function drawProjectedArrow(ctx, vector, width, height, color, label, globalScale) {
  const [px, py] = project3D(vector);
  const originX = width / 2;
  const originY = height / 2 + 16;
  const tipX = originX + px * globalScale;
  const tipY = originY - py * globalScale;
  const angle = Math.atan2(tipY - originY, tipX - originX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const head = 11;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - head * Math.cos(angle - Math.PI / 6), tipY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tipX - head * Math.cos(angle + Math.PI / 6), tipY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.font = "13px Consolas";
  ctx.fillText(label, tipX + 8, tipY - 8);
  ctx.restore();
}

function useCanvas(canvasRef, draw, deps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    draw(ctx, canvas);
  }, deps);
}

function Toggle({ label, checked, onChange, swatch }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch }} />
      <span>{label}</span>
      <input type="checkbox" className="h-3.5 w-3.5 accent-orange-400" checked={checked} onChange={onChange} />
    </label>
  );
}

function MetricCard({ title, value, caption }) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="font-mono text-sm text-cyan-100">{value}</p>
      {caption ? <p className="mt-1 text-xs text-slate-400">{caption}</p> : null}
    </article>
  );
}

function VectorSlider({ label, vector, setVector, color }) {
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

export default function App() {
  const [vectorA, setVectorA] = useState(presets.reset.a);
  const [vectorB, setVectorB] = useState(presets.reset.b);
  const [scalarK, setScalarK] = useState(presets.reset.k);
  const [visible, setVisible] = useState({
    sum: true,
    diff: true,
    proj: true,
    rej: true,
    scaledA: true,
    scaledB: false,
    unitA: false,
    unitB: false,
    parallelogram: true,
    angle: true,
    normal: true,
  });

  const planeCanvasRef = useRef(null);
  const crossCanvasRef = useRef(null);

  const computed = useMemo(() => {
    const sum = add(vectorA, vectorB);
    const difference = subtract(vectorA, vectorB);
    const scaledA = scale(vectorA, scalarK);
    const scaledB = scale(vectorB, scalarK);
    const normalizedA = normalize(vectorA);
    const normalizedB = normalize(vectorB);
    const dotValue = dot(vectorA, vectorB);
    const crossValue = cross(vectorA, vectorB);
    const angle = angleBetween(vectorA, vectorB);
    const projAonB = project(vectorA, vectorB);
    const projBonA = project(vectorB, vectorA);
    const rejAfromB = subtract(vectorA, projAonB);
    const hadamardValue = hadamard(vectorA, vectorB);
    const distance = magnitude(difference);
    const area = magnitude(crossValue);
    const cosine = magnitude(vectorA) * magnitude(vectorB) === 0 ? 0 : dotValue / (magnitude(vectorA) * magnitude(vectorB));
    const planeNormal = normalize(crossValue);

    return {
      sum,
      difference,
      scaledA,
      scaledB,
      normalizedA,
      normalizedB,
      dotValue,
      crossValue,
      angle,
      projAonB,
      projBonA,
      rejAfromB,
      hadamardValue,
      distance,
      area,
      cosine,
      planeNormal,
      triple: dot(crossValue, [0, 0, 1]),
    };
  }, [scalarK, vectorA, vectorB]);

  const planeBounds = useMemo(() => {
    const candidates = [vectorA, vectorB];
    if (visible.sum) candidates.push(computed.sum);
    if (visible.diff) candidates.push(computed.difference);
    if (visible.proj) candidates.push(computed.projAonB);
    if (visible.rej) candidates.push(computed.rejAfromB);
    if (visible.scaledA) candidates.push(computed.scaledA);
    if (visible.scaledB) candidates.push(computed.scaledB);
    if (visible.unitA) candidates.push(computed.normalizedA);
    if (visible.unitB) candidates.push(computed.normalizedB);
    return Math.max(8, ...candidates.flatMap((vector) => [Math.abs(vector[0]), Math.abs(vector[1])]));
  }, [computed, vectorA, vectorB, visible]);

  const crossBounds = useMemo(() => {
    const vectors = [[8, 0, 0], [0, 8, 0], [0, 0, 8], vectorA, vectorB];
    if (visible.normal) vectors.push(computed.crossValue);
    return Math.max(8, ...vectors.map(project3D).flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
  }, [computed.crossValue, vectorA, vectorB, visible.normal]);

  const insight = useMemo(() => {
    const relation =
      Math.abs(computed.dotValue) < 0.15
        ? "almost orthogonal"
        : Math.abs(computed.angle) < 8 || Math.abs(computed.angle - 180) < 8
          ? "almost parallel"
          : "obliquely related";
    return `A and B are ${relation}. The adaptive 2D plane now follows only the layers you have enabled, so the zoom reacts to the current view instead of a fixed maximum. The side-by-side normal view makes it easier to connect the spanned plane with the cross-product direction.`;
  }, [computed.angle, computed.dotValue]);

  useCanvas(
    planeCanvasRef,
    (ctx, canvas) => {
      const width = canvas.width;
      const height = canvas.height;
      const padding = 48;
      const pixelsPerUnit = Math.min((width - padding * 2) / (planeBounds * 2), (height - padding * 2) / (planeBounds * 2));
      const centerX = width / 2;
      const centerY = height / 2;

      drawGrid(ctx, width, height, centerX, centerY, pixelsPerUnit);
      if (visible.parallelogram) drawParallelogram(ctx, vectorA, vectorB, centerX, centerY, pixelsPerUnit);
      if (visible.angle) drawAngleArc(ctx, vectorA, vectorB, centerX, centerY, pixelsPerUnit);

      drawArrow2D(ctx, [vectorA[0], vectorA[1]], centerX, centerY, pixelsPerUnit, colors.a, "A");
      drawArrow2D(ctx, [vectorB[0], vectorB[1]], centerX, centerY, pixelsPerUnit, colors.b, "B");
      if (visible.sum) drawArrow2D(ctx, [computed.sum[0], computed.sum[1]], centerX, centerY, pixelsPerUnit, colors.sum, "A+B");
      if (visible.diff) drawArrow2D(ctx, [computed.difference[0], computed.difference[1]], centerX, centerY, pixelsPerUnit, colors.diff, "A-B");
      if (visible.proj) drawArrow2D(ctx, [computed.projAonB[0], computed.projAonB[1]], centerX, centerY, pixelsPerUnit, colors.proj, "proj");
      if (visible.rej) drawArrow2D(ctx, [computed.rejAfromB[0], computed.rejAfromB[1]], centerX, centerY, pixelsPerUnit, colors.rej, "rej");
      if (visible.scaledA) drawArrow2D(ctx, [computed.scaledA[0], computed.scaledA[1]], centerX, centerY, pixelsPerUnit, colors.scaledA, "kA", true);
      if (visible.scaledB) drawArrow2D(ctx, [computed.scaledB[0], computed.scaledB[1]], centerX, centerY, pixelsPerUnit, colors.scaledB, "kB", true);
      if (visible.unitA) drawArrow2D(ctx, [computed.normalizedA[0], computed.normalizedA[1]], centerX, centerY, pixelsPerUnit, "#8cc6ff", "uA", true);
      if (visible.unitB) drawArrow2D(ctx, [computed.normalizedB[0], computed.normalizedB[1]], centerX, centerY, pixelsPerUnit, "#ffb0dd", "uB", true);

      if (visible.proj) {
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = "rgba(151,255,200,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + vectorA[0] * pixelsPerUnit, centerY - vectorA[1] * pixelsPerUnit);
        ctx.lineTo(centerX + computed.projAonB[0] * pixelsPerUnit, centerY - computed.projAonB[1] * pixelsPerUnit);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(237,247,255,0.85)";
      ctx.font = "14px Consolas";
      ctx.fillText(`visible range: +/-${formatNumber(planeBounds)} units`, 18, 28);
    },
    [computed, planeBounds, vectorA, vectorB, visible],
  );

  useCanvas(
    crossCanvasRef,
    (ctx, canvas) => {
      const width = canvas.width;
      const height = canvas.height;
      const scaleValue = Math.min((width * 0.32) / crossBounds, (height * 0.32) / crossBounds);
      drawGrid(ctx, width, height, width / 2, height / 2 + 16, 42);
      drawProjectedArrow(ctx, [8, 0, 0], width, height, "rgba(83,214,255,0.35)", "x", scaleValue);
      drawProjectedArrow(ctx, [0, 8, 0], width, height, "rgba(255,224,102,0.35)", "y", scaleValue);
      drawProjectedArrow(ctx, [0, 0, 8], width, height, "rgba(151,255,200,0.35)", "z", scaleValue);
      drawProjectedArrow(ctx, vectorA, width, height, colors.a, "A", scaleValue);
      drawProjectedArrow(ctx, vectorB, width, height, colors.b, "B", scaleValue);
      if (visible.normal) drawProjectedArrow(ctx, computed.crossValue, width, height, colors.cross, "A×B", scaleValue);
    },
    [computed.crossValue, crossBounds, vectorA, vectorB, visible.normal],
  );

  const operations = [
    { title: "A + B", value: formatVector(computed.sum) },
    { title: "A - B", value: formatVector(computed.difference) },
    { title: "Dot Product", value: formatNumber(computed.dotValue), caption: `cos(theta) = ${formatNumber(computed.cosine)}` },
    { title: "Cross Product", value: formatVector(computed.crossValue), caption: `area = ${formatNumber(computed.area)}` },
    { title: "Angle", value: `${formatNumber(computed.angle)} deg` },
    { title: "Projection A on B", value: formatVector(computed.projAonB) },
    { title: "Projection B on A", value: formatVector(computed.projBonA) },
    { title: "Rejection of A from B", value: formatVector(computed.rejAfromB) },
    { title: "Normalized A", value: formatVector(computed.normalizedA) },
    { title: "Normalized B", value: formatVector(computed.normalizedB) },
    { title: "Hadamard Product", value: formatVector(computed.hadamardValue) },
    { title: "Tip Distance", value: formatNumber(computed.distance) },
    { title: "Plane Normal", value: formatVector(computed.planeNormal) },
    { title: "Triple Scalar Product", value: formatNumber(computed.triple), caption: "(A x B) · z-hat" },
    { title: "kA", value: formatVector(computed.scaledA) },
    { title: "kB", value: formatVector(computed.scaledB) },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(83,214,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,139,61,0.18),transparent_26%),linear-gradient(135deg,#031019_0%,#0c2033_42%,#10233d_100%)] text-slate-50">
      <div className="mx-auto w-[min(1400px,calc(100%-20px))] py-5 md:w-[min(1400px,calc(100%-32px))]">
        <header className="mb-6 grid gap-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-6 shadow-2xl backdrop-blur xl:grid-cols-[1.55fr_1fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-orange-300">Vector Operations For Robotics</p>
            <h1 className="mb-4 text-4xl font-bold leading-none md:text-6xl">Tailwind React Visualization Lab</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300">
              The app now uses Tailwind styling, keeps the adaptive 2D view and cross-product normal view side by side,
              and lets you switch different vector constructions on and off while the zoom updates around the active scene.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-gradient-to-br from-orange-400/12 to-cyan-300/8 p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">Visualization Layers</h2>
            <p className="mb-4 text-sm leading-6 text-slate-300">
              Compare base vectors, sums, differences, projections, rejection, scaled vectors, unit vectors, angle arc, and the spanning parallelogram.
            </p>
            <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <span>Addition and subtraction</span>
              <span>Projection and rejection</span>
              <span>Scaling with live k readout</span>
              <span>Normal / cross-product view</span>
            </div>
          </div>
        </header>

        <section className="mb-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3">
                <h2 className="text-2xl font-semibold text-white">Adaptive 2D Plane</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-300">
                  This panel is intentionally kept to the left half of the screen so you can watch the vector space while adjusting values on the right.
                </p>
              </div>
              <canvas ref={planeCanvasRef} width="860" height="520" className="aspect-[5/4] w-full rounded-3xl border border-white/10 bg-slate-950/60" />
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.a }} />A</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.b }} />B</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.sum }} />A + B</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.proj }} />Projection</span>
              </div>
            </div>

            <aside className="lg:sticky lg:top-5 lg:self-start">
              <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
                <div>
                  <h2 className="text-xl font-semibold text-white">Controls</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Sliders, scalar adjustments, and checkboxes now occupy the right half of the screen beside the adaptive 2D plane.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(presets).map((presetKey) => (
                    <button
                      key={presetKey}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs capitalize text-slate-100 transition hover:-translate-y-0.5 hover:border-orange-300/50 hover:bg-orange-300/10"
                      onClick={() => {
                        setVectorA(presets[presetKey].a);
                        setVectorB(presets[presetKey].b);
                        setScalarK(presets[presetKey].k);
                      }}
                    >
                      {presetKey}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <VectorSlider label="Vector A" vector={vectorA} setVector={setVectorA} color={colors.a} />
                  <VectorSlider label="Vector B" vector={vectorB} setVector={setVectorB} color={colors.b} />
                  <div className="rounded-3xl border border-white/8 bg-white/5 p-3.5">
                    <h3 className="mb-2.5 text-sm font-semibold text-white">Scalar K</h3>
                    <label className="grid grid-cols-[18px_1fr_58px] items-center gap-2 text-xs text-slate-300">
                      <span>K</span>
                      <div className="relative">
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.1"
                          value={scalarK}
                          onChange={(event) => setScalarK(Number(event.target.value))}
                          className="w-full accent-orange-400"
                        />
                        <div
                          className="pointer-events-none absolute -top-7 rounded-full bg-orange-300 px-2 py-0.5 text-[11px] font-semibold text-slate-950 shadow"
                          style={{ left: `calc(${((scalarK + 5) / 10) * 100}% - 22px)` }}
                        >
                          {formatNumber(scalarK)}
                        </div>
                      </div>
                      <strong className="text-right font-mono text-[11px] text-cyan-100">{formatNumber(scalarK)}</strong>
                    </label>
                    <div className="mt-3 space-y-1 rounded-2xl bg-slate-950/45 p-3 font-mono text-[11px] text-slate-200">
                      <p>kA = {formatVector(computed.scaledA)}</p>
                      <p>kB = {formatVector(computed.scaledB)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Visualization Options</h3>
                  <div className="flex flex-wrap gap-2">
                    <Toggle label="A + B" swatch={colors.sum} checked={visible.sum} onChange={() => setVisible((prev) => ({ ...prev, sum: !prev.sum }))} />
                    <Toggle label="A - B" swatch={colors.diff} checked={visible.diff} onChange={() => setVisible((prev) => ({ ...prev, diff: !prev.diff }))} />
                    <Toggle label="Projection" swatch={colors.proj} checked={visible.proj} onChange={() => setVisible((prev) => ({ ...prev, proj: !prev.proj }))} />
                    <Toggle label="Rejection" swatch={colors.rej} checked={visible.rej} onChange={() => setVisible((prev) => ({ ...prev, rej: !prev.rej }))} />
                    <Toggle label="Show kA" swatch={colors.scaledA} checked={visible.scaledA} onChange={() => setVisible((prev) => ({ ...prev, scaledA: !prev.scaledA }))} />
                    <Toggle label="Show kB" swatch={colors.scaledB} checked={visible.scaledB} onChange={() => setVisible((prev) => ({ ...prev, scaledB: !prev.scaledB }))} />
                    <Toggle label="Unit A" swatch="#8cc6ff" checked={visible.unitA} onChange={() => setVisible((prev) => ({ ...prev, unitA: !prev.unitA }))} />
                    <Toggle label="Unit B" swatch="#ffb0dd" checked={visible.unitB} onChange={() => setVisible((prev) => ({ ...prev, unitB: !prev.unitB }))} />
                    <Toggle label="Parallelogram" swatch="#ffe066" checked={visible.parallelogram} onChange={() => setVisible((prev) => ({ ...prev, parallelogram: !prev.parallelogram }))} />
                    <Toggle label="Angle Arc" swatch="#ffffff" checked={visible.angle} onChange={() => setVisible((prev) => ({ ...prev, angle: !prev.angle }))} />
                    <Toggle label="Normal / A×B" swatch={colors.cross} checked={visible.normal} onChange={() => setVisible((prev) => ({ ...prev, normal: !prev.normal }))} />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="space-y-5">
            <div className="grid gap-5">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
                <div className="mb-3">
                  <h2 className="text-2xl font-semibold text-white">Normal Form / Cross Product</h2>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">
                    This view stays under the main plane/control row so you can keep the primary interaction area focused on the plane and its live controls.
                  </p>
                </div>
                <canvas ref={crossCanvasRef} width="860" height="520" className="w-full rounded-3xl border border-white/10 bg-slate-950/60" />
                <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-5 text-slate-300">
                  <p><span className="font-semibold text-white">Plane normal:</span> {formatVector(computed.planeNormal)}</p>
                  <p><span className="font-semibold text-white">Cross product:</span> {formatVector(computed.crossValue)}</p>
                  <p><span className="font-semibold text-white">Spanned area:</span> {formatNumber(computed.area)}</p>
                </div>
              </div>
            </div>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3">
                <h2 className="text-2xl font-semibold text-white">Computed Operations</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-300">{insight}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {operations.map((operation) => (
                  <MetricCard key={operation.title} title={operation.title} value={operation.value} caption={operation.caption} />
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
