import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 12250,
    allowedHosts: ['pinghu.706tech.cn'],
    proxy: {
      '/api': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/pdfs': {
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
