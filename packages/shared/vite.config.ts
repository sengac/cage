import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['nanoid', 'zod', 'date-fns', 'path', 'os', 'fs', 'fs/promises', 'url'],
      output: {
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    target: 'node18',
    ssr: true,
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
  },
});
