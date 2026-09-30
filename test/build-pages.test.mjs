import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseBuildArguments, inventoryFiles } from '../tools/Build-Pages.mjs';

test('hosted build accepts a portable default and an explicit deployment subpath', () => {
  assert.equal(parseBuildArguments([]).base, './');
  const options = parseBuildArguments(['--base', '/reachy-mini/', '--out-dir', 'local/portable-build']);
  assert.equal(options.base, '/reachy-mini/');
  assert.match(options.outDir.replaceAll('\\', '/'), /\/local\/portable-build$/);
  assert.equal(parseBuildArguments(['--base', '/']).base, '/');
});

test('hosted build rejects ambiguous options and remote or malformed bases', () => {
  for (const args of [['--out-dir'], ['--unknown', 'x'], ['--base', './', '--base', '/'], ['--base', 'https://example.com/'], ['--base', '/reachy-mini'], ['--base', '/../../'], ['--out-dir', '--base']]) {
    assert.throws(() => parseBuildArguments(args));
  }
});

test('copied resource inventory includes nested files with portable sorted paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'reachy-assets-'));
  try {
    await fs.mkdir(path.join(root, 'models', 'nested'), { recursive: true });
    await fs.writeFile(path.join(root, 'models', 'nested', 'landmarker.task'), 'synthetic');
    await fs.writeFile(path.join(root, 'models', 'manifest.json'), '{}');
    assert.deepEqual(await inventoryFiles(root, 'models'), ['models/manifest.json', 'models/nested/landmarker.task']);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
