<template>
  <div class="dashboard-container">
    <!-- 顶部导航 -->
    <header class="dashboard-header">
      <div class="header-content">
        <div class="logo" @click="$router.push('/home')">
          <span class="logo-icon">🌟</span>
          <span class="logo-text">苹湖少儿空间</span>
        </div>
        <nav class="header-nav">
          <router-link to="/home" class="nav-link">首页</router-link>
          <router-link to="/dashboard" class="nav-link active">数据看板</router-link>
          <router-link to="/leaderboard" class="nav-link">排行榜</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
        </nav>
        <div class="header-actions">
          <span class="update-time">数据更新: {{ lastUpdateTime }}</span>
          <n-button quaternary size="small" @click="fetchData" :loading="loading">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
          <n-button type="primary" size="small" @click="$router.push('/login')">登录</n-button>
        </div>
        <button class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
          <n-icon :size="24"><MenuOutline /></n-icon>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="dashboard-main">
      <!-- Hero区域 -->
      <section class="hero-section">
        <h1 class="hero-title">学习数据看板</h1>
        <p class="hero-subtitle">实时追踪孩子们的学习成长，见证每一步进步</p>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="stat-value">{{ dashboardData?.userStats?.total || 0 }}</span>
            <span class="stat-label">在学学生</span>
          </div>
          <div class="hero-stat">
            <span class="stat-value">{{ dashboardData?.contentStats?.total || 0 }}</span>
            <span class="stat-label">作品总数</span>
          </div>
          <div class="hero-stat">
            <span class="stat-value">{{ dashboardData?.userStats?.todayActive || 0 }}</span>
            <span class="stat-label">今日活跃</span>
          </div>
        </div>
      </section>

      <!-- 8大学习板块 -->
      <section class="modules-section">
        <h2 class="section-title">学习模块概览</h2>
        <div class="modules-grid">
          <div
            v-for="mod in modules"
            :key="mod.key"
            class="module-card"
            :style="{ '--accent': mod.color, '--accent-bg': mod.bgColor }"
          >
            <div class="module-icon">{{ mod.icon }}</div>
            <div class="module-info">
              <h3 class="module-name">{{ mod.name }}</h3>
              <div class="module-stats">
                <div class="module-stat">
                  <span class="value">{{ mod.total }}</span>
                  <span class="label">{{ mod.totalLabel }}</span>
                </div>
                <div class="module-stat">
                  <span class="value">{{ mod.today }}</span>
                  <span class="label">今日</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 趋势图表区 -->
      <section class="charts-section">
        <div class="charts-row">
          <div class="chart-card large">
            <div class="chart-header">
              <h3>学习活跃趋势 (30天)</h3>
            </div>
            <div ref="trendChartRef" class="chart-body"></div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3>模块使用分布</h3>
            </div>
            <div ref="pieChartRef" class="chart-body"></div>
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-header">
              <h3>用户角色分布</h3>
            </div>
            <div ref="roleChartRef" class="chart-body"></div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3>内容类型分布</h3>
            </div>
            <div ref="contentChartRef" class="chart-body"></div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3>积分排行榜 TOP5</h3>
            </div>
            <div class="ranking-list">
              <div
                v-for="(user, idx) in topUsers"
                :key="user.id || idx"
                class="ranking-item"
              >
                <span class="rank" :class="{ 'top-3': idx < 3 }">{{ idx + 1 }}</span>
                <n-avatar :size="32" :src="user.avatar" round>
                  {{ user.name?.[0] || user.username?.[0] || '?' }}
                </n-avatar>
                <span class="user-name">{{ user.name || user.username }}</span>
                <span class="user-score">{{ user.score || user.totalPoints || 0 }}分</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 实时动态 -->
      <section class="activity-section">
        <h2 class="section-title">最新学习动态</h2>
        <div class="activity-feed">
          <div
            v-for="(event, idx) in recentEvents"
            :key="idx"
            class="activity-item"
          >
            <div class="activity-icon" :style="{ background: getEventColor(event.type) }">
              {{ getEventIcon(event.type) }}
            </div>
            <div class="activity-content">
              <span class="activity-user">{{ event.user || event.username || '匿名' }}</span>
              <span class="activity-action">{{ event.action || '提交了' }}</span>
              <span class="activity-module">{{ event.module || event.type || '内容' }}</span>
            </div>
            <span class="activity-time">{{ formatTime(event.time || event.createdAt) }}</span>
          </div>
          <div v-if="recentEvents.length === 0" class="empty-feed">
            暂无动态
          </div>
        </div>
      </section>
    </main>

    <!-- 底部 -->
    <footer class="dashboard-footer">
      <span>苹湖少儿空间 · 数据看板</span>
      <span>© 2024-2026</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, NAvatar } from 'naive-ui'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import * as echarts from 'echarts'
import { analyticsAPI } from '@/api'

const router = useRouter()
const loading = ref(false)
const showMobileMenu = ref(false)
const lastUpdateTime = ref('-')
const dashboardData = ref(null)

// 图表refs
const trendChartRef = ref(null)
const pieChartRef = ref(null)
const roleChartRef = ref(null)
const contentChartRef = ref(null)

let trendChart = null
let pieChart = null
let roleChart = null
let contentChart = null

// 8大学习模块
const modules = computed(() => {
  const content = dashboardData.value?.contentStats || {}
  const studentGrowth = dashboardData.value?.studentGrowthStats || {}
  return [
    { key: 'diary', name: '日记', icon: '📝', total: content.diary || 0, today: content.todayDiary || 0, totalLabel: '篇', color: '#a855f7', bgColor: '#f3e8ff' },
    { key: 'math', name: '数学', icon: '🧮', total: studentGrowth.math?.total || 0, today: studentGrowth.math?.today || 0, totalLabel: '次', color: '#3b82f6', bgColor: '#dbeafe' },
    { key: 'recitation', name: '背诗', icon: '🎤', total: content.recitation || 0, today: 0, totalLabel: '首', color: '#f97316', bgColor: '#ffedd5' },
    { key: 'calligraphy', name: '书写', icon: '✍️', total: content.calligraphyWork || 0, today: 0, totalLabel: '幅', color: '#ec4899', bgColor: '#fce7f3' },
    { key: 'creative', name: '分享生活', icon: '📸', total: content.creativeWork || 0, today: 0, totalLabel: '条', color: '#14b8a6', bgColor: '#ccfbf1' },
    { key: 'questions', name: '勤学好问', icon: '❓', total: 0, today: 0, totalLabel: '次', color: '#8b5cf6', bgColor: '#ede9fe' },
    { key: 'typing', name: '打字训练', icon: '⌨️', total: studentGrowth.typing?.total || 0, today: studentGrowth.typing?.today || 0, totalLabel: '次', color: '#6366f1', bgColor: '#eef2ff' },
    { key: 'pinyin', name: '拼音练习', icon: '🔤', total: studentGrowth.pinyin?.total || 0, today: studentGrowth.pinyin?.today || 0, totalLabel: '次', color: '#0ea5e9', bgColor: '#e0f2fe' },
  ]
})

// 排行榜
const topUsers = computed(() => {
  return dashboardData.value?.topUsers?.slice(0, 5) || []
})

// 实时动态
const recentEvents = computed(() => {
  return dashboardData.value?.realtimeEvents?.slice(0, 8) || []
})

function getEventIcon(type) {
  const icons = { diary: '📝', math: '🧮', recitation: '🎤', calligraphy: '✍️', typing: '⌨️', pinyin: '🔤', default: '📌' }
  return icons[type] || icons.default
}

function getEventColor(type) {
  const colors = { diary: '#f3e8ff', math: '#dbeafe', recitation: '#ffedd5', calligraphy: '#fce7f3', typing: '#eef2ff', pinyin: '#e0f2fe', default: '#f3f4f6' }
  return colors[type] || colors.default
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

async function fetchData() {
  loading.value = true
  try {
    const res = await analyticsAPI.getPublicDashboard()
    if (res.success) {
      dashboardData.value = res.data
      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
      await nextTick()
      renderCharts()
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

function renderCharts() {
  renderTrendChart()
  renderPieChart()
  renderRoleChart()
  renderContentChart()
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const trend = dashboardData.value?.activityTrend || []
  const dates = trend.map(d => d.date?.slice(5) || '')
  const dau = trend.map(d => d.dau || 0)

  trendChart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', textStyle: { color: '#1f2937' } },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#9ca3af' } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af' } },
    series: [{
      type: 'line', data: dau, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { width: 3, color: '#6366f1' }, itemStyle: { color: '#6366f1' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }]) },
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
    { name: '书写', value: content.calligraphyWork || 0 },
    { name: '背诵', value: content.recitation || 0 },
    { name: '创意作品', value: content.creativeWork || 0 },
    { name: '日记分析', value: content.diaryAnalysis || 0 },
    { name: '作业', value: content.homework || 0 },
  ].filter(d => d.value > 0)

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  pieChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', textStyle: { color: '#1f2937' } },
    series: [{
      type: 'pie', radius: ['45%', '75%'], data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#6b7280' },
    }],
  })
}

function renderRoleChart() {
  if (!roleChartRef.value) return
  if (roleChart) roleChart.dispose()
  roleChart = echarts.init(roleChartRef.value)

  const roles = dashboardData.value?.userStats?.roleDistribution || {}
  const data = [
    { name: '学生', value: roles.STUDENT || 0 },
    { name: '家长', value: roles.PARENT || 0 },
    { name: '教师', value: roles.TEACHER || 0 },
    { name: '管理员', value: roles.ADMIN || 0 },
  ].filter(d => d.value > 0)

  roleChart.setOption({
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', textStyle: { color: '#1f2937' } },
    series: [{
      type: 'pie', radius: ['45%', '75%'], data,
      label: { show: true, formatter: '{b}: {c}人', fontSize: 11, color: '#6b7280' },
    }],
  })
}

function renderContentChart() {
  if (!contentChartRef.value) return
  if (contentChart) contentChart.dispose()
  contentChart = echarts.init(contentChartRef.value)

  const modulesData = modules.value
  contentChart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e5e7eb', textStyle: { color: '#1f2937' } },
    grid: { left: 80, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af' } },
    yAxis: { type: 'category', data: modulesData.map(m => m.name), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280' } },
    series: [{
      type: 'bar', data: modulesData.map((m, i) => ({ value: m.total, itemStyle: { color: m.color, borderRadius: [0, 6, 6, 0] } })),
      barWidth: '60%',
    }],
  })
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
  roleChart?.resize()
  contentChart?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  pieChart?.dispose()
  roleChart?.dispose()
  contentChart?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #fafbfc;
  color: #1f2937;
}

/* 头部 */
.dashboard-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-icon { font-size: 24px; }
.logo-text { font-size: 18px; font-weight: 600; color: #1f2937; }

.header-nav {
  display: flex;
  gap: 32px;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  padding: 8px 0;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.active {
  color: #6366f1;
}

.nav-link.active {
  border-bottom: 2px solid #6366f1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.update-time {
  font-size: 13px;
  color: #9ca3af;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
}

/* 主内容 */
.dashboard-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 24px 40px;
}

/* Hero区域 */
.hero-section {
  text-align: center;
  padding: 60px 0 40px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 20px;
  color: #6b7280;
  margin: 0 0 40px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 80px;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 48px;
  font-weight: 700;
  color: #6366f1;
  line-height: 1;
}

.stat-label {
  font-size: 15px;
  color: #9ca3af;
  margin-top: 8px;
}

/* 板块区域 */
.modules-section {
  margin-bottom: 60px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.module-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.module-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.3s;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: var(--accent);
}

.module-card:hover::before {
  opacity: 1;
}

.module-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}

.module-stats {
  display: flex;
  gap: 16px;
}

.module-stat {
  display: flex;
  flex-direction: column;
}

.module-stat .value {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.module-stat .label {
  font-size: 12px;
  color: #9ca3af;
}

/* 图表区域 */
.charts-section {
  margin-bottom: 60px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.charts-row:nth-child(2) {
  grid-template-columns: 1fr 1fr 1fr;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.chart-card.large {
  grid-column: span 1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.chart-body {
  height: 280px;
}

/* 排行榜 */
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
  border-radius: 12px;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #f3f4f6;
}

.rank {
  width: 24px;
  height: 24px;
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

.user-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.user-score {
  font-size: 14px;
  font-weight: 600;
  color: #6366f1;
}

/* 动态区域 */
.activity-section {
  margin-bottom: 40px;
}

.activity-feed {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 10px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  font-size: 14px;
  color: #6b7280;
}

.activity-user {
  font-weight: 600;
  color: #1f2937;
}

.activity-module {
  color: #6366f1;
  font-weight: 500;
}

.activity-time {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
}

.empty-feed {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

/* 底部 */
.dashboard-footer {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #9ca3af;
  border-top: 1px solid #e5e7eb;
}

/* 响应式 */
@media (max-width: 1200px) {
  .modules-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-row,
  .charts-row:nth-child(2) {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-nav,
  .header-actions {
    display: none;
  }
  .mobile-menu-btn {
    display: block;
  }
  .hero-title {
    font-size: 32px;
  }
  .hero-stats {
    gap: 40px;
  }
  .stat-value {
    font-size: 36px;
  }
  .modules-grid {
    grid-template-columns: 1fr;
  }
}
</style>
