<template>
  <div class="public-poetry-tab">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 6" :key="i" height="220px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="暂无唐诗宋词作品" />

    <!-- 诗词作品列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="poetry-card"
        @click="handleViewWork(work)"
      >
        <!-- 作品预览 -->
        <div class="preview-container">
          <iframe
            :srcdoc="work.htmlCode"
            class="preview-frame"
            sandbox="allow-scripts"
          ></iframe>
        </div>

        <!-- 作品信息 -->
        <div class="info-section">
          <h3 class="work-title">{{ work.title }}</h3>
          <div class="author-row">
            <span class="author-name">{{ work.author?.profile?.nickname || work.author?.username }}</span>
            <span class="create-time">{{ formatDate(work.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const loading = ref(false);
const works = ref([]);

const loadWorks = async () => {
  loading.value = true;
  try {
    // 使用公开API获取已审核的诗词作品
    const response = await axios.get('/api/poetry-works/public');
    works.value = response.data.works || [];
  } catch (error) {
    console.error('加载诗词作品失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleViewWork = (work) => {
  router.push(`/poetry/${work.id}`);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

onMounted(() => {
  loadWorks();
});
</script>

<style scoped>
.public-poetry-tab {
  padding: 0;
}

.poetry-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.poetry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.preview-container {
  height: 180px;
  background: #f5f5f5;
  overflow: hidden;
}

.preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}

.info-section {
  padding: 12px 16px;
}

.work-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.create-time {
  font-size: 12px;
  color: #999;
}
</style>
