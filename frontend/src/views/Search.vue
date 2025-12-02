<template>
  <div class="space-y-6">
    <!-- 搜索框 -->
    <div class="card">
      <div class="flex items-center space-x-4">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索日记、作品、笔记、作业..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button type="primary" size="large" @click="handleSearch" :loading="loading">
          搜索
        </n-button>
      </div>

      <!-- 筛选 -->
      <div class="flex items-center space-x-4 mt-4">
        <span class="text-sm text-gray-500">类型筛选：</span>
        <n-radio-group v-model:value="filterType" @update:value="handleSearch">
          <n-radio-button value="">全部</n-radio-button>
          <n-radio-button value="diary">日记</n-radio-button>
          <n-radio-button value="work">作品</n-radio-button>
          <n-radio-button value="note">笔记</n-radio-button>
          <n-radio-button value="readingNote">读书笔记</n-radio-button>
          <n-radio-button value="homework">作业</n-radio-button>
        </n-radio-group>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">
          搜索结果
          <span v-if="results.length" class="text-sm font-normal text-gray-500">
            (找到 {{ total }} 条)
          </span>
        </h2>
      </div>

      <n-skeleton v-if="loading" text :repeat="5" />

      <n-empty v-else-if="results.length === 0" description="未找到相关内容">
        <template #extra>
          <p class="text-sm text-gray-500">尝试使用其他关键词搜索</p>
        </template>
      </n-empty>

      <div v-else class="space-y-3">
        <div
          v-for="item in results"
          :key="`${item.type}-${item.id}`"
          class="card hover:shadow-md transition-shadow cursor-pointer"
          @click="goToResult(item)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <n-tag :type="getTagType(item.type)" size="small">
                  {{ item.typeName }}
                </n-tag>
                <h3 class="font-medium text-gray-800">{{ item.title }}</h3>
              </div>
              <p v-if="item.excerpt" class="text-sm text-gray-600 line-clamp-2">
                {{ item.excerpt }}
              </p>
              <div class="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                <span v-if="item.author">作者：{{ item.author }}</span>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
            <n-icon size="20" class="text-gray-400">
              <ChevronForwardOutline />
            </n-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 初始状态 -->
    <div v-else class="text-center py-12">
      <n-icon size="48" class="text-gray-300 mb-4">
        <SearchOutline />
      </n-icon>
      <p class="text-gray-500">输入关键词开始搜索</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchAPI } from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { SearchOutline, ChevronForwardOutline } from '@vicons/ionicons5';

const route = useRoute();
const router = useRouter();

const searchQuery = ref('');
const filterType = ref('');
const results = ref([]);
const total = ref(0);
const loading = ref(false);
const hasSearched = ref(false);

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

const getTagType = (type) => {
  const types = {
    diary: 'info',
    work: 'success',
    note: 'warning',
    readingNote: 'info',
    homework: 'error',
  };
  return types[type] || 'default';
};

const handleSearch = async () => {
  if (!searchQuery.value || searchQuery.value.trim().length < 2) {
    return;
  }

  loading.value = true;
  hasSearched.value = true;

  try {
    const params = { q: searchQuery.value.trim() };
    if (filterType.value) {
      params.type = filterType.value;
    }

    const data = await searchAPI.search(params);
    results.value = data.results || [];
    total.value = data.total || 0;
  } catch (error) {
    console.error('搜索失败:', error);
  } finally {
    loading.value = false;
  }
};

const goToResult = (item) => {
  router.push(item.url);
};

onMounted(() => {
  // 从URL获取搜索参数
  const q = route.query.q;
  if (q) {
    searchQuery.value = q;
    handleSearch();
  }
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
