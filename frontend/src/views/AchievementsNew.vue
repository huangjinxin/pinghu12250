<template>
  <div class="achievements-page">
    <!-- 顶部统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">{{ stats.totalUnlocked }}</div>
        <div class="stat-label">已解锁</div>
        <div class="stat-sub">/ {{ stats.totalAchievements }}</div>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <div class="stat-value">{{ stats.totalPoints }}</div>
        <div class="stat-label">成就积分</div>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <div class="stat-value" style="font-size: 28px;">{{ currentRank.icon }}</div>
        <div class="stat-label" :style="{ color: currentRank.color }">{{ currentRank.name }}</div>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <div class="stat-value">{{ stats.currentStreak }}</div>
        <div class="stat-label">连续天数</div>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="progress-bar-wrap">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="progress-text">{{ progressPercent }}%</span>
    </div>

    <!-- 最近解锁 -->
    <div v-if="recentUnlocked.length > 0" class="recent-section">
      <div class="section-label">最近解锁</div>
      <div class="recent-list">
        <div v-for="a in recentUnlocked" :key="a.code" class="recent-item" @click="showAchievementInfo(a)">
          <span class="recent-icon">{{ a.emoji }}</span>
          <span class="recent-name">{{ a.name }}</span>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <n-spin :show="loading" v-if="loading">
      <div class="loading-placeholder" />
    </n-spin>

    <template v-else>
      <!-- 8大任务卡片 -->
      <div class="task-grid">
        <div
          v-for="task in TASK_ACHIEVEMENT_MAP"
          :key="task.key"
          class="task-card"
          :class="{ active: selectedTask === task.key }"
          :style="{ '--card-color': task.color, '--card-bg': task.bgColor }"
          @click="selectTask(task.key)"
        >
          <div class="task-card-inner">
            <div class="task-icon-wrapper">
              <span class="task-icon">{{ task.icon }}</span>
              <div v-if="achievementsByTask[task.key]?.progress === 100 && achievementsByTask[task.key]?.total > 0" class="task-complete-badge">✓</div>
            </div>
            <div class="task-name">{{ task.name }}</div>
            <div class="task-progress-bar">
              <div class="task-progress-fill" :style="{ width: (achievementsByTask[task.key]?.progress || 0) + '%' }" />
            </div>
            <div class="task-count">
              <span class="task-unlocked">{{ achievementsByTask[task.key]?.unlocked || 0 }}</span>
              <span class="task-sep">/</span>
              <span class="task-total">{{ achievementsByTask[task.key]?.total || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 展开的任务成就详情 -->
      <transition name="slide">
        <div v-if="selectedTask && achievementsByTask[selectedTask]" class="task-detail">
          <div class="task-detail-header">
            <span class="task-detail-icon">{{ achievementsByTask[selectedTask].icon }}</span>
            <span class="task-detail-name">{{ achievementsByTask[selectedTask].name }}</span>
            <span class="task-detail-count">{{ achievementsByTask[selectedTask].unlocked }}/{{ achievementsByTask[selectedTask].total }}</span>
          </div>
          <div class="achievement-list">
            <div
              v-for="a in currentTaskAchievements"
              :key="a.code"
              class="achievement-item"
              :class="{ unlocked: a.unlocked }"
              @click="showAchievementInfo(a)"
            >
              <div class="ach-icon" :class="{ dim: !a.unlocked }">{{ a.emoji }}</div>
              <div class="ach-info">
                <div class="ach-name">{{ a.name }}</div>
                <div class="ach-desc">{{ a.description }}</div>
                <div class="ach-meta">
                  <span v-if="a.unlocked" class="ach-unlocked-tag">✓ {{ formatDate(a.unlockedAt) }}</span>
                  <span v-else class="ach-points">+{{ a.rewardPoints }} 积分</span>
                </div>
              </div>
              <div v-if="!a.unlocked && a.progress > 0" class="ach-progress-wrap">
                <div class="ach-progress-bar">
                  <div class="ach-progress-fill" :style="{ width: a.progress + '%' }" />
                </div>
                <span class="ach-progress-text">{{ a.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- 其他成就 -->
      <div v-if="otherAchievements.length > 0" class="other-section">
        <div class="section-label">其他成就</div>
        <div class="other-grid">
          <div
            v-for="a in otherAchievements"
            :key="a.code"
            class="other-item"
            :class="{ unlocked: a.unlocked }"
            @click="showAchievementInfo(a)"
          >
            <span class="other-icon" :class="{ dim: !a.unlocked }">{{ a.emoji }}</span>
            <div class="other-info">
              <div class="other-name">{{ a.name }}</div>
              <div class="other-desc">{{ a.description }}</div>
            </div>
            <span v-if="a.unlocked" class="other-check">✓</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAchievements, TASK_ACHIEVEMENT_MAP } from '@/composables/useAchievements';
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline';

const router = useRouter();
const message = useMessage();

const {
  loading,
  stats,
  recentUnlocked,
  currentRank,
  progressPercent,
  loadAchievements,
  selectedTask,
  selectTask,
  achievementsByTask,
  otherAchievements,
  currentTaskAchievements,
} = useAchievements();

function showAchievementInfo(a) {
  message.info(`成就：${a.name}\n${a.description}`);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

onMounted(() => {
  loadAchievements();
});
</script>

<style scoped>
.achievements-page {
  padding: 4px;
}
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  border-radius: 12px;
  padding: 12px 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  margin-bottom: 8px;
}
.stat-item {
  text-align: center;
  flex: 1;
}
.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}
.stat-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}
.stat-sub {
  font-size: 10px;
  color: #94a3b8;
}
.stat-divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
}
.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  border-radius: 3px;
  transition: width .6s ease;
}
.progress-text {
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
  min-width: 36px;
  text-align: right;
}
.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.recent-section {
  margin-bottom: 14px;
}
.recent-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 5px 12px 5px 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all .15s;
}
.recent-item:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(99,102,241,.12);
}
.recent-icon { font-size: 18px; }
.recent-name { font-size: 12px; font-weight: 600; color: #334155; white-space: nowrap; }

/* 8大任务卡片网格 */
.task-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.task-card {
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: all .2s;
  border: 2px solid #e2e8f0;
  overflow: hidden;
}
.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
}
.task-card.active {
  border-color: var(--card-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--card-color) 20%, transparent);
}
.task-card-inner {
  padding: 14px 10px 10px;
  text-align: center;
}
.task-icon-wrapper {
  position: relative;
  display: inline-block;
}
.task-icon {
  font-size: 36px;
  line-height: 1;
}
.task-complete-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  width: 18px;
  height: 18px;
  background: #10b981;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}
.task-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin: 6px 0 8px;
}
.task-progress-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}
.task-progress-fill {
  height: 100%;
  background: var(--card-color);
  border-radius: 2px;
  transition: width .5s ease;
}
.task-count {
  font-size: 12px;
}
.task-unlocked {
  font-weight: 800;
  color: var(--card-color);
}
.task-sep {
  color: #94a3b8;
  margin: 0 2px;
}
.task-total {
  color: #94a3b8;
  font-weight: 500;
}

/* 展开的任务详情 */
.task-detail {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  border: 2px solid var(--card-color, #6366f1);
  border-top: 3px solid var(--card-color, #6366f1);
}
.task-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}
.task-detail-icon { font-size: 28px; }
.task-detail-name { font-size: 16px; font-weight: 700; color: #1e293b; flex: 1; }
.task-detail-count { font-size: 14px; font-weight: 700; color: #94a3b8; }

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.achievement-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: all .15s;
  border: 1px solid transparent;
}
.achievement-item:hover {
  border-color: #e2e8f0;
  background: #fff;
}
.achievement-item.unlocked {
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border-color: #bbf7d0;
}
.ach-icon {
  font-size: 30px;
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}
.ach-icon.dim { filter: grayscale(1); opacity: .4; }
.ach-info { flex: 1; min-width: 0; }
.ach-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.ach-desc { font-size: 11px; color: #64748b; margin-top: 1px; }
.ach-meta { margin-top: 3px; }
.ach-unlocked-tag {
  font-size: 11px;
  color: #10b981;
  font-weight: 600;
}
.ach-points {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
}
.ach-progress-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ach-progress-bar {
  width: 50px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}
.ach-progress-fill {
  height: 100%;
  background: #6366f1;
  border-radius: 2px;
}
.ach-progress-text {
  font-size: 10px;
  font-weight: 600;
  color: #6366f1;
  min-width: 28px;
}

/* 其他成就 */
.other-section { margin-bottom: 10px; }
.other-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.other-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
}
.other-item:hover { border-color: #6366f1; }
.other-item.unlocked { border-color: #bbf7d0; background: #f0fdf4; }
.other-icon { font-size: 22px; flex-shrink: 0; }
.other-icon.dim { filter: grayscale(1); opacity: .4; }
.other-info { flex: 1; min-width: 0; }
.other-name { font-size: 12px; font-weight: 600; color: #1e293b; }
.other-desc { font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.other-check { color: #10b981; font-weight: 700; font-size: 14px; }

.loading-placeholder { height: 200px; }

/* 展开动画 */
.slide-enter-active, .slide-leave-active {
  transition: all .25s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式 */
@media (max-width: 700px) {
  .task-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .task-icon { font-size: 28px; }
}
@media (max-width: 460px) {
  .stats-bar { flex-wrap: wrap; gap: 4px; }
  .stat-item { min-width: 22%; }
  .stat-divider { display: none; }
  .other-grid { grid-template-columns: 1fr; }
}
</style>
