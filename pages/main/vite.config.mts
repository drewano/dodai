import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'), // Assuming a public directory might be added
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'main'),
    rollupOptions: {
      input: resolve(rootDir, 'index.html'), // Make sure to point to the correct HTML file
    },
  },
});
