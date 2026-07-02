// @ts-nocheck
// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  getBudgetForBundleFile,
} from './bundleConfig';

const generatedDirs: string[] = [];
const cwd = process.cwd();
const appRoot = existsSync(path.resolve(cwd, 'vite.config.ts'))
  ? cwd
  : path.resolve(cwd, 'apps/web');
const configPath = path.resolve(appRoot, 'vite.config.ts');
const buildEnv = { ...process.env, NODE_ENV: 'production' };

for (const key of Object.keys(buildEnv)) {
  if (key.startsWith('VITEST')) {
    delete buildEnv[key];
  }
}

function collectJavaScriptAssets(outDir: string): string[] {
  const assetDir = path.join(outDir, 'assets');
  return readdirSync(assetDir)
    .filter((fileName) => fileName.endsWith('.js'))
    .map((fileName) => path.join(assetDir, fileName));
}

describe('bundle budgets', () => {
  afterEach(() => {
    while (generatedDirs.length > 0) {
      const dir = generatedDirs.pop();
      if (dir) {
        rmSync(dir, { force: true, recursive: true });
      }
    }
  });

  it('keeps emitted app and worker chunks inside the current scoped budget', async () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'mbd-bundle-budget-'));
    generatedDirs.push(outDir);

    execFileSync(process.execPath, [
      './node_modules/vite/bin/vite.js',
      'build',
      '--config',
      configPath,
      '--outDir',
      outDir,
    ], {
      cwd: appRoot,
      env: buildEnv,
      stdio: 'pipe',
    });

    const manifestPath = path.join(outDir, '.vite', 'manifest.json');
    expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toBeTruthy();

    const oversized = collectJavaScriptAssets(outDir).flatMap((filePath) => {
      const fileName = path.basename(filePath);
      const source = readFileSync(filePath);
      const rawBytes = source.byteLength;
      const gzipBytes = gzipSync(source).byteLength;
      const { rawBudget, gzipBudget } = getBudgetForBundleFile(fileName);

      if (rawBytes <= rawBudget && gzipBytes <= gzipBudget) {
        return [];
      }

      return [{
        fileName,
        rawBytes,
        gzipBytes,
        rawBudget,
        gzipBudget,
      }];
    });

    expect(oversized).toEqual([]);
  }, 60_000);
});
