<template>
  <div class="stat-card" :class="{ 'theme-light': theme === 'light' }" :style="{ '--accent-color': color }">
    <div class="stat-icon">
      <n-icon :size="28">
        <component :is="iconComponent" />
      </n-icon>
    </div>
    <div class="stat-content">
      <span class="stat-label">{{ title }}</span>
      <span class="stat-value" ref="valueRef">{{ formattedValue }}</span>
      <span class="stat-growth" :class="growthClass" v-if="growth !== null">
        <span class="growth-icon">{{ growth >= 0 ? '↑' : '↓' }}</span>
        {{ Math.abs(growth) }}%
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { NIcon } from 'naive-ui';
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import FlashOutline from '@vicons/ionicons5/es/FlashOutline'
import DocumentTextOutline from '@vicons/ionicons5/es/DocumentTextOutline'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: Number, default: 0 },
  growth: { type: Number, default: null },
  icon: { type: String, default: 'users' },
  color: { type: String, default: '#2080f0' },
  theme: { type: String, default: 'dark' },
  suffix: { type: String, default: '' },
});

const displayValue = ref(0);
const valueRef = ref(null);

const iconMap = {
  users: PeopleOutline,
  flash: FlashOutline,
  document: DocumentTextOutline,
  trophy: TrophyOutline,
  time: FlashOutline,
  checkmark: TrophyOutline,
};

const iconComponent = computed(() => iconMap[props.icon] || PeopleOutline);

const growthClass = computed(() => ({
  'growth-up': props.growth >= 0,
  'growth-down': props.growth < 0,
}));

const formattedValue = computed(() => {
  return displayValue.value.toLocaleString() + props.suffix;
});

// 数字滚动动画
function animateValue(start, end, duration = 1500) {
  const startTime = performance.now();
  const diff = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    displayValue.value = Math.round(start + diff * eased);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

watch(
  () => props.value,
  (newVal, oldVal) => {
    animateValue(oldVal || 0, newVal);
  }
);

onMounted(() => {
  animateValue(0, props.value);
});
</script>

<style scoped>
.stat-card {
  background: rgba(19, 26, 61, 0.8);
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), transparent);
}

.stat-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
  transform: translateY(-2px);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-color), rgba(64, 158, 255, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  font-family: 'DIN Alternate', 'Roboto Mono', monospace;
  letter-spacing: 1px;
}

.stat-growth {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.growth-up {
  color: #52c41a;
}

.growth-down {
  color: #ff4d4f;
}

.growth-icon {
  font-weight: bold;
}

/* 亮色主题 */
.stat-card.theme-light {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(64, 158, 255, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card.theme-light:hover {
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.2);
}

.stat-card.theme-light .stat-label {
  color: rgba(0, 0, 0, 0.5);
}

.stat-card.theme-light .stat-value {
  color: #1a1a2e;
}
</style>
