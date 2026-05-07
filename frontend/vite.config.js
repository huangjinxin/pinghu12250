import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [NaiveUiResolver()],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
  assetsInclude: [],
  server: {
    watch: {
      ignored: ['**/.DS_Store'],
    },
    host: '0.0.0.0',
    port: 12253,
    allowedHosts: ['pinghu.706tech.cn', 'beichenmac-mini-3.tail2b26f.ts.net', 'lucky.pinghu.online'],
    proxy: {
      '/api': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/photos-static': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/pdfs': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.DOCKER_ENV ? 'http://backend:12251' : 'http://localhost:12251',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'katex', 'highlight.js', 'markdown-it'],
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('naive-ui')) return 'chunk-naive-ui';
            if (id.includes('pdfjs-dist') || id.includes('pdfjs')) return 'chunk-pdf';
            if (id.includes('echarts')) return 'chunk-echarts';
            if (id.includes('monaco-editor') || id.includes('@codemirror') || id.includes('codemirror') || id.includes('vue-codemirror')) return 'chunk-editor';
            if (id.includes('@wangeditor') || id.includes('wangeditor')) return 'chunk-wangeditor';
            if (id.includes('flipbook-viewer') || id.includes('page-flip')) return 'chunk-flipbook';
            if (id.includes('@tiptap')) return 'chunk-tiptap';
            if (id.includes('katex')) return 'chunk-katex';
            if (id.includes('highlight.js')) return 'chunk-hljs';
            if (id.includes('markdown-it') || id.includes('marked')) return 'chunk-markdown';
            if (id.includes('hanzi-writer')) return 'chunk-hanzi';
            if (id.includes('date-fns')) return 'chunk-datefns';
            if (id.includes('html5-qrcode')) return 'chunk-qrcode';
            if (id.includes('socket.io')) return 'chunk-socket';
            return 'chunk-vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 2000,
  },
  preview: {
    host: '0.0.0.0',
    port: 12250,
    allowedHosts: ['pinghu.706tech.cn', 'beichenmac-mini-3.tail2b26f.ts.net', 'lucky.pinghu.online'],
    proxy: {
      '/api': { target: 'http://localhost:12251', changeOrigin: true },
      '/uploads': { target: 'http://localhost:12251', changeOrigin: true },
      '/photos-static': { target: 'http://localhost:12251', changeOrigin: true },
      '/pdfs': { target: 'http://localhost:12251', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:12251', changeOrigin: true, ws: true },
    },
  },
  css: {
    devSourcemap: true,
  },
});
