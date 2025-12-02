<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">挑战历史</h1>
        <p class="text-gray-500 mt-1">查看你的历史挑战记录</p>
      </div>
      <n-button @click="$router.back()">
        <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        返回
      </n-button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <n-card class="stat-card">
        <n-statistic label="总完成数" :value="stats.totalCompleted">
          <template #prefix>
            <n-icon size="24" color="#10b981"><CheckmarkCircleOutline /></n-icon>
          </template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card">
        <n-statistic label="连续完成天数" :value="stats.currentStreak">
          <template #prefix>
            <n-icon size="24" color="#f59e0b"><FlameOutline /></n-icon>
          </template>
          <template #suffix>天</template>
        </n-statistic>
      </n-card>
      <n-card class="stat-card">
        <n-statistic label="获得积分" :value="stats.totalPoints">
          <template #prefix>
            <n-icon size="24" color="#3b82f6"><TrophyOutline /></n-icon>
          </template>
        </n-statistic>
      </n-card>
    </div>

    <!-- 筛选器 -->
    <n-card>
      <n-space>
        <n-select
          v-model:value="filter.difficulty"
          :options="difficultyOptions"
          placeholder="难度"
          clearable
          style="width: 120px"
          @update:value="loadHistory"
        />
        <n-select
          v-model:value="filter.status"
          :options="statusOptions"
          placeholder="状态"
          clearable
          style="width: 120px"
          @update:value="loadHistory"
        />
      </n-space>
    </n-card>

    <!-- 历史记录列表 -->
    <n-spin :show="loading">
      <div v-if="history.length > 0" class="space-y-3">
        <n-card
          v-for="record in history"
          :key="record.id"
          size="small"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-medium text-gray-800">{{ record.challenge.title }}</h3>
                <n-tag
                  :type="getDifficultyTagType(record.challenge.difficulty)"
                  size="small"
                >
                  {{ getDifficultyText(record.challenge.difficulty) }}
                </n-tag>
                <n-tag
                  v-if="record.status === 'completed'"
                  type="success"
                  size="small"
                >
                  已完成
                </n-tag>
                <n-tag
                  v-else
                  type="default"
                  size="small"
                >
                  未完成
                </n-tag>
              </div>

              <p class="text-sm text-gray-600 mb-2">{{ record.challenge.description }}</p>

              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span>日期: {{ formatDate(record.date) }}</span>
                <span>进度: {{ record.currentProgress }} / {{ record.challenge.targetCount }}</span>
                <span v-if="record.claimedAt">领取时间: {{ formatTime(record.claimedAt) }}</span>
              </div>
            </div>

            <div v-if="record.status === 'completed'" class="flex items-center gap-3 text-sm">
              <div class="flex items-center gap-1">
                <n-icon size="16" color="#3b82f6"><TrophyOutline /></n-icon>
                <span>+{{ record.challenge.pointsReward }} 积分</span>
              </div>
            </div>
          </div>
        </n-card>
      </div>

      <n-empty v-else description="暂无历史记录" class="py-12" />
    </n-spin>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        @update:page="loadHistory"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/api';
import {
  ArrowBackOutline,
  CheckmarkCircleOutline,
  FlameOutline,
  TrophyOutline,
  LogoUsd,
} from '@vicons/ionicons5';

const message = useMessage();

const loading = ref(false);
const history = ref([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const stats = reactive({
  totalCompleted: 0,
  currentStreak: 0,
  totalPoints: 0,
  totalCoins: 0,
});

const filter = reactive({
  difficulty: null,
  status: null,
});

const difficultyOptions = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' },
];

const statusOptions = [
  { label: '已完成', value: 'completed' },
  { label: '未完成', value: 'active' },
];

// 加载历史记录
const loadHistory = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize.value,
    };
    if (filter.difficulty) params.difficulty = filter.difficulty;
    if (filter.status) params.status = filter.status;

    const response = await api.get('/challenges/history', { params });
    history.value = response.history || [];
    total.value = response.total || 0;

    // 加载统计数据
    if (response.stats) {
      Object.assign(stats, response.stats);
    }
  } catch (error) {
    console.error('加载历史失败:', error);
    message.error(error.error || '加载历史失败');
  } finally {
    loading.value = false;
  }
};

// 难度标签类型
const getDifficultyTagType = (difficulty) => {
  const types = {
    easy: 'success',
    medium: 'warning',
    hard: 'error',
  };
  return types[difficulty] || 'default';
};

const getDifficultyText = (difficulty) => {
  const texts = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return texts[difficulty] || difficulty;
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.stat-card {
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
