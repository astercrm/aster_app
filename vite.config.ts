import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Increase warning limit (our app is intentionally feature-rich)
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Split large libraries into separate lazy-loaded chunks
          manualChunks(id) {
            // ⚠️ React core MUST be checked FIRST — many libs (recharts,
            // lucide-react, framer-motion) transitively import react/react-dom.
            // If we match those libs first, Rollup may pull React internals
            // (forwardRef, createElement, etc.) into their chunk, causing
            // "Cannot read properties of undefined" at runtime.

            // React core — always needed, load first
            if (
              id.includes('node_modules/react/')
              || id.includes('node_modules/react-dom/')
              || id.includes('node_modules/react-router-dom/')
              || id.includes('node_modules/react-router/')
              || id.includes('node_modules/scheduler/')
            ) {
              return 'react-core';
            }
            // Lucide icons — large icon set
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            // Recharts + d3 — only needed on Dashboard
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')
                || id.includes('node_modules/victory') || id.includes('node_modules/internmap')
                || id.includes('node_modules/decimal.js')) {
              return 'charts';
            }
            // Animation library — split from core
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'motion';
            }
            // ExcelJS is huge — only needed for bulk upload/download (Admin)
            if (id.includes('node_modules/exceljs')) {
              return 'excel';
            }
            // Everything else from node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      // Enable source maps only in dev for faster prod builds
      sourcemap: false,
      // Minify aggressively
      minify: 'esbuild',
      target: 'es2020',
    },
  };
});
