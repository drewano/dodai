import { resolve } from 'node:path';
import { makeEntryPointPlugin } from '../../packages/hmr';
import { withPageConfig } from '../../packages/vite-config';
import { IS_DEV } from '../../packages/env/lib/const';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  plugins: [IS_DEV && makeEntryPointPlugin()],
  build: {
    lib: {
      name: 'InlineAssist',
      fileName: 'index',
      formats: ['iife'],
      entry: resolve(srcDir, 'index.ts'),
    },
    outDir: resolve(rootDir, '..', '..', 'dist', 'inline-assist'),
  },
});
