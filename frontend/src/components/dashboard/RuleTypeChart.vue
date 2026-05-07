<template>
  <div class="rule-type-chart" :class="{ 'theme-light': theme === 'light' }">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
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
let chart = null;

function initChart() {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  updateChart();
}

function updateChart() {
  if (!chart || !props.data.length) return;

  const isDark = props.theme === 'dark';
  const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
  const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  const categories = props.data.map((d) => d.name);
  const values = props.data.map((d) => d.totalSubmissions);

  const colors = [
    '#36cfc9', '#409eff', '#722ed1', '#f0a020', '#52c41a',
    '#ff4d4f', '#13c2c2', '#eb2f96', '#faad14', '#1890ff',
    '#2f54eb', '#fa541c',
  ];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = props.data[params[0].dataIndex];
        let html = `<b>${item.name}</b>: ${item.totalSubmissions}次<br/>`;
        item.templates.slice(0, 5).forEach((t) => {
          html += `<span style="color:#999">· ${t.name}: ${t.count}次</span><br/>`;
        });
        if (item.templates.length > 5) {
          html += `<span style="color:#666">...还有${item.templates.length - 5}项</span>`;
        }
        return html;
      },
    },
    grid: { left: 100, right: 30, top: 10, bottom: 30 },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: axisColor, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: categories.reverse(),
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: textColor, fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: values.reverse().map((v, i) => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colors[i % colors.length] },
              { offset: 1, color: colors[(i + 1) % colors.length] },
            ]),
          },
        })),
        barWidth: 16,
        label: {
          show: true,
          position: 'right',
          color: textColor,
          formatter: '{c}次',
        },
        animationDuration: 1500,
        animationEasing: 'elasticOut',
      },
    ],
  };

  chart.setOption(option);
}

function handleResize() {
  chart?.resize();
}

watch(() => props.data, updateChart, { deep: true });
watch(() => props.theme, updateChart);

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
});
</script>

<style scoped>
.rule-type-chart {
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
