import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const modelSha256 = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
const model = path.join(root, 'public/models/face_landmarker.task');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(path.dirname(model), { recursive: true });
let bytes;
try { bytes = await fs.readFile(model); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!bytes) {
  const response = await fetch(modelUrl, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error(`Model download failed (${response.status})`);
  bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== modelSha256) throw Error('Face model checksum mismatch');
  await fs.writeFile(model, bytes);
}
if (digest(bytes) !== modelSha256) throw Error('Local face model checksum mismatch; restore the pinned model before building');
const wasmRoot = path.join(root, 'public/mediapipe');
await fs.mkdir(wasmRoot, { recursive: true });
const packageRoot = path.join(root, 'node_modules/@mediapipe/tasks-vision');
const metadata = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const assets = [];
for (const name of await fs.readdir(path.join(packageRoot, 'wasm'))) {
  if (!/^[\w-]+\.(?:js|wasm)$/.test(name)) continue;
  const contents = await fs.readFile(path.join(packageRoot, 'wasm', name));
  await fs.writeFile(path.join(wasmRoot, name), contents);
  assets.push({ name, sha256: digest(contents) });
}
await fs.writeFile(path.join(wasmRoot, 'assets.json'), JSON.stringify({ package: metadata.name, version: metadata.version, modelUrl, modelSha256, assets }, null, 2));
console.log(`Prepared local webcam model and ${assets.length} runtime assets (${metadata.version})`);
