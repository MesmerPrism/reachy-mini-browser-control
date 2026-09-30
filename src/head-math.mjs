// MediaPipe's web FaceLandmarker returns MatrixData packed in column-major order:
// https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/framework/formats/matrix.cc
// The Procrustes pose includes a uniform scale. Remove it, reject shear/reflection.
export function rotationFromFaceMatrix(matrix) {
  if (matrix?.rows !== 4 || matrix?.columns !== 4 || matrix.data?.length !== 16) return null;
  const d = Array.from(matrix.data);
  if (!d.every(Number.isFinite) || Math.abs(d[15] - 1) > 0.01 ||
      [d[3], d[7], d[11]].some(v => Math.abs(v) > 0.01)) return null;
  const cols = [0, 4, 8].map(i => d.slice(i, i + 3));
  const scales = cols.map(c => Math.hypot(...c));
  const scale = scales.reduce((a, b) => a + b) / 3;
  if (scale < 1e-6 || scales.some(s => Math.abs(s / scale - 1) > 0.03)) return null;
  const c = cols.map(col => col.map(v => v / scale));
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  if (Math.abs(dot(c[0], c[1])) > 0.03 || Math.abs(dot(c[0], c[2])) > 0.03 ||
      Math.abs(dot(c[1], c[2])) > 0.03) return null;
  const cross = [c[0][1]*c[1][2]-c[0][2]*c[1][1], c[0][2]*c[1][0]-c[0][0]*c[1][2], c[0][0]*c[1][1]-c[0][1]*c[1][0]];
  if (Math.abs(dot(cross, c[2]) - 1) > 0.05) return null;
  // Orthonormalize accepted numerical noise so transpose really is the inverse.
  const normalize = v => { const length = Math.hypot(...v); return v.map(x => x / length); };
  const x = normalize(c[0]);
  const projection = dot(x, c[1]);
  const y = normalize(c[1].map((v, i) => v - projection * x[i]));
  const z = [x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0]];
  // Internal matrices are row-major. No image mirroring enters this calculation.
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}

export function relativeRotation(neutral, current) {
  return Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    return neutral[row] * current[col] + neutral[3 + row] * current[3 + col] + neutral[6 + row] * current[6 + col];
  });
}

export const wrapDegrees = degrees => ((degrees + 180) % 360 + 360) % 360 - 180;

// R = Ry(yaw) Rx(pitch) Rz(roll), right-handed MediaPipe camera basis.
// Signs are provisional preview coordinates until attended robot mapping checks.
export function anglesFromRotation(r) {
  const pitch = Math.asin(Math.max(-1, Math.min(1, -r[5])));
  const singular = Math.abs(Math.cos(pitch)) < 1e-6;
  const yaw = singular ? Math.atan2(-r[6], r[0]) : Math.atan2(r[2], r[8]);
  const roll = singular ? 0 : Math.atan2(r[3], r[4]);
  const degrees = 180 / Math.PI;
  return { yaw: wrapDegrees(yaw * degrees), pitch: pitch * degrees, roll: wrapDegrees(roll * degrees) };
}
