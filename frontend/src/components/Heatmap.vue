<template>
  <div class="heatmap-container">
    <div class="flex justify-between text-xs text-gray-400 mb-2">
      <span>{{ months[0] }}</span>
      <span>{{ months[Math.floor(months.length / 2)] }}</span>
      <span>{{ months[months.length - 1] }}</span>
    </div>
    <div class="flex">
      <!-- 星期标签 -->
      <div class="flex flex-col justify-around text-xs text-gray-400 mr-1">
        <span>一</span>
        <span>三</span>
        <span>五</span>
      </div>
      <!-- 热力图格子 -->
      <div class="flex gap-[2px] flex-1">
        <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[2px]">
          <div
            v-for="(day, di) in week"
            :key="di"
            class="w-[10px] h-[10px] rounded-sm cursor-pointer"
            :class="getCellClass(day.count)"
            :title="day.date ? `${day.date}: ${day.count} 条记录` : ''"
          ></div>
        </div>
      </div>
    </div>
    <!-- 图例 -->
    <div class="flex items-center justify-end mt-2 text-xs text-gray-400">
      <span class="mr-1">少</span>
      <div class="w-[10px] h-[10px] rounded-sm bg-gray-100 mr-[2px]"></div>
      <div class="w-[10px] h-[10px] rounded-sm bg-green-200 mr-[2px]"></div>
      <div class="w-[10px] h-[10px] rounded-sm bg-green-400 mr-[2px]"></div>
      <div class="w-[10px] h-[10px] rounded-sm bg-green-600 mr-[2px]"></div>
      <div class="w-[10px] h-[10px] rounded-sm bg-green-800"></div>
      <span class="ml-1">多</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { format, subDays, startOfWeek, addDays } from 'date-fns';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const weeks = computed(() => {
  const result = [];
  const today = new Date();
  const start = startOfWeek(subDays(today, 364), { weekStartsOn: 1 });

  let currentWeek = [];
  let currentDate = start;

  while (currentDate <= today) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    currentWeek.push({
      date: dateStr,
      count: props.data[dateStr] || 0,
    });

    if (currentWeek.length === 7) {
      result.push(currentWeek);
      currentWeek = [];
    }
    currentDate = addDays(currentDate, 1);
  }

  if (currentWeek.length > 0) {
    // 补齐最后一周
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: 0 });
    }
    result.push(currentWeek);
  }

  return result;
});

const months = computed(() => {
  const result = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push(format(d, 'M月'));
  }
  return result;
});

const getCellClass = (count) => {
  if (count === 0) return 'bg-gray-100';
  if (count <= 2) return 'bg-green-200';
  if (count <= 4) return 'bg-green-400';
  if (count <= 6) return 'bg-green-600';
  return 'bg-green-800';
};
</script>
