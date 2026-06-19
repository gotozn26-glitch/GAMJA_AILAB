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
    // 빌드 결과물이 dist 폴더에 생성되도록 강제합니다.
    outDir: 'dist',
    // 자산 파일들을 assets 폴더 안에 모읍니다.
    assetsDir: 'assets',
    // 기존 index.html의 경로 문제를 해결하기 위해 빈 스크립트 방지 설정을 넣습니다.
    emptyOutDir: true,
  }
});
