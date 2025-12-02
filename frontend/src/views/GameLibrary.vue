<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">我的游戏库</h1>
      <p class="text-gray-500 mt-1">管理你的游戏收藏和记录</p>
    </div>

    <!-- Tabs -->
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 我的记录 -->
      <n-tab-pane name="records" tab="我的记录">
        <div class="mb-4">
          <n-select v-model:value="statusFilter" :options="statusOptions" placeholder="筛选状态" style="width: 200px" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="record in myRecords"
            :key="record.id"
            class="card hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToRecord(record.id)"
          >
            <img
              v-if="record.game.coverImage"
              :src="record.game.coverImage"
              :alt="record.game.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
            <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg"></div>

            <div class="p-4">
              <h3 class="font-bold text-lg mb-2">{{ record.game.name }}</h3>
              <div class="flex flex-wrap gap-1 mb-3">
                <n-tag v-for="genre in record.game.genres.slice(0, 2)" :key="genre" size="small" type="info">
                  {{ genre }}
                </n-tag>
              </div>

              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-1">
                  <n-icon color="#fbbf24"><StarOutline /></n-icon>
                  <span class="font-medium">{{ record.rating }}/10</span>
                </div>
                <n-tag :type="getStatusType(record.status)" size="small">
                  {{ getStatusLabel(record.status) }}
                </n-tag>
              </div>

              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span class="flex items-center gap-1">
                  <n-icon><HeartOutline /></n-icon>
                  {{ record._count.likes }}
                </span>
                <span class="flex items-center gap-1">
                  <n-icon><ChatboxOutline /></n-icon>
                  {{ record._count.comments }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <n-empty v-if="myRecords.length === 0" description="暂无记录" />

        <div class="flex justify-center mt-6" v-if="recordTotalPages > 1">
          <n-pagination v-model:page="recordPage" :page-count="recordTotalPages" @update:page="loadMyRecords" />
        </div>
      </n-tab-pane>

      <!-- 收藏的游戏 -->
      <n-tab-pane name="favorites" tab="收藏的游戏">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div
            v-for="favorite in favorites"
            :key="favorite.id"
            class="card hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToGame(favorite.game.id)"
          >
            <img
              v-if="favorite.game.coverImage"
              :src="favorite.game.coverImage"
              :alt="favorite.game.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
            <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg"></div>

            <div class="p-3">
              <h3 class="font-medium text-sm mb-2 line-clamp-2">{{ favorite.game.name }}</h3>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ favorite.game._count.records }} 条记录</span>
              </div>
            </div>
          </div>
        </div>

        <n-empty v-if="favorites.length === 0" description="暂无收藏" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import { StarOutline, HeartOutline, ChatboxOutline } from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const activeTab = ref('records');
const statusFilter = ref(null);
const myRecords = ref([]);
const favorites = ref([]);
const recordPage = ref(1);
const recordTotalPages = ref(1);

const statusOptions = [
  { label: '全部', value: null },
  { label: '想玩', value: 'WANT_TO_PLAY' },
  { label: '在玩', value: 'PLAYING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已放弃', value: 'DROPPED' },
];

const statusLabels = {
  WANT_TO_PLAY: '想玩',
  PLAYING: '在玩',
  COMPLETED: '已完成',
  DROPPED: '已放弃',
};

const getStatusLabel = (status) => statusLabels[status] || status;

const getStatusType = (status) => {
  const types = {
    WANT_TO_PLAY: 'info',
    PLAYING: 'warning',
    COMPLETED: 'success',
    DROPPED: 'default',
  };
  return types[status] || 'default';
};

const loadMyRecords = async () => {
  try {
    const { records, total } = await gameAPI.getMyLibrary({
      status: statusFilter.value,
      page: recordPage.value,
      pageSize: 12,
    });
    myRecords.value = records;
    recordTotalPages.value = Math.ceil(total / 12);
  } catch (error) {
    message.error('加载失败');
  }
};

const loadFavorites = async () => {
  try {
    favorites.value = await gameAPI.getFavorites();
  } catch (error) {
    message.error('加载收藏失败');
  }
};

const goToRecord = (id) => {
  router.push(`/games/records/${id}`);
};

const goToGame = (id) => {
  router.push(`/games/${id}`);
};

watch(statusFilter, () => {
  recordPage.value = 1;
  loadMyRecords();
});

watch(activeTab, (newTab) => {
  if (newTab === 'favorites') {
    loadFavorites();
  }
});

onMounted(() => {
  loadMyRecords();
});
</script>
