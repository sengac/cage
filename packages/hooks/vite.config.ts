import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/cage-hook-handler.ts',
      formats: ['es'], // ESM only
      fileName: 'cage-hook-handler'
    },
    rollupOptions: {
      external: ['fs', 'path', 'os', 'child_process', 'url'],
      output: {
        format: 'es'
      }
    },
    target: 'node18', // For Node.js 18+
    ssr: true // Server-side rendering mode for CLI
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default']
  }
});