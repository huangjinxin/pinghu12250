<template>
  <div ref="chartRef" class="ranking-bar"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  data: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
});

const chartRef = ref(null);
let chartInstance = null;

const isLight = computed(() => props.theme === 'light');
const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#409eff', '#409eff'];

function updateChart() {
  if (!chartInstance || props.data.length === 0) return;

  const textColor = isLight.value ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
  const tooltipBg = isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(19, 26, 61, 0.95)';
  const tooltipText = isLight.value ? '#333' : '#fff';

  const sortedData = [...props.data].reverse();
  const yData = sortedData.map((item) => item.username);
  const xData = sortedData.map((item) => item.totalPoints);

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: 'rgba(64, 158, 255, 0.5)',
      textStyle: { color: tooltipText },
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = sortedData[params[0].dataIndex];
        return `#${item.rank} ${item.username}<br/>积分: ${item.totalPoints.toLocaleString()}`;
      },
    },
    grid: { left: 80, right: 60, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: yData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 12,
        formatter: (value, index) => {
          const rank = sortedData.length - index;
          const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`;
          return `${medal} ${value}`;
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: xData.map((value, index) => {
          const rank = sortedData.length - index;
          return {
            value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: rankColors[Math.min(rank - 1, 4)] },
                { offset: 1, color: 'rgba(64, 158, 255, 0.3)' },
              ]),
              borderRadius: [0, 4, 4, 0],
            },
          };
        }),
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          color: textColor,
          fontSize: 11,
          formatter: (params) => params.value.toLocaleString(),
        },
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        animationDelay: (idx) => idx * 100,
      },
    ],
  });
}

function initChart() {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  updateChart();
}

function handleResize() {
  chartInstance?.resize();
}

watch(() => props.data, updateChart, { deep: true });
watch(() => props.theme, updateChart);

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped>
.ranking-bar {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
