<template>
  <div class="template-ranking" :class="{ 'theme-light': theme === 'light' }">
    <div v-if="data.length === 0" class="ranking-empty">暂无数据</div>
    <ul v-else class="ranking-list">
      <li v-for="item in data" :key="item.templateId" class="ranking-item">
        <span class="rank-num">{{ item.rank }}</span>
        <div class="template-info">
          <span class="template-name">{{ item.name }}</span>
          <span class="template-meta">
            <span class="type-tag">{{ item.typeName }}</span>
            <span class="points">+{{ item.points }}分</span>
          </span>
        </div>
        <span class="count">{{ item.count }}次</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
});
</script>

<style scoped>
.template-ranking {
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
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
}

.ranking-item:hover {
  background: rgba(64, 158, 255, 0.1);
}

.rank-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.points {
  font-size: 11px;
  color: #f0a020;
}

.count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  flex-shrink: 0;
}

.ranking-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px 0;
}

/* 亮色主题 */
.template-ranking.theme-light .ranking-item {
  background: rgba(0, 0, 0, 0.02);
}

.template-ranking.theme-light .ranking-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.template-ranking.theme-light .template-name {
  color: rgba(0, 0, 0, 0.85);
}

.template-ranking.theme-light .count {
  color: rgba(0, 0, 0, 0.5);
}

.template-ranking.theme-light .ranking-empty {
  color: rgba(0, 0, 0, 0.4);
}
</style>
