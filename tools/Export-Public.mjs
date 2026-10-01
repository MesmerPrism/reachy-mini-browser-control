import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

// This is a deliberately explicit publication list, never a recursive repo copy.
// Adding a new runtime/setup file requires a fresh source and privacy review.
export const PUBLIC_FILES = Object.freeze([
  '.gitignore', '.gitattributes', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'AGENTS.md', 'CONTRIBUTING.md',
  '.github/workflows/checks.yml', 'docs/ARCHITECTURE.md', 'docs/STATUS.md', 'docs/DAEMON_1_11_COMPATIBILITY.md',
  'src/AgentConsole.jsx', 'src/agent-console.mjs', 'src/agent-console.css', 'test/agent-console.test.mjs',
  'src/command-flight.mjs', 'test/command-flight.test.mjs',
  'src/model-antenna-control.mjs', 'test/model-antenna-control.test.mjs',
  'server/security-headers.mjs', 'test/security-headers.test.mjs',
  'src/SpatialControls.jsx', 'src/spatial-control.mjs', 'src/spatial-controls.css', 'test/spatial-control.test.mjs',
  'src/WebXRControls.jsx', 'src/xr-head-follow.mjs', 'src/webxr-controls.css', 'test/xr-head-follow.test.mjs',
  'public-site/newsreader-latin.woff2', 'public-site/newsreader-latin-ext.woff2', 'test/build-pages.test.mjs',
  'docs/SETUP.md', 'package.json', 'package-lock.json', 'config.example.json', 'index.html', 'vite.config.js',
  'licenses/React-Scheduler.txt', 'licenses/Hugging-Face-Hub.txt', 'licenses/Hugging-Face-Tasks.txt', 'licenses/Newsreader-OFL.txt', 'licenses/React.txt', 'licenses/React-DOM.txt', 'licenses/Lucide.txt', 'licenses/Three.txt',
  'licenses/ws.txt', 'licenses/Vite.txt', 'licenses/Pretext.txt', 'licenses/MediaPipe-Apache-2.0.txt', 'licenses/Reachy-Mini-Apache-2.0.txt', 'licenses/Reachy-Mini-JavaScript-SDK.txt',
  'src/Antennas.jsx', 'src/App.jsx', 'src/AudioControls.jsx', 'src/Camera.jsx', 'src/Emotes.jsx',
  'src/HeadControls.jsx', 'src/HeadTracking.jsx', 'src/RobotModel.jsx', 'src/main.jsx', 'src/styles.css',
  'src/head-follow.mjs', 'src/head-manual-queue.mjs', 'src/head-math.mjs', 'src/head-tracker.js',
  'src/head-tracker.worker.js', 'src/media.js', 'src/robot-model-state.mjs', 'src/talk-lifecycle.mjs',
  'src/useControl.js', 'src/useHeadControl.js', 'src/useReachyMedia.js',
  'src/wireless-control.mjs', 'src/wireless-audio.mjs', 'src/first-setup.mjs', 'src/setup-guidance.mjs', 'src/panorama-camera.mjs',
  'src/wireless-telemetry.mjs', 'src/robot-update.mjs', 'public-site/RobotUpdate.jsx', 'test/robot-update.test.mjs',
  'test/daemon-1.11-compatibility.test.mjs', 'test/fixtures/daemon-1.11-wire.mjs',
  'server/audio-control.mjs', 'server/control.mjs', 'server/head-pose.mjs', 'server/index.mjs', 'server/media-guard.mjs',
  'tools/Prepare-HeadAssets.mjs', 'tools/Prepare-ReachyModel.mjs', 'tools/Validate-ReachyModel.mjs',
  'tools/reachy-model-source.mjs', 'tools/Export-Public.mjs', 'tools/Setup-Local.mjs', 'tools/Build-Pages.mjs', 'tools/Agent-Diagnostics.mjs',
  'public-site/WirelessPanel.jsx', 'public-site/index.html', 'public-site/FitText.jsx', 'public-site/FirstSetup.jsx', 'public-site/main.jsx', 'public-site/style.css', 'public-site/demo-sdk.mjs', 'public-site/SimulatedCamera.jsx', 'public-site/demo-room-panorama.png', 'public-site/DEMO_ASSETS.md',
  'test/agent-diagnostics.test.mjs', 'test/panorama-camera.test.mjs', 'src/wifi-setup.mjs', 'public-site/WifiSetup.jsx', 'test/wifi-setup.test.mjs',
  'test/audio-control.test.mjs', 'test/control-recovery.test.mjs', 'test/control.test.mjs', 'test/first-setup.test.mjs', 'test/setup-guidance.test.mjs',
  'test/head-control.test.mjs', 'test/head-follow.test.mjs', 'test/head-manual-queue.test.mjs',
  'test/head-math.test.mjs', 'test/head-tracker.test.mjs', 'test/manual-head-control.test.mjs',
  'test/media-guard.test.mjs', 'test/robot-model-state.test.mjs', 'test/talk-lifecycle.test.mjs',
  'test/fixtures/text-qa.html', 'test/fixtures/text-qa.jsx', 'test/fixtures/setup-qa.html', 'test/fixtures/setup-qa.jsx', 'test/setup-local.test.mjs', 'test/public-export.test.mjs', 'test/robot-schematic.test.mjs', 'test/wireless-control.test.mjs', 'test/wireless-audio.test.mjs',
].sort());

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// GitHub Pages reserves .github paths even beneath a no-Jekyll source export.
// Keep canonical repository paths in the ZIP and an explicit static projection.
const sitePath = name => name.startsWith('.github/') ? `github/${name.slice('.github/'.length)}` : name;
export function auditPublicFile(name, bytes) {
  if (name.includes('\\') || name.startsWith('/') || name.split('/').some(part => part === '..' || part === '.')) throw Error('Unsafe publication path');
  if (/(?:^|\/)(?:local|node_modules|dist|\.git|\.env|VALIDATION\.md)(?:\/|$)/i.test(name) ||
      /\.(?:glb|gltf|stl|urdf|mjcf|wasm|task|apk|exe|dll|log|pem|key)$/i.test(name) || name.startsWith('public/')) throw Error(`Excluded publication content: ${name}`);
  // One reviewed synthetic panorama is a binary source asset. Fail closed on
  // substitutions; this exception admits no arbitrary images or CAD binaries.
  if (name === 'public-site/demo-room-panorama.png') {
    if (hash(bytes) !== 'ea4fe2bad1e747547dfb20d1e1d1e17d02c20b41a9ac6b6ccf8bf2163a536e96') throw Error('Unreviewed demo panorama');
    return null;
  }
  const fontHashes = {
    'public-site/newsreader-latin.woff2': '6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101',
    'public-site/newsreader-latin-ext.woff2': '45683de03de37187604102316c0b42c0cb2d8dc9c4140a20ad471c3148cc1278',
  };
  if (Object.hasOwn(fontHashes, name)) {
    if (hash(bytes) !== fontHashes[name]) throw Error(`Unreviewed font: ${name}`);
    return null;
  }
  if (/\.woff2?$/i.test(name)) throw Error(`Unreviewed font: ${name}`);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (text.includes('\0')) throw Error(`Non-text publication content: ${name}`);
  // Reject personal machine paths, UNC roots, credentials and network addresses.
  // Safe localhost bindings, generic DNS names and synthetic robot.invalid remain.
  if (/[A-Za-z]:[\\/](?:Users|Work|repos|Agent Bureau)\b/i.test(text) || /\/(?:Users|home)\/[^\s/]+\//.test(text) || /\\\\[\w.-]+\\[\w.$-]+(?:\\|['"\s]|$)/.test(text)) throw Error(`Private machine path in ${name}`);
  if (/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text)) throw Error(`Credential in ${name}`);
  for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    const octets = match[0].split('.').map(Number);
    if (octets.every(v => v <= 255) && match[0] !== '127.0.0.1') throw Error(`Non-loopback numeric address in ${name}`);
  }
  if (name === 'config.example.json') {
    const config = JSON.parse(text);
    if (config.expectedHardwareId !== 'replace-with-your-robot-hardware-id' || config.robotUrl !== 'http://reachy-mini.local:8000') throw Error('Example configuration must retain generic placeholders');
  }
  return text;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit=0;bit<8;bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}

// A portable, deterministic ordinary ZIP. DOS timestamp is fixed to 1980-01-01;
// no host file paths, permissions, creation times or extra fields are included.
export function sourceZip(entries) {
  if (entries.length > 65535) throw Error('Source archive too large');
  const records = [], directories = []; let offset = 0;
  for (const entry of entries) {
    const filename = Buffer.from(entry.name, 'utf8'), bytes = Buffer.from(entry.bytes);
    if (filename.length > 65535 || bytes.length > 0xffffffff) throw Error('Source entry too large');
    const compressed = deflateRawSync(bytes, { level: 9 }), crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0x800,6);
    local.writeUInt16LE(8,8); local.writeUInt16LE(33,12); local.writeUInt32LE(crc,14);
    local.writeUInt32LE(compressed.length,18); local.writeUInt32LE(bytes.length,22); local.writeUInt16LE(filename.length,26);
    records.push(local,filename,compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6);
    central.writeUInt16LE(0x800,8); central.writeUInt16LE(8,10); central.writeUInt16LE(33,14);
    central.writeUInt32LE(crc,16); central.writeUInt32LE(compressed.length,20); central.writeUInt32LE(bytes.length,24);
    central.writeUInt16LE(filename.length,28); central.writeUInt32LE(offset,42);
    directories.push(central,filename); offset += local.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(directories), end = Buffer.alloc(22);
  if (offset > 0xffffffff || directory.length > 0xffffffff) throw Error('Source archive too large');
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...records,directory,end]);
}

function childPath(root, relative) {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw Error('Publication path escaped its root');
  return resolved;
}

export async function collectPublicSource(appRoot) {
  const entries = [];
  for (const name of PUBLIC_FILES) {
    const file = childPath(appRoot, name), info = await fs.lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw Error(`Not an ordinary source file: ${name}`);
    const real = await fs.realpath(file);
    if (!real.startsWith(await fs.realpath(appRoot) + path.sep)) throw Error(`Source escaped workspace: ${name}`);
    const bytes = await fs.readFile(file); auditPublicFile(name,bytes);
    entries.push({ name, bytes });
  }
  // Fail closed when a new runtime file has not entered the reviewed allowlist.
  for (const directory of ['src','server','public-site']) for (const name of await fs.readdir(path.join(appRoot,directory))) {
    if (!PUBLIC_FILES.includes(`${directory}/${name}`)) throw Error(`Unreviewed runtime file: ${directory}/${name}`);
  }
  return entries;
}

export async function exportPublic({ appRoot, siteRoot, sourceRevision = null }) {
  siteRoot = await fs.realpath(siteRoot);
  const entries = await collectPublicSource(appRoot);
  const metadata = JSON.parse(entries.find(entry => entry.name === 'package.json').bytes.toString());
  if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) throw Error('Use an explicit stable numeric release version');
  if (sourceRevision !== null && !/^[a-f0-9]{40}$/.test(sourceRevision)) throw Error('Invalid source revision');
  const prefix = `reachy-mini-controller-v${metadata.version}`;
  const sourceFiles = entries.map(entry => ({ path: entry.name, bytes: entry.bytes.length, sha256: hash(entry.bytes) }));
  const sourceTreeSha256 = hash(Buffer.from(JSON.stringify(sourceFiles)));
  const manifest = { schema: 'reachy.public-source.v1', name: metadata.name, version: metadata.version,
    sourceRevision, sourceTreeSha256,
    originalCodeLicense: 'MIT', dependencyLicenses: 'THIRD_PARTY_NOTICES.md',
    exclusions: ['private configuration and evidence','Git history','installed dependencies','generated model/WASM binaries','source CAD and robot meshes'],
    files: sourceFiles.map(file => ({ ...file, sitePath: sitePath(file.path) })) };
  entries.push({ name:'SOURCE_MANIFEST.json', bytes:Buffer.from(JSON.stringify(manifest,null,2)+'\n') });
  const zip = sourceZip(entries.map(entry => ({ name:`${prefix}/${entry.name}`, bytes:entry.bytes })));
  const product = childPath(siteRoot,'reachy-mini'), source = childPath(product,'source'), downloads = childPath(product,'downloads');
  const staging = childPath(product,'source.export-staging');
  // Verify the exact export-owned locations before any recursive removal.
  if (path.dirname(source) !== product || path.dirname(staging) !== product || path.basename(source) !== 'source' || path.basename(staging) !== 'source.export-staging') throw Error('Unsafe export cleanup path');
  await fs.mkdir(product,{recursive:true});
  if (!(await fs.realpath(product)).startsWith(siteRoot + path.sep)) throw Error('Website product directory escaped its root');
  for (const directory of [source, staging, downloads]) {
    try { if ((await fs.lstat(directory)).isSymbolicLink()) throw Error('Export directory is a symbolic link'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const zipName = `${prefix}.zip`, sha256 = hash(zip);
  // A published version identifies immutable bytes. Refuse before replacing
  // source or release metadata; an unchanged retry remains idempotent.
  try {
    const prior = await fs.readFile(childPath(downloads, zipName));
    if (hash(prior) !== sha256) throw Error(`Release ${metadata.version} already exists with different bytes; increment the version`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.rm(staging,{recursive:true,force:true}); await fs.mkdir(staging);
  for (const entry of entries) { const file = childPath(staging,sitePath(entry.name)); await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file,entry.bytes); }
  await fs.rm(source,{recursive:true,force:true}); await fs.rename(staging,source);
  await fs.mkdir(downloads,{recursive:true});
  if (!(await fs.realpath(downloads)).startsWith(siteRoot + path.sep)) throw Error('Download directory escaped its root');
  await fs.writeFile(childPath(downloads,zipName),zip);
  await fs.writeFile(childPath(downloads,`${zipName}.sha256`),`${sha256}  ${zipName}\n`);
  await fs.writeFile(childPath(product,'PUBLIC_ARTIFACTS.json'),JSON.stringify({schema:'reachy.public-artifacts.v1',version:metadata.version,
    sourceRevision, sourceTreeSha256,
    sourceManifest:'source/SOURCE_MANIFEST.json',archive:{path:`downloads/${zipName}`,bytes:zip.length,sha256},sourceFiles:entries.length},null,2)+'\n');
  return { sourceFiles:entries.length, archive:zipName, bytes:zip.length, sha256 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--site-dir') throw Error('Usage: node tools/Export-Public.mjs --site-dir <website-root>');
  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: appRoot, encoding: 'utf8' }).trim();
  if (execFileSync('git', ['status', '--porcelain'], { cwd: appRoot, encoding: 'utf8' }).trim()) throw Error('Commit the reviewed source before exporting a release');
  console.log(JSON.stringify(await exportPublic({ appRoot, siteRoot:path.resolve(args[1]), sourceRevision }),null,2));
}
