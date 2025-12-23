<template>
  <div class="gallery-detail-page">
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
          <span class="subtitle">少儿画廊</span>
        </div>
      </div>

      <!-- 作品内容 -->
      <div class="content-card">
        <!-- 图片展示 -->
        <div class="image-section">
          <n-image
            v-if="work.images?.length === 1"
            :src="work.images[0]"
            object-fit="contain"
            class="main-image"
            :img-props="{ style: 'max-height: 70vh; width: 100%; object-fit: contain;' }"
          />
          <n-image-group v-else>
            <div class="image-grid" :class="{ 'single': work.images?.length === 1, 'double': work.images?.length === 2 }">
              <n-image
                v-for="(img, index) in work.images"
                :key="index"
                :src="img"
                object-fit="cover"
                class="grid-image"
              />
            </div>
          </n-image-group>
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
          <p>{{ work.content }}</p>
        </div>
      </div>

      <!-- 底部 -->
      <div class="footer">
        <p>扫码或点击登录查看更多精彩作品</p>
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
    const response = await axios.get(`/api/gallery/${id}`);
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
.gallery-detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  max-width: 800px;
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

.image-section {
  background: #f5f5f5;
  padding: 20px;
}

.main-image {
  width: 100%;
  border-radius: 12px;
}

.image-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}

.image-grid.single {
  grid-template-columns: 1fr;
}

.image-grid.double {
  grid-template-columns: repeat(2, 1fr);
}

.grid-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
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
  .gallery-detail-page {
    padding: 10px;
  }

  .title-text {
    font-size: 22px;
  }

  .content-card {
    border-radius: 16px;
  }

  .image-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
