<template>
  <div class="lb-charts">
    <div
      v-for="dim in dimensions"
      :key="dim.key"
      class="chart-card"
      :class="`theme-${dim.key}`"
    >
      <div class="chart-header" @click="$router.push(`/moments?tab=leaderboard&dimension=${dim.key}`)">
        <span class="chart-icon">{{ dim.icon }}</span>
        <span class="chart-title">{{ dim.label }}</span>
        <span class="chart-link">详情 →</span>
      </div>
      <div class="chart-body">
        <div v-if="!chartData[dim.key]?.length" class="chart-empty">暂无数据</div>
        <div v-else class="bar-list">
          <div v-for="(item, i) in chartData[dim.key]" :key="i" class="bar-row">
            <span class="bar-rank">{{ i + 1 }}</span>
            <span class="bar-name">{{ item.name }}</span>
            <div class="bar-track">
              <div
                class="bar-fill"
                :style="{ width: getPercent(dim.key, item.value) + '%' }"
              ></div>
            </div>
            <span class="bar-value">{{ item.value }}{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { feedAPI } from '@/api'

const dimensions = [
  { key: 'points', icon: '⭐', label: '积分排行' },
  { key: 'diary', icon: '📖', label: '日记字数' },
  { key: 'streak', icon: '🔥', label: '连续打卡' },
  { key: 'learning', icon: '📚', label: '学习任务' },
  { key: 'works', icon: '🎨', label: '作品数量' },
  { key: 'questions', icon: '❓', label: '提问互动' },
  { key: 'typing', icon: '⌨️', label: '打字最高分' },
  { key: 'pinyin', icon: '🔤', label: '拼音字数' },
]

const chartData = reactive({})
const maxValues = reactive({})

function getPercent(key, value) {
  const max = maxValues[key] || 1
  return Math.max(5, (value / max) * 100)
}

async function loadAll() {
  const results = await Promise.allSettled(
    dimensions.map(d =>
      feedAPI.getLeaderboard({ dimension: d.key, period: 'weekly', limit: 10 })
    )
  )
  dimensions.forEach((d, i) => {
    const res = results[i]
    if (res.status === 'fulfilled') {
      const list = (res.value.data?.leaderboard || []).map(item => ({
        name: item.user?.profile?.nickname || item.user?.username || '?',
        value: item.value || 0,
        label: item.label || '',
      }))
      chartData[d.key] = list
      maxValues[d.key] = list[0]?.value || 1
    } else {
      chartData[d.key] = []
    }
  })
}

onMounted(loadAll)
</script>

<style scoped>
.lb-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
}

.chart-header:hover { background: #f9fafb; }

.chart-icon { font-size: 18px; }

.chart-title {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.chart-link {
  font-size: 12px;
  color: #6366f1;
}

.chart-body { padding: 12px 16px; }

.chart-empty {
  text-align: center;
  padding: 20px;
  color: #d1d5db;
  font-size: 13px;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-rank {
  width: 18px;
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  text-align: center;
  flex-shrink: 0;
}

.bar-row:nth-child(1) .bar-rank { color: #f59e0b; }
.bar-row:nth-child(2) .bar-rank { color: #94a3b8; }
.bar-row:nth-child(3) .bar-rank { color: #b45309; }

.bar-name {
  width: 48px;
  font-size: 12px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 16px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

.bar-value {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  min-width: 40px;
  text-align: right;
  flex-shrink: 0;
}

/* 主题色 */
.theme-points .bar-fill { background: linear-gradient(90deg, #818cf8, #6366f1); }
.theme-diary .bar-fill { background: linear-gradient(90deg, #c084fc, #a855f7); }
.theme-streak .bar-fill { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.theme-learning .bar-fill { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
.theme-works .bar-fill { background: linear-gradient(90deg, #34d399, #10b981); }
.theme-questions .bar-fill { background: linear-gradient(90deg, #f472b6, #ec4899); }
.theme-typing .bar-fill { background: linear-gradient(90deg, #818cf8, #4f46e5); }
.theme-pinyin .bar-fill { background: linear-gradient(90deg, #38bdf8, #0ea5e9); }

.theme-points .chart-header { border-left: 4px solid #6366f1; }
.theme-diary .chart-header { border-left: 4px solid #a855f7; }
.theme-streak .chart-header { border-left: 4px solid #f59e0b; }
.theme-learning .chart-header { border-left: 4px solid #3b82f6; }
.theme-works .chart-header { border-left: 4px solid #10b981; }
.theme-questions .chart-header { border-left: 4px solid #ec4899; }
.theme-typing .chart-header { border-left: 4px solid #4f46e5; }
.theme-pinyin .chart-header { border-left: 4px solid #0ea5e9; }

@media (max-width: 768px) {
  .lb-charts { grid-template-columns: 1fr; }
}
</style>
