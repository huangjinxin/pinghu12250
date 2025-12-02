<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">游戏大厅</h1>
        <p class="text-gray-500 mt-1">探索游戏，分享你的游玩体验</p>
      </div>
      <div class="flex gap-2">
        <n-button @click="$router.push('/games/search')">
          <template #icon><n-icon><SearchOutline /></n-icon></template>
          搜索游戏
        </n-button>
        <n-button type="primary" @click="$router.push('/games/library')">
          <template #icon><n-icon><GameControllerOutline /></n-icon></template>
          我的游戏库
        </n-button>
      </div>
    </div>

    <!-- Tabs -->
    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 最新记录 -->
      <n-tab-pane name="feed" tab="最新记录">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="record in feedRecords"
            :key="record.id"
            class="card hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToRecord(record.id)"
          >
            <img
              v-if="record.screenshots?.length"
              :src="record.screenshots[0].url"
              :alt="record.game.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
            <div v-else class="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-t-lg flex items-center justify-center">
              <n-icon size="64" color="#fff"><GameControllerOutline /></n-icon>
            </div>

            <div class="p-4">
              <h3 class="font-bold text-lg mb-2">{{ record.game.name }}</h3>
              <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ record.content }}</p>

              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <img :src="record.user.avatar" :alt="record.user.username" class="w-8 h-8 rounded-full" />
                  <span class="text-sm text-gray-700">{{ record.user.username }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <n-icon color="#fbbf24"><StarOutline /></n-icon>
                  <span class="text-sm font-medium">{{ record.rating }}/10</span>
                </div>
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

        <div class="flex justify-center mt-6">
          <n-pagination
            v-model:page="feedPage"
            :page-count="feedTotalPages"
            @update:page="loadFeed"
          />
        </div>
      </n-tab-pane>

      <!-- 热门游戏 -->
      <n-tab-pane name="hot" tab="热门游戏">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div
            v-for="game in hotGames"
            :key="game.id"
            class="card hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToGame(game.id)"
          >
            <img
              v-if="game.coverImage"
              :src="game.coverImage"
              :alt="game.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
            <div v-else class="w-full h-48 bg-gray-300 rounded-t-lg"></div>

            <div class="p-3">
              <h3 class="font-medium text-sm mb-2 line-clamp-2">{{ game.name }}</h3>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ game._count.records }} 条记录</span>
                <span>{{ game._count.favorites }} 收藏</span>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- 游戏类型 -->
      <n-tab-pane name="genres" tab="游戏类型">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div
            v-for="genre in genres"
            :key="genre.name"
            class="card hover:shadow-lg transition-shadow cursor-pointer text-center p-4"
            @click="searchByGenre(genre.name)"
          >
            <h3 class="font-medium text-gray-800 mb-1">{{ genre.name }}</h3>
            <p class="text-sm text-gray-500">{{ genre.count }} 条记录</p>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import {
  GameControllerOutline,
  SearchOutline,
  StarOutline,
  HeartOutline,
  ChatboxOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const activeTab = ref('feed');
const feedRecords = ref([]);
const feedPage = ref(1);
const feedTotalPages = ref(1);
const hotGames = ref([]);
const genres = ref([]);

const loadFeed = async () => {
  try {
    const { records, total } = await gameAPI.getRecordFeed({ page: feedPage.value, pageSize: 12 });
    feedRecords.value = records;
    feedTotalPages.value = Math.ceil(total / 12);
  } catch (error) {
    message.error('加载失败');
  }
};

const loadHotGames = async () => {
  try {
    hotGames.value = await gameAPI.getHotGames({ limit: 20 });
  } catch (error) {
    message.error('加载热门游戏失败');
  }
};

const loadGenres = async () => {
  try {
    genres.value = await gameAPI.getGenreStats();
  } catch (error) {
    message.error('加载类型统计失败');
  }
};

const goToRecord = (id) => {
  router.push(`/games/records/${id}`);
};

const goToGame = (id) => {
  router.push(`/games/${id}`);
};

const searchByGenre = (genre) => {
  router.push({ path: '/games/search', query: { genre } });
};

onMounted(() => {
  loadFeed();
  loadHotGames();
  loadGenres();
});
</script>
