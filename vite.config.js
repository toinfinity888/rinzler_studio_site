import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './', // 👈 ВОТ ЭТО КЛЮЧЕВОЕ
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true
  }
});