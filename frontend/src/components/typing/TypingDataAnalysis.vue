<template>
  <div class="typing-data-analysis">
    <n-spin :show="loading">
      <!-- 概览指标卡片 -->
      <div class="overview-cards">
        <n-grid :cols="4" :x-gap="8" :y-gap="8">
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

      <!-- 趋势图表 -->
      <div class="chart-section">
        <n-card title="数据趋势" size="small">
          <template #header-extra>
            <n-radio-group v-model:value="trendDays" size="small" @update:value="loadTrend">
              <n-radio-button :value="7">7天</n-radio-button>
              <n-radio-button :value="14">14天</n-radio-button>
              <n-radio-button :value="30">30天</n-radio-button>
            </n-radio-group>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </n-card>
      </div>

      <!-- 连击分布 + 难度分布 -->
      <n-grid :cols="2" :x-gap="12" :y-gap="12">
        <n-gi>
          <n-card title="连击分布" size="small">
            <div ref="comboChartRef" class="chart-container-sm"></div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="难度分布" size="small">
            <div ref="difficultyChartRef" class="chart-container-sm"></div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 错误按键热力图 -->
      <div class="chart-section">
        <n-card title="错误按键分布" size="small">
          <div ref="errorChartRef" class="chart-container"></div>
        </n-card>
      </div>

      <!-- 准确率+WPM 散点图 -->
      <div class="chart-section">
        <n-card title="准确率 vs 速度" size="small">
          <div ref="scatterChartRef" class="chart-container"></div>
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useMessage } from 'naive-ui'
import * as echarts from 'echarts'
import { typingAPI } from '@/api/index'

const message = useMessage()
const loading = ref(true)
const trendDays = ref(30)

const overview = ref(null)
const trend = ref(null)
const comboDist = ref([])
const difficultyDist = ref([])
const errorKeys = ref({})
const practices = ref([])

const trendChartRef = ref(null)
const comboChartRef = ref(null)
const difficultyChartRef = ref(null)
const errorChartRef = ref(null)
const scatterChartRef = ref(null)

let trendChart = null
let comboChart = null
let difficultyChart = null
let errorChart = null
let scatterChart = null

const overviewCards = computed(() => {
  if (!overview.value) return []
  const o = overview.value
  return [
    { key: 'practiceCount', icon: '🎮', value: o.totalPracticeCount, label: '总练习次数' },
    { key: 'validCount', icon: '✅', value: o.validPracticeCount, label: '有效练习' },
    { key: 'avgAccuracy', icon: '🎯', value: o.avgAccuracy + '%', label: '平均准确率' },
    { key: 'bestAccuracy', icon: '💯', value: o.bestAccuracy + '%', label: '最高准确率' },
    { key: 'avgWpm', icon: '⚡', value: o.avgWpm, label: '平均WPM' },
    { key: 'bestWpm', icon: '🚀', value: o.bestWpm, label: '最高WPM' },
    { key: 'bestCombo', icon: '🔥', value: o.bestCombo, label: '最大连击' },
    { key: 'totalWords', icon: '📝', value: o.totalWordsDestroyed, label: '消灭单词' },
  ]
})

async function loadAll() {
  loading.value = true
  try {
    const [overviewRes, trendRes, comboRes, diffRes, errorRes, listRes] = await Promise.all([
      typingAPI.analyticsOverview(),
      typingAPI.analyticsTrend({ days: trendDays.value }),
      typingAPI.analyticsComboDist(),
      typingAPI.analyticsDifficultyDist(),
      typingAPI.analyticsErrorKeys(),
      typingAPI.myList({ limit: 100 }),
    ])
    if (overviewRes.success) overview.value = overviewRes.data
    if (trendRes.success) trend.value = trendRes.data
    if (comboRes.success) comboDist.value = comboRes.data
    if (diffRes.success) difficultyDist.value = diffRes.data
    if (errorRes.success) errorKeys.value = errorRes.data
    if (listRes.success) practices.value = listRes.data.practices

    await nextTick()
    renderCharts()
  } catch (e) {
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

async function loadTrend() {
  try {
    const res = await typingAPI.analyticsTrend({ days: trendDays.value })
    if (res.success) {
      trend.value = res.data
      await nextTick()
      renderTrendChart()
    }
  } catch (e) {
    message.error('加载趋势数据失败')
  }
}

function renderCharts() {
  renderTrendChart()
  renderComboChart()
  renderDifficultyChart()
  renderErrorChart()
  renderScatterChart()
}

function renderTrendChart() {
  if (!trendChartRef.value || !trend.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const dates = trend.value.dates.map(d => d.slice(5))
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['准确率', 'WPM', '最大连击'], bottom: 0 },
    grid: { left: 50, right: 50, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '准确率%', min: 0, max: 100, position: 'left' },
      { type: 'value', name: 'WPM/连击', position: 'right' },
    ],
    series: [
      {
        name: '准确率', type: 'line', data: trend.value.avgAccuracy, smooth: true,
        itemStyle: { color: '#6366f1' }, areaStyle: { opacity: 0.1 },
      },
      {
        name: 'WPM', type: 'line', yAxisIndex: 1, data: trend.value.avgWpm, smooth: true,
        itemStyle: { color: '#10b981' },
      },
      {
        name: '最大连击', type: 'line', yAxisIndex: 1, data: trend.value.maxCombo, smooth: true,
        itemStyle: { color: '#f59e0b' },
      },
    ],
  })
}

function renderComboChart() {
  if (!comboChartRef.value || !comboDist.value.length) return
  if (comboChart) comboChart.dispose()
  comboChart = echarts.init(comboChartRef.value)

  comboChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: comboDist.value.map(d => ({ name: d.label, value: d.count })),
      label: { formatter: '{b}: {c}次' },
      itemStyle: { borderRadius: 4 },
    }],
  })
}

function renderDifficultyChart() {
  if (!difficultyChartRef.value || !difficultyDist.value.length) return
  if (difficultyChart) difficultyChart.dispose()
  difficultyChart = echarts.init(difficultyChartRef.value)

  const labels = { '0.25': '极慢', '0.5': '慢速', '0.75': '中速', '1.0': '快速' }
  difficultyChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: difficultyDist.value.map(d => ({ name: labels[d.label] || d.label, value: d.count })),
      label: { formatter: '{b}: {c}次' },
      itemStyle: { borderRadius: 4 },
    }],
  })
}

function renderErrorChart() {
  if (!errorChartRef.value || !Object.keys(errorKeys.value).length) return
  if (errorChart) errorChart.dispose()
  errorChart = echarts.init(errorChartRef.value)

  const entries = Object.entries(errorKeys.value).sort((a, b) => b[1] - a[1])
  const letters = entries.map(e => e[0].toUpperCase())
  const counts = entries.map(e => e[1])

  errorChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: letters, axisLabel: { fontSize: 11, fontWeight: 'bold' } },
    yAxis: { type: 'value', name: '错误次数' },
    series: [{
      type: 'bar', data: counts,
      itemStyle: {
        color: (params) => {
          const val = params.data
          if (val > 50) return '#ef4444'
          if (val > 20) return '#f59e0b'
          return '#6366f1'
        },
      },
    }],
  })
}

function renderScatterChart() {
  if (!scatterChartRef.value || !practices.value.length) return
  if (scatterChart) scatterChart.dispose()
  scatterChart = echarts.init(scatterChartRef.value)

  const data = practices.value
    .filter(p => p.accuracy > 0 && p.wpm > 0)
    .map(p => [p.accuracy, p.wpm, p.score])

  scatterChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => `准确率: ${p.data[0]}%<br>WPM: ${p.data[1]}<br>得分: ${p.data[2]}`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { name: '准确率%', min: 0, max: 100 },
    yAxis: { name: 'WPM' },
    series: [{
      type: 'scatter', data,
      symbolSize: (val) => Math.max(8, Math.min(30, val[2] / 100)),
      itemStyle: { color: '#6366f1', opacity: 0.6 },
    }],
  })
}

function handleResize() {
  trendChart?.resize()
  comboChart?.resize()
  difficultyChart?.resize()
  errorChart?.resize()
  scatterChart?.resize()
}

onMounted(() => {
  loadAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  comboChart?.dispose()
  difficultyChart?.dispose()
  errorChart?.dispose()
  scatterChart?.dispose()
})
</script>

<style scoped>
.typing-data-analysis {
  max-width: 800px;
  margin: 0 auto;
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
  font-size: 22px;
  font-weight: bold;
  color: #6366f1;
}

.card-label {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.chart-section {
  margin: 12px 0;
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
    font-size: 16px;
  }
  .chart-container {
    height: 220px;
  }
  .chart-container-sm {
    height: 200px;
  }
}
</style>
