import { ref, computed, onMounted, onUnmounted } from 'vue';
import { analyticsAPI } from '@/api';

export function useDashboardData(options = {}) {
  const { refreshInterval = 30000, isPublic = false } = options;

  const loading = ref(false);
  const error = ref(null);
  const dashboardData = ref(null);
  let refreshTimer = null;

  // 核心指标
  const coreStats = computed(() => {
    if (!dashboardData.value) return [];
    const { userStats, contentStats, pointsStats } = dashboardData.value;
    return [
      {
        key: 'totalUsers',
        title: '总用户数',
        value: userStats?.total || 0,
        growth: userStats?.growthRate || 0,
        icon: 'users',
        color: '#409eff',
      },
      {
        key: 'todayActive',
        title: '今日活跃',
        value: userStats?.todayActive || 0,
        growth: null,
        icon: 'flash',
        color: '#36cfc9',
      },
      {
        key: 'contentTotal',
        title: '内容总量',
        value: contentStats?.total || 0,
        growth: null,
        icon: 'document',
        color: '#722ed1',
      },
      {
        key: 'todayPoints',
        title: '今日积分',
        value: pointsStats?.todayIssued || 0,
        growth: null,
        icon: 'trophy',
        color: '#f0a020',
      },
    ];
  });

  // 用户角色分布
  const roleDistribution = computed(() => {
    if (!dashboardData.value?.userStats?.roleDistribution) return [];
    const dist = dashboardData.value.userStats.roleDistribution;
    return [
      { name: '学生', value: dist.STUDENT || 0 },
      { name: '家长', value: dist.PARENT || 0 },
      { name: '老师', value: dist.TEACHER || 0 },
      { name: '管理员', value: dist.ADMIN || 0 },
    ].filter((item) => item.value > 0);
  });

  // 内容类型分布
  const contentDistribution = computed(() => {
    if (!dashboardData.value?.contentStats?.distribution) return [];
    const dist = dashboardData.value.contentStats.distribution;
    const nameMap = {
      recitation: '背诵',
      diaryAnalysis: '日记AI分析',
      calligraphyWork: '书法',
      diary: '日记',
      creativeWork: '创意作品',
      homework: '作业',
      note: '笔记',
      htmlWork: 'HTML作品',
      poetryWork: '诗词',
    };
    return Object.entries(dist)
      .map(([key, value]) => ({ name: nameMap[key] || key, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  });

  // 活跃趋势
  const activityTrend = computed(() => dashboardData.value?.activityTrend || []);

  // 实时动态
  const realtimeEvents = computed(() => dashboardData.value?.realtimeEvents || []);

  // 积分排行
  const topUsers = computed(() => dashboardData.value?.topUsers || []);

  // 提交统计
  const submissionStats = computed(() => dashboardData.value?.submissionStats || null);

  // 提交概览
  const submissionOverview = computed(() => submissionStats.value?.overview || null);

  // 热门模板
  const topTemplates = computed(() => submissionStats.value?.topTemplates || []);

  // 提交趋势
  const submissionTrend = computed(() => submissionStats.value?.submissionTrend || []);

  // 活跃提交者
  const topSubmitters = computed(() => submissionStats.value?.topSubmitters || []);

  // 每日挑战统计
  const dailyChallengeStats = computed(() => submissionStats.value?.dailyChallengeStats || null);

  // 学生成长数据
  const studentGrowthStats = computed(() => dashboardData.value?.studentGrowthStats || null);

  // 背诵模块统计
  const recitationStats = computed(() => studentGrowthStats.value?.recitation || null);

  // 日记AI分析统计
  const diaryAnalysisStats = computed(() => studentGrowthStats.value?.diaryAnalysis || null);

  // 书法作品统计
  const calligraphyStats = computed(() => studentGrowthStats.value?.calligraphy || null);

  // 少儿画廊统计
  const galleryStats = computed(() => studentGrowthStats.value?.gallery || null);

  // 数学模块统计
  const mathStats = computed(() => studentGrowthStats.value?.math || null);

  // 诗词作品统计
  const poetryStats = computed(() => studentGrowthStats.value?.poetry || null);

  // 打字训练统计
  const typingStats = computed(() => studentGrowthStats.value?.typing || null);

  // 拼音练习统计
  const pinyinStats = computed(() => studentGrowthStats.value?.pinyin || null);

  // 奖罚类型统计
  const ruleTypeStats = computed(() => dashboardData.value?.ruleTypeStats || []);

  // 获取数据
  async function fetchData() {
    loading.value = true;
    error.value = null;
    try {
      const result = isPublic
        ? await analyticsAPI.getPublicDashboard()
        : await analyticsAPI.getDashboard();
      if (result.success) {
        dashboardData.value = result.data;
      } else {
        error.value = result.error || '获取数据失败';
      }
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  function startAutoRefresh() {
    if (refreshTimer) return;
    refreshTimer = setInterval(fetchData, refreshInterval);
  }

  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  onMounted(() => {
    fetchData();
    startAutoRefresh();
  });

  onUnmounted(() => {
    stopAutoRefresh();
  });

  return {
    loading,
    error,
    dashboardData,
    coreStats,
    roleDistribution,
    contentDistribution,
    activityTrend,
    realtimeEvents,
    topUsers,
    submissionStats,
    submissionOverview,
    topTemplates,
    submissionTrend,
    topSubmitters,
    dailyChallengeStats,
    studentGrowthStats,
    recitationStats,
    diaryAnalysisStats,
    calligraphyStats,
    galleryStats,
    mathStats,
    poetryStats,
    typingStats,
    pinyinStats,
    ruleTypeStats,
    fetchData,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
