import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对资源路径，仓库名无论是什么都能部署到 GitHub Pages 子目录。
  base: './',
  plugins: [react()],
  server: { port: 3000, open: true },
});
