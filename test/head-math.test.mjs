import test from 'node:test';
import assert from 'node:assert/strict';
import { rotationFromFaceMatrix, relativeRotation, anglesFromRotation, wrapDegrees } from '../src/head-math.mjs';

function rotation(yaw = 0, pitch = 0, roll = 0) {
  const [y, p, r] = [yaw, pitch, roll].map(a => a * Math.PI / 180);
  const [cy, sy, cp, sp, cr, sr] = [Math.cos(y), Math.sin(y), Math.cos(p), Math.sin(p), Math.cos(r), Math.sin(r)];
  return [cy*cr+sy*sp*sr, -cy*sr+sy*sp*cr, sy*cp, cp*sr, cp*cr, -sp, -sy*cr+cy*sp*sr, sy*sr+cy*sp*cr, cy*cp];
}
function matrix(r, scale = 1) {
  return { rows: 4, columns: 4, data: [r[0]*scale,r[3]*scale,r[6]*scale,0,r[1]*scale,r[4]*scale,r[7]*scale,0,r[2]*scale,r[5]*scale,r[8]*scale,0,2,3,-50,1] };
}
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`);

test('column-major MediaPipe scale and translation preserve rotation signs', () => {
  for (const [yaw,pitch,roll] of [[20,0,0],[-20,0,0],[0,15,0],[0,-15,0],[0,0,25],[17,-13,8]]) {
    const result = anglesFromRotation(rotationFromFaceMatrix(matrix(rotation(yaw,pitch,roll),1.4)));
    close(result.yaw,yaw); close(result.pitch,pitch); close(result.roll,roll);
  }
});
test('neutral inverse uses rotations, including across absolute angle wrap', () => {
  const neutral = rotation(179,0,0), current = rotation(-179,0,0);
  close(anglesFromRotation(relativeRotation(neutral,current)).yaw,2);
  const zero = anglesFromRotation(relativeRotation(rotation(35,12,-8),rotation(35,12,-8)));
  Object.values(zero).forEach(v => close(v,0));
  close(wrapDegrees(361),1); close(wrapDegrees(-361),-1);
});
test('CSS preview mirroring has no effect on pose math', () => {
  const input = matrix(rotation(11,-9,4));
  const plain = rotationFromFaceMatrix(input);
  const mirroredPreview = rotationFromFaceMatrix({...input, previewCssTransform: 'scaleX(-1)'});
  assert.deepEqual(plain,mirroredPreview);
});
test('malformed, nonrigid and reflected matrices are rejected', () => {
  for (const bad of [null,{},matrix(rotation()).data,{...matrix(rotation()),rows:3}]) assert.equal(rotationFromFaceMatrix(bad),null);
  for (const [index,value] of [[0,NaN],[0,0],[0,-1],[4,0.3],[15,0],[3,1]]) {
    const input = matrix(rotation()); input.data[index] = value;
    assert.equal(rotationFromFaceMatrix(input),null);
  }
});
