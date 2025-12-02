<template>
  <div class="space-y-6">
    <!-- 标签信息 -->
    <div v-if="tagInfo" class="card">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <n-button circle @click="$router.back()">
            <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
          </n-button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-gray-800">#{{ tagInfo.name }}</h1>
              <n-tag :type="getCategoryType(tagInfo.category)" size="small">
                {{ getCategoryText(tagInfo.category) }}
              </n-tag>
            </div>
            <p class="text-gray-500 mt-1">{{ tagInfo.usageCount || 0 }} 次使用</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容类型Tab -->
    <n-tabs v-model:value="contentType" type="line" animated @update:value="loadContents">
      <n-tab-pane name="all" tab="全部" />
      <n-tab-pane name="works" tab="作品" />
      <n-tab-pane name="diaries" tab="日记" />
      <n-tab-pane name="notes" tab="笔记" />
      <n-tab-pane name="books" tab="读书" />
    </n-tabs>

    <!-- 内容列表 -->
    <n-spin :show="loading">
      <div v-if="contents.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ContentCard
          v-for="content in contents"
          :key="content.id"
          :content="content"
          @click="handleContentClick(content)"
        />
      </div>

      <n-empty v-else description="暂无相关内容" class="py-12" />
    </n-spin>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="loadContents"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import { ArrowBackOutline } from '@vicons/ionicons5';
import ContentCard from '@/components/ContentCard.vue';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const tagName = ref(route.params.tagName);
const tagInfo = ref(null);
const contentType = ref('all');
const contents = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);

// 加载标签信息
const loadTagInfo = async () => {
  try {
    const response = await api.get(`/tags/${tagName.value}`);
    tagInfo.value = response.tag;
  } catch (error) {
    console.error('加载标签信息失败:', error);
    message.error(error.error || '加载标签信息失败');
  }
};

// 加载内容列表
const loadContents = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize.value,
    };
    if (contentType.value !== 'all') {
      params.type = contentType.value;
    }

    const response = await api.get(`/tags/${tagName.value}/contents`, { params });
    contents.value = response.contents || [];
    total.value = response.total || 0;
  } catch (error) {
    console.error('加载内容失败:', error);
    message.error(error.error || '加载内容失败');
  } finally {
    loading.value = false;
  }
};

// 处理内容点击
const handleContentClick = (content) => {
  const routes = {
    work: `/works/${content.id}`,
    diary: `/diaries/${content.id}`,
    note: `/notes/${content.id}`,
    book: `/books/${content.id}`,
  };
  const path = routes[content.type];
  if (path) {
    router.push(path);
  }
};

// 分类相关
const getCategoryType = (category) => {
  const types = {
    learning: 'info',
    creative: 'success',
    life: 'warning',
    game: 'error',
  };
  return types[category] || 'default';
};

const getCategoryText = (category) => {
  const texts = {
    learning: '学习',
    creative: '创作',
    life: '生活',
    game: '游戏',
  };
  return texts[category] || category;
};

onMounted(() => {
  loadTagInfo();
  loadContents();
});
</script>
