<template>
  <div ref="chartRef" class="ring-chart"></div>
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
const colors = ['#409eff', '#36cfc9', '#722ed1', '#f0a020'];

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
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: textColor, fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: borderColor,
          borderWidth: 2,
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: textColor },
          itemStyle: { shadowBlur: 30, shadowColor: 'rgba(64, 158, 255, 0.5)' },
        },
        labelLine: { show: false },
        data: props.data.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: colors[index % colors.length] },
        })),
        animationType: 'scale',
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
.ring-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
