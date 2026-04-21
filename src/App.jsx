import { useEffect, useMemo, useRef, useState } from "react";
import { GradientField } from "./components/GradientField";
import { MetricCard } from "./components/MetricCard";
import { Toggle } from "./components/Toggle";
import { VectorSlider } from "./components/VectorSlider";
import { colors } from "./constants/colors";
import { presets } from "./constants/vectorPresets";
import { useCanvas } from "./hooks/useCanvas";
import {
  drawAngleArc,
  drawArrow2D,
  drawArrowSegment2D,
  drawConfidenceCircle,
  drawGhostArrow2D,
  drawGrid,
  drawParallelogram,
  drawPath,
  drawPoint2D,
  drawProjectedArrow,
  drawProjectedConfidenceSphere,
  drawProjectedSegment,
} from "./utils/canvasDraw";
import {
  add,
  angleBetween,
  confidenceRadius,
  cross,
  dot,
  formatNumber,
  formatVector,
  gradientOfHill,
  hadamard,
  magnitude,
  normalize,
  parametricCircle,
  parametricCircleVelocity,
  project,
  project3D,
  rotateVector,
  scale,
  subtract,
  vectorBounds,
  withGaussianNoise,
} from "./utils/vectorMath";

const rotationAxes = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

function MiniRange({ label, min, max, step = 0.1, value, onChange, suffix = "", accent = "accent-orange-400" }) {
  return (
    <label className="grid grid-cols-[72px_1fr_54px] items-center gap-2 text-xs text-slate-300">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`w-full ${accent}`}
      />
      <strong className="text-right font-mono text-[11px] text-cyan-100">
        {formatNumber(value)}
        {suffix}
      </strong>
    </label>
  );
}

function SectionCard({ title, children, description }) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-2.5">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{description}</p> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export default function App() {
  const [vectorA, setVectorA] = useState(presets.reset.a);
  const [vectorB, setVectorB] = useState(presets.reset.b);
  const [scalarK, setScalarK] = useState(presets.reset.k);
  const [rotation, setRotation] = useState({ enabled: false, angle: 35, axis: "z" });
  const [armMode, setArmMode] = useState(false);
  const [lockLengths, setLockLengths] = useState(false);
  const [jointAngles, setJointAngles] = useState({ a: 35, b: 28 });
  const [pathTracer, setPathTracer] = useState({ enabled: false, radius: 6, speed: 0.9 });
  const [sensorNoise, setSensorNoise] = useState({ enabled: false, sigma: 0.7 });
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
    path: true,
    velocity: true,
    confidence: true,
  });
  const [motionTime, setMotionTime] = useState(0);
  const [noiseOffset, setNoiseOffset] = useState([0, 0, 0]);

  const planeCanvasRef = useRef(null);
  const crossCanvasRef = useRef(null);

  useEffect(() => {
    let frameId;

    if (!pathTracer.enabled && !sensorNoise.enabled) {
      setNoiseOffset([0, 0, 0]);
      return undefined;
    }

    const tick = (timestamp) => {
      const seconds = timestamp / 1000;
      if (pathTracer.enabled) setMotionTime(seconds * pathTracer.speed);
      if (sensorNoise.enabled) setNoiseOffset(withGaussianNoise([0, 0, 0], sensorNoise.sigma));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [pathTracer.enabled, pathTracer.speed, sensorNoise.enabled, sensorNoise.sigma]);

  const armLengths = useMemo(
    () => ({
      a: Math.max(0.25, magnitude(vectorA)),
      b: Math.max(0.25, magnitude(vectorB)),
    }),
    [vectorA, vectorB],
  );

  const sourceVectorA = useMemo(() => {
    if (!armMode || !lockLengths) return vectorA;
    const theta = (jointAngles.a * Math.PI) / 180;
    return [armLengths.a * Math.cos(theta), armLengths.a * Math.sin(theta), 0];
  }, [armLengths.a, armMode, jointAngles.a, lockLengths, vectorA]);

  const sourceVectorB = useMemo(() => {
    if (!armMode || !lockLengths) return vectorB;
    const theta = ((jointAngles.a + jointAngles.b) * Math.PI) / 180;
    return [armLengths.b * Math.cos(theta), armLengths.b * Math.sin(theta), 0];
  }, [armLengths.b, armMode, jointAngles.a, jointAngles.b, lockLengths, vectorB]);

  const rotatedVectorA = useMemo(() => {
    if (!rotation.enabled) return sourceVectorA;
    return rotateVector(sourceVectorA, rotationAxes[rotation.axis], rotation.angle);
  }, [rotation.angle, rotation.axis, rotation.enabled, sourceVectorA]);

  const effectiveVectorA = rotatedVectorA;
  const effectiveVectorB = sourceVectorB;
  const endEffector = useMemo(() => add(effectiveVectorA, effectiveVectorB), [effectiveVectorA, effectiveVectorB]);
  const noisyTip = useMemo(
    () => (sensorNoise.enabled ? add(effectiveVectorA, noiseOffset) : effectiveVectorA),
    [effectiveVectorA, noiseOffset, sensorNoise.enabled],
  );

  const pathPosition = useMemo(() => parametricCircle(pathTracer.radius, motionTime), [motionTime, pathTracer.radius]);
  const pathVelocity = useMemo(() => parametricCircleVelocity(pathTracer.radius, motionTime), [motionTime, pathTracer.radius]);
  const pathVelocityDisplay = useMemo(() => scale(pathVelocity, 0.35), [pathVelocity]);
  const pathPoints = useMemo(
    () =>
      Array.from({ length: 160 }, (_, index) => {
        const t = (index / 159) * Math.PI * 2;
        return parametricCircle(pathTracer.radius, t);
      }),
    [pathTracer.radius],
  );

  const computed = useMemo(() => {
    const sum = add(effectiveVectorA, effectiveVectorB);
    const difference = subtract(effectiveVectorA, effectiveVectorB);
    const scaledA = scale(effectiveVectorA, scalarK);
    const scaledB = scale(effectiveVectorB, scalarK);
    const normalizedA = normalize(effectiveVectorA);
    const normalizedB = normalize(effectiveVectorB);
    const dotValue = dot(effectiveVectorA, effectiveVectorB);
    const crossValue = cross(effectiveVectorA, effectiveVectorB);
    const angle = angleBetween(effectiveVectorA, effectiveVectorB);
    const projAonB = project(effectiveVectorA, effectiveVectorB);
    const projBonA = project(effectiveVectorB, effectiveVectorA);
    const rejAfromB = subtract(effectiveVectorA, projAonB);
    const hadamardValue = hadamard(effectiveVectorA, effectiveVectorB);
    const distance = magnitude(difference);
    const area = magnitude(crossValue);
    const cosine = magnitude(effectiveVectorA) * magnitude(effectiveVectorB) === 0 ? 0 : dotValue / (magnitude(effectiveVectorA) * magnitude(effectiveVectorB));
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
  }, [effectiveVectorA, effectiveVectorB, scalarK]);

  const gradientAtTip = useMemo(() => gradientOfHill(effectiveVectorA[0], effectiveVectorA[1]), [effectiveVectorA]);

  const planeBounds = useMemo(() => {
    const candidates = [effectiveVectorA, effectiveVectorB, endEffector, noisyTip];
    if (rotation.enabled) candidates.push(sourceVectorA);
    if (visible.sum) candidates.push(computed.sum);
    if (visible.diff) candidates.push(computed.difference);
    if (visible.proj) candidates.push(computed.projAonB);
    if (visible.rej) candidates.push(computed.rejAfromB);
    if (visible.scaledA) candidates.push(computed.scaledA);
    if (visible.scaledB) candidates.push(computed.scaledB);
    if (visible.unitA) candidates.push(computed.normalizedA);
    if (visible.unitB) candidates.push(computed.normalizedB);
    if (pathTracer.enabled) {
      candidates.push(pathPosition, add(pathPosition, pathVelocityDisplay));
      candidates.push([pathTracer.radius, pathTracer.radius, 0], [-pathTracer.radius, -pathTracer.radius, 0]);
    }
    const noiseRadius = sensorNoise.enabled && visible.confidence ? confidenceRadius(sensorNoise.sigma) : 0;
    return vectorBounds(candidates, Math.max(8, pathTracer.radius + 2, noiseRadius + 4));
  }, [
    computed,
    effectiveVectorA,
    effectiveVectorB,
    endEffector,
    noisyTip,
    pathPosition,
    pathTracer.enabled,
    pathTracer.radius,
    pathVelocityDisplay,
    rotation.enabled,
    sensorNoise.enabled,
    sensorNoise.sigma,
    sourceVectorA,
    visible,
  ]);

  const crossBounds = useMemo(() => {
    const vectors = [[8, 0, 0], [0, 8, 0], [0, 0, 8], effectiveVectorA, effectiveVectorB, endEffector];
    if (rotation.enabled) vectors.push(sourceVectorA);
    if (visible.normal) vectors.push(computed.crossValue);
    if (pathTracer.enabled) vectors.push(pathPosition, add(pathPosition, pathVelocityDisplay));
    return Math.max(8, ...vectors.map(project3D).flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
  }, [computed.crossValue, effectiveVectorA, effectiveVectorB, endEffector, pathPosition, pathTracer.enabled, pathVelocityDisplay, rotation.enabled, sourceVectorA, visible.normal]);

  const insight = useMemo(() => {
    const relation =
      Math.abs(computed.dotValue) < 0.15
        ? "almost orthogonal"
        : Math.abs(computed.angle) < 8 || Math.abs(computed.angle - 180) < 8
          ? "almost parallel"
          : "obliquely related";
    return `A and B are ${relation}. Rotation, kinematic chaining, path motion, and uncertainty overlays all feed the same adaptive view so the zoom follows the active story instead of a fixed scene.`;
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

      if (visible.path && pathTracer.enabled) drawPath(ctx, pathPoints, centerX, centerY, pixelsPerUnit, "rgba(255,255,255,0.6)");
      if (visible.parallelogram && !armMode) drawParallelogram(ctx, effectiveVectorA, effectiveVectorB, centerX, centerY, pixelsPerUnit);
      if (visible.angle) drawAngleArc(ctx, effectiveVectorA, effectiveVectorB, centerX, centerY, pixelsPerUnit);

      if (rotation.enabled) drawGhostArrow2D(ctx, [sourceVectorA[0], sourceVectorA[1]], centerX, centerY, pixelsPerUnit, colors.a, "A0");
      drawArrow2D(ctx, [effectiveVectorA[0], effectiveVectorA[1]], centerX, centerY, pixelsPerUnit, colors.a, rotation.enabled ? "R(A)" : "A");

      if (armMode) {
        drawPoint2D(ctx, [effectiveVectorA[0], effectiveVectorA[1]], centerX, centerY, pixelsPerUnit, "#ffffff", 4);
        drawArrowSegment2D(
          ctx,
          [effectiveVectorA[0], effectiveVectorA[1]],
          [endEffector[0], endEffector[1]],
          centerX,
          centerY,
          pixelsPerUnit,
          colors.b,
          "Link B",
        );
        if (visible.sum) drawArrow2D(ctx, [endEffector[0], endEffector[1]], centerX, centerY, pixelsPerUnit, colors.sum, "EE");
      } else {
        drawArrow2D(ctx, [effectiveVectorB[0], effectiveVectorB[1]], centerX, centerY, pixelsPerUnit, colors.b, "B");
        if (visible.sum) drawArrow2D(ctx, [computed.sum[0], computed.sum[1]], centerX, centerY, pixelsPerUnit, colors.sum, "A+B");
      }

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
        ctx.moveTo(centerX + effectiveVectorA[0] * pixelsPerUnit, centerY - effectiveVectorA[1] * pixelsPerUnit);
        ctx.lineTo(centerX + computed.projAonB[0] * pixelsPerUnit, centerY - computed.projAonB[1] * pixelsPerUnit);
        ctx.stroke();
        ctx.restore();
      }

      if (sensorNoise.enabled) {
        if (visible.confidence) drawConfidenceCircle(ctx, [effectiveVectorA[0], effectiveVectorA[1]], confidenceRadius(sensorNoise.sigma), centerX, centerY, pixelsPerUnit, colors.a);
        drawArrow2D(ctx, [noisyTip[0], noisyTip[1]], centerX, centerY, pixelsPerUnit, "#d0f6ff", "A noisy", true);
        drawPoint2D(ctx, [noisyTip[0], noisyTip[1]], centerX, centerY, pixelsPerUnit, "#d0f6ff", 4, 0.9);
      }

      if (visible.path && pathTracer.enabled) {
        drawArrow2D(ctx, [pathPosition[0], pathPosition[1]], centerX, centerY, pixelsPerUnit, "#f4f7fb", "r(t)");
        drawPoint2D(ctx, [pathPosition[0], pathPosition[1]], centerX, centerY, pixelsPerUnit, "#ffffff", 4);
        if (visible.velocity) {
          drawArrowSegment2D(
            ctx,
            [pathPosition[0], pathPosition[1]],
            [pathPosition[0] + pathVelocityDisplay[0], pathPosition[1] + pathVelocityDisplay[1]],
            centerX,
            centerY,
            pixelsPerUnit,
            "#ffe066",
            "v(t)",
          );
        }
      }

      ctx.fillStyle = "rgba(237,247,255,0.85)";
      ctx.font = "14px Consolas";
      ctx.fillText(`visible range: +/-${formatNumber(planeBounds)} units`, 18, 28);
    },
    [
      armMode,
      computed,
      effectiveVectorA,
      effectiveVectorB,
      endEffector,
      noisyTip,
      pathPoints,
      pathPosition,
      pathTracer.enabled,
      pathVelocityDisplay,
      planeBounds,
      rotation.enabled,
      sensorNoise.enabled,
      sensorNoise.sigma,
      sourceVectorA,
      visible,
    ],
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
      if (rotation.enabled) drawProjectedSegment(ctx, [0, 0, 0], sourceVectorA, width, height, colors.a, "A0", scaleValue, 0.35);
      drawProjectedArrow(ctx, effectiveVectorA, width, height, colors.a, rotation.enabled ? "R(A)" : "A", scaleValue);
      if (armMode) {
        drawProjectedSegment(ctx, effectiveVectorA, endEffector, width, height, colors.b, "Link B", scaleValue);
        drawProjectedArrow(ctx, endEffector, width, height, colors.sum, "EE", scaleValue);
      } else {
        drawProjectedArrow(ctx, effectiveVectorB, width, height, colors.b, "B", scaleValue);
      }
      if (visible.normal) drawProjectedArrow(ctx, computed.crossValue, width, height, colors.cross, "A×B", scaleValue);
      if (sensorNoise.enabled && visible.confidence) drawProjectedConfidenceSphere(ctx, effectiveVectorA, confidenceRadius(sensorNoise.sigma), width, height, colors.a, scaleValue);
      if (pathTracer.enabled && visible.path) {
        drawProjectedArrow(ctx, pathPosition, width, height, "#f4f7fb", "r(t)", scaleValue);
        if (visible.velocity) drawProjectedSegment(ctx, pathPosition, add(pathPosition, pathVelocityDisplay), width, height, "#ffe066", "v(t)", scaleValue);
      }
    },
    [
      armMode,
      computed.crossValue,
      crossBounds,
      effectiveVectorA,
      effectiveVectorB,
      endEffector,
      pathPosition,
      pathTracer.enabled,
      pathVelocityDisplay,
      rotation.enabled,
      sensorNoise.enabled,
      sensorNoise.sigma,
      sourceVectorA,
      visible,
    ],
  );

  const operations = [
    { title: "A + B / End Effector", value: formatVector(computed.sum), caption: armMode ? "Tip of the 2-link chain" : "Vector sum from the origin" },
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
    { title: "Rotation Angle", value: `${formatNumber(rotation.angle)} deg`, caption: rotation.enabled ? `Axis ${rotation.axis.toUpperCase()}` : "Rotation mode off" },
    { title: "Sensor Confidence", value: sensorNoise.enabled ? `${formatNumber(confidenceRadius(sensorNoise.sigma))} radius` : "off", caption: sensorNoise.enabled ? `Noisy tip ${formatVector(noisyTip)}` : "Gaussian perturbation disabled" },
    { title: "Path Position", value: formatVector(pathPosition), caption: pathTracer.enabled ? `velocity ${formatVector(pathVelocity)}` : "Path tracer off" },
    { title: "Gradient at A tip", value: `(${formatNumber(gradientAtTip[0])}, ${formatNumber(gradientAtTip[1])})` },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(83,214,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,139,61,0.18),transparent_26%),linear-gradient(135deg,#031019_0%,#0c2033_42%,#10233d_100%)] text-slate-50">
      <div className="mx-auto w-[min(1440px,calc(100%-20px))] py-5 md:w-[min(1440px,calc(100%-32px))]">
        <header className="mb-6 grid gap-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-6 shadow-2xl backdrop-blur xl:grid-cols-[1.55fr_1fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-orange-300">Vector Operations For Robotics</p>
            <h1 className="mb-4 text-4xl font-bold leading-none md:text-6xl">Robotics Vector Visualization Lab</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300">
              Explore vector algebra, rotation matrices, gradients, robotic kinematics, motion tangents, and probabilistic sensor uncertainty in one adaptive Tailwind-powered workspace.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-gradient-to-br from-orange-400/12 to-cyan-300/8 p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">New Modes</h2>
            <div className="grid gap-2 text-sm text-slate-200">
              <span>Rotation mode with live R(theta) application</span>
              <span>2-link robotic arm with end-effector tracking</span>
              <span>Parametric path tracer with tangent velocity</span>
              <span>Sensor noise and confidence interval overlays</span>
              <span>Gradient probe field for partial derivatives</span>
            </div>
          </div>
        </header>

        <section className="mb-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3">
                <h2 className="text-2xl font-semibold text-white">Adaptive 2D Plane</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-300">
                  The left panel keeps the main workspace visible while rotation, arm chaining, motion, and uncertainty update in real time.
                </p>
              </div>
              <canvas ref={planeCanvasRef} width="860" height="520" className="aspect-[5/4] w-full rounded-3xl border border-white/10 bg-slate-950/60" />
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.a }} />A / R(A)</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.b }} />B / Link B</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.sum }} />End Effector</span>
                <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-white" />Path + Probe Layers</span>
              </div>
            </div>

            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur lg:h-[calc(100vh-2rem)]">
                <div>
                  <h2 className="text-xl font-semibold text-white">Controls</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    The right half keeps the sliders, adjustments, and visualization toggles beside the plane so the effect of every change stays in view.
                  </p>
                </div>

                <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
                  <VectorSlider label="Vector A" vector={vectorA} setVector={setVectorA} color={colors.a} />
                  <VectorSlider label="Vector B" vector={vectorB} setVector={setVectorB} color={colors.b} />
                  <SectionCard title="Scalar" description="The floating value and numeric readout stay synchronized as k changes.">
                    <MiniRange label="k" min={-5} max={5} step={0.1} value={scalarK} onChange={setScalarK} />
                    <div className="rounded-2xl bg-slate-950/45 p-2.5 font-mono text-[11px] text-slate-200">
                      <p>kA = {formatVector(computed.scaledA)}</p>
                      <p>kB = {formatVector(computed.scaledB)}</p>
                    </div>
                  </SectionCard>

                  <SectionCard title="Rotation" description="Apply a rotation matrix to Vector A and compare the original ghost with the rotated vector.">
                    <div className="flex flex-wrap gap-2">
                      <Toggle label="Rotation Mode" swatch={colors.a} checked={rotation.enabled} onChange={() => setRotation((prev) => ({ ...prev, enabled: !prev.enabled }))} />
                      {Object.keys(rotationAxes).map((axisKey) => (
                        <button
                          key={axisKey}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                            rotation.axis === axisKey ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                          onClick={() => setRotation((prev) => ({ ...prev, axis: axisKey }))}
                        >
                          {axisKey.toUpperCase()} axis
                        </button>
                      ))}
                    </div>
                    <MiniRange label="angle" min={0} max={360} step={1} value={rotation.angle} onChange={(value) => setRotation((prev) => ({ ...prev, angle: value }))} suffix=" deg" />
                  </SectionCard>

                  <SectionCard title="2-Link Arm" description="Tie B to the tip of A and, when lengths are locked, rotate both joints like a planar robotic arm.">
                    <div className="flex flex-wrap gap-2">
                      <Toggle label="Arm Mode" swatch={colors.sum} checked={armMode} onChange={() => setArmMode((prev) => !prev)} />
                      <Toggle label="Lock Lengths" swatch={colors.b} checked={lockLengths} onChange={() => setLockLengths((prev) => !prev)} />
                    </div>
                    {armMode ? (
                      <>
                        <MiniRange label="joint A" min={-180} max={180} step={1} value={jointAngles.a} onChange={(value) => setJointAngles((prev) => ({ ...prev, a: value }))} suffix=" deg" />
                        <MiniRange label="joint B" min={-180} max={180} step={1} value={jointAngles.b} onChange={(value) => setJointAngles((prev) => ({ ...prev, b: value }))} suffix=" deg" />
                        <div className="rounded-2xl bg-slate-950/45 p-2.5 text-[11px] text-slate-300">
                          <p>link lengths: {formatNumber(armLengths.a)} and {formatNumber(armLengths.b)}</p>
                          <p className="font-mono text-cyan-100">end effector = {formatVector(endEffector)}</p>
                        </div>
                      </>
                    ) : null}
                  </SectionCard>

                  <SectionCard title="Path Tracer" description="Animate a position vector along a circular path and show its tangent velocity vector.">
                    <div className="flex flex-wrap gap-2">
                      <Toggle label="Path Tracer" swatch="#ffffff" checked={pathTracer.enabled} onChange={() => setPathTracer((prev) => ({ ...prev, enabled: !prev.enabled }))} />
                    </div>
                    <MiniRange label="radius" min={2} max={12} step={0.1} value={pathTracer.radius} onChange={(value) => setPathTracer((prev) => ({ ...prev, radius: value }))} />
                    <MiniRange label="speed" min={0.2} max={3} step={0.1} value={pathTracer.speed} onChange={(value) => setPathTracer((prev) => ({ ...prev, speed: value }))} />
                  </SectionCard>

                  <SectionCard title="Sensor Noise" description="Perturb Vector A with Gaussian noise and draw a confidence interval around the mean tip position.">
                    <div className="flex flex-wrap gap-2">
                      <Toggle label="Sensor Noise" swatch="#d0f6ff" checked={sensorNoise.enabled} onChange={() => setSensorNoise((prev) => ({ ...prev, enabled: !prev.enabled }))} />
                    </div>
                    <MiniRange label="sigma" min={0.1} max={3} step={0.1} value={sensorNoise.sigma} onChange={(value) => setSensorNoise((prev) => ({ ...prev, sigma: value }))} />
                  </SectionCard>

                  <SectionCard title="Visualization Layers">
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
                      <Toggle label="Path" swatch="#ffffff" checked={visible.path} onChange={() => setVisible((prev) => ({ ...prev, path: !prev.path }))} />
                      <Toggle label="Velocity" swatch="#ffe066" checked={visible.velocity} onChange={() => setVisible((prev) => ({ ...prev, velocity: !prev.velocity }))} />
                      <Toggle label="Confidence" swatch="#d0f6ff" checked={visible.confidence} onChange={() => setVisible((prev) => ({ ...prev, confidence: !prev.confidence }))} />
                    </div>
                  </SectionCard>
                </div>

                <div className="mt-3 border-t border-white/8 pt-4">
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
                </div>
              </div>
            </aside>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3">
                <h2 className="text-2xl font-semibold text-white">Normal Form / Cross Product</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-300">
                  The 3D projection connects the plane spanned by A and B with its normal while also showing the rotated vector, the chained arm, path motion, and uncertainty volume.
                </p>
              </div>
              <canvas ref={crossCanvasRef} width="860" height="520" className="w-full rounded-3xl border border-white/10 bg-slate-950/60" />
              <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-5 text-slate-300">
                <p><span className="font-semibold text-white">Plane normal:</span> {formatVector(computed.planeNormal)}</p>
                <p><span className="font-semibold text-white">Cross product:</span> {formatVector(computed.crossValue)}</p>
                <p><span className="font-semibold text-white">End effector:</span> {formatVector(endEffector)}</p>
              </div>
            </div>

            <GradientField />
          </div>

          <section className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
            <div className="mb-3">
              <h2 className="text-2xl font-semibold text-white">Computed Operations</h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-300">{insight}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {operations.map((operation) => (
                <MetricCard key={operation.title} title={operation.title} value={operation.value} caption={operation.caption} />
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
