<template>
  <div ref="chartRef" class="area-chart"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps({
  data: { type: Array, default: () => [] },
  series: { type: Array, default: () => ['dau'] },
  stacked: { type: Boolean, default: false },
  theme: { type: String, default: 'dark' },
});

const chartRef = ref(null);
let chartInstance = null;

const isLight = computed(() => props.theme === 'light');

const seriesConfig = {
  dau: { name: '活跃用户', color: '#409eff' },
  newUsers: { name: '新增用户', color: '#36cfc9' },
  events: { name: '事件数', color: '#722ed1' },
  pageViews: { name: '页面浏览', color: '#f0a020' },
  total: { name: '总提交', color: '#722ed1' },
  approved: { name: '已通过', color: '#52c41a' },
  rejected: { name: '已拒绝', color: '#ff4d4f' },
};

function formatDate(dateStr) {
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
}

function updateChart() {
  if (!chartInstance || props.data.length === 0) return;

  const xData = props.data.map((item) => formatDate(item.date));
  const bgColor = isLight.value ? '#fff' : '#0a0e27';
  const textColor = isLight.value ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
  const subTextColor = isLight.value ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
  const lineColor = isLight.value ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const tooltipBg = isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(19, 26, 61, 0.95)';
  const tooltipText = isLight.value ? '#333' : '#fff';

  const seriesList = props.series.map((key) => {
    const config = seriesConfig[key] || { name: key, color: '#409eff' };
    return {
      name: config.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      stack: props.stacked ? 'total' : undefined,
      lineStyle: { color: config.color, width: 2 },
      itemStyle: { color: config.color, borderColor: bgColor, borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: config.color.replace(')', ', 0.4)').replace('rgb', 'rgba') },
          { offset: 1, color: config.color.replace(')', ', 0.05)').replace('rgb', 'rgba') },
        ]),
      },
      data: props.data.map((item) => item[key] || 0),
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    };
  });

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: 'rgba(64, 158, 255, 0.5)',
      textStyle: { color: tooltipText, fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: subTextColor } },
    },
    legend: {
      top: 5,
      right: 10,
      textStyle: { color: textColor, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: lineColor } },
      axisTick: { show: false },
      axisLabel: { color: subTextColor, fontSize: 10, interval: Math.floor(xData.length / 7) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: subTextColor, fontSize: 10 },
      splitLine: { lineStyle: { color: lineColor, type: 'dashed' } },
    },
    series: seriesList,
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
.area-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
