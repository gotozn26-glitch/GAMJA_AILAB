import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  /** LogoMaker: CHAE_GPT_API_KEY (클라이언트). Upscaler: CHAE_* 키는 서버(server.ts)에서 사용 */
  envPrefix: ['VITE_', 'CHAE_'],
  plugins: [tailwindcss(), react()],
  // 배포 환경에서 경로가 꼬이지 않도록 '/'로 고정합니다.
  base: '/',
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/runtime-config.js': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        main: path.resolve(__dirname, 'main/index.html'),
      },
    },
  },
});
