import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: 'es2020',
        keepClassNames: true,
      },
    })
  ],
  esbuild: false, // Disable esbuild since we're using SWC
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