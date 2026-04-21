import { useMemo, useRef, useState } from "react";
import { MetricCard } from "./components/MetricCard";
import { Toggle } from "./components/Toggle";
import { VectorSlider } from "./components/VectorSlider";
import { colors } from "./constants/colors";
import { presets } from "./constants/vectorPresets";
import { useCanvas } from "./hooks/useCanvas";
import { drawAngleArc, drawArrow2D, drawGrid, drawParallelogram, drawProjectedArrow } from "./utils/canvasDraw";
import {
  add,
  angleBetween,
  cross,
  dot,
  formatNumber,
  formatVector,
  hadamard,
  magnitude,
  normalize,
  project,
  project3D,
  scale,
  subtract,
} from "./utils/vectorMath";

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
