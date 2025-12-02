<template>
  <div class="space-y-6">
    <!-- 顶部标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的游戏库</h1>
        <p class="text-gray-500 mt-1">管理你的游戏收藏和游玩记录</p>
      </div>
      <n-button @click="$router.push('/games')">
        <template #icon>
          <n-icon><ArrowBackOutline /></n-icon>
        </template>
        返回大厅
      </n-button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">全部游戏</div>
        <div class="text-2xl font-bold">{{ stats.total || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">想玩</div>
        <div class="text-2xl font-bold text-blue-500">{{ stats.wantToPlay || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">在玩</div>
        <div class="text-2xl font-bold text-yellow-500">{{ stats.playing || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-gray-500 mb-1">已通关</div>
        <div class="text-2xl font-bold text-green-500">{{ stats.completed || 0 }}</div>
      </div>
    </div>

    <!-- 筛选标签页 -->
    <n-tabs v-model:value="activeStatus" type="line" animated @update:value="handleStatusChange">
      <n-tab-pane name="all" tab="全部" />
      <n-tab-pane name="WANT_TO_PLAY" tab="想玩" />
      <n-tab-pane name="PLAYING" tab="在玩" />
      <n-tab-pane name="COMPLETED" tab="已通关" />
      <n-tab-pane name="DROPPED" tab="已放弃" />
    </n-tabs>

    <!-- 游戏列表 -->
    <n-spin :show="loading">
      <div v-if="records.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <div
          v-for="record in records"
          :key="record.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer"
          @click="$router.push(`/games/${record.game.id}`)"
        >
          <div class="flex gap-4">
            <!-- 游戏封面 -->
            <img
              v-if="record.game.coverUrl"
              :src="record.game.coverUrl"
              :alt="record.game.name"
              class="w-24 h-32 object-cover rounded"
            />
            <div v-else class="w-24 h-32 bg-gray-200 rounded flex items-center justify-center">
              <n-icon size="32" color="#999"><GameControllerOutline /></n-icon>
            </div>

            <!-- 游戏信息 -->
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-lg mb-2 line-clamp-2">{{ record.game.name }}</h3>

              <div class="space-y-2">
                <!-- 状态 -->
                <n-tag :type="getStatusType(record.status)" size="small">
                  {{ getStatusLabel(record.status) }}
                </n-tag>

                <!-- 游戏类型 -->
                <div class="text-sm text-gray-500">
                  <n-tag size="tiny" type="info">{{ record.game.gameType }}</n-tag>
                  <span class="ml-2">{{ record.game.platform }}</span>
                </div>

                <!-- 游玩时长 -->
                <div class="text-sm text-gray-600">
                  <n-icon><TimeOutline /></n-icon>
                  总时长：{{ formatPlayTime(record.totalPlayTime) }}
                </div>

                <!-- 我的评测数 -->
                <div class="text-sm text-gray-600">
                  <n-icon><ChatboxOutline /></n-icon>
                  我的评测：{{ record.myReviewCount || 0 }} 条
                </div>

                <!-- 平均评分 -->
                <div class="flex items-center gap-1 text-sm">
                  <n-rate :value="record.game.avgScore / 2" readonly size="tiny" />
                  <span class="text-gray-600">{{ record.game.avgScore?.toFixed(1) || '暂无' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 最后更新时间 -->
          <div class="mt-3 pt-3 border-t text-xs text-gray-400">
            最后更新：{{ formatTime(record.updatedAt) }}
          </div>
        </div>
      </div>
      <n-empty v-else description="还没有游戏记录，去游戏大厅找找喜欢的游戏吧！">
        <template #extra>
          <n-button type="primary" @click="$router.push('/games')">前往游戏大厅</n-button>
        </template>
      </n-empty>
    </n-spin>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center mt-6">
      <n-pagination
        v-model:page="currentPage"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="loadRecords"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { gameAPI } from '@/api';
import {
  ArrowBackOutline,
  GameControllerOutline,
  TimeOutline,
  ChatboxOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();

const activeStatus = ref('all');
const records = ref([]);
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(false);

const stats = reactive({
  total: 0,
  wantToPlay: 0,
  playing: 0,
  completed: 0,
  dropped: 0,
});

// 加载游戏库
const loadRecords = async () => {
  loading.value = true;
  try {
    const status = activeStatus.value === 'all' ? undefined : activeStatus.value;
    const data = await gameAPI.getMyLibrary({
      status,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    records.value = data.records || [];
    total.value = data.total || 0;
  } catch (error) {
    console.error('加载游戏库失败', error);
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    // 加载各状态的数量
    const allData = await gameAPI.getMyLibrary({ pageSize: 1 });
    stats.total = allData.total || 0;

    const wantData = await gameAPI.getMyLibrary({ status: 'WANT_TO_PLAY', pageSize: 1 });
    stats.wantToPlay = wantData.total || 0;

    const playingData = await gameAPI.getMyLibrary({ status: 'PLAYING', pageSize: 1 });
    stats.playing = playingData.total || 0;

    const completedData = await gameAPI.getMyLibrary({ status: 'COMPLETED', pageSize: 1 });
    stats.completed = completedData.total || 0;

    const droppedData = await gameAPI.getMyLibrary({ status: 'DROPPED', pageSize: 1 });
    stats.dropped = droppedData.total || 0;
  } catch (error) {
    console.error('加载统计失败', error);
  }
};

// 状态改变
const handleStatusChange = () => {
  currentPage.value = 1;
  loadRecords();
};

// 获取状态标签
const getStatusLabel = (status) => {
  const labels = {
    WANT_TO_PLAY: '想玩',
    PLAYING: '在玩',
    COMPLETED: '已通关',
    DROPPED: '已放弃',
  };
  return labels[status] || status;
};

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    WANT_TO_PLAY: 'info',
    PLAYING: 'warning',
    COMPLETED: 'success',
    DROPPED: 'default',
  };
  return types[status] || 'default';
};

// 格式化游玩时长
const formatPlayTime = (minutes) => {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
};

// 格式化时间
const formatTime = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

onMounted(() => {
  loadRecords();
  loadStats();
});
</script>
