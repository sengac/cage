import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext', // Use latest ES features
    minify: 'esbuild',
    rollupOptions: {
      output: {
        format: 'es' // ESM output format
      }
    }
  },
  optimizeDeps: {
    include: [
      // Pre-bundle any CommonJS dependencies
      'react',
      'react-dom',
      'react-router-dom',
      'zustand'
    ]
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@cage/shared': fileURLToPath(new URL('../shared/src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend server
        changeOrigin: true
      }
    }
  }
});