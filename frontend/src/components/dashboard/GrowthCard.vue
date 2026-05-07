<template>
  <div class="growth-card" :class="{ 'theme-light': theme === 'light' }">
    <div class="card-header">
      <span class="card-icon">{{ icon }}</span>
      <span class="card-title">{{ title }}</span>
    </div>
    <div class="card-stats">
      <div class="stat-item main">
        <span class="stat-value">{{ formatNumber(data?.total || 0) }}</span>
        <span class="stat-label">{{ totalLabel }}</span>
      </div>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-value small">{{ data?.participants || 0 }}</span>
          <span class="stat-label">参与人数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value small">{{ data?.avgPerUser || 0 }}</span>
          <span class="stat-label">人均</span>
        </div>
        <div class="stat-item">
          <span class="stat-value small highlight">{{ data?.maxPerUser || 0 }}</span>
          <span class="stat-label">最多</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '📊' },
  data: { type: Object, default: null },
  totalLabel: { type: String, default: '总数' },
  theme: { type: String, default: 'dark' },
});

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}
</script>

<style scoped>
.growth-card {
  background: rgba(19, 26, 61, 0.8);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.growth-card:hover {
  border-color: #36cfc9;
  box-shadow: 0 0 20px rgba(54, 207, 201, 0.2);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

.card-icon {
  font-size: 20px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.card-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-item.main {
  margin-bottom: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #36cfc9;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
}

.stat-value.small {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
}

.stat-value.highlight {
  color: #f0a020;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-row {
  display: flex;
  justify-content: space-around;
}

/* 亮色主题 */
.growth-card.theme-light {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(64, 158, 255, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.growth-card.theme-light:hover {
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.2);
}

.growth-card.theme-light .card-title {
  color: rgba(0, 0, 0, 0.85);
}

.growth-card.theme-light .stat-value {
  color: #1890ff;
}

.growth-card.theme-light .stat-value.small {
  color: rgba(0, 0, 0, 0.85);
}

.growth-card.theme-light .stat-value.highlight {
  color: #fa8c16;
}

.growth-card.theme-light .stat-label {
  color: rgba(0, 0, 0, 0.45);
}
</style>
