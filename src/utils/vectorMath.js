export function add(a, b) {
  return a.map((value, index) => value + b[index]);
}

export function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

export function scale(v, k) {
  return v.map((value) => value * k);
}

export function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function magnitude(v) {
  return Math.hypot(...v);
}

export function normalize(v) {
  const mag = magnitude(v);
  return mag === 0 ? [0, 0, 0] : scale(v, 1 / mag);
}

export function project(ofVector, ontoVector) {
  const denominator = dot(ontoVector, ontoVector);
  return denominator === 0 ? [0, 0, 0] : scale(ontoVector, dot(ofVector, ontoVector) / denominator);
}

export function angleBetween(a, b) {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot(a, b) / denom));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function hadamard(a, b) {
  return a.map((value, index) => value * b[index]);
}

export function formatNumber(value) {
  return Number(value).toFixed(2);
}

export function formatVector(vector) {
  return `(${vector.map(formatNumber).join(", ")})`;
}

export function project3D([x, y, z]) {
  const yaw = Math.PI / 4;
  const pitch = Math.PI / 6;
  const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
  const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
  const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  return [x1, y1];
}
