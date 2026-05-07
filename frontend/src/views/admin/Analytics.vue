<template>
  <div class="analytics-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <div class="header-title">
          <h1>📊 数据中心</h1>
          <p>平台运营数据概览</p>
        </div>
        <div class="header-actions">
          <n-button size="small" @click="loadData" :loading="loading">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新数据
          </n-button>
          <n-button type="primary" size="small" @click="$router.push('/dashboard')">
            公开看板
          </n-button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <n-tabs v-model:value="activeTab" type="segment" size="medium">
        <!-- 数据概览 Tab -->
        <n-tab-pane name="overview" tab="数据概览">
          <n-spin :show="loading">
            <!-- 核心数据卡片 -->
            <section class="hero-stats">
              <div class="stat-card" v-for="stat in heroStats" :key="stat.key">
                <div class="stat-icon">{{ stat.icon }}</div>
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-desc">{{ stat.desc }}</div>
              </div>
            </section>

            <!-- 学习模块数据 -->
            <section class="section">
              <h2 class="section-title">学习模块数据</h2>
              <div class="modules-grid">
                <div
                  v-for="mod in moduleStats"
                  :key="mod.key"
                  class="module-card"
                  :style="{ '--accent': mod.color }"
                >
                  <div class="module-header">
                    <span class="module-icon">{{ mod.icon }}</span>
                    <span class="module-name">{{ mod.name }}</span>
                  </div>
                  <div class="module-body">
                    <div class="module-main-stat">
                      <span class="value">{{ mod.total }}</span>
                      <span class="label">{{ mod.totalLabel }}</span>
                    </div>
                    <div class="module-sub-stats">
                      <div class="sub-stat">
                        <span class="value">{{ mod.participants }}</span>
                        <span class="label">参与人数</span>
                      </div>
                      <div class="sub-stat">
                        <span class="value">{{ mod.avgPerUser }}</span>
                        <span class="label">人均</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 图表区域 -->
            <section class="section">
              <h2 class="section-title">趋势分析</h2>
              <div class="charts-row">
                <div class="chart-card">
                  <h3>用户活跃趋势 (30天)</h3>
                  <div ref="trendChartRef" class="chart-body"></div>
                </div>
                <div class="chart-card">
                  <h3>内容创作分布</h3>
                  <div ref="pieChartRef" class="chart-body"></div>
                </div>
              </div>
            </section>

            <!-- 排行榜 -->
            <section class="section">
              <h2 class="section-title">活跃用户</h2>
              <div class="ranking-grid">
                <div class="ranking-card">
                  <h3>🏆 积分排行榜</h3>
                  <div class="ranking-list">
                    <div
                      v-for="(user, idx) in topUsers"
                      :key="user.id || idx"
                      class="ranking-item"
                    >
                      <span class="rank" :class="{ 'top-3': idx < 3 }">{{ idx + 1 }}</span>
                      <span class="name">{{ user.name || user.username }}</span>
                      <span class="score">{{ user.score || user.totalPoints || 0 }}分</span>
                    </div>
                  </div>
                </div>
                <div class="ranking-card">
                  <h3>📝 最新动态</h3>
                  <div class="event-list">
                    <div
                      v-for="(event, idx) in recentEvents"
                      :key="idx"
                      class="event-item"
                    >
                      <span class="event-icon">{{ getEventIcon(event.type) }}</span>
                      <span class="event-text">{{ event.user || event.username }} {{ event.action }}</span>
                      <span class="event-time">{{ formatTime(event.time || event.timestamp) }}</span>
                    </div>
                    <div v-if="recentEvents.length === 0" class="empty-events">暂无动态</div>
                  </div>
                </div>
              </div>
            </section>
          </n-spin>
        </n-tab-pane>

        <!-- 数据备份 Tab -->
        <n-tab-pane name="backup" tab="数据备份">
          <div class="backup-section">
            <div class="backup-status-grid">
              <div class="status-card">
                <div class="status-icon">{{ backupStatus?.success ? '✅' : backupStatus?.success === false ? '❌' : '⏳' }}</div>
                <div class="status-info">
                  <div class="status-label">备份状态</div>
                  <div class="status-value">{{ backupStatus?.success ? '正常' : backupStatus?.success === false ? '失败' : '未知' }}</div>
                </div>
              </div>
              <div class="status-card">
                <div class="status-icon">🕐</div>
                <div class="status-info">
                  <div class="status-label">最近备份</div>
                  <div class="status-value">{{ formatBackupTime(backupStatus?.time) }}</div>
                </div>
              </div>
              <div class="status-card">
                <div class="status-icon">📦</div>
                <div class="status-info">
                  <div class="status-label">备份文件</div>
                  <div class="status-value">{{ backupFiles.length }} 个</div>
                </div>
              </div>
            </div>
            <div class="backup-actions">
              <span class="backup-hint">自动备份：每3小时 · 保留7天</span>
              <n-button type="primary" :loading="backupTriggering" @click="triggerBackup">立即备份</n-button>
            </div>
            <n-data-table :columns="backupColumns" :data="backupFiles" :loading="backupLoading" size="small" />
          </div>
        </n-tab-pane>

        <!-- 活动日志 Tab -->
        <n-tab-pane name="logs" tab="活动日志">
          <ActivityLogs :embedded="true" />
        </n-tab-pane>

        <!-- AI配置 Tab -->
        <n-tab-pane name="ai-config" tab="AI配置">
          <DiaryAiSettingsPanel />
        </n-tab-pane>

        <!-- API配置 Tab -->
        <n-tab-pane name="api-config" tab="API配置">
          <ApiConfig />
        </n-tab-pane>
      </n-tabs>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, h } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NButton } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import * as echarts from 'echarts'
import { analyticsAPI, backupAPI } from '@/api'
import ActivityLogs from './ActivityLogs.vue'
import DiaryAiSettingsPanel from '@/components/DiaryAiSettingsPanel.vue'
import ApiConfig from './ApiConfig.vue'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('overview')
const dashboardData = ref({})

// 备份相关
const backupStatus = ref(null)
const backupFiles = ref([])
const backupLoading = ref(false)
const backupTriggering = ref(false)

// 图表
const trendChartRef = ref(null)
const pieChartRef = ref(null)
let trendChart = null
let pieChart = null

// 核心数据卡片
const heroStats = computed(() => {
  const users = dashboardData.value?.userStats || {}
  const content = dashboardData.value?.contentStats?.distribution || {}
  const growth = dashboardData.value?.studentGrowthStats || {}
  
  const totalLearning = (growth.typing?.total || 0) + (growth.pinyin?.total || 0) + 
    (growth.math?.total || 0) + (growth.recitation?.total || 0)
  
  const totalWorks = (content.diary || 0) + (content.calligraphyWork || 0) + 
    (content.creativeWork || 0) + (content.poetryWork || 0)
  
  return [
    { key: 'users', icon: '👨‍🎓', value: users.total || 0, label: '注册学生', desc: '累计注册用户数' },
    { key: 'active', icon: '🔥', value: users.todayActive || 0, label: '今日活跃', desc: '今日活跃用户数' },
    { key: 'works', icon: '📚', value: totalWorks, label: '作品总数', desc: '日记+书法+创意+诗词' },
    { key: 'learning', icon: '🎯', value: totalLearning, label: '学习次数', desc: '打字+拼音+数学+背诵' },
    { key: 'diary', icon: '📖', value: content.diary || 0, label: '日记篇数', desc: '累计提交日记' },
    { key: 'calligraphy', icon: '✍️', value: content.calligraphyWork || 0, label: '书法作品', desc: '累计书写练习' },
    { key: 'typing', icon: '⌨️', value: growth.typing?.total || 0, label: '打字练习', desc: '累计打字训练' },
    { key: 'pinyin', icon: '🔤', value: growth.pinyin?.total || 0, label: '拼音练习', desc: '累计拼音学习' },
  ]
})

// 学习模块数据
const moduleStats = computed(() => {
  const growth = dashboardData.value?.studentGrowthStats || {}
  const content = dashboardData.value?.contentStats?.distribution || {}
  
  return [
    { key: 'typing', name: '打字训练', icon: '⌨️', total: growth.typing?.total || 0, totalLabel: '次练习', participants: growth.typing?.participants || 0, avgPerUser: growth.typing?.avgPerUser || 0, color: '#6366f1' },
    { key: 'pinyin', name: '拼音练习', icon: '🔤', total: growth.pinyin?.total || 0, totalLabel: '次练习', participants: growth.pinyin?.participants || 0, avgPerUser: growth.pinyin?.avgPerUser || 0, color: '#0ea5e9' },
    { key: 'math', name: '数学练习', icon: '🧮', total: growth.math?.total || 0, totalLabel: '次练习', participants: growth.math?.participants || 0, avgPerUser: growth.math?.avgPerUser || 0, color: '#3b82f6' },
    { key: 'recitation', name: '背诵记录', icon: '🎤', total: growth.recitation?.total || 0, totalLabel: '次背诵', participants: growth.recitation?.participants || 0, avgPerUser: growth.recitation?.avgPerUser || 0, color: '#f97316' },
    { key: 'diary', name: '日记创作', icon: '📝', total: content.diary || 0, totalLabel: '篇日记', participants: 0, avgPerUser: 0, color: '#a855f7' },
    { key: 'calligraphy', name: '书法练习', icon: '✍️', total: content.calligraphyWork || 0, totalLabel: '幅作品', participants: growth.calligraphy?.participants || 0, avgPerUser: growth.calligraphy?.avgPerUser || 0, color: '#ec4899' },
  ]
})

// 排行榜
const topUsers = computed(() => {
  return (dashboardData.value?.topUsers || []).slice(0, 5)
})

// 最新动态
const recentEvents = computed(() => {
  return (dashboardData.value?.realtimeEvents || []).slice(0, 6)
})

const backupColumns = [
  { title: '文件名', key: 'filename', ellipsis: { tooltip: true } },
  { title: '大小', key: 'sizeHuman', width: 100 },
  { title: '时间', key: 'createdAt', width: 180, render: (row) => formatBackupTime(row.createdAt) },
  {
    title: '操作', key: 'actions', width: 150,
    render: (row) => h('div', { style: 'display:flex;gap:8px' }, [
      h(NButton, { size: 'tiny', type: 'primary', text: true, onClick: () => window.open(backupAPI.downloadUrl(row.filename)) }, { default: () => '下载' }),
      h(NButton, { size: 'tiny', type: 'error', text: true, onClick: () => deleteBackup(row.filename) }, { default: () => '删除' }),
    ])
  },
]

function getEventIcon(type) {
  const icons = { event: '📌', submission: '✅', diary: '📝', calligraphy: '✍️', typing: '⌨️', pinyin: '🔤', math: '🧮', default: '📌' }
  return icons[type] || icons.default
}

function formatTime(time) {
  if (!time) return '-'
  const d = new Date(time)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN')
}

function formatBackupTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

async function loadData() {
  loading.value = true
  try {
    const res = await analyticsAPI.getDashboard()
    if (res.success) {
      dashboardData.value = res.data
      await nextTick()
      renderCharts()
    }
  } catch (e) {
    console.error('加载失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadBackup() {
  backupLoading.value = true
  try {
    const [statusRes, filesRes] = await Promise.all([backupAPI.getStatus(), backupAPI.getList()])
    if (statusRes.success) backupStatus.value = statusRes.data
    if (filesRes.success) backupFiles.value = filesRes.data
  } catch {} finally { backupLoading.value = false }
}

async function triggerBackup() {
  backupTriggering.value = true
  try {
    const res = await backupAPI.trigger()
    if (res.success) await loadBackup()
  } catch {} finally { backupTriggering.value = false }
}

async function deleteBackup(filename) {
  try {
    const res = await backupAPI.remove(filename)
    if (res.success) backupFiles.value = backupFiles.value.filter(f => f.filename !== filename)
  } catch {}
}

function renderCharts() {
  renderTrendChart()
  renderPieChart()
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const trend = dashboardData.value?.activityTrend || []
  const dates = trend.map(d => d.date?.slice(5) || '')
  const dau = trend.map(d => d.dau || 0)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: '活跃用户' },
    series: [{
      type: 'line', data: dau, smooth: true,
      lineStyle: { width: 3, color: '#6366f1' },
      itemStyle: { color: '#6366f1' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0)' }]) },
    }],
  })
}

function renderPieChart() {
  if (!pieChartRef.value) return
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)

  const content = dashboardData.value?.contentStats?.distribution || {}
  const data = [
    { name: '日记', value: content.diary || 0 },
    { name: '书法', value: content.calligraphyWork || 0 },
    { name: '创意作品', value: content.creativeWork || 0 },
    { name: '日记分析', value: content.diaryAnalysis || 0 },
    { name: '作业', value: content.homework || 0 },
    { name: '背诵', value: content.recitation || 0 },
  ].filter(d => d.value > 0)

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316']
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { formatter: '{b}: {c}', fontSize: 12 },
    }],
  })
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
}

onMounted(() => {
  loadData()
  loadBackup()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.analytics-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 头部 */
.page-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 24px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-title p {
  font-size: 14px;
  color: #9ca3af;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容 */
.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* 核心数据卡片 */
.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  text-align: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #6366f1;
  line-height: 1;
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-top: 8px;
}

.stat-desc {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

/* 学习模块 */
.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.module-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
}

.module-card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.module-icon {
  font-size: 28px;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.module-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.module-main-stat .value {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}

.module-main-stat .label {
  font-size: 13px;
  color: #9ca3af;
}

.module-sub-stats {
  display: flex;
  gap: 20px;
}

.sub-stat {
  text-align: right;
}

.sub-stat .value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.sub-stat .label {
  font-size: 12px;
  color: #9ca3af;
}

/* 图表区域 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.chart-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.chart-body {
  height: 280px;
}

/* 排行榜 */
.ranking-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ranking-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.ranking-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #9ca3af;
  background: #e5e7eb;
  border-radius: 6px;
}

.rank.top-3 {
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.score {
  font-size: 14px;
  font-weight: 600;
  color: #6366f1;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.event-icon {
  font-size: 16px;
}

.event-text {
  flex: 1;
  font-size: 13px;
  color: #4b5563;
}

.event-time {
  font-size: 12px;
  color: #9ca3af;
}

.empty-events {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
}

/* 备份区域 */
.backup-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.backup-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.status-icon {
  font-size: 32px;
}

.status-label {
  font-size: 12px;
  color: #9ca3af;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.backup-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.backup-hint {
  font-size: 13px;
  color: #9ca3af;
}

/* 响应式 */
@media (max-width: 1200px) {
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .modules-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-stats,
  .modules-grid,
  .charts-row,
  .ranking-grid {
    grid-template-columns: 1fr;
  }
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
