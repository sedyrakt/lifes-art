// ============================================================
// vite.config.mjs
// LIFE'S ART ERP
// Vite + React + Electron
// Production Ready
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

console.log(`⚡ Vite config: ${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}`);

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuild = command === 'build';

  console.log(`📦 Vite command: ${command}`);
  console.log(`🖥️ Electron mode: ${isServe ? 'DEVELOPPEMENT' : 'PRODUCTION'}`);
  console.log(`🖼️ Static assets base: ${isServe ? '/' : './'}`);

  return {
    plugins: [
      react()
    ],

    // Development:
    // http://localhost:5173/
    //
    // Production Electron:
    // file://.../dist/index.html
    base: isServe ? '/' : './',

    resolve: {
      extensions: [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json'
      ],
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: isProduction ? 'terser' : false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,

      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              passes: 2
            },
            mangle: true,
            format: {
              comments: false,
              beautify: false
            }
          }
        : undefined,

      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },

    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      hmr: {
        overlay: true
      }
    },

    preview: {
      port: 4173,
      strictPort: true
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom'
      ]
    },

    publicDir: path.resolve(__dirname, 'public')
  };
});