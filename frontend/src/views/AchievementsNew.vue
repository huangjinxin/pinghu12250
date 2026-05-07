<template>
  <div class="space-y-6">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card text-center">
        <div class="text-3xl font-bold text-primary-500">{{ stats.totalUnlocked }}</div>
        <div class="text-sm text-gray-500">已解锁</div>
        <div class="text-xs text-gray-400">/ {{ stats.totalAchievements }} 总数</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-amber-500">{{ stats.totalPoints }}</div>
        <div class="text-sm text-gray-500">成就积分</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl">{{ currentRank.icon }}</div>
        <div class="text-sm font-medium" :style="{ color: currentRank.color }">{{ currentRank.name }}</div>
        <div class="text-xs text-gray-400">当前段位</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-orange-500">{{ stats.currentStreak }}</div>
        <div class="text-sm text-gray-500">连续天数</div>
      </div>
    </div>

    <!-- 解锁进度 -->
    <div class="card">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600">成就解锁进度</span>
        <span class="text-sm font-medium text-primary-500">{{ progressPercent }}%</span>
      </div>
      <n-progress
        type="line"
        :percentage="progressPercent"
        :show-indicator="false"
        :height="8"
        :border-radius="4"
      />
    </div>

    <!-- 最近解锁 -->
    <div v-if="recentUnlocked.length > 0" class="card">
      <h3 class="font-medium text-gray-800 mb-4">最近解锁</h3>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <div
          v-for="achievement in recentUnlocked"
          :key="achievement.code"
          class="flex-shrink-0 w-24 text-center"
        >
          <div class="text-4xl mb-1">{{ achievement.emoji }}</div>
          <div class="text-xs font-medium text-gray-800 truncate">{{ achievement.name }}</div>
          <div class="text-xs text-gray-400">{{ formatDate(achievement.unlockedAt) }}</div>
        </div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="card">
      <div class="flex gap-2 overflow-x-auto pb-2">
        <n-tag
          v-for="cat in categories"
          :key="cat.key"
          :type="currentCategory === cat.key ? 'primary' : 'default'"
          :bordered="currentCategory !== cat.key"
          class="cursor-pointer flex-shrink-0"
          @click="currentCategory = cat.key"
        >
          {{ cat.icon }} {{ cat.name }}
        </n-tag>
      </div>
    </div>

    <!-- 成就列表 -->
    <div v-if="loading" class="card">
      <n-skeleton text :repeat="5" />
    </div>
    <template v-else>
      <!-- 已解锁 -->
      <div v-if="unlockedAchievements.length > 0" class="space-y-2">
        <h3 class="text-sm font-medium text-gray-500 px-1">已解锁 ({{ unlockedAchievements.length }})</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="achievement in unlockedAchievements"
            :key="achievement.code"
            class="achievement-card unlocked cursor-pointer"
            @click="handleAchievementClick(achievement)"
          >
            <div class="achievement-icon">{{ achievement.emoji }}</div>
            <div class="achievement-info">
              <div class="font-medium text-gray-800">{{ achievement.name }}</div>
              <div class="text-xs text-gray-500">{{ achievement.description }}</div>
              <div class="text-xs text-green-500 mt-1">
                +{{ achievement.rewardPoints }} 积分 · {{ formatDate(achievement.unlockedAt) }}
              </div>
            </div>
            <n-icon class="achievement-check" size="20" color="#10b981">
              <CheckmarkCircleOutline />
            </n-icon>
          </div>
        </div>
      </div>

      <!-- 未解锁 -->
      <div v-if="lockedAchievements.length > 0" class="space-y-2">
        <h3 class="text-sm font-medium text-gray-500 px-1">未解锁 ({{ lockedAchievements.length }})</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="achievement in lockedAchievements"
            :key="achievement.code"
            class="achievement-card locked cursor-pointer"
            @click="handleAchievementClick(achievement)"
          >
            <div class="achievement-icon grayscale opacity-50">{{ achievement.emoji }}</div>
            <div class="achievement-info">
              <div class="font-medium text-gray-400">{{ achievement.name }}</div>
              <div class="text-xs text-gray-400">{{ achievement.description }}</div>
              <div class="text-xs text-gray-400 mt-1">+{{ achievement.rewardPoints }} 积分</div>
              <n-progress
                v-if="achievement.progress > 0"
                type="line"
                :percentage="achievement.progress"
                :height="4"
                :show-indicator="false"
                class="mt-2"
              />
            </div>
            <n-icon class="achievement-lock" size="16" color="#9ca3af">
              <LockClosedOutline />
            </n-icon>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredAchievements.length === 0" class="card text-center py-12">
        <div class="text-4xl mb-2">🏆</div>
        <p class="text-gray-500">该分类暂无成就</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAchievements } from '@/composables/useAchievements';
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import LockClosedOutline from '@vicons/ionicons5/es/LockClosedOutline'

const router = useRouter();
const message = useMessage();
const {
  loading,
  stats,
  currentCategory,
  categories,
  unlockedAchievements,
  lockedAchievements,
  filteredAchievements,
  recentUnlocked,
  currentRank,
  progressPercent,
  loadAchievements,
} = useAchievements();

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const handleAchievementClick = (achievement) => {
  if (achievement.id) {
    router.push(`/achievements/${achievement.id}`);
  } else {
    message.info(`成就：${achievement.name}\n${achievement.description}`);
  }
};

onMounted(() => {
  loadAchievements();
});
</script>

<style scoped>
.achievement-card {
  @apply flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100;
  @apply transition-all duration-200;
}
.achievement-card.unlocked {
  @apply border-green-100 bg-green-50/30;
}
.achievement-card.locked {
  @apply bg-gray-50;
}
.achievement-icon {
  @apply text-3xl flex-shrink-0;
}
.achievement-info {
  @apply flex-1 min-w-0;
}
.achievement-check,
.achievement-lock {
  @apply flex-shrink-0;
}
</style>