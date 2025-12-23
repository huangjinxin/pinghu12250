<template>
  <div class="html-work-view">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p class="loading-text">加载中...</p>
    </div>

    <!-- 错误页面 -->
    <div v-else-if="error" class="error-container">
      <div class="error-content">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2>{{ error }}</h2>
        <p>该作品可能不存在或暂时无法访问</p>
        <n-button type="primary" @click="$router.push('/login')">返回登录</n-button>
      </div>
    </div>

    <!-- 作品展示 -->
    <div v-else-if="work" class="work-view-container">
      <!-- 顶部导航 -->
      <div class="header">
        <div class="site-title">
          <span class="title-text">苹湖少儿空间</span>
          <span class="subtitle">HTML作品集</span>
        </div>
      </div>

      <!-- 顶部信息条（悬浮显示） -->
      <div class="top-bar" :class="{ 'visible': showTopBar }">
        <div class="bar-content">
          <div class="work-info">
            <span class="work-title">{{ work.title }}</span>
            <span class="work-author">作者：{{ work.author?.profile?.nickname || work.author?.username }}</span>
          </div>
          <div class="bar-actions">
            <n-button @click="$router.push('/login')" type="primary">
              登录查看更多
            </n-button>
          </div>
        </div>
      </div>

      <!-- 全屏iframe展示 -->
      <iframe
        ref="workFrame"
        class="work-frame"
        sandbox="allow-scripts"
        @mousemove="handleMouseMove"
      ></iframe>

      <!-- 底部提示（悬浮显示） -->
      <div class="bottom-hint" :class="{ 'visible': showTopBar }">
        <span>苹湖少儿空间 - HTML作品展示</span>
      </div>

      <!-- 底部固定导航 -->
      <div class="footer">
        <p>登录苹湖少儿空间，查看更多创意作品</p>
        <n-button type="primary" @click="$router.push('/login')">
          立即登录
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();

const loading = ref(true);
const error = ref('');
const work = ref(null);
const workFrame = ref(null);
const showTopBar = ref(true);

let hideTimeout = null;

const loadWork = async () => {
  try {
    const id = route.params.id;
    const response = await axios.get(`/api/html-works/public/${id}`);
    work.value = response.data;

    // 渲染作品
    setTimeout(() => {
      renderWork();
    }, 100);
  } catch (err) {
    console.error('加载作品失败:', err);
    error.value = err.response?.data?.error || '加载作品失败';
  } finally {
    loading.value = false;
  }
};

const renderWork = () => {
  if (!workFrame.value || !work.value) return;

  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${work.value.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: auto; }
    ${work.value.cssCode || ''}
  </style>
</head>
<body>
  ${work.value.htmlCode || ''}
  <script>${work.value.jsCode || ''}<\/script>
</body>
</html>`;

  workFrame.value.srcdoc = doc;
};

const handleMouseMove = () => {
  showTopBar.value = true;

  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }

  hideTimeout = setTimeout(() => {
    showTopBar.value = false;
  }, 3000);
};

// 初始显示3秒后自动隐藏
onMounted(() => {
  loadWork();

  hideTimeout = setTimeout(() => {
    showTopBar.value = false;
  }, 3000);
});

onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
});
</script>

<style scoped>
.html-work-view {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%);
  padding: 20px;
}

.loading-container {
  width: 100%;
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.loading-text {
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
}

.error-container {
  width: 100%;
  height: calc(100% - 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.error-content {
  text-align: center;
  color: white;
  padding: 40px;
}

.error-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  color: #f87171;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-content h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.error-content p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 30px;
}

.work-view-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.work-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
  padding: 15px 20px;
  opacity: 0;
  transform: translateY(-100%);
  transition: all 0.3s ease;
}

.top-bar.visible {
  opacity: 1;
  transform: translateY(0);
}

.bar-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.work-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.work-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.work-author {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.bar-actions {
  display: flex;
  gap: 10px;
}

.bottom-hint {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 15px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  opacity: 0;
  transform: translateY(100%);
  transition: all 0.3s ease;
}

.bottom-hint.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 640px) {
  .top-bar {
    padding: 10px 15px;
  }

  .work-title {
    font-size: 16px;
  }

  .work-author {
    font-size: 12px;
  }
}
</style>
