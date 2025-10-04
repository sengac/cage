import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
    swc.vite({
      module: { type: 'es6' }, // CRITICAL: Must match module type
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true, // CRITICAL for NestJS DI
        },
        target: 'es2020',
        keepClassNames: true,
      },
    }),
  ],
  esbuild: false, // CRITICAL: Disable esbuild to use SWC instead
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    pool: 'forks',
  },
});
