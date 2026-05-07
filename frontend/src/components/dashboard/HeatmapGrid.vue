<template>
  <div class="overflow-x-auto pb-2">
    <div class="heatmap-grid">
      <div
        v-for="item in processedData"
        :key="item.date"
        :class="['heatmap-cell', getHeatmapClass(item.level)]"
        :title="`${item.date}: ${item.count}次提交`"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
});

const processedData = computed(() => {
  return props.data.map(item => ({
    ...item,
    level: getLevel(item.count),
  }));
});

function getLevel(count) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function getHeatmapClass(level) {
  const classes = [
    'bg-gray-100',
    'bg-green-200',
    'bg-green-300',
    'bg-green-400',
    'bg-green-500',
  ];
  return classes[level] || classes[0];
}
</script>

<style scoped>
.heatmap-grid {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  min-width: max-content;
}

.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  transition: transform 0.1s;
}

.heatmap-cell:hover {
  transform: scale(1.2);
}
</style>
