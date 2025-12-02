<template>
  <div class="space-y-6">
    <!-- 搜索栏 -->
    <div class="card">
      <div class="flex gap-2">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索游戏名称..."
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button type="primary" @click="handleSearch" :loading="loading">搜索</n-button>
      </div>
    </div>

    <!-- 顶部分页 -->
    <div v-if="!loading && total > pageSize" class="card">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-sm text-gray-600">
          共 <span class="font-semibold text-primary-600">{{ total }}</span> 个游戏，
          当前第 <span class="font-semibold text-primary-600">{{ page }}</span> 页，
          共 <span class="font-semibold text-primary-600">{{ Math.ceil(total / pageSize) }}</span> 页
        </div>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[9, 18, 27, 36]"
          show-quick-jumper
          @update:page="loadGames"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>
            <n-button size="small" @click="goToFirstPage" :disabled="page === 1">首页</n-button>
          </template>
          <template #suffix>
            <n-button size="small" @click="goToLastPage" :disabled="page === Math.ceil(total / pageSize)">尾页</n-button>
          </template>
        </n-pagination>
      </div>
    </div>

    <!-- 游戏列表 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 9" :key="i" height="300px" :sharp="false" />
    </div>

    <n-empty v-else-if="!games.length" description="还没有任何游戏，请联系管理员添加" />

    <div v-else>
      <h2 v-if="searchQuery" class="text-lg font-bold mb-4">搜索结果</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="game in games"
          :key="game.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer"
          @click="selectGame(game)"
        >
          <img
            v-if="game.coverImage"
            :src="game.coverImage"
            :alt="game.name"
            class="w-full h-48 object-cover rounded-t-lg"
          />
          <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg flex items-center justify-center">
            <n-icon size="48" color="#999"><GameControllerOutline /></n-icon>
          </div>

          <div class="p-4">
            <h3 class="font-bold text-lg mb-2">{{ game.name }}</h3>
            <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ game.description || '暂无描述' }}</p>

            <div class="flex flex-wrap gap-1 mb-3">
              <n-tag v-for="genre in game.genres.slice(0, 3)" :key="genre" size="small" type="info">
                {{ genre }}
              </n-tag>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-500">
              <span v-if="game.releaseDate">{{ formatDate(game.releaseDate) }}</span>
              <div class="flex items-center gap-2">
                <span>{{ game._count.records }} 条记录</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部分页 -->
    <div v-if="!loading && total > pageSize" class="card">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-sm text-gray-600">
          共 <span class="font-semibold text-primary-600">{{ total }}</span> 个游戏，
          当前第 <span class="font-semibold text-primary-600">{{ page }}</span> 页，
          共 <span class="font-semibold text-primary-600">{{ Math.ceil(total / pageSize) }}</span> 页
        </div>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[9, 18, 27, 36]"
          show-quick-jumper
          @update:page="loadGames"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>
            <n-button size="small" @click="goToFirstPage" :disabled="page === 1">首页</n-button>
          </template>
          <template #suffix>
            <n-button size="small" @click="goToLastPage" :disabled="page === Math.ceil(total / pageSize)">尾页</n-button>
          </template>
        </n-pagination>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import { SearchOutline, GameControllerOutline } from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const searchQuery = ref('');
const games = ref([]);
const page = ref(1);
const pageSize = ref(9); // 每页显示数量（默认9个，3x3布局）
const total = ref(0);
const loading = ref(false);

const handleSearch = () => {
  // 搜索时重置到第一页
  page.value = 1;
  loadGames();
};

const goToFirstPage = () => {
  page.value = 1;
  loadGames();
};

const goToLastPage = () => {
  page.value = Math.ceil(total.value / pageSize.value);
  loadGames();
};

const handlePageSizeChange = (newPageSize) => {
  pageSize.value = newPageSize;
  page.value = 1; // 改变每页数量时重置到第一页
  loadGames();
};

const loadGames = async () => {
  loading.value = true;
  // 滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    };

    // 如果有搜索关键词，添加到参数中
    if (searchQuery.value && searchQuery.value.trim()) {
      params.q = searchQuery.value.trim();
    }

    const { results, total: totalCount } = await gameAPI.searchGames(params);
    games.value = results || [];
    total.value = totalCount || 0;
  } catch (error) {
    message.error('加载游戏失败');
    console.error('加载游戏失败:', error);
  } finally {
    loading.value = false;
  }
};

const selectGame = (game) => {
  router.push(`/games/${game.id}`);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
};

onMounted(() => {
  loadGames(); // 初始加载所有游戏
});
</script>
