import { useMemo, useRef, useState } from "react";
import { useCanvas } from "../hooks/useCanvas";
import { formatNumber, gradientOfHill, magnitude, sampleHill } from "../utils/vectorMath";

const GRID_RANGE = 6;

function toCanvasPoint(point, width, height) {
  const scaleX = width / (GRID_RANGE * 2);
  const scaleY = height / (GRID_RANGE * 2);
  return [width / 2 + point[0] * scaleX, height / 2 - point[1] * scaleY];
}

function fromCanvasPoint(x, y, width, height) {
  const scaleX = width / (GRID_RANGE * 2);
  const scaleY = height / (GRID_RANGE * 2);
  return [(x - width / 2) / scaleX, -(y - height / 2) / scaleY];
}

export function GradientField() {
  const canvasRef = useRef(null);
  const [probe, setProbe] = useState([1.5, -1.25]);

  const gradient = useMemo(() => gradientOfHill(probe[0], probe[1]), [probe]);
  const steepness = magnitude([...gradient, 0]);
  const fieldValue = sampleHill(probe[0], probe[1]);

  useCanvas(
    canvasRef,
    (ctx, canvas) => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      for (let x = 0; x < width; x += 8) {
        for (let y = 0; y < height; y += 8) {
          const [worldX, worldY] = fromCanvasPoint(x, y, width, height);
          const value = sampleHill(worldX, worldY);
          const intensity = Math.max(0, Math.min(1, (value + GRID_RANGE * GRID_RANGE) / (GRID_RANGE * GRID_RANGE)));
          ctx.fillStyle = `rgba(83,214,255,${0.1 + intensity * 0.35})`;
          ctx.fillRect(x, y, 8, 8);
        }
      }

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      for (let index = -GRID_RANGE; index <= GRID_RANGE; index += 1) {
        const [vx1, vy1] = toCanvasPoint([index, -GRID_RANGE], width, height);
        const [vx2, vy2] = toCanvasPoint([index, GRID_RANGE], width, height);
        const [hx1, hy1] = toCanvasPoint([-GRID_RANGE, index], width, height);
        const [hx2, hy2] = toCanvasPoint([GRID_RANGE, index], width, height);
        ctx.beginPath();
        ctx.moveTo(vx1, vy1);
        ctx.lineTo(vx2, vy2);
        ctx.moveTo(hx1, hy1);
        ctx.lineTo(hx2, hy2);
        ctx.stroke();
      }
      ctx.restore();

      const [probeX, probeY] = toCanvasPoint(probe, width, height);
      const directionScale = Math.min(1.8, 0.35 + steepness * 0.14);
      const tip = [probe[0] + gradient[0] * directionScale * 0.2, probe[1] + gradient[1] * directionScale * 0.2];
      const [tipX, tipY] = toCanvasPoint(tip, width, height);
      const angle = Math.atan2(tipY - probeY, tipX - probeX);

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(probeX, probeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255,224,102,0.96)";
      ctx.fillStyle = "rgba(255,224,102,0.96)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(probeX, probeY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - 10 * Math.cos(angle - Math.PI / 6), tipY - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(tipX - 10 * Math.cos(angle + Math.PI / 6), tipY - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.font = "13px Consolas";
      ctx.fillText("grad f", tipX + 8, tipY - 8);
      ctx.restore();
    },
    [gradient, probe, steepness],
  );

  const handleClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const canvasX = (x / rect.width) * canvas.width;
    const canvasY = (y / rect.height) * canvas.height;
    setProbe(fromCanvasPoint(canvasX, canvasY, canvas.width, canvas.height));
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/35 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3">
        <h2 className="text-2xl font-semibold text-white">Gradient Field</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-300">
          Probe the scalar field f(x, y) = -(x^2 + y^2) and watch the gradient vector point toward steepest ascent.
        </p>
      </div>
      <canvas
        ref={canvasRef}
        width="860"
        height="420"
        onClick={handleClick}
        className="w-full cursor-crosshair rounded-3xl border border-white/10 bg-slate-950/60"
      />
      <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-semibold text-white">Probe</p>
          <p className="font-mono text-cyan-100">({formatNumber(probe[0])}, {formatNumber(probe[1])})</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-semibold text-white">Gradient</p>
          <p className="font-mono text-cyan-100">({formatNumber(gradient[0])}, {formatNumber(gradient[1])})</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-semibold text-white">Field Value</p>
          <p className="font-mono text-cyan-100">{formatNumber(fieldValue)}</p>
        </div>
      </div>
    </section>
  );
}
