import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PUBLIC_FILES, auditPublicFile, sourceZip, collectPublicSource, exportPublic } from '../tools/Export-Public.mjs';

test('publication allowlist excludes private and generated content',()=>{
  for(const name of PUBLIC_FILES) assert.doesNotMatch(name,/^(?:local|public|node_modules|dist|\.git)\//);
  assert.ok(PUBLIC_FILES.includes('LICENSE'));assert.ok(PUBLIC_FILES.includes('THIRD_PARTY_NOTICES.md'));
  assert.ok(PUBLIC_FILES.includes('AGENTS.md'));assert.ok(PUBLIC_FILES.includes('.github/workflows/checks.yml'));
  assert.ok(!PUBLIC_FILES.includes('docs/VALIDATION.md'));
});
test('audit rejects private roots, numeric robot addresses, credentials and hardware binaries',()=>{
  const privateRoot='S:'+String.fromCharCode(92)+'Work'+String.fromCharCode(92)+'secret';
  const robotAddress=['192','168','1','44'].join('.');
  for(const text of [privateRoot,robotAddress,'ghp_'+'a'.repeat(30)]) assert.throws(()=>auditPublicFile('src/example.js',Buffer.from(text)));
  for(const name of ['local/config.json','model.glb','../escape.js','docs/VALIDATION.md']) assert.throws(()=>auditPublicFile(name,Buffer.from('safe')));
  assert.doesNotThrow(()=>auditPublicFile('src/example.js',Buffer.from('http://127.0.0.1:18750 http://robot.invalid')));
});

test('release retries preserve bytes and a reused version rejects changed source before replacement', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'reachy-release-identity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const appRoot = path.join(root, 'app'), siteRoot = path.join(root, 'site');
  await fs.mkdir(siteRoot);
  const entries = await collectPublicSource(fileURLToPath(new URL('..', import.meta.url)));
  for (const entry of entries) {
    const target = path.join(appRoot, entry.name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.bytes);
  }
  const sourceRevision = 'a'.repeat(40);
  const first = await exportPublic({ appRoot, siteRoot, sourceRevision });
  assert.deepEqual(await exportPublic({ appRoot, siteRoot, sourceRevision }), first);
  const product = path.join(siteRoot, 'reachy-mini');
  const receipt = await fs.readFile(path.join(product, 'PUBLIC_ARTIFACTS.json'));
  const manifest = JSON.parse(await fs.readFile(path.join(product, 'source/SOURCE_MANIFEST.json')));
  assert.equal(manifest.sourceRevision, sourceRevision);
  assert.match(manifest.sourceTreeSha256, /^[a-f0-9]{64}$/);
  await fs.appendFile(path.join(appRoot, 'README.md'), '\nReviewed release fixture change.\n');
  await assert.rejects(exportPublic({ appRoot, siteRoot, sourceRevision }), /already exists with different bytes/);
  assert.deepEqual(await fs.readFile(path.join(product, 'PUBLIC_ARTIFACTS.json')), receipt);
  assert.equal(await fs.readFile(path.join(product, 'source/README.md'), 'utf8'), entries.find(e => e.name === 'README.md').bytes.toString());
});
test('ZIP has deterministic timestamps, CRC headers and exact source entry payloads',()=>{
  const entries=[{name:'package/LICENSE',bytes:Buffer.from('MIT')},{name:'package/src/example.js',bytes:Buffer.from('export const ok = true;')},{name:'package/crc-fixture.txt',bytes:Buffer.from('123456789')}];
  const archive=sourceZip(entries);assert.deepEqual(archive,sourceZip(entries));
  let offset=0;
  for(const entry of entries) {
    assert.equal(archive.readUInt32LE(offset),0x04034b50);assert.equal(archive.readUInt16LE(offset+12),33);
    if(entry.name==='package/crc-fixture.txt') assert.equal(archive.readUInt32LE(offset+14),0xcbf43926);
    const length=archive.readUInt16LE(offset+26),compressed=archive.readUInt32LE(offset+18);
    assert.equal(archive.subarray(offset+30,offset+30+length).toString(),entry.name);
    assert.deepEqual(inflateRawSync(archive.subarray(offset+30+length,offset+30+length+compressed)),entry.bytes);
    offset+=30+length+compressed;
  }
  assert.equal(archive.readUInt32LE(offset),0x02014b50);
  assert.equal(archive.readUInt32LE(archive.length-22),0x06054b50);
  assert.equal(archive.readUInt16LE(archive.length-12),entries.length);
});
test('every selected current source file passes the release privacy audit',async()=>{
  const entries=await collectPublicSource(fileURLToPath(new URL('..',import.meta.url)));
  assert.equal(entries.length,PUBLIC_FILES.length);assert.ok(entries.every(entry=>entry.bytes.length>0));
});

test('only the exact reviewed synthetic panorama is admitted as a binary source asset',async()=>{
  const name='public-site/demo-room-panorama.png';
  const bytes=await fs.readFile(fileURLToPath(new URL('../'+name,import.meta.url)));
  assert.doesNotThrow(()=>auditPublicFile(name,bytes));
  const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  assert.throws(()=>auditPublicFile(name,changed),/Unreviewed demo panorama/);
  assert.throws(()=>auditPublicFile('public-site/other-panorama.png',bytes));
});

test('export writes a verifiable complete source release and preserves website files',async()=>{
  const siteRoot=await fs.mkdtemp(path.join(os.tmpdir(),'reachy-public-export-'));
  try {
    await fs.mkdir(path.join(siteRoot,'reachy-mini/source'),{recursive:true});
    await fs.writeFile(path.join(siteRoot,'reachy-mini/index.html'),'existing website');
    await fs.writeFile(path.join(siteRoot,'reachy-mini/source/obsolete.txt'),'old export');
    const result=await exportPublic({appRoot:fileURLToPath(new URL('..',import.meta.url)),siteRoot});
    assert.equal(await fs.readFile(path.join(siteRoot,'reachy-mini/index.html'),'utf8'),'existing website');
    await assert.rejects(fs.stat(path.join(siteRoot,'reachy-mini/source/obsolete.txt')),{code:'ENOENT'});
    const manifest=JSON.parse(await fs.readFile(path.join(siteRoot,'reachy-mini/source/SOURCE_MANIFEST.json'),'utf8'));
    assert.equal(manifest.files.length,PUBLIC_FILES.length);
    for(const file of manifest.files) {
      const bytes=await fs.readFile(path.join(siteRoot,'reachy-mini/source',file.sitePath));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);
    }
    const workflow = manifest.files.find(file => file.path === '.github/workflows/checks.yml');
    assert.equal(workflow.sitePath, 'github/workflows/checks.yml');
    const archive=await fs.readFile(path.join(siteRoot,'reachy-mini/downloads',result.archive));
    assert.equal(crypto.createHash('sha256').update(archive).digest('hex'),result.sha256);
    assert.equal(result.sourceFiles,PUBLIC_FILES.length+1);
    assert.equal(archive.readUInt16LE(archive.length-12),result.sourceFiles);
  } finally {
    const resolved=await fs.realpath(siteRoot),temporaryRoot=await fs.realpath(os.tmpdir());
    assert.ok(resolved.startsWith(temporaryRoot+path.sep));
    await fs.rm(resolved,{recursive:true,force:true});
  }
});
