import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

// Vite's default public-directory copy would also distribute privately cached
// official CAD. Production copies only the selected asset inventories.
export default defineConfig(({ command }) => {
  let config;
  return {
    esbuild: { jsx: 'automatic' },
    worker: { format: 'es' },
    publicDir: command === 'build' ? false : 'public',
    plugins: [{
      name: 'selected-public-assets',
      apply: 'build',
      configResolved(resolved) { config = resolved; },
      async closeBundle() {
        const directories = ['mediapipe', 'models'];
        if (process.env.VITE_REACHY_MODEL === 'private-cad') directories.push('reachy-model');
        for (const directory of directories) await fs.cp(path.resolve(config.root, 'public', directory), path.resolve(config.root, config.build.outDir, directory), { recursive: true });
      },
    }],
  };
});
