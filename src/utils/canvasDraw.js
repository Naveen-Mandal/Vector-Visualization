import { colors } from "../constants/colors";
import { project3D } from "./vectorMath";

export function drawGrid(ctx, width, height, centerX, centerY, pixelsPerUnit) {
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

export function drawArrow2D(ctx, vector, centerX, centerY, pixelsPerUnit, color, label, dashed = false) {
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

export function drawParallelogram(ctx, a, b, centerX, centerY, pixelsPerUnit) {
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

export function drawAngleArc(ctx, a, b, centerX, centerY, pixelsPerUnit) {
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

export function drawProjectedArrow(ctx, vector, width, height, color, label, globalScale) {
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
