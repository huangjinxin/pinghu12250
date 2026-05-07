<template>
  <div class="public-html-works-tab">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 6" :key="i" height="280px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="暂无HTML作品" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="work-card"
        @click="handleViewWork(work)"
      >
        <!-- 作品预览 -->
        <div class="preview-container">
          <iframe
            :srcdoc="getPreviewHtml(work)"
            class="preview-frame"
            sandbox="allow-scripts"
          ></iframe>
        </div>

        <!-- 作品信息 -->
        <div class="info-section">
          <h3 class="work-title">{{ work.title }}</h3>
          <p v-if="work.description" class="work-desc">{{ work.description }}</p>
          <div class="meta-row">
            <span class="author-name">{{ work.author?.profile?.nickname || work.author?.username }}</span>
            <div class="stats">
              <span class="stat-item">
                <n-icon size="14"><HeartOutline /></n-icon>
                {{ work._count?.likes || 0 }}
              </span>
              <span class="stat-item">
                <n-icon size="14"><GitBranchOutline /></n-icon>
                {{ work._count?.forks || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="!loading && total > pageSize" class="pagination-container">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        :page-size="pageSize"
        @update:page="loadWorks"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import GitBranchOutline from '@vicons/ionicons5/es/GitBranchOutline'
import axios from 'axios';

const router = useRouter();
const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);

const loadWorks = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/html-works/public', {
      params: { page: page.value, pageSize: pageSize.value }
    });
    works.value = response.data.works || [];
    total.value = response.data.pagination?.total || 0;
  } catch (error) {
    console.error('加载HTML作品失败:', error);
  } finally {
    loading.value = false;
  }
};

const getPreviewHtml = (work) => {
  return work.htmlCode || '';
};

const handleViewWork = (work) => {
  // 在新标签页打开作品
  window.open(`/view/${work.id}`, '_blank');
};

onMounted(() => {
  loadWorks();
});
</script>

<style scoped>
.public-html-works-tab {
  padding: 0;
}

.work-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
}

.work-card:hover {
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
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-desc {
  font-size: 13px;
  color: #666;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
