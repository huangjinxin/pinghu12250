<template>
  <div class="diary-game-stats-panel">
    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-3">
      <n-spin size="small" />
    </div>

    <!-- 统计卡片 - 紧凑两行布局 -->
    <div v-else-if="stats" class="stats-content">
      <!-- 第一行：连续打卡 + 本周进度 -->
      <div class="flex items-center gap-4 mb-3">
        <!-- 连续打卡 -->
        <div class="stat-item">
          <div class="stat-icon" :style="{ background: stats.rankInfo?.color || '#CD7F32' }">
            🔥
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.currentStreak }}天</div>
            <div class="stat-label">连续打卡</div>
          </div>
        </div>

        <!-- 本周进度 -->
        <div class="flex-1 flex items-center gap-2">
          <div class="week-dots flex gap-1">
            <div
              v-for="(day, index) in weekDays"
              :key="index"
              class="week-dot"
              :class="getDayClass(day)"
              :title="day.label"
            />
          </div>
          <span class="text-xs text-gray-500 whitespace-nowrap">
            {{ stats.weekDays?.filter(d => d.hasDiary).length || 0 }}/7
          </span>
        </div>

        <!-- 段位 -->
        <div class="stat-item">
          <div class="stat-icon-plain">{{ stats.rankInfo?.emoji || '🥉' }}</div>
          <div class="stat-info">
            <div class="stat-value" :style="{ color: stats.rankInfo?.color }">{{ stats.rankInfo?.name || '青铜' }}</div>
            <div class="stat-label">当前段位</div>
          </div>
        </div>
      </div>

      <!-- 第二行：成就 + 累计字数 + 升级提示 -->
      <div class="flex items-center gap-4">
        <!-- 成就 -->
        <div class="stat-item clickable" @click="$emit('view-achievements')">
          <div class="stat-icon-plain">🏆</div>
          <div class="stat-info">
            <div class="stat-value">{{ achievementStats?.unlocked || 0 }}/{{ achievementStats?.total || 0 }}</div>
            <div class="stat-label">成就</div>
          </div>
        </div>

        <!-- 累计字数 -->
        <div class="stat-item">
          <div class="stat-icon-plain">✍️</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatWordCount(stats.totalWords) }}</div>
            <div class="stat-label">累计字数</div>
          </div>
        </div>

        <!-- 升级提示 -->
        <div v-if="stats.nextRankInfo" class="flex-1 flex justify-end">
          <span class="upgrade-hint text-xs">
            再坚持 <strong class="text-amber-600">{{ stats.nextRankInfo.daysNeeded }}</strong> 天升级
            <span class="ml-1">{{ stats.nextRankInfo.emoji }} {{ stats.nextRankInfo.name }}</span>
          </span>
        </div>

        <!-- 补签卡（如果有） -->
        <div v-if="makeupCardInfo?.availableCount" class="stat-item">
          <div class="stat-icon-plain">🎫</div>
          <div class="stat-info">
            <div class="stat-value">{{ makeupCardInfo.availableCount }}</div>
            <div class="stat-label">补签卡</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据 -->
    <div v-else class="text-center py-3 text-gray-400 text-sm">
      开始写日记，开启成长之旅
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { diaryGameAPI } from '@/api'

const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view-achievements'])

const loading = ref(true)
const stats = ref(null)
const achievementStats = ref(null)
const makeupCardInfo = ref(null)

// 本周日期
const weekDays = computed(() => {
  if (!stats.value?.weekDays) {
    const days = ['一', '二', '三', '四', '五', '六', '日']
    return days.map((short, index) => ({
      short,
      label: `周${short}`,
      hasDiary: false,
      isToday: false,
      isFuture: false
    }))
  }
  return stats.value.weekDays
})

// 获取日期点样式
const getDayClass = (day) => {
  if (day.hasDiary) return 'dot-done'
  if (day.isToday) return 'dot-today'
  if (day.isFuture) return 'dot-future'
  return 'dot-missed'
}

// 格式化字数
const formatWordCount = (count) => {
  if (!count) return '0'
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const res = await diaryGameAPI.getOverview()
    if (res.success) {
      stats.value = res.data.stats
      achievementStats.value = res.data.achievements
    }
  } catch (error) {
    console.error('[DiaryGameStats] 加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refresh = () => loadData()

defineExpose({ refresh })

onMounted(() => loadData())
</script>

<style scoped>
.diary-game-stats-panel {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-item.clickable {
  cursor: pointer;
}

.stat-item.clickable:hover .stat-value {
  color: var(--primary-color);
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.stat-icon-plain {
  font-size: 20px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: #9ca3af;
}

/* 本周进度点 */
.week-dot {
  width: 20px;
  height: 6px;
  border-radius: 3px;
  transition: all 0.2s;
}

.dot-done {
  background: #22c55e;
}

.dot-today {
  background: #3b82f6;
  box-shadow: 0 0 0 2px #bfdbfe;
}

.dot-missed {
  background: #e5e7eb;
}

.dot-future {
  background: #f3f4f6;
}

/* 升级提示 */
.upgrade-hint {
  display: inline-block;
  padding: 4px 10px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 6px;
  color: #92400e;
  white-space: nowrap;
}
</style>
