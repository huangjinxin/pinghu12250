<template>
  <div class="leaderboard-container" :class="{ 'theme-light': isLightTheme }">
    <!-- 顶部导航 -->
    <header class="public-header">
      <div class="header-content">
        <div class="logo" @click="$router.push('/home')">
          <span class="logo-icon">🌟</span>
          <span class="logo-text">苹湖少儿空间</span>
        </div>
        <nav class="header-nav">
          <router-link to="/home" class="nav-link">首页</router-link>
          <router-link to="/dashboard" class="nav-link">数据概览</router-link>
          <router-link to="/leaderboard" class="nav-link active">排行</router-link>
          <router-link to="/gallery" class="nav-link">作品展示</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
        </nav>
        <div class="header-actions">
          <n-button quaternary size="small" @click="$router.push('/login')">登录</n-button>
          <n-button type="primary" size="small" @click="$router.push('/register')">注册</n-button>
        </div>
        <button class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
          <n-icon :size="24"><MenuOutline /></n-icon>
        </button>
      </div>
      <transition name="slide">
        <div v-if="showMobileMenu" class="mobile-menu">
          <router-link to="/home" class="mobile-nav-link" @click="showMobileMenu = false">首页</router-link>
          <router-link to="/dashboard" class="mobile-nav-link" @click="showMobileMenu = false">数据概览</router-link>
          <router-link to="/leaderboard" class="mobile-nav-link" @click="showMobileMenu = false">排行</router-link>
          <router-link to="/gallery" class="mobile-nav-link" @click="showMobileMenu = false">作品展示</router-link>
          <router-link to="/about" class="mobile-nav-link" @click="showMobileMenu = false">关于</router-link>
          <div class="mobile-actions">
            <n-button block @click="$router.push('/login'); showMobileMenu = false">登录</n-button>
            <n-button block type="primary" @click="$router.push('/register'); showMobileMenu = false">注册</n-button>
          </div>
        </div>
      </transition>
    </header>

    <!-- 顶部工具栏（统计+按钮一行） -->
    <header class="header">
      <div class="toolbar">
        <!-- 统计信息 -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ totalStudents }}</span>
            <span class="stat-label">总人数</span>
          </div>
          <div class="stat-item completed">
            <span class="stat-value">{{ completedCount }}</span>
            <span class="stat-label">全部完成</span>
          </div>
          <div class="stat-item pending">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">进行中</span>
          </div>
          <div class="stat-item not-started">
            <span class="stat-value">{{ notStartedCount }}</span>
            <span class="stat-label">未开始</span>
          </div>
        </div>
        <!-- 图例 -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot approved"></span>
            <span>完成</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot pending"></span>
            <span>待审</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot rejected"></span>
            <span>驳回</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot not-submitted"></span>
            <span>未交</span>
          </div>
        </div>
        <!-- 右侧按钮 -->
        <div class="toolbar-right">
          <div class="update-info">
            <span class="countdown">{{ refreshCountdown }}s</span>
          </div>
          <button class="theme-btn" @click="toggleTheme">
            <svg v-if="isLightTheme" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          <button class="refresh-btn" @click="loadData" :disabled="loading">
            <svg class="refresh-icon" :class="{ spinning: loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading && !leaderboard.length" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 排行榜卡片网格 -->
    <div v-else class="card-grid">
      <div
        v-for="(student, index) in leaderboard"
        :key="student.id"
        class="student-card"
        :class="getCardClass(student)"
      >
        <!-- 排名徽章 -->
        <div class="rank-badge" :class="getRankClass(index)">
          {{ index + 1 }}
        </div>

        <!-- 用户信息 -->
        <div class="student-info">
          <div class="avatar" :style="getAvatarStyle(student)">
            {{ student.name?.[0] || '?' }}
          </div>
          <div class="student-name">{{ student.name }}</div>
        </div>

        <!-- 挑战状态（一行三项，显示名字和状态） -->
        <div class="challenges-row">
          <div
            v-for="challenge in student.challenges"
            :key="challenge.id"
            class="challenge-item"
            :class="[`theme-${challenge.color}`, getStatusClass(challenge.status)]"
          >
            <div class="challenge-icon">
              <svg v-if="challenge.status === 'APPROVED'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else-if="challenge.status === 'PENDING'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <svg v-else-if="challenge.status === 'REJECTED'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span class="challenge-name">{{ challenge.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !leaderboard.length" class="empty-state">
      <p>暂无数据</p>
    </div>

    <!-- 底部信息 -->
    <footer class="footer">
      <p>最后更新: {{ formatTime(updateTime) }}</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { NIcon } from 'naive-ui';
import MenuOutline from '@vicons/ionicons5/es/MenuOutline';

// 状态
const loading = ref(false);
const leaderboard = ref([]);
const totalStudents = ref(0);
const updateTime = ref(null);
const refreshCountdown = ref(30);
const isLightTheme = ref(true); // 默认浅色主题
const showMobileMenu = ref(false);

// 刷新定时器
let refreshTimer = null;
let countdownTimer = null;

// 切换主题
function toggleTheme() {
  isLightTheme.value = !isLightTheme.value;
}

// 统计数据
const completedCount = computed(() => {
  return leaderboard.value.filter(s => s.approvedCount === 6).length;
});

// 进行中：只要有任何一项提交了（待审核或已通过，但未全部完成）
const pendingCount = computed(() => {
  return leaderboard.value.filter(s => {
    const hasAnySubmission = s.approvedCount > 0 || s.pendingCount > 0;
    const notCompleted = s.approvedCount < 6;
    return hasAnySubmission && notCompleted;
  }).length;
});

const notStartedCount = computed(() => {
  return leaderboard.value.filter(s => s.approvedCount === 0 && s.pendingCount === 0).length;
});

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const timezoneOffset = -new Date().getTimezoneOffset();
    const response = await fetch(`/api/public/leaderboard?timezoneOffset=${timezoneOffset}`);
    const data = await response.json();

    if (data.success) {
      leaderboard.value = data.data.leaderboard;
      totalStudents.value = data.data.totalStudents;
      updateTime.value = data.data.updateTime;
    }
  } catch (error) {
    console.error('加载排行榜失败:', error);
  } finally {
    loading.value = false;
  }
}

// 获取卡片样式类
function getCardClass(student) {
  if (student.approvedCount === 6) return 'completed';
  const hasRejected = student.challenges?.some(c => c.status === 'REJECTED');
  if (hasRejected) return 'has-rejected';
  if (student.approvedCount > 0 || student.pendingCount > 0) return 'in-progress';
  return 'not-started';
}

// 获取排名样式类
function getRankClass(index) {
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
  return '';
}

// 获取头像样式
function getAvatarStyle(student) {
  if (student.avatar) {
    return { backgroundImage: `url(${student.avatar})` };
  }
  return {};
}

// 获取状态样式类
function getStatusClass(status) {
  const classes = {
    APPROVED: 'status-approved',
    PENDING: 'status-pending',
    REJECTED: 'status-rejected',
    NOT_SUBMITTED: 'status-empty',
  };
  return classes[status] || 'status-empty';
}

// 格式化时间
function formatTime(time) {
  if (!time) return '--';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 开始自动刷新
function startAutoRefresh() {
  // 每30秒刷新数据
  refreshTimer = setInterval(() => {
    loadData();
    refreshCountdown.value = 30;
  }, 30000);

  // 倒计时
  countdownTimer = setInterval(() => {
    refreshCountdown.value = Math.max(0, refreshCountdown.value - 1);
  }, 1000);
}

// 停止自动刷新
function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

onMounted(() => {
  loadData();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.leaderboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 76px 12px 12px;
  color: #fff;
  transition: all 0.3s ease;
  overflow-x: hidden;
}

/* Header */
.public-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.header-nav {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
  padding: 8px 0;
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
  gap: 12px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-menu {
  display: none;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.mobile-nav-link {
  display: block;
  padding: 12px 0;
  color: #64748b;
  text-decoration: none;
  font-size: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

/* ========== 顶部工具栏 ========== */
.header {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  flex-wrap: wrap;
}

.stats-bar {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
}

.stat-item.completed .stat-value { color: #34d399; }
.stat-item.pending .stat-value { color: #fbbf24; }
.stat-item.not-started .stat-value { color: #9ca3af; }

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.legend {
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.approved { background: #34d399; }
.legend-dot.pending { background: #fbbf24; }
.legend-dot.rejected { background: #f87171; }
.legend-dot.not-submitted { background: rgba(255, 255, 255, 0.2); }

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.update-info {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.countdown {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: #a5b4fc;
}

.theme-btn, .refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover, .refresh-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.theme-btn svg, .refresh-btn svg {
  width: 18px;
  height: 18px;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ========== 卡片网格 ========== */
.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  overflow: hidden;
  align-items: start;
}

/* ========== 学生卡片（紧凑） ========== */
.student-card {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
}

.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.student-card.completed {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(16, 185, 129, 0.1));
  border-color: rgba(52, 211, 153, 0.4);
}

.student-card.in-progress {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.08));
  border-color: rgba(251, 191, 36, 0.3);
}

.student-card.has-rejected {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(239, 68, 68, 0.08));
  border-color: rgba(248, 113, 113, 0.4);
}

/* 排名徽章 */
.rank-badge {
  position: absolute;
  top: -6px;
  right: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1a1a2e;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #e5e7eb, #9ca3af);
  color: #1a1a2e;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
}

/* 用户信息 */
.student-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.student-name {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 挑战状态（两行三列） */
.challenges-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.challenge-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border-left: 3px solid transparent;
}

.challenge-item.theme-purple { border-left-color: #a855f7; }
.challenge-item.theme-blue { border-left-color: #3b82f6; }
.challenge-item.theme-orange { border-left-color: #f97316; }
.challenge-item.theme-pink { border-left-color: #ec4899; }
.challenge-item.theme-teal { border-left-color: #14b8a6; }
.challenge-item.theme-violet { border-left-color: #8b5cf6; }

.challenge-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.challenge-icon svg {
  width: 13px;
  height: 13px;
}

.challenge-item.status-approved .challenge-icon {
  background: #34d399;
  color: #fff;
}

.challenge-item.status-pending .challenge-icon {
  background: #fbbf24;
  color: #1a1a2e;
}

.challenge-item.status-rejected .challenge-icon {
  background: #f87171;
  color: #fff;
}

.challenge-item.status-empty .challenge-icon {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
}

.challenge-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ========== 浅色主题 ========== */
.theme-light {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #0f172a;
}

.theme-light .toolbar {
  background: #fff;
  border: 2px solid #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.theme-light .stat-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.theme-light .stat-value {
  font-size: 22px;
}

.theme-light .stat-item.completed .stat-value { color: #059669; }
.theme-light .stat-item.pending .stat-value { color: #d97706; }
.theme-light .stat-item.not-started .stat-value { color: #64748b; }

.theme-light .stat-label {
  color: #334155;
  font-weight: 600;
}

.theme-light .legend-item {
  color: #1e293b;
  font-weight: 600;
}

.theme-light .legend-dot.not-submitted {
  background: #94a3b8;
}

.theme-light .legend-dot.rejected {
  background: #ef4444;
}

.theme-light .update-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.theme-light .countdown {
  color: #4f46e5;
}

.theme-light .theme-btn,
.theme-light .refresh-btn {
  background: #fff;
  border: 2px solid #cbd5e1;
  color: #1e293b;
}

.theme-light .theme-btn:hover,
.theme-light .refresh-btn:hover {
  background: #f1f5f9;
}

.theme-light .student-card {
  background: #fff;
  border: 3px solid #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.theme-light .student-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #94a3b8;
}

.theme-light .student-card.completed {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-color: #34d399;
}

.theme-light .student-card.in-progress {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-color: #fbbf24;
}

.theme-light .student-card.has-rejected {
  background: linear-gradient(135deg, #fef2f2, #fecaca);
  border-color: #f87171;
}

.theme-light .rank-badge {
  background: #f1f5f9;
  color: #1e293b;
  border: 2px solid #cbd5e1;
  font-weight: 800;
}

.theme-light .student-name {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.theme-light .challenge-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.theme-light .challenge-item.status-empty .challenge-icon {
  background: #e2e8f0;
  color: #94a3b8;
}

.theme-light .challenge-item.status-rejected .challenge-icon {
  background: #fecaca;
  color: #dc2626;
}

.theme-light .challenge-name {
  color: #334155;
  font-weight: 600;
}

/* ========== 其他 ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.theme-light .loading-state {
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #a5b4fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.theme-light .loading-spinner {
  border-color: #e2e8f0;
  border-top-color: #4f46e5;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.theme-light .empty-state {
  color: #64748b;
}

.footer {
  text-align: center;
  padding: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.theme-light .footer {
  color: #94a3b8;
}

/* ========== 响应式 ========== */
@media (max-width: 1100px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-bar {
    justify-content: center;
  }

  .legend {
    justify-content: center;
  }

  .toolbar-right {
    justify-content: center;
    margin-left: 0;
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

  .mobile-menu {
    display: block;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
