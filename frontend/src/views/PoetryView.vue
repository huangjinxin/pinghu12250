<template>
  <div class="poetry-view">
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
        <p>该作品可能不存在或尚未通过审核</p>
        <n-button type="primary" @click="$router.push('/login')">返回登录</n-button>
      </div>
    </div>

    <!-- 作品展示 -->
    <div v-else-if="work" class="work-view-container">
      <!-- 固定返回按钮（始终显示） -->
      <div class="back-button-container">
        <n-button type="warning" size="large" @click="handleBack" class="back-btn">
          <template #icon><n-icon size="20"><ArrowBackOutline /></n-icon></template>
          返回诗词文章
        </n-button>
      </div>

      <!-- 顶部信息条（悬浮显示） -->
      <div class="top-bar" :class="{ 'visible': showTopBar }">
        <div class="bar-content">
          <div class="work-info">
            <span class="work-title">{{ work.title }}</span>
            <span class="work-author">作者：{{ work.author?.profile?.nickname || work.author?.username }}</span>
          </div>
          <div class="bar-actions">
            <n-button @click="handleShare" type="primary" size="small">
              <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
              分享
            </n-button>
            <n-button @click="$router.push('/login')" type="info" size="small">
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
        <span>苹湖少儿空间 - 诗词文章作品展示</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import ShareSocialOutline from '@vicons/ionicons5/es/ShareSocialOutline'
import ArrowBackOutline from '@vicons/ionicons5/es/ArrowBackOutline'
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(true);
const error = ref('');
const work = ref(null);
const workFrame = ref(null);
const showTopBar = ref(true);

let hideTimeout = null;

const loadWork = async () => {
  try {
    const id = route.params.id;
    const response = await axios.get(`/api/poetry-works/public/${id}`);
    work.value = response.data;

    // 渲染作品
    setTimeout(() => {
      renderWork();
    }, 100);
  } catch (err) {
    console.error('加载诗词作品失败:', err);
    error.value = err.response?.data?.error || '加载作品失败';
  } finally {
    loading.value = false;
  }
};

const renderWork = () => {
  if (!workFrame.value || !work.value) return;

  // 直接使用原始HTML代码
  workFrame.value.srcdoc = work.value.htmlCode;
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

const handleBack = () => {
  // 直接返回到作品展廊的诗词文章tab
  router.push('/works');
};

const handleShare = async () => {
  const shareUrl = window.location.href;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制');
  } catch (err) {
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制');
  }
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
.poetry-view {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-container {
  width: 100%;
  height: 100%;
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
  height: 100%;
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

.back-button-container {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1001;
}

.back-btn {
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.back-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
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

  .bar-actions {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
