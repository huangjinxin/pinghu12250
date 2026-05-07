<template>
  <div class="challenges-container">
    <!-- 顶部横幅 -->
    <div class="hero-banner">
      <div class="hero-content">
        <h1>每日挑战</h1>
        <p>完成三项挑战，收获成长积分</p>
      </div>
      <div class="countdown-box">
        <div class="countdown-label">距离刷新</div>
        <div class="countdown-time">{{ countdown }}</div>
      </div>
    </div>

    <!-- 奖励规则说明（可折叠） -->
    <div class="reward-info-card">
      <div class="reward-info-header" @click="showRewardInfo = !showRewardInfo">
        <div class="reward-info-title">
          <n-icon size="18" color="#f59e0b"><TrophyOutline /></n-icon>
          <span>完成奖励规则</span>
        </div>
        <n-icon size="16" :class="{ 'rotate-180': showRewardInfo }">
          <ChevronDownOutline />
        </n-icon>
      </div>
      <n-collapse-transition :show="showRewardInfo">
        <div class="reward-info-body">
          <div class="reward-formula">
            <div class="formula-item">
              <span class="formula-label">基础奖励</span>
              <span class="formula-value">{{ rewardConfig.basePoints }}</span>
              <span class="formula-unit">积分</span>
            </div>
            <span class="formula-operator">+</span>
            <div class="formula-item">
              <span class="formula-label">连续奖励</span>
              <span class="formula-value">{{ rewardConfig.streakBonus }}</span>
              <span class="formula-unit">× 连续天数</span>
            </div>
          </div>
          <div class="reward-note">
            每日完成3项审核通过后可领取奖励，连续天数最高计算{{ rewardConfig.streakMaxDays }}天
          </div>
          <div class="reward-example">
            例：连续完成10天，可获得 {{ rewardConfig.basePoints }} + {{ rewardConfig.streakBonus }} × 10 = <strong>{{ rewardConfig.basePoints + rewardConfig.streakBonus * 10 }}</strong> 积分
          </div>
        </div>
      </n-collapse-transition>
    </div>

    <!-- 今日总览 -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-icon">🎯</div>
        <div class="stat-info">
          <div class="stat-value">{{ completedCount }}/3</div>
          <div class="stat-label">今日完成</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">⭐</div>
        <div class="stat-info">
          <div class="stat-value">+{{ todayPoints }}</div>
          <div class="stat-label">今日积分</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">🔥</div>
        <div class="stat-info">
          <div class="stat-value">{{ streakDays }}天</div>
          <div class="stat-label">连续完成</div>
        </div>
      </div>
    </div>

    <!-- 领取奖励区域 -->
    <div v-if="rewardStatus" class="reward-claim-section">
      <div v-if="rewardStatus.claimed" class="reward-claimed">
        <div class="claimed-icon">🎉</div>
        <div class="claimed-text">
          <div class="claimed-title">今日奖励已领取</div>
          <div class="claimed-detail">
            获得 {{ rewardStatus.claimedReward?.totalPoints }} 积分
            <span v-if="rewardStatus.claimedReward?.streakDays > 0">
              (含连续{{ rewardStatus.claimedReward?.streakDays }}天奖励)
            </span>
          </div>
        </div>
      </div>
      <div v-else-if="rewardStatus.canClaim" class="reward-can-claim" @click="claimReward">
        <div class="claim-animation">
          <div class="claim-icon">🎁</div>
          <div class="claim-sparkles">
            <span v-for="i in 6" :key="i" class="sparkle"></span>
          </div>
        </div>
        <div class="claim-text">
          <div class="claim-title">点击领取今日奖励</div>
          <div class="claim-detail">
            可获得 <strong>{{ rewardStatus.estimatedReward?.totalPoints }}</strong> 积分
            <span v-if="rewardStatus.estimatedReward?.streakDays > 0">
              (基础{{ rewardStatus.estimatedReward?.basePoints }} + 连续{{ rewardStatus.estimatedReward?.streakDays }}天×{{ rewardConfig.streakBonus }})
            </span>
          </div>
        </div>
        <n-spin v-if="claiming" size="small" class="ml-2" />
      </div>
      <div v-else class="reward-not-ready">
        <div class="not-ready-icon">📝</div>
        <div class="not-ready-text">
          还需完成 {{ 3 - rewardStatus.approvedCount }} 项审核通过后可领取奖励
        </div>
      </div>
    </div>

    <!-- 三项挑战 -->
    <div class="challenges-section">
      <h2 class="section-title">今日挑战</h2>
      <div v-if="loading" class="loading-state">
        <n-spin size="medium" />
        <p>加载中...</p>
      </div>
      <div v-else class="challenge-cards">
        <div
          v-for="item in challengeItems"
          :key="item.id"
          :class="['challenge-card', `theme-${item.colorClass}`, { completed: item.status === 'APPROVED' }]"
        >
          <div class="card-header">
            <div :class="['card-icon', `bg-${item.colorClass}`]">
              <n-icon size="28" color="#fff">
                <component :is="item.icon" />
              </n-icon>
            </div>
            <div class="card-points">
              <span class="points-value">+{{ item.points }}</span>
              <span class="points-label">积分</span>
            </div>
          </div>

          <div class="card-body">
            <h3 class="card-title">{{ item.name }}</h3>
            <p class="card-desc">{{ item.description }}</p>
          </div>

          <div class="card-footer">
            <div :class="['status-badge', getStatusClass(item.status)]">
              <n-icon size="14">
                <component :is="getStatusIcon(item.status)" />
              </n-icon>
              <span>{{ getStatusText(item.status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 近期记录 -->
    <div class="history-section">
      <div class="section-header">
        <h2 class="section-title">近期记录</h2>
        <span class="history-tip">最近7天</span>
      </div>
      <div v-if="loadingHistory" class="loading-state small">
        <n-spin size="small" />
      </div>
      <div v-else-if="historyDays.length === 0" class="empty-state">
        暂无记录
      </div>
      <div v-else class="history-list">
        <div
          v-for="day in historyDays"
          :key="day.date"
          class="history-item"
        >
          <div class="history-date">
            <div class="date-label">{{ formatDate(day.date) }}</div>
            <div :class="['completion-badge', { full: day.completedCount === 3 }]">
              {{ day.completedCount }}/3
            </div>
          </div>
          <div class="history-icons">
            <div
              v-for="item in challengeItems"
              :key="item.id"
              :class="['history-icon', `bg-${item.colorClass}`, { inactive: !day.completed[item.templateName] }]"
              :title="item.name"
            >
              <n-icon size="14" color="#fff">
                <component :is="item.icon" />
              </n-icon>
            </div>
          </div>
          <div class="history-points" v-if="day.points > 0">
            +{{ day.points }}
          </div>
        </div>
      </div>
    </div>

    <!-- 领取成功弹窗 -->
    <n-modal v-model:show="showClaimSuccess" :mask-closable="false">
      <div class="claim-success-modal">
        <div class="success-animation">
          <div class="success-icon">🎊</div>
          <div class="confetti-container">
            <span v-for="i in 20" :key="i" class="confetti" :style="{ '--i': i }"></span>
          </div>
        </div>
        <h2 class="success-title">恭喜领取成功！</h2>
        <div class="success-points">
          <span class="points-number">+{{ claimResult?.totalPoints }}</span>
          <span class="points-unit">积分</span>
        </div>
        <div class="success-breakdown" v-if="claimResult">
          <div class="breakdown-item">
            <span class="breakdown-label">基础奖励</span>
            <span class="breakdown-value">+{{ claimResult.basePoints }}</span>
          </div>
          <div class="breakdown-item" v-if="claimResult.streakPoints > 0">
            <span class="breakdown-label">连续{{ claimResult.streakDays }}天奖励</span>
            <span class="breakdown-value">+{{ claimResult.streakPoints }}</span>
          </div>
        </div>
        <n-button type="primary" size="large" @click="showClaimSuccess = false">
          太棒了！
        </n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import { submissionAPI } from '@/api';
import Book from '@vicons/ionicons5/es/Book'
import Calculator from '@vicons/ionicons5/es/Calculator'
import Newspaper from '@vicons/ionicons5/es/Newspaper'
import CheckmarkCircle from '@vicons/ionicons5/es/CheckmarkCircle'
import Time from '@vicons/ionicons5/es/Time'
import AlertCircle from '@vicons/ionicons5/es/AlertCircle'
import RadioButtonOff from '@vicons/ionicons5/es/RadioButtonOff'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'

const message = useMessage();

// 挑战项目配置
const challengeItems = ref([
  {
    id: 'diary',
    name: '写日记',
    description: '记录今天的所思所想，不少于800字',
    templateName: '日记(审批前提项/日)',
    icon: Book,
    color: '#a855f7',
    colorClass: 'purple',
    points: 200,
    submitLink: '/diaries',
    status: 'NOT_SUBMITTED',
  },
  {
    id: 'math',
    name: '数学学习',
    description: '完成可汗学院数学课程并截图',
    templateName: '可汗学院数学进度',
    icon: Calculator,
    color: '#3b82f6',
    colorClass: 'blue',
    points: 60,
    submitLink: '/submissions',
    status: 'NOT_SUBMITTED',
  },
  {
    id: 'poetry',
    name: '背诵古诗',
    description: '背诵一首古诗并录音提交',
    templateName: '背诗',
    icon: Newspaper,
    color: '#f97316',
    colorClass: 'orange',
    points: 55,
    submitLink: '/submissions',
    status: 'NOT_SUBMITTED',
  },
]);

// 状态
const loading = ref(true);
const loadingHistory = ref(true);
const countdown = ref('--:--:--');
const streakDays = ref(0);
const historyDays = ref([]);
let countdownTimer = null;

// 奖励规则说明折叠状态
const showRewardInfo = ref(false);

// 奖励配置
const rewardConfig = reactive({
  basePoints: 300,
  streakBonus: 88,
  streakMaxDays: 100
});

// 奖励领取状态
const rewardStatus = ref(null);
const claiming = ref(false);
const showClaimSuccess = ref(false);
const claimResult = ref(null);

// 计算属性
const completedCount = computed(() => {
  return challengeItems.value.filter(item => item.status === 'APPROVED').length;
});

const todayPoints = computed(() => {
  return challengeItems.value
    .filter(item => item.status === 'APPROVED')
    .reduce((sum, item) => sum + item.points, 0);
});

// 获取状态图标
function getStatusIcon(status) {
  const icons = {
    NOT_SUBMITTED: RadioButtonOff,
    PENDING: Time,
    APPROVED: CheckmarkCircle,
    REJECTED: AlertCircle,
  };
  return icons[status] || RadioButtonOff;
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    NOT_SUBMITTED: '未提交',
    PENDING: '待审核',
    APPROVED: '已完成',
    REJECTED: '已退回',
  };
  return texts[status] || '未提交';
}

// 获取状态样式类
function getStatusClass(status) {
  const classes = {
    NOT_SUBMITTED: 'status-empty',
    PENDING: 'status-pending',
    APPROVED: 'status-success',
    REJECTED: 'status-error',
  };
  return classes[status] || 'status-empty';
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 调整为9点边界
  today.setHours(9, 0, 0, 0);
  yesterday.setHours(9, 0, 0, 0);

  const dateOnly = new Date(date);
  dateOnly.setHours(9, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return '今天';
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return '昨天';
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

// 启动倒计时（到第二天9点）
function startCountdown() {
  const updateCountdown = () => {
    const now = new Date();
    // 计算到下一个9点的时间
    const next9am = new Date(now);
    if (now.getHours() >= 9) {
      // 今天9点已过，算明天9点
      next9am.setDate(next9am.getDate() + 1);
    }
    next9am.setHours(9, 0, 0, 0);

    const diff = next9am - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    countdown.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

// 加载今日状态
async function loadTodayStatus() {
  try {
    const templateNames = challengeItems.value.map(item => item.templateName).join(',');
    const timezoneOffset = -new Date().getTimezoneOffset();
    const response = await submissionAPI.getTodayStatus({ templateNames, timezoneOffset });

    const todayStatus = response.todayStatus || {};

    // 更新每个挑战的状态
    challengeItems.value.forEach(item => {
      const status = todayStatus[item.templateName];
      item.status = status?.status || 'NOT_SUBMITTED';
    });
  } catch (err) {
    console.error('加载今日状态失败:', err);
  } finally {
    loading.value = false;
  }
}

// 加载历史记录
async function loadHistory() {
  try {
    const templateNames = challengeItems.value.map(item => item.templateName).join(',');
    const timezoneOffset = -new Date().getTimezoneOffset();
    const response = await submissionAPI.getMyDashboardStats({
      templateNames,
      days: 7,
      timezoneOffset
    });

    // 处理历史数据
    if (response.byDate) {
      historyDays.value = Object.entries(response.byDate)
        .map(([date, data]) => ({
          date,
          completedCount: Object.keys(data.completed || {}).length,
          completed: data.completed || {},
          points: data.points || 0,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7);
    }

    // 计算连续天数
    streakDays.value = response.streakDays || 0;
  } catch (err) {
    console.error('加载历史记录失败:', err);
  } finally {
    loadingHistory.value = false;
  }
}

// 加载奖励配置
async function loadRewardConfig() {
  try {
    const res = await submissionAPI.getChallengeConfig();
    if (res.success && res.data) {
      rewardConfig.basePoints = res.data.basePoints ?? 300;
      rewardConfig.streakBonus = res.data.streakBonus ?? 88;
      rewardConfig.streakMaxDays = res.data.streakMaxDays ?? 100;
    }
  } catch (err) {
    console.error('加载奖励配置失败:', err);
  }
}

// 加载奖励领取状态
async function loadRewardStatus() {
  try {
    const timezoneOffset = -new Date().getTimezoneOffset();
    const res = await submissionAPI.getDailyRewardStatus({ timezoneOffset });
    if (res.success) {
      rewardStatus.value = res.data;
    }
  } catch (err) {
    console.error('加载奖励状态失败:', err);
  }
}

// 领取奖励
async function claimReward() {
  if (claiming.value || !rewardStatus.value?.canClaim) return;

  claiming.value = true;
  try {
    const timezoneOffset = -new Date().getTimezoneOffset();
    const res = await submissionAPI.claimDailyReward({ timezoneOffset });
    if (res.success) {
      claimResult.value = res.data;
      showClaimSuccess.value = true;
      // 重新加载状态
      await loadRewardStatus();
    }
  } catch (err) {
    message.error(err.error || '领取失败，请稍后重试');
  } finally {
    claiming.value = false;
  }
}

onMounted(() => {
  startCountdown();
  loadTodayStatus();
  loadHistory();
  loadRewardConfig();
  loadRewardStatus();
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style scoped>
.challenges-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 80px;
}

/* 顶部横幅 */
.hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 16px;
}

.hero-content h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.hero-content p {
  margin: 4px 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.countdown-box {
  text-align: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
}

.countdown-label {
  font-size: 12px;
  opacity: 0.9;
}

.countdown-time {
  font-size: 20px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 统计行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

/* 挑战卡片区 */
.challenges-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.challenge-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.challenge-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  transition: all 0.2s;
}

.challenge-card.theme-purple {
  border-left-color: #a855f7;
}

.challenge-card.theme-blue {
  border-left-color: #3b82f6;
}

.challenge-card.theme-orange {
  border-left-color: #f97316;
}

.challenge-card.completed {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon.bg-purple { background: linear-gradient(135deg, #a855f7, #7c3aed); }
.card-icon.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.card-icon.bg-orange { background: linear-gradient(135deg, #f97316, #ea580c); }

.card-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.points-value {
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
}

.points-label {
  font-size: 12px;
  color: #9ca3af;
}

.card-body {
  margin-bottom: 12px;
}

.card-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-empty {
  background: #f3f4f6;
  color: #6b7280;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-success {
  background: #d1fae5;
  color: #059669;
}

.status-error {
  background: #fee2e2;
  color: #dc2626;
}

/* 奖励规则说明卡片 */
.reward-info-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.reward-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.reward-info-header:hover {
  background: #f9fafb;
}

.reward-info-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.reward-info-header .n-icon {
  transition: transform 0.3s;
  color: #9ca3af;
}

.reward-info-header .rotate-180 {
  transform: rotate(180deg);
}

.reward-info-body {
  padding: 0 16px 16px;
}

.reward-formula {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  margin-bottom: 12px;
}

.formula-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.formula-label {
  font-size: 12px;
  color: #92400e;
}

.formula-value {
  font-size: 24px;
  font-weight: 700;
  color: #d97706;
}

.formula-unit {
  font-size: 11px;
  color: #92400e;
}

.formula-operator {
  font-size: 20px;
  font-weight: 600;
  color: #d97706;
}

.reward-note {
  font-size: 13px;
  color: #6b7280;
  text-align: center;
  margin-bottom: 8px;
}

.reward-example {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

.reward-example strong {
  color: #f59e0b;
  font-size: 14px;
}

/* 奖励领取区域 */
.reward-claim-section {
  margin-bottom: 20px;
}

.reward-claimed {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-radius: 12px;
}

.claimed-icon {
  font-size: 32px;
}

.claimed-title {
  font-size: 15px;
  font-weight: 600;
  color: #065f46;
}

.claimed-detail {
  font-size: 13px;
  color: #047857;
  margin-top: 2px;
}

.reward-can-claim {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  animation: pulse-glow 2s infinite;
}

.reward-can-claim:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5);
  }
}

.claim-animation {
  position: relative;
  width: 48px;
  height: 48px;
}

.claim-icon {
  font-size: 40px;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.claim-sparkles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #f59e0b;
  border-radius: 50%;
  animation: sparkle 1.5s infinite;
}

.sparkle:nth-child(1) { top: 0; left: 50%; animation-delay: 0s; }
.sparkle:nth-child(2) { top: 20%; left: 90%; animation-delay: 0.2s; }
.sparkle:nth-child(3) { top: 70%; left: 85%; animation-delay: 0.4s; }
.sparkle:nth-child(4) { top: 90%; left: 50%; animation-delay: 0.6s; }
.sparkle:nth-child(5) { top: 70%; left: 15%; animation-delay: 0.8s; }
.sparkle:nth-child(6) { top: 20%; left: 10%; animation-delay: 1s; }

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

.claim-text {
  flex: 1;
}

.claim-title {
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
}

.claim-detail {
  font-size: 13px;
  color: #b45309;
  margin-top: 4px;
}

.claim-detail strong {
  font-size: 18px;
  color: #d97706;
}

.reward-not-ready {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f3f4f6;
  border-radius: 12px;
}

.not-ready-icon {
  font-size: 24px;
}

.not-ready-text {
  font-size: 14px;
  color: #6b7280;
}

/* 领取成功弹窗 */
.claim-success-modal {
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  max-width: 320px;
  margin: 0 auto;
}

.success-animation {
  position: relative;
  height: 80px;
  margin-bottom: 16px;
}

.success-icon {
  font-size: 64px;
  animation: pop-in 0.5s ease-out;
}

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.confetti {
  position: absolute;
  width: 8px;
  height: 8px;
  top: 50%;
  left: 50%;
  animation: confetti-fall 1s ease-out forwards;
}

.confetti:nth-child(odd) {
  background: #f59e0b;
  border-radius: 50%;
}

.confetti:nth-child(even) {
  background: #6366f1;
  border-radius: 2px;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(
      calc((var(--i) - 10) * 15px),
      calc(var(--i) * 8px)
    ) rotate(calc(var(--i) * 45deg));
  }
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px;
}

.success-points {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 16px;
}

.points-number {
  font-size: 48px;
  font-weight: 700;
  color: #f59e0b;
}

.points-unit {
  font-size: 18px;
  color: #9ca3af;
}

.success-breakdown {
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.breakdown-label {
  color: #6b7280;
}

.breakdown-value {
  color: #059669;
  font-weight: 600;
}

/* 历史记录 */
.history-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-tip {
  font-size: 12px;
  color: #9ca3af;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 10px;
}

.history-date {
  min-width: 60px;
}

.date-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.completion-badge {
  font-size: 11px;
  color: #9ca3af;
}

.completion-badge.full {
  color: #059669;
  font-weight: 600;
}

.history-icons {
  display: flex;
  gap: 6px;
  flex: 1;
}

.history-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.history-icon.inactive {
  opacity: 0.25;
}

.history-icon.bg-purple { background: #a855f7; }
.history-icon.bg-blue { background: #3b82f6; }
.history-icon.bg-orange { background: #f97316; }

.history-points {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

/* 状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #9ca3af;
}

.loading-state.small {
  padding: 20px;
}

.loading-state p {
  margin: 8px 0 0;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
