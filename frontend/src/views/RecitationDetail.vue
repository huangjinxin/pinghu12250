<template>
  <div class="recitation-detail-page">
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p class="mt-4 text-gray-500">加载中...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <n-result status="error" :title="error" description="该作品可能不存在或未通过审核">
        <template #footer>
          <n-button @click="$router.push('/login')">返回登录</n-button>
        </template>
      </n-result>
    </div>

    <div v-else-if="work" class="work-container">
      <!-- 顶部导航 -->
      <div class="header">
        <div class="site-title">
          <span class="title-text">苹湖少儿空间</span>
          <span class="subtitle">少儿朗诵</span>
        </div>
      </div>

      <!-- 作品内容 -->
      <div class="content-card">
        <!-- 音频播放区 -->
        <div class="audio-section">
          <div class="audio-icon">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              </svg>
            </div>
          </div>

          <div class="audio-list">
            <div v-for="(audioUrl, index) in work.audios" :key="index" class="audio-item">
              <span class="audio-label">音频 {{ index + 1 }}</span>
              <audio :src="audioUrl" controls class="audio-player" />
            </div>
          </div>
        </div>

        <!-- 作者信息 -->
        <div class="author-section">
          <div class="avatar-wrapper">
            <div class="avatar" :style="{ backgroundColor: getAvatarColor(work.author?.username) }">
              {{ getAvatarText(work.author?.username) }}
            </div>
          </div>
          <div class="author-info">
            <div class="author-name">{{ work.author?.nickname || work.author?.username }}</div>
            <div class="publish-time">{{ formatDate(work.createdAt) }}</div>
          </div>
        </div>

        <!-- 分类标签 -->
        <div class="tags-section">
          <n-tag type="info" size="medium">{{ work.template?.type?.name }}</n-tag>
          <n-tag type="success" size="medium">{{ work.template?.standard?.name }}</n-tag>
        </div>

        <!-- 描述内容 -->
        <div v-if="work.content" class="description-section">
          <div class="section-title">作品描述</div>
          <p>{{ work.content }}</p>
        </div>
      </div>

      <!-- 底部 -->
      <div class="footer">
        <p>扫码或点击登录收听更多精彩朗诵</p>
        <n-button type="primary" @click="$router.push('/login')">登录苹湖少儿空间</n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();

const loading = ref(true);
const error = ref('');
const work = ref(null);

const loadWork = async () => {
  try {
    const id = route.params.id;
    const response = await axios.get(`/api/gallery/recitation/${id}`);
    work.value = response.data.work;
  } catch (err) {
    console.error('加载作品失败:', err);
    error.value = err.response?.data?.error || '加载作品失败';
  } finally {
    loading.value = false;
  }
};

const getAvatarColor = (username) => {
  if (!username) return '#8b5cf6';
  const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3d8', '#60a5fa', '#a78bfa', '#f472b6'];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
};

const getAvatarText = (username) => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

onMounted(() => {
  loadWork();
});
</script>

<style scoped>
.recitation-detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  color: white;
}

.work-container {
  max-width: 600px;
  margin: 0 auto;
}

.header {
  text-align: center;
  padding: 20px 0 30px;
}

.site-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.title-text {
  font-size: 28px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 16px;
  border-radius: 20px;
}

.content-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.audio-section {
  background: linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%);
  padding: 30px 20px;
  text-align: center;
}

.audio-icon {
  margin-bottom: 20px;
}

.icon-circle {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.audio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.audio-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.audio-player {
  width: 100%;
  max-width: 400px;
  height: 45px;
  border-radius: 25px;
}

.author-section {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar-wrapper {
  margin-right: 15px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.author-info {
  flex: 1;
}

.author-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.publish-time {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.tags-section {
  padding: 15px 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.description-section {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 10px;
}

.description-section p {
  font-size: 16px;
  line-height: 1.8;
  color: #555;
  margin: 0;
  white-space: pre-wrap;
}

.footer {
  text-align: center;
  padding: 30px 20px;
  color: white;
}

.footer p {
  margin-bottom: 15px;
  font-size: 14px;
  opacity: 0.9;
}

@media (max-width: 640px) {
  .recitation-detail-page {
    padding: 10px;
  }

  .title-text {
    font-size: 22px;
  }

  .content-card {
    border-radius: 16px;
  }

  .icon-circle {
    width: 60px;
    height: 60px;
  }

  .icon-circle svg {
    width: 30px;
    height: 30px;
  }
}
</style>
