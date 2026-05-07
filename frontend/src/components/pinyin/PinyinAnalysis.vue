<template>
  <div class="pinyin-analysis">
    <n-spin :show="loading">
      <div class="hero-grid">
        <n-card v-for="card in overviewCards" :key="card.label" size="small">
          <div class="hero-card">
            <div class="hero-label">{{ card.label }}</div>
            <div class="hero-value" :class="card.type">{{ card.value }}</div>
            <div class="hero-sub">{{ card.sub }}</div>
          </div>
        </n-card>
      </div>

      <div class="stats-section">
        <div v-for="(item, key) in statsConfig" :key="key" class="stats-card">
          <n-card size="small" :bordered="true">
            <div class="stats-card-inner">
              <div class="stats-title">{{ item.label }}</div>
              <div class="stats-number">{{ stats[key]?.charCount || 0 }}</div>
              <div class="stats-sub">{{ stats[key]?.practiceCount || 0 }}次练习</div>
              <div class="stats-acc">正确率 {{ stats[key]?.avgAccuracy || 0 }}%</div>
            </div>
          </n-card>
        </div>
      </div>

      <n-tabs v-model:value="activeInnerTab" type="line" animated @update:value="handleInnerTabChange">
        <n-tab-pane name="errorAnalysis" tab="错误分析">
          <div v-if="hasAnalysisData" class="analysis-content">
            <div class="insight-grid">
              <n-card v-for="item in insightCards" :key="item.label" size="small">
                <div class="insight-card">
                  <div class="insight-label">{{ item.label }}</div>
                  <div class="insight-value">{{ item.value }}</div>
                  <div class="insight-sub">{{ item.sub }}</div>
                </div>
              </n-card>
            </div>

            <div class="chart-grid">
              <n-card title="高频错误拼音 Top10" size="small">
                <div ref="errorPinyinChartRef" class="chart-container"></div>
              </n-card>
              <n-card title="声调错误分布" size="small">
                <div ref="toneChartRef" class="chart-container"></div>
              </n-card>
              <n-card title="声母错误排行" size="small">
                <div ref="initialChartRef" class="chart-container"></div>
              </n-card>
              <n-card title="韵母错误排行" size="small">
                <div ref="finalChartRef" class="chart-container"></div>
              </n-card>
            </div>

            <div class="list-grid">
              <n-card title="高频错误汉字" size="small">
                <div v-if="errorData?.errorChars?.length" class="error-chars-list">
                  <div v-for="item in errorData.errorChars" :key="item.char" class="error-char-item">
                    <div class="error-char-main">
                      <span class="char">{{ item.char }}</span>
                      <span class="pinyin">{{ item.pinyin }}</span>
                    </div>
                    <div class="error-char-meta">
                      <span class="error-count">{{ item.errors }}次错误</span>
                      <span class="error-rate">错误率 {{ item.errorRate }}%</span>
                    </div>
                    <n-progress
                      type="line"
                      :percentage="item.errorRate"
                      :color="item.errorRate >= 50 ? '#d03050' : item.errorRate >= 30 ? '#f0a020' : '#18a058'"
                      :show-indicator="false"
                      :height="6"
                    />
                  </div>
                </div>
                <n-empty v-else description="目前没有错误数据，继续保持" />
              </n-card>

              <n-card title="易错拼音明细" size="small">
                <div v-if="errorData?.errorPinyins?.length" class="error-pinyin-list">
                  <div v-for="item in topErrorPinyins" :key="item.pinyin" class="error-pinyin-item">
                    <div>
                      <div class="error-pinyin-text">{{ item.pinyin }}</div>
                      <div class="error-pinyin-chars">{{ item.chars.join('、') }}</div>
                    </div>
                    <n-tag size="small" type="error">{{ item.count }}次</n-tag>
                  </div>
                </div>
                <n-empty v-else description="暂无易错拼音" />
              </n-card>
            </div>
          </div>
          <n-empty v-else description="先完成几次练习，这里会显示你的易错点" />
        </n-tab-pane>

        <n-tab-pane name="trend" tab="练习趋势">
          <div v-if="errorData?.dailyTrend?.length" class="analysis-content">
            <div class="insight-grid">
              <n-card v-for="item in trendCards" :key="item.label" size="small">
                <div class="insight-card">
                  <div class="insight-label">{{ item.label }}</div>
                  <div class="insight-value">{{ item.value }}</div>
                  <div class="insight-sub">{{ item.sub }}</div>
                </div>
              </n-card>
            </div>

            <n-card title="近30天练习趋势" size="small">
              <div ref="trendChartRef" class="chart-container-large"></div>
            </n-card>
          </div>
          <n-empty v-else description="暂无趋势数据" />
        </n-tab-pane>

        <n-tab-pane name="records" tab="练习记录">
          <div v-if="recordOverviewCards.length" class="insight-grid record-overview">
            <n-card v-for="item in recordOverviewCards" :key="item.label" size="small">
              <div class="insight-card">
                <div class="insight-label">{{ item.label }}</div>
                <div class="insight-value">{{ item.value }}</div>
                <div class="insight-sub">{{ item.sub }}</div>
              </div>
            </n-card>
          </div>

          <div class="records-list" v-if="recordSummaries.length">
            <div v-for="p in recordSummaries" :key="p.id" class="record-item">
              <div class="record-main" @click="showDetail(p)">
                <div class="record-top">
                  <div class="record-title">{{ p.title }}</div>
                  <div class="record-tags">
                    <n-tag size="tiny" type="info">{{ p.charCount }}字</n-tag>
                    <n-tag size="tiny" :type="p.accuracy >= 90 ? 'success' : p.accuracy >= 70 ? 'warning' : 'error'">
                      {{ p.accuracy }}%
                    </n-tag>
                    <n-tag size="tiny" :type="p.errorCount > 0 ? 'error' : 'success'">
                      {{ p.errorCount > 0 ? `${p.errorCount}错` : '零错误' }}
                    </n-tag>
                  </div>
                </div>
                <div class="record-meta">
                  <span>用时 {{ formatDuration(p.duration) }}</span>
                  <span>按键 {{ p.totalKeys || 0 }}</span>
                  <span>正确 {{ p.correctKeys || 0 }}</span>
                  <span>{{ formatDate(p.createdAt) }}</span>
                </div>
              </div>
              <n-button size="tiny" quaternary type="error" @click.stop="handleDelete(p.id)">
                删除
              </n-button>
            </div>
          </div>
          <n-empty v-else description="暂无练习记录，开始你的第一次练习吧" />

          <div v-if="totalPages > 1" class="pagination">
            <n-pagination
              v-model:page="currentPage"
              :page-count="totalPages"
              size="small"
              @update:page="loadPractices"
            />
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-spin>

    <PinyinRecordDetail v-if="selectedRecord" :record="selectedRecord" @close="selectedRecord = null" />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDialog, useMessage } from 'naive-ui'
import * as echarts from 'echarts'
import { pinyinAPI } from '@/api/index'
import PinyinRecordDetail from './PinyinRecordDetail.vue'

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
})

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const activeInnerTab = ref('errorAnalysis')
const practices = ref([])
const stats = ref({})
const errorData = ref(null)
const currentPage = ref(1)
const totalPages = ref(1)
const selectedRecord = ref(null)

const errorPinyinChartRef = ref(null)
const toneChartRef = ref(null)
const initialChartRef = ref(null)
const finalChartRef = ref(null)
const trendChartRef = ref(null)

let errorPinyinChart = null
let toneChart = null
let initialChart = null
let finalChart = null
let trendChart = null

const statsConfig = {
  today: { label: '今日' },
  week: { label: '本周' },
  month: { label: '本月' },
  allTime: { label: '累计' },
}

const hasAnalysisData = computed(() => {
  return (errorData.value?.overview?.totalPractices || 0) > 0
})

const overviewCards = computed(() => {
  const allTime = stats.value?.allTime || {}
  const today = stats.value?.today || {}

  return [
    {
      label: '累计练习',
      value: `${allTime.practiceCount || 0}次`,
      sub: `累计 ${allTime.charCount || 0} 字`,
      type: '',
    },
    {
      label: '累计正确率',
      value: `${allTime.avgAccuracy || 0}%`,
      sub: `今日练习 ${today.practiceCount || 0} 次`,
      type: 'success',
    },
    {
      label: '总按键数',
      value: allTime.totalKeys || 0,
      sub: `正确按键 ${allTime.correctKeys || 0}`,
      type: '',
    },
    {
      label: '今日状态',
      value: `${today.charCount || 0}字`,
      sub: `${today.avgAccuracy || 0}% 正确率`,
      type: today.practiceCount > 0 ? 'warning' : '',
    },
  ]
})

const insightCards = computed(() => {
  const overview = errorData.value?.overview || {}
  const topPinyin = errorData.value?.errorPinyins?.[0]
  const topChar = errorData.value?.errorChars?.[0]
  const topInitial = errorData.value?.initialErrors?.[0]
  const topFinal = errorData.value?.finalErrors?.[0]
  const topTone = getTopTone()

  return [
    {
      label: '总错误数',
      value: overview.totalErrors || 0,
      sub: `平均错误率 ${overview.avgErrorRate || 0}%`,
    },
    {
      label: '最易错拼音',
      value: topPinyin?.pinyin || '-',
      sub: topPinyin ? `${topPinyin.count}次错误` : '暂无数据',
    },
    {
      label: '最易错汉字',
      value: topChar?.char || '-',
      sub: topChar ? `${topChar.errors}次错误 · ${topChar.errorRate}%` : '暂无数据',
    },
    {
      label: '重点突破',
      value: topInitial?.initial || topFinal?.final || '-',
      sub: topTone || '暂无明显薄弱点',
    },
  ]
})

const trendCards = computed(() => {
  const trend = errorData.value?.dailyTrend || []
  if (!trend.length) return []

  const totalPractices = trend.reduce((sum, item) => sum + item.practices, 0)
  const totalChars = trend.reduce((sum, item) => sum + item.chars, 0)
  const avgAccuracy = Math.round(trend.reduce((sum, item) => sum + item.avgAccuracy, 0) / trend.length * 10) / 10
  const bestDay = [...trend].sort((a, b) => b.chars - a.chars)[0]

  return [
    {
      label: '近30天练习',
      value: `${totalPractices}次`,
      sub: `共练习 ${totalChars} 字`,
    },
    {
      label: '趋势均值',
      value: `${avgAccuracy}%`,
      sub: '按天计算的平均正确率',
    },
    {
      label: '最高单日字数',
      value: `${bestDay?.chars || 0}字`,
      sub: bestDay ? bestDay.date : '暂无数据',
    },
    {
      label: '最近活跃日',
      value: trend[trend.length - 1]?.date || '-',
      sub: `${trend[trend.length - 1]?.practices || 0}次练习`,
    },
  ]
})

const recordSummaries = computed(() => {
  return practices.value.map(item => ({
    ...item,
    errorCount: Array.isArray(item.content)
      ? item.content.reduce((sum, row) => sum + (row.errors || 0), 0)
      : 0,
  }))
})

const recordOverviewCards = computed(() => {
  if (!recordSummaries.value.length) return []

  const latest = recordSummaries.value[0]
  const avgAccuracy = Math.round(recordSummaries.value.reduce((sum, item) => sum + (item.accuracy || 0), 0) / recordSummaries.value.length * 10) / 10
  const zeroErrorCount = recordSummaries.value.filter(item => item.errorCount === 0).length

  return [
    {
      label: '当前页记录',
      value: `${recordSummaries.value.length}条`,
      sub: `第 ${currentPage.value} / ${totalPages.value} 页`,
    },
    {
      label: '平均正确率',
      value: `${avgAccuracy}%`,
      sub: '基于当前页记录',
    },
    {
      label: '零错误记录',
      value: `${zeroErrorCount}条`,
      sub: '当前页表现最佳次数',
    },
    {
      label: '最近一次练习',
      value: latest ? formatDate(latest.createdAt) : '-',
      sub: latest ? `${latest.charCount}字 · ${latest.accuracy}%` : '暂无数据',
    },
  ]
})

const topErrorPinyins = computed(() => {
  return errorData.value?.errorPinyins?.slice(0, 8) || []
})

async function loadPractices(page = currentPage.value) {
  currentPage.value = page
  loading.value = true
  try {
    const res = await pinyinAPI.myList({ page, limit: 20 })
    if (res.success) {
      practices.value = res.data.practices || []
      totalPages.value = res.data.totalPages || 1
    }
  } catch (error) {
    message.error('获取记录失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await pinyinAPI.myStats()
    if (res.success) {
      stats.value = res.data || {}
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

async function loadErrorAnalysis() {
  try {
    const res = await pinyinAPI.errorAnalysis()
    if (res.success) {
      errorData.value = res.data
      if (props.active) {
        await nextTick()
        renderVisibleCharts()
      }
    }
  } catch (error) {
    console.error('获取错误分析失败:', error)
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadPractices(currentPage.value), loadStats(), loadErrorAnalysis()])
  } finally {
    loading.value = false
  }
}

function renderVisibleCharts() {
  if (!props.active) return

  if (activeInnerTab.value === 'errorAnalysis') {
    renderErrorPinyinChart()
    renderToneChart()
    renderInitialChart()
    renderFinalChart()
  }

  if (activeInnerTab.value === 'trend') {
    renderTrendChart()
  }
}

function renderErrorPinyinChart() {
  if (!errorPinyinChartRef.value || !errorData.value?.errorPinyins?.length) return
  errorPinyinChart?.dispose()

  const data = errorData.value.errorPinyins.slice(0, 10)
  errorPinyinChart = echarts.init(errorPinyinChartRef.value)
  errorPinyinChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 20, bottom: 48 },
    xAxis: {
      type: 'category',
      data: data.map(item => item.pinyin),
      axisLabel: { rotate: 35, fontSize: 11 },
    },
    yAxis: { type: 'value', name: '错误次数' },
    series: [{
      type: 'bar',
      data: data.map(item => item.count),
      barMaxWidth: 28,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff8a80' },
          { offset: 1, color: '#d03050' },
        ]),
        borderRadius: [6, 6, 0, 0],
      },
    }],
  })
}

function renderToneChart() {
  if (!toneChartRef.value || !errorData.value?.toneErrors) return
  toneChart?.dispose()

  const tones = errorData.value.toneErrors
  toneChart = echarts.init(toneChartRef.value)
  toneChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '42%'],
      label: { formatter: '{b}\n{c}次' },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data: [
        { value: tones[1] || 0, name: '一声', itemStyle: { color: '#36a3f7' } },
        { value: tones[2] || 0, name: '二声', itemStyle: { color: '#f0a020' } },
        { value: tones[3] || 0, name: '三声', itemStyle: { color: '#8b5cf6' } },
        { value: tones[4] || 0, name: '四声', itemStyle: { color: '#d03050' } },
      ],
    }],
  })
}

function renderInitialChart() {
  if (!initialChartRef.value || !errorData.value?.initialErrors?.length) return
  initialChart?.dispose()

  const data = errorData.value.initialErrors.slice(0, 12)
  initialChart = echarts.init(initialChartRef.value)
  initialChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(item => item.initial),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: '错误次数' },
    series: [{
      type: 'bar',
      data: data.map(item => item.count),
      barMaxWidth: 28,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ffb74d' },
          { offset: 1, color: '#fb8c00' },
        ]),
        borderRadius: [6, 6, 0, 0],
      },
    }],
  })
}

function renderFinalChart() {
  if (!finalChartRef.value || !errorData.value?.finalErrors?.length) return
  finalChart?.dispose()

  const data = errorData.value.finalErrors.slice(0, 12)
  finalChart = echarts.init(finalChartRef.value)
  finalChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(item => item.final),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: '错误次数' },
    series: [{
      type: 'bar',
      data: data.map(item => item.count),
      barMaxWidth: 28,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#81c784' },
          { offset: 1, color: '#18a058' },
        ]),
        borderRadius: [6, 6, 0, 0],
      },
    }],
  })
}

function renderTrendChart() {
  if (!trendChartRef.value || !errorData.value?.dailyTrend?.length) return
  trendChart?.dispose()

  const data = errorData.value.dailyTrend
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['练习字数', '错误数', '正确率'], bottom: 0 },
    grid: { left: 40, right: 40, top: 20, bottom: 48 },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date.slice(5)),
      axisLabel: { rotate: 35, fontSize: 10 },
    },
    yAxis: [
      { type: 'value', name: '字数/错误数', position: 'left' },
      { type: 'value', name: '正确率%', min: 0, max: 100, position: 'right' },
    ],
    series: [
      {
        name: '练习字数',
        type: 'bar',
        data: data.map(item => item.chars),
        barMaxWidth: 24,
        itemStyle: { color: '#36a3f7' },
      },
      {
        name: '错误数',
        type: 'bar',
        data: data.map(item => item.errors),
        barMaxWidth: 24,
        itemStyle: { color: '#ff6b6b' },
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map(item => item.avgAccuracy),
        itemStyle: { color: '#18a058' },
        lineStyle: { color: '#18a058', width: 2 },
      },
    ],
  })
}

function resizeCharts() {
  errorPinyinChart?.resize()
  toneChart?.resize()
  initialChart?.resize()
  finalChart?.resize()
  trendChart?.resize()
}

function disposeCharts() {
  errorPinyinChart?.dispose()
  toneChart?.dispose()
  initialChart?.dispose()
  finalChart?.dispose()
  trendChart?.dispose()
  errorPinyinChart = null
  toneChart = null
  initialChart = null
  finalChart = null
  trendChart = null
}

function getTopTone() {
  const toneMap = errorData.value?.toneErrors || {}
  const toneEntries = Object.entries(toneMap).sort((a, b) => b[1] - a[1])
  if (!toneEntries.length || toneEntries[0][1] <= 0) return ''

  const toneLabels = {
    1: '一声错误最多',
    2: '二声错误最多',
    3: '三声错误最多',
    4: '四声错误最多',
  }

  return `${toneLabels[toneEntries[0][0]]} · ${toneEntries[0][1]}次`
}

function showDetail(record) {
  selectedRecord.value = record
}

function handleDelete(id) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条练习记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await pinyinAPI.delete(id)
        if (res.success) {
          message.success('已删除')
          await loadAll()
          if (props.active) {
            await nextTick()
            renderVisibleCharts()
          }
        }
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

async function handleInnerTabChange() {
  await nextTick()
  renderVisibleCharts()
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

watch(() => props.active, async (active) => {
  if (!active) return
  await nextTick()
  renderVisibleCharts()
})

onMounted(async () => {
  await loadAll()
  window.addEventListener('resize', resizeCharts)
  if (props.active) {
    await nextTick()
    renderVisibleCharts()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})

defineExpose({
  refresh: loadAll,
})
</script>

<style scoped>
.pinyin-analysis {
  max-width: 980px;
  margin: 0 auto;
}

.hero-grid,
.stats-section,
.insight-grid,
.chart-grid,
.list-grid {
  display: grid;
  gap: 12px;
}

.hero-grid,
.stats-section,
.insight-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
}

.chart-grid,
.list-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.stats-card-inner,
.insight-card {
  text-align: center;
}

.hero-label,
.stats-title,
.insight-label {
  font-size: 12px;
  color: #999;
}

.hero-value,
.stats-number,
.insight-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-top: 4px;
}

.hero-value.success {
  color: #18a058;
}

.hero-value.warning {
  color: #f0a020;
}

.hero-sub,
.stats-sub,
.stats-acc,
.insight-sub {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.chart-container {
  width: 100%;
  height: 260px;
}

.chart-container-large {
  width: 100%;
  height: 360px;
}

.error-chars-list,
.error-pinyin-list,
.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-char-item,
.error-pinyin-item,
.record-item {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 12px;
}

.error-char-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-char-main,
.error-char-meta,
.record-top,
.record-meta,
.error-pinyin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.char {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.pinyin,
.error-pinyin-chars,
.record-meta,
.error-rate {
  font-size: 12px;
  color: #666;
}

.error-count {
  font-size: 12px;
  color: #d03050;
}

.error-pinyin-text,
.record-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.record-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.record-main:hover {
  opacity: 0.75;
}

.record-top {
  align-items: flex-start;
  margin-bottom: 6px;
}

.record-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.record-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.record-overview {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 900px) {
  .hero-grid,
  .stats-section,
  .insight-grid,
  .chart-grid,
  .list-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .hero-grid,
  .stats-section,
  .insight-grid,
  .chart-grid,
  .list-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-value,
  .stats-number,
  .insight-value {
    font-size: 22px;
  }

  .chart-container {
    height: 220px;
  }

  .chart-container-large {
    height: 300px;
  }

  .error-char-main,
  .error-char-meta,
  .record-item,
  .record-top,
  .error-pinyin-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-tags {
    width: 100%;
  }

  .record-title {
    white-space: normal;
  }
}
</style>
