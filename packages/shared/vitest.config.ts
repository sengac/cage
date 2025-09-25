import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@cage/shared': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['zod'],
  },
  build: {
    commonjsOptions: {
      include: [/zod/, /node_modules/],
    },
  },
});
