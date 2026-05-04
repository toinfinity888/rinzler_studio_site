import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        calculator: resolve(__dirname, 'src/calculator.html'),
        mentionsLegales: resolve(__dirname, 'src/mentions-legales.html'),
        politiqueConfidentialite: resolve(__dirname, 'src/politique-confidentialite.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true
  }
});