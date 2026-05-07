<template>
  <div class="space-y-6 pb-20">
    <!-- 页面标题和返回按钮 -->
    <div class="flex items-center gap-4">
      <n-button quaternary circle @click="goBack">
        <template #icon>
          <n-icon><ArrowBackOutline /></n-icon>
        </template>
      </n-button>
      <div>
        <h1 class="text-2xl font-bold text-gray-800">信用档案</h1>
        <p class="text-gray-500 mt-1">你的多维度行为评分系统</p>
      </div>
    </div>

    <n-spin :show="loading">
      <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 概览面板 -->
        <n-card class="col-span-1" style="background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);">
          <div class="text-center py-6">
            <div class="flex items-center justify-center mb-2">
              <n-icon size="24" class="mr-2 text-indigo-600">
                <ShieldCheckmarkOutline />
              </n-icon>
              <span class="text-lg font-medium text-gray-700">总信用分</span>
            </div>
            <div class="text-6xl font-bold mb-2 text-indigo-600">
              {{ creditProfile?.totalScore || 0 }}
            </div>
            <div class="text-sm text-gray-500 mb-6">
              综合评估（德、智、体、美、劳、群）
            </div>
          </div>
        </n-card>

        <!-- 雷达图面板 -->
        <n-card class="col-span-1 md:col-span-2">
          <div ref="radarChartRef" class="w-full h-64"></div>
        </n-card>
      </div>

      <!-- 近期动态与趋势 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <n-card title="近30天获得分数趋势">
          <div ref="trendChartRef" class="w-full h-64"></div>
        </n-card>

        <n-card title="行为影响记录 (近期)">
          <n-timeline>
            <n-timeline-item
              v-for="impact in recentImpacts"
              :key="impact.id"
              type="info"
              :title="impact.behavior?.description || impact.behavior?.action || '系统动作'"
              :time="formatDate(impact.createdAt)"
            >
              <div class="flex items-center gap-2 mt-2">
                <n-tag size="small" type="success" v-if="impact.rawPoints > 0">
                  +{{ impact.rawPoints }} 分 ({{ formatDimension(impact.dimension) }})
                </n-tag>
                <n-tag size="small" type="error" v-else-if="impact.rawPoints < 0">
                  {{ impact.rawPoints }} 分 ({{ formatDimension(impact.dimension) }})
                </n-tag>
                <span v-if="impact.behavior?.behaviorType === 'APPROVED_SUBMISSION'" class="text-xs text-indigo-500 font-medium">
                  [审核通过]
                </span>
              </div>
            </n-timeline-item>
            <n-empty v-if="recentImpacts.length === 0" description="暂无行为影响记录" />
          </n-timeline>
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { 
  NButton, NIcon, NCard, NSpin, NTag, NTimeline, NTimelineItem, NEmpty, useMessage
} from 'naive-ui';
import { 
  ArrowBackOutline, ShieldCheckmarkOutline
} from '@vicons/ionicons5';
import { creditAPI } from '@/api';

// ECharts 引入
import * as echarts from 'echarts/core';
import { RadarChart, LineChart } from 'echarts/charts';
import { 
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, RadarComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, 
  RadarComponent, RadarChart, LineChart, CanvasRenderer
]);

const router = useRouter();
const message = useMessage();
const loading = ref(true);

const radarChartRef = ref(null);
const trendChartRef = ref(null);
let radarChart = null;
let trendChart = null;

const creditProfile = ref(null);
const recentImpacts = ref([]);
const trendData = ref({});

const goBack = () => router.back();

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatDimension = (dim) => {
  const map = {
    MORALITY: '品德',
    INTELLIGENCE: '智慧',
    PHYSIQUE: '体质',
    AESTHETICS: '审美',
    LABOR: '劳动',
    SOCIETY: '社交'
  };
  return map[dim] || dim;
};

const initCharts = () => {
  // 雷达图
  if (radarChartRef.value) {
    radarChart = echarts.init(radarChartRef.value);
    const profile = creditProfile.value || {};
    
    radarChart.setOption({
      tooltip: {},
      radar: {
        indicator: [
          { name: '品德', max: 500 },
          { name: '智慧', max: 500 },
          { name: '体质', max: 500 },
          { name: '审美', max: 500 },
          { name: '劳动', max: 500 },
          { name: '社交', max: 500 }
        ],
        radius: '70%',
        splitArea: {
          areaStyle: {
            color: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1']
          }
        }
      },
      series: [{
        name: '信用多边形',
        type: 'radar',
        data: [{
          value: [
            profile.moralityScore || 0,
            profile.intelligenceScore || 0,
            profile.physiqueScore || 0,
            profile.aestheticsScore || 0,
            profile.laborScore || 0,
            profile.societyScore || 0
          ],
          name: '当前得分',
          areaStyle: { color: 'rgba(79, 70, 229, 0.4)' },
          lineStyle: { color: '#4f46e5', width: 2 },
          itemStyle: { color: '#4f46e5' }
        }]
      }]
    });
  }

  // 趋势图
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value);
    const dates = Object.keys(trendData.value).sort();
    const values = dates.map(d => trendData.value[d]);

    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { 
        type: 'category', 
        boundaryGap: false, 
        data: dates.map(d => d.slice(5)) // 显示 MM-DD
      },
      yAxis: { type: 'value' },
      series: [{
        name: '每日得分',
        type: 'line',
        data: values,
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 70, 229, 0.6)' },
            { offset: 1, color: 'rgba(79, 70, 229, 0.1)' }
          ])
        },
        itemStyle: { color: '#4f46e5' }
      }]
    });
  }
};

const fetchData = async () => {
  try {
    loading.value = true;
    const res = await creditAPI.getProfile();
    if (res.success) {
      creditProfile.value = res.profile;
      recentImpacts.value = res.recentImpacts;
      trendData.value = res.trend;
      
      await nextTick();
      initCharts();
    }
  } catch (error) {
    message.error('获取信用数据失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleResize = () => {
  radarChart?.resize();
  trendChart?.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  radarChart?.dispose();
  trendChart?.dispose();
});
</script>