export function add(a, b) {
  return a.map((value, index) => value + b[index]);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

export function lerp(a, b, t) {
  return a + (b - a) * t;
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
  const cosine = clamp(dot(a, b) / denom, -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function hadamard(a, b) {
  return a.map((value, index) => value * b[index]);
}

export function vectorBounds(vectors, floor = 8) {
  const values = vectors.flatMap((vector) => vector.map((value) => Math.abs(value)));
  return Math.max(floor, ...(values.length ? values : [0]));
}

export function toRadians(angle) {
  return (angle * Math.PI) / 180;
}

export function rotationMatrix(axis, angle) {
  const [ux, uy, uz] = normalize(axis);
  const theta = toRadians(angle);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const oneMinusC = 1 - c;

  if (magnitude([ux, uy, uz]) === 0) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  return [
    [c + ux * ux * oneMinusC, ux * uy * oneMinusC - uz * s, ux * uz * oneMinusC + uy * s],
    [uy * ux * oneMinusC + uz * s, c + uy * uy * oneMinusC, uy * uz * oneMinusC - ux * s],
    [uz * ux * oneMinusC - uy * s, uz * uy * oneMinusC + ux * s, c + uz * uz * oneMinusC],
  ];
}

export function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

export function rotateVector(vector, axis, angle) {
  return multiplyMatrixVector(rotationMatrix(axis, angle), vector);
}

export function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function withGaussianNoise(vector, sigma) {
  return vector.map((value) => value + gaussianRandom() * sigma);
}

export function confidenceRadius(sigma, zScore = 2) {
  return Math.abs(sigma) * zScore;
}

export function parametricCircle(radius, t, z = 0) {
  return [radius * Math.cos(t), radius * Math.sin(t), z];
}

export function parametricCircleVelocity(radius, t) {
  return [-radius * Math.sin(t), radius * Math.cos(t), 0];
}

export function gradientOfHill(x, y) {
  return [-2 * x, -2 * y];
}

export function sampleHill(x, y) {
  return -(x * x + y * y);
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
