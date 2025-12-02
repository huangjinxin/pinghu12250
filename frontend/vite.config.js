import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口，允许局域网访问
    port: 12250,
    proxy: {
      '/api': {
        // 在Docker环境中使用服务名，本地开发使用localhost
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
