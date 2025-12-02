<template>
  <div class="achievement-wall">
    <h3 class="text-lg font-bold mb-4">成就墙</h3>
    <div v-if="achievements.length > 0" class="flex flex-wrap gap-3">
      <div
        v-for="achievement in displayAchievements"
        :key="achievement.id"
        class="achievement-badge"
        :title="achievement.name"
      >
        <span class="badge-icon">{{ achievement.icon }}</span>
      </div>
      <n-button v-if="achievements.length > maxDisplay" text @click="showAll = !showAll">
        {{ showAll ? '收起' : `+${achievements.length - maxDisplay}` }}
      </n-button>
    </div>
    <p v-else class="text-gray-400 text-sm">暂无成就</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  achievements: { type: Array, default: () => [] },
  maxDisplay: { type: Number, default: 10 }
});

const showAll = ref(false);
const displayAchievements = computed(() => {
  return showAll.value ? props.achievements : props.achievements.slice(0, props.maxDisplay);
});
</script>

<style scoped>
.achievement-badge {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}
.achievement-badge:hover {
  transform: scale(1.1);
}
.badge-icon {
  font-size: 24px;
}
</style>
