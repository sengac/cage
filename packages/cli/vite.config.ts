import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/cli/index.tsx',
      formats: ['es'], // ESM only
      fileName: 'index',
    },
    rollupOptions: {
      external: ['ink', 'react', 'chalk', 'commander'],
      output: {
        format: 'es',
      },
    },
    target: 'node18', // For Node.js 18+
    ssr: true, // Server-side rendering mode for CLI
  },
  optimizeDeps: {
    include: [
      // Add any CommonJS dependencies here that need to be pre-bundled
      'chalk',
      'commander',
    ],
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
});
