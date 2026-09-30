import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
export function parseBuildArguments(args) {
  const options = { outDir: path.join(root, 'local/pages'), base: './' };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!['--out-dir', '--base'].includes(flag) || seen.has(flag) || !value || value.startsWith('--')) throw Error('Usage: node tools/Build-Pages.mjs [--out-dir directory] [--base ./|/path/]');
    seen.add(flag);
    if (flag === '--out-dir') options.outDir = path.resolve(value);
    else {
      if (value !== './' && !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(value)) throw Error('Base must be ./ or an absolute site path ending in /.');
      options.base = value;
    }
  }
  return options;
}
export async function buildPages({ outDir, base }) {
const result = await build({ configFile: false, root: path.join(root, 'public-site'), base, publicDir: false, esbuild: { jsx: 'automatic' }, build: { outDir, emptyOutDir: false }, worker: { format: 'es' } });
const files = new Set((Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output.map(item => item.fileName)));
// Remove only this builder's obsolete hashed chunks. Never empty a supplied
// output directory or touch the separate source/download release inventory.
const assets = path.join(outDir, 'assets');
for (const file of await fs.readdir(assets, { withFileTypes: true })) {
  if (file.isFile() && /^(?:index|RobotModel|SimulatedCamera|three\.module|head-tracker(?:\.worker)?|vision_bundle|demo-sdk|reachy-mini-sdk|demo-room-panorama|newsreader-latin(?:-ext)?)-[\w-]+\.(?:js|css|png|woff2)$/.test(file.name) && !files.has(`assets/${file.name}`)) await fs.unlink(path.join(assets, file.name));
}
// Explicitly copy only reviewed Apache-2.0 webcam resources, never private CAD/config.
for (const name of ['mediapipe', 'models']) await fs.cp(path.join(root, 'public', name), path.join(outDir, name), { recursive: true });
for (const name of ['mediapipe', 'models']) for (const file of await inventoryFiles(outDir, name)) files.add(file);
const manifest = [];
for (const name of [...files].sort()) {
  const bytes=await fs.readFile(path.join(outDir,name));
  manifest.push({path:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(outDir,'build-manifest.json'),JSON.stringify({version:metadata.version,files:manifest},null,2)+'\n');
console.log('Built static browser controller; no local server or configuration is bundled.');
}
export async function inventoryFiles(directory, relative = '') {
  const files = [];
  for (const item of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw Error('Build assets must not contain symbolic links.');
    if (item.isDirectory()) files.push(...await inventoryFiles(directory, name));
    else if (item.isFile()) files.push(name);
    else throw Error('Build assets must be ordinary files or directories.');
  }
  return files.sort();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPages(parseBuildArguments(process.argv.slice(2)));
