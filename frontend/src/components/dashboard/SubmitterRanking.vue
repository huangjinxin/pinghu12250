<template>
  <div class="submitter-ranking" :class="{ 'theme-light': theme === 'light' }">
    <div v-if="data.length === 0" class="ranking-empty">暂无数据</div>
    <ul v-else class="ranking-list">
      <li v-for="item in data" :key="item.userId" class="ranking-item">
        <span class="rank-badge" :class="getRankClass(item.rank)">
          {{ item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `#${item.rank}` }}
        </span>
        <n-avatar :src="item.avatar" :size="28" round>
          {{ item.username?.charAt(0) }}
        </n-avatar>
        <span class="username">{{ item.username }}</span>
        <span class="count">{{ item.approvedCount }} 次</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { NAvatar } from 'naive-ui';

defineProps({
  data: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
});

function getRankClass(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}
</script>

<style scoped>
.submitter-ranking {
  height: 100%;
  overflow: hidden;
}

.ranking-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 100%;
  overflow-y: auto;
}

.ranking-list::-webkit-scrollbar {
  width: 4px;
}

.ranking-list::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.3);
  border-radius: 2px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.ranking-item:hover {
  background: rgba(64, 158, 255, 0.1);
}

.rank-badge {
  min-width: 32px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.rank-badge.gold { color: #ffd700; }
.rank-badge.silver { color: #c0c0c0; }
.rank-badge.bronze { color: #cd7f32; }

.username {
  flex: 1;
  color: #36cfc9;
  font-weight: 500;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  flex-shrink: 0;
}

.ranking-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px 0;
}

/* 亮色主题 */
.submitter-ranking.theme-light .ranking-item {
  background: rgba(0, 0, 0, 0.02);
}

.submitter-ranking.theme-light .ranking-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.submitter-ranking.theme-light .rank-badge {
  color: rgba(0, 0, 0, 0.5);
}

.submitter-ranking.theme-light .username {
  color: #1890ff;
}

.submitter-ranking.theme-light .count {
  color: rgba(0, 0, 0, 0.65);
}

.submitter-ranking.theme-light .ranking-empty {
  color: rgba(0, 0, 0, 0.4);
}
</style>
