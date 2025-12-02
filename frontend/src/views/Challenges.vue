<template>
  <div class="challenges-page">
    <!-- 顶部横幅 -->
    <div class="challenge-header">
      <div class="header-left">
        <h1>每日挑战</h1>
        <p class="subtitle">完成挑战，赢取奖励</p>
      </div>
      <div class="header-right">
        <div class="countdown">
          <div class="countdown-icon">⏰</div>
          <div class="countdown-text">
            <div class="label">距离刷新</div>
            <div class="time">{{ countdown }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-label">本周完成</div>
          <div class="stat-value">{{ stats.weekCompleted || 0 }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-info">
          <div class="stat-label">连续天数</div>
          <div class="stat-value">{{ stats.streakDays || 0 }}天</div>
        </div>
      </div>
    </div>

    <!-- 今日挑战 -->
    <div class="today-challenges">
      <h2>今日挑战</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="challenges.length === 0" class="empty">暂无挑战</div>
      <div v-else class="challenge-list">
        <div
          v-for="challenge in challenges"
          :key="challenge.difficulty"
          :class="['challenge-card', `difficulty-${challenge.difficulty.toLowerCase()}`]"
        >
          <div class="challenge-badge">
            <span class="difficulty-label">
              {{ difficultyMap[challenge.difficulty] }}
            </span>
          </div>

          <div class="challenge-content">
            <h3>{{ challenge.template.title }}</h3>
            <p class="description">{{ challenge.template.description }}</p>

            <!-- 进度条 -->
            <div class="progress-section">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${getProgress(challenge.record)}%` }"
                ></div>
              </div>
              <div class="progress-text">
                {{ challenge.record.progress }} / {{ challenge.record.target }}
              </div>
            </div>

            <!-- 奖励信息 -->
            <div class="rewards">
              <div class="reward">
                <span class="reward-icon">⭐</span>
                <span class="reward-value">+{{ challenge.template.rewardPoints }}</span>
              </div>
              <div class="reward">
                <span class="reward-icon">💰</span>
                <span class="reward-value">+{{ challenge.template.rewardCoins }}</span>
              </div>
            </div>

            <!-- 状态和按钮 -->
            <div class="challenge-actions">
              <div v-if="challenge.record.status === 'COMPLETED'" class="status completed">
                <span class="status-icon">✓</span>
                已完成
              </div>
              <button
                v-if="challenge.record.status === 'COMPLETED' && !challenge.record.rewardClaimed"
                @click="claimReward(challenge.record.id)"
                :disabled="claiming === challenge.record.id"
                class="btn-claim"
              >
                {{ claiming === challenge.record.id ? '领取中...' : '领取奖励' }}
              </button>
              <div v-if="challenge.record.rewardClaimed" class="status claimed">
                <span class="status-icon">🎁</span>
                已领取
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录 Tab -->
    <div class="history-section">
      <div class="section-tabs">
        <button
          :class="['tab', { active: activeTab === 'today' }]"
          @click="activeTab = 'today'"
        >
          今日挑战
        </button>
        <button
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'; loadHistory()"
        >
          历史记录
        </button>
      </div>

      <div v-if="activeTab === 'history'" class="history-content">
        <div v-if="loadingHistory" class="loading">加载中...</div>
        <div v-else-if="history.length === 0" class="empty">暂无历史记录</div>
        <div v-else class="history-list">
          <div v-for="day in history" :key="day.date" class="history-day">
            <div class="day-header">
              <div class="date">{{ formatDate(day.date) }}</div>
              <div class="completion">
                {{ getCompletionCount(day.challenges) }} / 3 完成
              </div>
            </div>
            <div class="day-challenges">
              <div
                v-for="record in day.challenges"
                :key="record.id"
                class="history-challenge"
              >
                <div class="challenge-info">
                  <span :class="['difficulty-dot', record.difficulty.toLowerCase()]"></span>
                  <span class="title">{{ record.template.title }}</span>
                </div>
                <div v-if="record.status === 'COMPLETED'" class="completed-badge">
                  ✓ 已完成
                </div>
                <div v-else class="failed-badge">未完成</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api';

export default {
  name: 'Challenges',
  data() {
    return {
      challenges: [],
      stats: {},
      loading: true,
      activeTab: 'today',
      history: [],
      loadingHistory: false,
      claiming: null,
      countdown: '',
      difficultyMap: {
        EASY: '简单',
        MEDIUM: '中等',
        HARD: '困难',
      },
    };
  },
  mounted() {
    this.loadTodaysChallenges();
    this.startCountdown();
  },
  beforeUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },
  methods: {
    async loadTodaysChallenges() {
      try {
        this.loading = true;
        const response = await api.get('/challenges/today');
        this.challenges = response.challenges || [];
        this.stats = response.stats || {};
      } catch (error) {
        console.error('加载今日挑战失败:', error);
        this.$toast?.error('加载今日挑战失败');
      } finally {
        this.loading = false;
      }
    },

    async claimReward(recordId) {
      try {
        this.claiming = recordId;
        const response = await api.post(`/challenges/${recordId}/claim`);

        this.$toast?.success(`领取成功! 获得 ${response.points} 积分`);

        // 如果有连续奖励
        if (response.streakReward) {
          response.streakReward.forEach(reward => {
            this.$toast?.success(`连续 ${reward.days} 天奖励: ${reward.points} 积分!`);
          });
        }

        // 重新加载挑战
        await this.loadTodaysChallenges();
      } catch (error) {
        console.error('领取奖励失败:', error);
        this.$toast?.error(error.response?.data?.error || '领取奖励失败');
      } finally {
        this.claiming = null;
      }
    },

    async loadHistory() {
      try {
        this.loadingHistory = true;
        const response = await api.get('/challenges/history');
        this.history = response.history || [];
      } catch (error) {
        console.error('加载历史记录失败:', error);
        this.$toast?.error('加载历史记录失败');
      } finally {
        this.loadingHistory = false;
      }
    },

    getProgress(record) {
      if (!record) return 0;
      return Math.min(100, Math.floor((record.progress / record.target) * 100));
    },

    getCompletionCount(challenges) {
      return challenges.filter(c => c.status === 'COMPLETED').length;
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
      } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }
    },

    startCountdown() {
      const updateCountdown = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);

        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        this.countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      updateCountdown();
      this.countdownTimer = setInterval(updateCountdown, 1000);
    },
  },
};
</script>

<style scoped>
.challenges-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 顶部横幅 */
.challenge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 20px;
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.2);
  padding: 12px 20px;
  border-radius: 12px;
}

.countdown-icon {
  font-size: 24px;
}

.countdown-text .label {
  font-size: 12px;
  opacity: 0.9;
}

.countdown-text .time {
  font-size: 20px;
  font-weight: bold;
  font-family: monospace;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 36px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

/* 今日挑战 */
.today-challenges {
  margin-bottom: 30px;
}

.today-challenges h2 {
  margin-bottom: 20px;
  color: #333;
}

.challenge-list {
  display: grid;
  gap: 20px;
}

.challenge-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border-left: 4px solid;
}

.challenge-card.difficulty-easy {
  border-left-color: #10b981;
}

.challenge-card.difficulty-medium {
  border-left-color: #3b82f6;
}

.challenge-card.difficulty-hard {
  border-left-color: #8b5cf6;
}

.challenge-badge {
  padding: 12px 20px;
  background: #f8f9fa;
}

.difficulty-label {
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.difficulty-easy .difficulty-label {
  color: #10b981;
}

.difficulty-medium .difficulty-label {
  color: #3b82f6;
}

.difficulty-hard .difficulty-label {
  color: #8b5cf6;
}

.challenge-content {
  padding: 20px;
}

.challenge-content h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.description {
  color: #666;
  margin-bottom: 16px;
  font-size: 14px;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #666;
  text-align: right;
}

.rewards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.reward {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
}

.reward-icon {
  font-size: 18px;
}

.reward-value {
  color: #f59e0b;
}

.challenge-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
}

.status.completed {
  background: #d1fae5;
  color: #059669;
}

.status.claimed {
  background: #fef3c7;
  color: #d97706;
}

.btn-claim {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-claim:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-claim:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 历史记录 */
.section-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab {
  padding: 10px 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.tab.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-day {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.day-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.date {
  font-weight: bold;
  color: #333;
}

.completion {
  color: #666;
  font-size: 14px;
}

.day-challenges {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-challenge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.challenge-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.difficulty-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.difficulty-dot.easy {
  background: #10b981;
}

.difficulty-dot.medium {
  background: #3b82f6;
}

.difficulty-dot.hard {
  background: #8b5cf6;
}

.completed-badge {
  color: #059669;
  font-size: 14px;
  font-weight: bold;
}

.failed-badge {
  color: #dc2626;
  font-size: 14px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
