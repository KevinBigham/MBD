import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {
  resolveAppManualChunk,
  resolveWorkerManualChunk,
} from './src/build/bundleConfig';

export default defineConfig({
  base: '/MBD/',
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return resolveAppManualChunk(id);
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mbd/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@mbd/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src/index.ts'),
      '@mbd/sim-core': path.resolve(__dirname, '../../packages/sim-core/src/index.ts'),
      '@mbd/sim-worker': path.resolve(__dirname, '../../packages/sim-worker/src/index.ts'),
      '@mbd/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      // Deduplicate React — prevent multiple instances in monorepo
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        manualChunks(id) {
          return resolveWorkerManualChunk(id);
        },
      },
    },
  },
});
