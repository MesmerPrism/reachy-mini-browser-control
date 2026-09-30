import { rigidPose } from '../server/head-pose.mjs';

export const PANORAMA_FOV_DEGREES = 70;
export const PANORAMA_MAX_AGE_MS = 1500;

// Source rows start at the north pole. Neutral forward (-z) samples center.
export function panoramaUV([x, y, z]) {
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length === 0) throw Error('Invalid panorama ray');
  const longitude = 0.5 + Math.atan2(x, -z) / (2 * Math.PI);
  return [((longitude % 1) + 1) % 1, 0.5 - Math.asin(Math.max(-1, Math.min(1, y / length))) / Math.PI];
}

export function panoramaCameraRays(width, height, fov = PANORAMA_FOV_DEGREES) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !Number.isFinite(fov) || fov <= 0 || fov >= 180) throw Error('Invalid panorama viewport');
  const rays = new Float32Array(width * height * 3), tangent = Math.tan(fov * Math.PI / 360);
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const x = (2 * (col + .5) / width - 1) * width / height * tangent;
    const y = (1 - 2 * (row + .5) / height) * tangent, length = Math.hypot(x, y, 1);
    const index = (row * width + col) * 3;
    rays[index] = x / length; rays[index + 1] = y / length; rays[index + 2] = -1 / length;
  }
  return rays;
}

// Software spherical reprojection: reuse camera rays and the output buffer.
export function reprojectPanorama({ pixels, panoramaWidth, panoramaHeight, rays, rotation, output }) {
  if (!Number.isInteger(panoramaWidth) || !Number.isInteger(panoramaHeight) || panoramaWidth < 1 || panoramaHeight < 1 || pixels.length !== panoramaWidth * panoramaHeight * 4 || rays.length % 3 || rotation.length !== 9 || output.length !== rays.length / 3 * 4) throw Error('Invalid panorama image buffers');
  for (let index = 0, target = 0; index < rays.length; index += 3, target += 4) {
    const x = rays[index], y = rays[index + 1], z = rays[index + 2];
    const wx = rotation[0] * x + rotation[1] * y + rotation[2] * z;
    const wy = rotation[3] * x + rotation[4] * y + rotation[5] * z;
    const wz = rotation[6] * x + rotation[7] * y + rotation[8] * z;
    const u = .5 + Math.atan2(wx, -wz) / (2 * Math.PI);
    const v = .5 - Math.asin(Math.max(-1, Math.min(1, wy / Math.hypot(wx, wy, wz)))) / Math.PI;
    const col = ((Math.floor(u * panoramaWidth) % panoramaWidth) + panoramaWidth) % panoramaWidth;
    const row = Math.max(0, Math.min(panoramaHeight - 1, Math.floor(v * panoramaHeight)));
    const source = (row * panoramaWidth + col) * 4;
    output[target] = pixels[source]; output[target + 1] = pixels[source + 1]; output[target + 2] = pixels[source + 2]; output[target + 3] = 255;
  }
  return output;
}

// Robot x-forward, y-left, z-up -> camera x-right, y-up, z-back.
// Both the moving camera axes and the panorama world use this basis.
const basis = [0,-1,0, 0,0,1, -1,0,0];
export function panoramaRotation(headMatrix) {
  const m = rigidPose(headMatrix);
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3), col = index % 3;
    let value = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      value += basis[row * 3 + a] * m[a * 4 + b] * basis[col * 3 + b];
    }
    return value;
  });
}

export function measuredPanoramaRotation(measured, now = Date.now()) {
  const age = now - measured?.receivedAt;
  if (!Number.isFinite(now) || !Number.isFinite(measured?.receivedAt) || age < 0 || age > PANORAMA_MAX_AGE_MS) {
    throw Error('Waiting for fresh simulated head telemetry.');
  }
  return panoramaRotation(measured.headMatrix);
}
