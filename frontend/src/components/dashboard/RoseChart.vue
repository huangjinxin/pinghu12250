<template>
  <div ref="chartRef" class="rose-chart"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps({
  data: { type: Array, default: () => [] },
  theme: { type: String, default: 'dark' },
});

const chartRef = ref(null);
let chartInstance = null;

const isLight = computed(() => props.theme === 'light');
const colors = ['#409eff', '#36cfc9', '#722ed1', '#f0a020', '#52c41a', '#ff4d4f', '#eb2f96'];

function updateChart() {
  if (!chartInstance || props.data.length === 0) return;

  const textColor = isLight.value ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
  const tooltipBg = isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(19, 26, 61, 0.95)';
  const tooltipText = isLight.value ? '#333' : '#fff';
  const borderColor = isLight.value ? '#fff' : '#0a0e27';

  chartInstance.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: 'rgba(64, 158, 255, 0.5)',
      textStyle: { color: tooltipText },
      formatter: '{b}: {c}',
    },
    legend: {
      bottom: 10,
      left: 'center',
      textStyle: { color: textColor, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
    },
    series: [
      {
        type: 'pie',
        radius: ['15%', '70%'],
        center: ['50%', '45%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 5,
          borderColor: borderColor,
          borderWidth: 1,
        },
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(64, 158, 255, 0.5)' },
        },
        data: props.data.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: colors[index % colors.length] },
        })),
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx) => idx * 80,
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
.rose-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
