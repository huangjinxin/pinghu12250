<template>
  <div class="public-gallery-tab">
    <!-- 作品列表 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 6" :key="i" height="280px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="暂无画廊作品" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="work-card"
        @click="handleViewDetail(work)"
      >
        <!-- 图片预览 -->
        <div class="image-container">
          <n-image
            :src="work.image"
            object-fit="cover"
            class="w-full h-full"
            :img-props="{ style: 'width: 100%; height: 100%; object-fit: cover;' }"
            preview-disabled
          />
        </div>

        <!-- 作品信息 -->
        <div class="info-section">
          <div class="author-row">
            <span class="author-name">{{ work.author?.nickname || work.author?.username }}</span>
            <n-tag v-if="work.template?.type?.name" type="info" size="small">
              {{ work.template?.type?.name }}
            </n-tag>
          </div>
          <p v-if="work.content" class="content-text">{{ work.content }}</p>
          <span class="create-time">{{ formatDate(work.createdAt) }}</span>
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

    <!-- 作品详情对话框 -->
    <n-modal
      v-model:show="showDetailDialog"
      preset="card"
      title="作品详情"
      style="width: 600px; max-width: 90vw;"
    >
      <div v-if="selectedWork" class="space-y-4">
        <div class="flex justify-center">
          <n-image
            :src="selectedWork.image"
            :width="500"
            object-fit="contain"
            style="max-height: 400px; border-radius: 8px;"
          />
        </div>
        <div class="p-3 bg-gray-50 rounded-lg">
          <div class="font-medium text-gray-800">
            {{ selectedWork.author?.nickname || selectedWork.author?.username }}
          </div>
          <div class="text-sm text-gray-500">{{ formatDate(selectedWork.createdAt) }}</div>
        </div>
        <div v-if="selectedWork.content" class="text-gray-600">
          {{ selectedWork.content }}
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);

const showDetailDialog = ref(false);
const selectedWork = ref(null);

const loadWorks = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/gallery/public', {
      params: { page: page.value, pageSize: pageSize.value }
    });
    works.value = response.data.works || [];
    total.value = response.data.pagination?.total || 0;
  } catch (error) {
    console.error('加载画廊作品失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleViewDetail = (work) => {
  selectedWork.value = work;
  showDetailDialog.value = true;
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
.public-gallery-tab {
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

.image-container {
  height: 200px;
  background: #f5f5f5;
  overflow: hidden;
}

.info-section {
  padding: 12px 16px;
}

.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.content-text {
  font-size: 13px;
  color: #666;
  margin: 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.create-time {
  font-size: 12px;
  color: #999;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
