import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      external: [
        '@nestjs/core',
        '@nestjs/common',
        '@nestjs/platform-express',
        '@nestjs/swagger',
        'reflect-metadata',
        'rxjs',
        'class-transformer',
        'class-validator',
        'fs',
        'path',
        'os',
        'url'
      ],
      output: {
        format: 'es',
        banner: '#!/usr/bin/env node'
      }
    },
    target: 'node18',
    ssr: true
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default']
  }
});