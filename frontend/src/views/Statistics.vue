<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">学习统计</h1>
      <p class="text-gray-500 mt-1">查看你的学习数据和成长记录</p>
    </div>

    <!-- 概览统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="card text-center">
        <div class="text-3xl font-bold text-primary-600">{{ stats.diaryCount || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">日记</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-green-600">{{ stats.htmlWorkCount || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">作品</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-purple-600">{{ stats.booksCount || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">书籍</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-blue-600">{{ stats.gamesCount || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">游戏</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-orange-600">{{ stats.homeworkCount || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">作业</div>
      </div>
      <div class="card text-center">
        <div class="text-3xl font-bold text-red-600">{{ stats.totalLikes || 0 }}</div>
        <div class="text-sm text-gray-600 mt-1">获赞</div>
      </div>
    </div>

    <!-- 学习热力图 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">学习热力图</h2>
        <n-select v-model:value="selectedYear" :options="yearOptions" style="width: 120px" @update:value="loadHeatmap" />
      </div>
      <Heatmap :data="heatmapData" />
      <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>总活动天数：{{ activeDays }} 天</span>
        <span>总记录数：{{ totalRecords }} 条</span>
      </div>
    </div>

    <!-- 月度趋势 -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">月度趋势</h2>
      <div class="h-64">
        <div class="flex h-full items-end justify-between gap-2">
          <div
            v-for="(month, index) in monthlyData"
            :key="index"
            class="flex-1 flex flex-col items-center"
          >
            <div
              class="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
              :style="{ height: getBarHeight(month.count) }"
              :title="`${month.name}: ${month.count} 条记录`"
            ></div>
            <span class="text-xs text-gray-500 mt-2">{{ month.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容分布 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 类型分布 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">内容分布</h2>
        <div class="space-y-3">
          <div v-for="item in distributionData" :key="item.name" class="flex items-center">
            <span class="w-20 text-sm text-gray-600">{{ item.name }}</span>
            <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden mx-3">
              <div
                class="h-full rounded-full transition-all"
                :class="item.color"
                :style="{ width: `${item.percentage}%` }"
              ></div>
            </div>
            <span class="w-12 text-sm text-gray-600 text-right">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">最近活动</h2>
        <div class="space-y-3">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="getActivityIconBg(activity.type)"
              >
                <n-icon size="16" :component="getActivityIcon(activity.type)" />
              </div>
              <div>
                <div class="text-sm font-medium text-gray-800">{{ activity.title }}</div>
                <div class="text-xs text-gray-500">{{ activity.typeName }}</div>
              </div>
            </div>
            <span class="text-xs text-gray-400">{{ formatDate(activity.createdAt) }}</span>
          </div>
          <n-empty v-if="recentActivities.length === 0" description="暂无活动" size="small" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { statsAPI, diaryAPI, noteAPI, readingNoteAPI, htmlWorkAPI } from '@/api';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  BookOutline,
  CodeSlashOutline,
  DocumentTextOutline,
  CreateOutline,
  SchoolOutline,
} from '@vicons/ionicons5';
import Heatmap from '@/components/Heatmap.vue';

const stats = ref({});
const heatmapData = ref({});
const monthlyData = ref([]);
const recentActivities = ref([]);

const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);

const yearOptions = computed(() => {
  const years = [];
  for (let y = currentYear; y >= currentYear - 2; y--) {
    years.push({ label: `${y}年`, value: y });
  }
  return years;
});

const activeDays = computed(() => Object.keys(heatmapData.value).length);
const totalRecords = computed(() => Object.values(heatmapData.value).reduce((sum, count) => sum + count, 0));

const totalContent = computed(() => {
  return (stats.value.diaryCount || 0) +
    (stats.value.htmlWorkCount || 0) +
    (stats.value.booksCount || 0) +
    (stats.value.gamesCount || 0) +
    (stats.value.homeworkCount || 0);
});

const distributionData = computed(() => {
  const total = totalContent.value || 1;
  return [
    {
      name: '日记',
      count: stats.value.diaryCount || 0,
      percentage: ((stats.value.diaryCount || 0) / total * 100).toFixed(1),
      color: 'bg-primary-500',
    },
    {
      name: '作品',
      count: stats.value.htmlWorkCount || 0,
      percentage: ((stats.value.htmlWorkCount || 0) / total * 100).toFixed(1),
      color: 'bg-green-500',
    },
    {
      name: '书籍',
      count: stats.value.booksCount || 0,
      percentage: ((stats.value.booksCount || 0) / total * 100).toFixed(1),
      color: 'bg-purple-500',
    },
    {
      name: '游戏',
      count: stats.value.gamesCount || 0,
      percentage: ((stats.value.gamesCount || 0) / total * 100).toFixed(1),
      color: 'bg-blue-500',
    },
    {
      name: '作业',
      count: stats.value.homeworkCount || 0,
      percentage: ((stats.value.homeworkCount || 0) / total * 100).toFixed(1),
      color: 'bg-orange-500',
    },
  ];
});

const getBarHeight = (count) => {
  const max = Math.max(...monthlyData.value.map(m => m.count), 1);
  return `${(count / max * 100)}%`;
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

const getActivityIcon = (type) => {
  const icons = {
    diary: CreateOutline,
    work: CodeSlashOutline,
    note: DocumentTextOutline,
    readingNote: BookOutline,
    homework: SchoolOutline,
  };
  return icons[type] || DocumentTextOutline;
};

const getActivityIconBg = (type) => {
  const colors = {
    diary: 'bg-primary-100 text-primary-600',
    work: 'bg-green-100 text-green-600',
    note: 'bg-purple-100 text-purple-600',
    readingNote: 'bg-blue-100 text-blue-600',
    homework: 'bg-orange-100 text-orange-600',
  };
  return colors[type] || 'bg-gray-100 text-gray-600';
};

const loadStats = async () => {
  try {
    const data = await statsAPI.getOverview();
    stats.value = data;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

const loadHeatmap = async () => {
  try {
    const data = await statsAPI.getHeatmap({ year: selectedYear.value });
    heatmapData.value = data.heatmapData || data;

    // 计算月度数据
    const monthly = {};
    for (let i = 1; i <= 12; i++) {
      monthly[i] = 0;
    }

    Object.entries(heatmapData.value).forEach(([date, count]) => {
      const month = new Date(date).getMonth() + 1;
      monthly[month] += count;
    });

    monthlyData.value = Object.entries(monthly).map(([month, count]) => ({
      name: `${month}月`,
      count,
    }));
  } catch (error) {
    console.error('加载热力图失败:', error);
  }
};

const loadRecentActivities = async () => {
  try {
    const [diaries, works, notes, readingNotes] = await Promise.all([
      diaryAPI.getDiaries({ limit: 3 }),
      htmlWorkAPI.getWorks({ limit: 3, myOnly: true }),
      noteAPI.getNotes(),
      readingNoteAPI.getReadingNotes(),
    ]);

    const activities = [
      ...(diaries.diaries || []).map(d => ({ ...d, type: 'diary', typeName: '日记' })),
      ...(works.works || []).map(w => ({ ...w, type: 'work', typeName: '作品' })),
      ...(notes.notes || []).slice(0, 3).map(n => ({ ...n, type: 'note', typeName: '笔记' })),
      ...(readingNotes.readingNotes || []).slice(0, 3).map(r => ({
        ...r,
        type: 'readingNote',
        typeName: '读书笔记',
        title: r.bookTitle
      })),
    ];

    recentActivities.value = activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  } catch (error) {
    console.error('加载最近活动失败:', error);
  }
};

onMounted(() => {
  loadStats();
  loadHeatmap();
  loadRecentActivities();
});
</script>
