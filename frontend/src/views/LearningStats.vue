<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学习统计</h1>
        <p class="text-gray-500 mt-1">数据可视化，洞察学习习惯</p>
      </div>
      <n-button @click="router.push('/learning-tracker')">
        返回学习追踪
      </n-button>
    </div>

    <!-- 概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div class="text-center">
          <p class="text-sm text-blue-600 font-medium">总学习时长</p>
          <p class="text-3xl font-bold text-blue-700 mt-2">{{ formatDuration(stats.totalDuration) }}</p>
        </div>
      </div>

      <div class="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div class="text-center">
          <p class="text-sm text-green-600 font-medium">学习次数</p>
          <p class="text-3xl font-bold text-green-700 mt-2">{{ stats.sessionCount }}</p>
        </div>
      </div>

      <div class="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div class="text-center">
          <p class="text-sm text-purple-600 font-medium">本周学习</p>
          <p class="text-3xl font-bold text-purple-700 mt-2">{{ formatDuration(stats.weekDuration) }}</p>
        </div>
      </div>

      <div class="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <div class="text-center">
          <p class="text-sm text-orange-600 font-medium">今日学习</p>
          <p class="text-3xl font-bold text-orange-700 mt-2">{{ formatDuration(stats.todayDuration) }}</p>
        </div>
      </div>
    </div>

    <!-- 学习热力图 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">学习热力图</h2>
        <n-select
          v-model:value="selectedYear"
          :options="yearOptions"
          style="width: 120px"
          @update:value="loadHeatmap"
        />
      </div>
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full">
          <div class="flex items-start space-x-2">
            <!-- 月份标签 -->
            <div class="flex flex-col justify-start pt-5">
              <div v-for="month in 12" :key="month" class="text-xs text-gray-500" style="height: 13px; line-height: 13px">
                {{ month }}月
              </div>
            </div>

            <!-- 热力图格子 -->
            <div class="flex space-x-1">
              <div v-for="week in heatmapWeeks" :key="week.start" class="flex flex-col space-y-1">
                <div
                  v-for="day in week.days"
                  :key="day.date"
                  class="w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-blue-400"
                  :style="{
                    backgroundColor: getHeatmapColor(day.duration)
                  }"
                  :title="`${day.date}: ${formatDuration(day.duration)}`"
                ></div>
              </div>
            </div>
          </div>

          <!-- 图例 -->
          <div class="flex items-center justify-end space-x-2 mt-4 text-xs text-gray-500">
            <span>少</span>
            <div class="w-3 h-3 rounded-sm bg-gray-100"></div>
            <div class="w-3 h-3 rounded-sm bg-green-200"></div>
            <div class="w-3 h-3 rounded-sm bg-green-400"></div>
            <div class="w-3 h-3 rounded-sm bg-green-600"></div>
            <div class="w-3 h-3 rounded-sm bg-green-800"></div>
            <span>多</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目时长占比饼图 -->
    <div class="card">
      <h2 class="text-xl font-bold text-gray-800 mb-4">项目时长占比</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 饼图 -->
        <div class="flex items-center justify-center">
          <svg width="300" height="300" viewBox="0 0 300 300">
            <g transform="translate(150, 150)">
              <path
                v-for="(segment, index) in pieSegments"
                :key="index"
                :d="segment.path"
                :fill="segment.color"
                class="transition-all hover:opacity-80 cursor-pointer"
                @mouseenter="hoveredProject = segment.project"
                @mouseleave="hoveredProject = null"
              >
                <title>{{ segment.project.name }}: {{ formatDuration(segment.project.totalDuration) }} ({{ segment.percentage.toFixed(1) }}%)</title>
              </path>
            </g>
            <!-- 中心文字 -->
            <text x="150" y="145" text-anchor="middle" class="text-lg font-semibold fill-gray-700">
              总时长
            </text>
            <text x="150" y="165" text-anchor="middle" class="text-2xl font-bold fill-gray-800">
              {{ formatDuration(stats.totalDuration) }}
            </text>
          </svg>
        </div>

        <!-- 图例 -->
        <div class="flex flex-col justify-center space-y-3">
          <div
            v-for="project in stats.projectStats"
            :key="project.id"
            class="flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer"
            :class="{
              'bg-gray-100': hoveredProject?.id === project.id,
              'hover:bg-gray-50': hoveredProject?.id !== project.id
            }"
            @mouseenter="hoveredProject = project"
            @mouseleave="hoveredProject = null"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-4 h-4 rounded"
                :style="{ backgroundColor: project.color }"
              ></div>
              <span class="font-medium text-gray-800">{{ project.name }}</span>
            </div>
            <div class="text-right">
              <p class="font-semibold text-gray-800">{{ formatDuration(project.totalDuration) }}</p>
              <p class="text-xs text-gray-500">{{ ((project.totalDuration / stats.totalDuration) * 100).toFixed(1) }}%</p>
            </div>
          </div>
          <n-empty v-if="stats.projectStats?.length === 0" description="暂无数据" size="small" />
        </div>
      </div>
    </div>

    <!-- 学习时长趋势折线图 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">学习时长趋势</h2>
        <n-select
          v-model:value="trendPeriod"
          :options="trendPeriodOptions"
          style="width: 150px"
          @update:value="loadTrendData"
        />
      </div>
      <div class="h-80">
        <svg width="100%" height="100%" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid meet">
          <!-- 网格线 -->
          <g>
            <line
              v-for="i in 5"
              :key="`grid-${i}`"
              :x1="60"
              :x2="780"
              :y1="40 + (i - 1) * 60"
              :y2="40 + (i - 1) * 60"
              stroke="#e5e7eb"
              stroke-width="1"
            />
          </g>

          <!-- Y轴标签 -->
          <g>
            <text
              v-for="(label, i) in yAxisLabels"
              :key="`y-label-${i}`"
              :x="50"
              :y="284 - i * 60"
              text-anchor="end"
              class="text-xs fill-gray-500"
            >
              {{ label }}
            </text>
          </g>

          <!-- 折线 -->
          <polyline
            v-if="trendPoints.length > 0"
            :points="trendPoints"
            fill="none"
            stroke="#3B82F6"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- 数据点 -->
          <g v-if="trendData.length > 0">
            <circle
              v-for="(point, index) in trendData"
              :key="`point-${index}`"
              :cx="60 + (index * (720 / (trendData.length - 1 || 1)))"
              :cy="280 - (point.duration / maxTrendValue * 240)"
              r="4"
              fill="#3B82F6"
              class="cursor-pointer transition-all hover:r-6"
            >
              <title>{{ point.label }}: {{ formatDuration(point.duration) }}</title>
            </circle>
          </g>

          <!-- X轴标签 -->
          <g>
            <text
              v-for="(point, index) in trendData"
              :key="`x-label-${index}`"
              v-if="index % Math.ceil(trendData.length / 10) === 0"
              :x="60 + (index * (720 / (trendData.length - 1 || 1)))"
              :y="305"
              text-anchor="middle"
              class="text-xs fill-gray-500"
            >
              {{ point.label }}
            </text>
          </g>

          <!-- 空状态 -->
          <text v-if="trendData.length === 0" x="400" y="160" text-anchor="middle" class="text-sm fill-gray-400">
            暂无数据
          </text>
        </svg>
      </div>
    </div>

    <!-- 排行榜 -->
    <div class="card">
      <h2 class="text-xl font-bold text-gray-800 mb-4">本周学习排行榜 TOP 10</h2>
      <div class="space-y-3">
        <div
          v-for="(user, index) in leaderboard"
          :key="user.user.id"
          class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            :class="{
              'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white': index === 0,
              'bg-gradient-to-br from-gray-300 to-gray-500 text-white': index === 1,
              'bg-gradient-to-br from-orange-400 to-orange-600 text-white': index === 2,
              'bg-blue-100 text-blue-600': index > 2
            }"
          >
            {{ index + 1 }}
          </div>
          <AvatarText :username="user.username" size="md" />
          <span class="flex-1 font-medium text-gray-800">{{ user.user.username }}</span>
          <div class="text-right">
            <p class="font-semibold text-blue-600">{{ formatDuration(user.totalDuration) }}</p>
            <p class="text-xs text-gray-500">本周学习</p>
          </div>
        </div>
        <n-empty v-if="leaderboard.length === 0" description="暂无排行数据" />
      </div>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { learningAPI } from '@/api';

const router = useRouter();
const message = useMessage();

const stats = ref({
  todayDuration: 0,
  weekDuration: 0,
  totalDuration: 0,
  sessionCount: 0,
  projectStats: [],
});
const leaderboard = ref([]);
const heatmapData = ref({});
const selectedYear = ref(new Date().getFullYear());
const hoveredProject = ref(null);
const trendPeriod = ref('week');
const trendData = ref([]);

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  return [
    { label: `${currentYear - 1}年`, value: currentYear - 1 },
    { label: `${currentYear}年`, value: currentYear },
  ];
});

const trendPeriodOptions = [
  { label: '最近7天', value: 'week' },
  { label: '最近30天', value: 'month' },
  { label: '最近90天', value: 'quarter' },
];

const formatDuration = (minutes) => {
  if (!minutes) return '0分钟';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

// 热力图相关
const heatmapWeeks = computed(() => {
  const weeks = [];
  const startDate = new Date(selectedYear.value, 0, 1);
  const endDate = new Date(selectedYear.value, 11, 31);

  // 调整到周一
  while (startDate.getDay() !== 1) {
    startDate.setDate(startDate.getDate() - 1);
  }

  let currentDate = new Date(startDate);
  while (currentDate <= endDate || weeks.length < 53) {
    const week = { start: currentDate.toISOString(), days: [] };
    for (let i = 0; i < 7; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      week.days.push({
        date: dateStr,
        duration: heatmapData.value[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
});

const getHeatmapColor = (duration) => {
  if (duration === 0) return '#ebedf0';
  if (duration < 30) return '#c6e48b';
  if (duration < 60) return '#7bc96f';
  if (duration < 120) return '#239a3b';
  return '#196127';
};

// 饼图相关
const pieSegments = computed(() => {
  if (!stats.value.projectStats || stats.value.projectStats.length === 0) {
    return [];
  }

  const total = stats.value.totalDuration;
  let currentAngle = -Math.PI / 2; // 从12点钟方向开始

  return stats.value.projectStats.map(project => {
    const percentage = (project.totalDuration / total) * 100;
    const angle = (project.totalDuration / total) * 2 * Math.PI;
    const radius = 120;

    const startX = Math.cos(currentAngle) * radius;
    const startY = Math.sin(currentAngle) * radius;

    currentAngle += angle;

    const endX = Math.cos(currentAngle) * radius;
    const endY = Math.sin(currentAngle) * radius;

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const path = [
      `M 0 0`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`
    ].join(' ');

    return {
      project,
      path,
      percentage,
      color: project.color,
    };
  });
});

// 趋势图相关
const maxTrendValue = computed(() => {
  if (trendData.value.length === 0) return 120;
  const max = Math.max(...trendData.value.map(d => d.duration));
  return Math.ceil(max / 60) * 60 || 120;
});

const yAxisLabels = computed(() => {
  const labels = [];
  for (let i = 0; i <= 4; i++) {
    const value = (maxTrendValue.value / 4) * i;
    labels.push(formatDuration(value));
  }
  return labels;
});

const trendPoints = computed(() => {
  if (trendData.value.length === 0) return '';

  return trendData.value
    .map((point, index) => {
      const x = 60 + (index * (720 / (trendData.value.length - 1 || 1)));
      const y = 280 - (point.duration / maxTrendValue.value * 240);
      return `${x},${y}`;
    })
    .join(' ');
});

const loadStats = async () => {
  try {
    const data = await learningAPI.getStats();
    stats.value = data;
  } catch (error) {
    message.error('加载统计数据失败');
  }
};

const loadLeaderboard = async () => {
  try {
    const data = await learningAPI.getLeaderboard();
    leaderboard.value = data.leaderboard || [];
  } catch (error) {
    console.error('加载排行榜失败:', error);
  }
};

const loadHeatmap = async () => {
  try {
    const data = await learningAPI.getHeatmap({ year: selectedYear.value });
    heatmapData.value = data.heatmapData || {};
  } catch (error) {
    console.error('加载热力图失败:', error);
  }
};

const loadTrendData = async () => {
  try {
    // 模拟趋势数据（实际应该从API获取）
    const days = trendPeriod.value === 'week' ? 7 : trendPeriod.value === 'month' ? 30 : 90;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        duration: heatmapData.value[dateStr] || 0,
      });
    }

    trendData.value = data;
  } catch (error) {
    console.error('加载趋势数据失败:', error);
  }
};

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadLeaderboard(),
    loadHeatmap(),
  ]);
  loadTrendData();
});
</script>
