import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY_POSE, absoluteHeadPose } from '../server/head-pose.mjs';
import { panoramaRotation, measuredPanoramaRotation, panoramaUV, panoramaCameraRays, reprojectPanorama } from '../src/panorama-camera.mjs';

const transform = (matrix, ray) => [0, 1, 2].map(row => ray.reduce((sum, value, col) => sum + matrix[row * 3 + col] * value, 0));
function near(actual, expected) { actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-10, `${actual} != ${expected}`)); }
const pose = (yaw = 0, pitch = 0, roll = 0) => absoluteHeadPose(IDENTITY_POSE, yaw, pitch, roll);

test('neutral robot pose looks forward at the panorama center with upright image', () => {
  const rotation = panoramaRotation(IDENTITY_POSE);
  near(rotation, [1,0,0, 0,1,0, 0,0,1]);
  near(transform(rotation, [0,0,-1]), [0,0,-1]);
  near(transform(rotation, [0,1,0]), [0,1,0]);
});
test('positive robot yaw turns the camera left', () => {
  near(transform(panoramaRotation(pose(90)), [0,0,-1]), [-1,0,0]);
});
test('positive robot pitch tips forward direction down', () => {
  near(transform(panoramaRotation(pose(0,90)), [0,0,-1]), [0,-1,0]);
});
test('positive robot roll rotates image axes without changing viewing direction', () => {
  const rotation = panoramaRotation(pose(0,0,90));
  near(transform(rotation, [0,0,-1]), [0,0,-1]);
  near(transform(rotation, [0,1,0]), [1,0,0]);
});
test('combined rotations preserve rigid orientation instead of discarding roll', () => {
  const robotPose = pose(20,-15,12), rotation = panoramaRotation(robotPose);
  near(transform(rotation, [0,0,-1]), [-robotPose[4], robotPose[8], -robotPose[0]]);
  near(transform(rotation, [0,1,0]), [-robotPose[6], robotPose[10], -robotPose[2]]);
});
test('translation cannot affect panorama rays', () => {
  const original = pose(12,-7,9), translated = [...original];
  translated[3] = 3; translated[7] = -4; translated[11] = 8;
  assert.deepEqual(panoramaRotation(translated), panoramaRotation(original));
});
test('malformed, reflected, non-rigid and nonfinite poses are rejected', () => {
  for (const invalid of [null, [], [...IDENTITY_POSE.slice(0,15), 0], IDENTITY_POSE.map((v,i) => i===0 ? -1 : v), IDENTITY_POSE.map((v,i) => i===0 ? 2 : v), IDENTITY_POSE.map((v,i) => i===7 ? NaN : v)]) {
    assert.throws(() => panoramaRotation(invalid));
  }
});
test('freshness uses measured receipt, rejects missing, stale and future telemetry', () => {
  const measured = { receivedAt: 1000, headMatrix: IDENTITY_POSE };
  near(measuredPanoramaRotation(measured, 2500), panoramaRotation(IDENTITY_POSE));
  for (const now of [2501,999,NaN]) assert.throws(() => measuredPanoramaRotation(measured, now), /fresh simulated/);
  for (const invalid of [null, {}, { ...measured, receivedAt: NaN }]) assert.throws(() => measuredPanoramaRotation(invalid, 1000), /fresh simulated/);
  assert.throws(() => measuredPanoramaRotation({ receivedAt: 1000, headMatrix: [] }, 1000));
});

test('panorama image coordinates put neutral at center and north at top', () => {
  near(panoramaUV([0,0,-1]), [.5,.5]);
  near(panoramaUV([-1,0,0]), [.25,.5]);
  near(panoramaUV([1,0,0]), [.75,.5]);
  assert.equal(panoramaUV([0,1,0])[1], 0);
  assert.equal(panoramaUV([0,-1,0])[1], 1);
  assert.equal(panoramaUV([0,0,1])[0], 0);
  near(panoramaUV([0,0,-7]), [.5,.5]);
  assert.throws(() => panoramaUV([0,0,0]));
  assert.throws(() => panoramaUV([NaN,0,0]));
});

test('cached camera rays use pixel centers with upright axes and expected field of view', () => {
  near([...panoramaCameraRays(1,1)], [0,0,-1]);
  const rays = panoramaCameraRays(3,3);
  assert.ok(rays[0] < 0 && rays[1] > 0 && rays[2] < 0);
  assert.ok(rays[24] > 0 && rays[25] < 0);
  near([...rays.slice(12,15)], [0,0,-1]);
  assert.ok(Math.abs(Math.hypot(...rays.slice(0,3)) - 1) < 1e-7);
  assert.ok(Math.abs(rays[1] / -rays[2] - 2 / 3 * Math.tan(35 * Math.PI / 180)) < 1e-7);
  assert.throws(() => panoramaCameraRays(0,3));
  assert.throws(() => panoramaCameraRays(3,3,180));
});

test('software projection samples changed scene content on measured yaw, pitch and roll', () => {
  const pixels = new Uint8ClampedArray(8 * 4 * 4);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
    pixels.set([col * 20, row * 40, 123, 255], (row * 8 + col) * 4);
  }
  const output = new Uint8ClampedArray(4);
  const sample = (rotation, rays = panoramaCameraRays(1,1)) => [...reprojectPanorama({ pixels, panoramaWidth: 8, panoramaHeight: 4, rays, rotation, output })];
  assert.deepEqual(sample(panoramaRotation(pose())), [80,80,123,255]);
  assert.deepEqual(sample(panoramaRotation(pose(90))), [40,80,123,255]);
  assert.deepEqual(sample(panoramaRotation(pose(0,90))), [80,120,123,255]);
  assert.deepEqual(sample(panoramaRotation(pose(0,0,90)), new Float32Array([0,1,0])), [120,80,123,255]);
  assert.deepEqual(sample(panoramaRotation(pose()), new Float32Array([0,0,1])), [0,80,123,255]);
  assert.equal(reprojectPanorama({ pixels, panoramaWidth: 8, panoramaHeight: 4, rays: panoramaCameraRays(1,1), rotation: panoramaRotation(pose()), output }), output);
  assert.throws(() => reprojectPanorama({ pixels, panoramaWidth: 8, panoramaHeight: 4, rays: panoramaCameraRays(1,1), rotation: panoramaRotation(pose()), output: new Uint8ClampedArray(3) }));
});
