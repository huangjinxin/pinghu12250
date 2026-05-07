<template>
  <div class="writing-analysis">
    <n-spin :show="loading">
      <!-- 时间范围选择 -->
      <div class="time-filter">
        <n-radio-group v-model:value="days" size="small" @update:value="loadData">
          <n-radio-button :value="7">7天</n-radio-button>
          <n-radio-button :value="14">14天</n-radio-button>
          <n-radio-button :value="30">30天</n-radio-button>
          <n-radio-button :value="90">90天</n-radio-button>
        </n-radio-group>
      </div>

      <!-- 总览卡片 -->
      <div class="overview-cards">
        <n-grid :cols="4" :x-gap="12" :y-gap="12">
          <n-gi v-for="card in overviewCards" :key="card.key">
            <n-card size="small" :bordered="true">
              <div class="overview-card">
                <div class="card-icon">{{ card.icon }}</div>
                <div class="card-value">{{ card.value }}</div>
                <div class="card-label">{{ card.label }}</div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- 极值统计 -->
      <div class="extreme-section">
        <n-card title="最佳记录" size="small">
          <n-grid :cols="3" :x-gap="12">
            <n-gi>
              <div class="extreme-item">
                <div class="extreme-label">单次最多字数</div>
                <div class="extreme-value">{{ data?.overview?.maxCharsPerWork || 0 }}</div>
                <div class="extreme-unit">字/次</div>
              </div>
            </n-gi>
            <n-gi>
              <div class="extreme-item">
                <div class="extreme-label">单次最多笔画</div>
                <div class="extreme-value">{{ data?.overview?.maxStrokesPerWork || 0 }}</div>
                <div class="extreme-unit">笔/次</div>
              </div>
            </n-gi>
            <n-gi>
              <div class="extreme-item">
                <div class="extreme-label">最高评分</div>
                <div class="extreme-value">{{ data?.overview?.bestScore ?? '-' }}</div>
                <div class="extreme-unit">分</div>
              </div>
            </n-gi>
          </n-grid>
        </n-card>
      </div>

      <!-- 趋势图 -->
      <div class="chart-section">
        <n-card title="每日趋势" size="small">
          <div ref="trendChartRef" class="chart-container"></div>
        </n-card>
      </div>

      <!-- 分布图表 -->
      <n-grid :cols="2" :x-gap="12" :y-gap="12">
        <n-gi>
          <n-card title="字数分布" size="small">
            <div ref="charDistChartRef" class="chart-container-sm"></div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="评分分布" size="small">
            <div ref="scoreDistChartRef" class="chart-container-sm"></div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 练习频率 -->
      <div class="chart-section">
        <n-card title="练习频率（按星期）" size="small">
          <div ref="weekDayChartRef" class="chart-container"></div>
        </n-card>
      </div>

      <n-empty v-if="!loading && !data" description="暂无书写数据，开始你的第一次练习吧" />
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as echarts from 'echarts'
import { calligraphyListAPI } from '@/api/index'

const message = useMessage()
const loading = ref(true)
const days = ref(30)
const data = ref(null)

const trendChartRef = ref(null)
const charDistChartRef = ref(null)
const scoreDistChartRef = ref(null)
const weekDayChartRef = ref(null)

let trendChart = null
let charDistChart = null
let scoreDistChart = null
let weekDayChart = null

const overviewCards = computed(() => {
  if (!data.value) return []
  const o = data.value.overview
  return [
    { key: 'totalWorks', icon: '📝', value: o.totalWorks, label: '总作品数' },
    { key: 'totalChars', icon: '✍️', value: o.totalChars, label: '总书写汉字' },
    { key: 'totalStrokes', icon: '🖊️', value: o.totalStrokes, label: '总书写笔画' },
    { key: 'avgScore', icon: '⭐', value: o.avgScore ?? '-', label: '平均评分' },
  ]
})

async function loadData() {
  loading.value = true
  try {
    const res = await calligraphyListAPI.myAnalysis({ days: days.value })
    if (res.success) {
      data.value = res.data
      await nextTick()
      renderCharts()
    }
  } catch (e) {
    message.error('加载分析数据失败')
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  renderTrendChart()
  renderCharDistChart()
  renderScoreDistChart()
  renderWeekDayChart()
}

function renderTrendChart() {
  if (!trendChartRef.value || !data.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const dailyStats = data.value.dailyStats || []
  const dates = dailyStats.map(d => d.date.slice(5))
  const chars = dailyStats.map(d => d.chars)
  const strokes = dailyStats.map(d => d.strokes)
  const works = dailyStats.map(d => d.works)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['字数', '笔画', '作品数'], bottom: 0 },
    grid: { left: 50, right: 50, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '字数/笔画', position: 'left' },
      { type: 'value', name: '作品数', position: 'right' },
    ],
    series: [
      {
        name: '字数', type: 'bar', data: chars, yAxisIndex: 0,
        itemStyle: { color: '#6366f1' },
      },
      {
        name: '笔画', type: 'bar', data: strokes, yAxisIndex: 0,
        itemStyle: { color: '#10b981' },
      },
      {
        name: '作品数', type: 'line', data: works, yAxisIndex: 1,
        itemStyle: { color: '#f59e0b' }, smooth: true,
      },
    ],
  })
}

function renderCharDistChart() {
  if (!charDistChartRef.value || !data.value) return
  if (charDistChart) charDistChart.dispose()
  charDistChart = echarts.init(charDistChartRef.value)

  const dist = data.value.charCountDist || []
  charDistChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: dist.map(d => ({ name: d.label, value: d.count })).filter(d => d.value > 0),
      label: { formatter: '{b}: {c}次' },
      itemStyle: { borderRadius: 4 },
    }],
  })
}

function renderScoreDistChart() {
  if (!scoreDistChartRef.value || !data.value) return
  if (scoreDistChart) scoreDistChart.dispose()
  scoreDistChart = echarts.init(scoreDistChartRef.value)

  const dist = data.value.scoreDist || []
  const colors = ['#10b981', '#6366f1', '#f59e0b']
  scoreDistChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: dist.map((d, i) => ({ name: d.label, value: d.count, itemStyle: { color: colors[i] } })).filter(d => d.value > 0),
      label: { formatter: '{b}: {c}次' },
      itemStyle: { borderRadius: 4 },
    }],
  })
}

function renderWeekDayChart() {
  if (!weekDayChartRef.value || !data.value) return
  if (weekDayChart) weekDayChart.dispose()
  weekDayChart = echarts.init(weekDayChartRef.value)

  const dist = data.value.weekDayDist || []
  weekDayChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dist.map(d => d.label) },
    yAxis: { type: 'value', name: '作品数' },
    series: [{
      type: 'bar', data: dist.map(d => d.count),
      itemStyle: {
        color: (params) => {
          const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6366f1', '#4f46e5']
          return colors[params.dataIndex]
        },
      },
    }],
  })
}

function handleResize() {
  trendChart?.resize()
  charDistChart?.resize()
  scoreDistChart?.resize()
  weekDayChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  charDistChart?.dispose()
  scoreDistChart?.dispose()
  weekDayChart?.dispose()
})
</script>

<style scoped>
.writing-analysis {
  max-width: 900px;
  margin: 0 auto;
}

.time-filter {
  margin-bottom: 16px;
}

.overview-cards {
  margin-bottom: 16px;
}

.overview-card {
  text-align: center;
}

.card-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #6366f1;
}

.card-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.extreme-section {
  margin-bottom: 16px;
}

.extreme-item {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #f0f5ff, #e8e8ff);
  border-radius: 8px;
}

.extreme-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.extreme-value {
  font-size: 28px;
  font-weight: bold;
  color: #6366f1;
}

.extreme-unit {
  font-size: 11px;
  color: #999;
}

.chart-section {
  margin: 16px 0;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.chart-container-sm {
  width: 100%;
  height: 240px;
}

@media (max-width: 480px) {
  .card-value {
    font-size: 18px;
  }
  .extreme-value {
    font-size: 22px;
  }
  .chart-container {
    height: 220px;
  }
  .chart-container-sm {
    height: 200px;
  }
}
</style>
