import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Box3, Vector3 } from 'three';
import { buildRobotTransforms, IDENTITY_MATRIX } from '../src/robot-model-state.mjs';

test('public schematic has five finite original rigid groups and accepts the measured transform path',async()=>{
  // Compile the real JSX module without starting React, WebGL or a browser.
  const output=await build({entryPoints:[fileURLToPath(new URL('../src/RobotModel.jsx',import.meta.url))],bundle:true,
    platform:'node',format:'cjs',write:false,external:['react','three'],loader:{'.css':'empty'}});
  const module={exports:{}};
  new Function('require','module','exports',output.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
  const diagram=module.exports.createSchematicRobot();
  assert.equal(diagram.manifest.schematic,true);
  assert.equal(diagram.manifest.rigid_groups,undefined);
  assert.equal(Object.keys(diagram.groups).length,5);
  for(const group of Object.values(diagram.groups)) {
    const bounds=new Box3().setFromObject(group),size=bounds.getSize(new Vector3());
    assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));
    assert.ok(size.length()>0 && size.length()<.3);
    group.traverse(node=>{if(node.geometry)assert.ok(node.geometry.attributes.position.array.every(Number.isFinite));});
  }
  const measured={headPose:[...IDENTITY_MATRIX],bodyYaw:.4,antennas:{right:25,left:-10}};
  const transforms=buildRobotTransforms(measured,diagram.manifest.model);
  assert.equal(transforms.head[11],.177);
  assert.notDeepEqual(transforms.antennas.left,transforms.antennas.right);
  assert.ok(Object.values(transforms).slice(0,3).every(matrix=>matrix.every(Number.isFinite)));
  for(const group of Object.values(diagram.groups))group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
});
