import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { diaryGameAPI, typingAPI } from '@/api';
import api from '@/api';
import { DIARY_ACHIEVEMENTS } from '@/config/diaryAchievements';
import { TYPING_ACHIEVEMENTS } from '@/config/typingAchievements';

// 8大任务配置（与首页 Home.vue 的 taskConfigs 保持一致）
export const TASK_ACHIEVEMENT_MAP = [
  { key: 'diary',       name: '日记',       icon: '📖', color: '#a855f7', bgColor: '#f3e8ff', prefix: 'DIARY_' },
  { key: 'math',        name: '数学',       icon: '📐', color: '#3b82f6', bgColor: '#dbeafe', prefix: 'MATH_' },
  { key: 'poetry',      name: '背诗',       icon: '📜', color: '#f97316', bgColor: '#ffedd5', prefix: 'POEM_' },
  { key: 'calligraphy', name: '书写',       icon: '✍️', color: '#ec4899', bgColor: '#fce7f3', prefix: 'CALLI_' },
  { key: 'moments',     name: '分享生活',   icon: '📸', color: '#14b8a6', bgColor: '#ccfbf1', prefix: 'MOMENT_' },
  { key: 'questions',   name: '勤学好问',   icon: '❓', color: '#8b5cf6', bgColor: '#ede9fe', prefix: 'ASK_' },
  { key: 'typing',      name: '打字训练',   icon: '⌨️', color: '#6366f1', bgColor: '#eef2ff', prefix: 'TYPING_' },
  { key: 'pinyin',      name: '拼音练习',   icon: '🔤', color: '#0ea5e9', bgColor: '#e0f2fe', prefix: 'PINYIN_' },
];

export function useAchievements() {
  const message = useMessage();

  const loading = ref(false);
  const selectedTask = ref(null); // 当前选中的任务卡片
  const achievements = ref([]);
  const stats = ref({
    totalUnlocked: 0,
    totalAchievements: 0,
    totalPoints: 0,
    currentStreak: 0,
    rank: 'bronze',
  });

  const recentUnlocked = computed(() =>
    achievements.value
      .filter(a => a.unlocked && a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, 5)
  );

  // 按任务分组
  const achievementsByTask = computed(() => {
    const map = {};
    for (const task of TASK_ACHIEVEMENT_MAP) {
      const taskAchs = achievements.value.filter(a => a.code && a.code.startsWith(task.prefix));
      const unlocked = taskAchs.filter(a => a.unlocked).length;
      map[task.key] = {
        ...task,
        achievements: taskAchs,
        total: taskAchs.length,
        unlocked,
        progress: taskAchs.length > 0 ? Math.round((unlocked / taskAchs.length) * 100) : 0,
      };
    }
    return map;
  });

  // 非任务类成就（通用/系统成就）
  const otherAchievements = computed(() => {
    const prefixes = TASK_ACHIEVEMENT_MAP.map(t => t.prefix);
    return achievements.value.filter(a => !prefixes.some(p => a.code && a.code.startsWith(p)));
  });

  // 当前选中的任务成就列表（按解锁状态排序）
  const currentTaskAchievements = computed(() => {
    if (!selectedTask.value) return [];
    const task = achievementsByTask.value[selectedTask.value];
    if (!task) return [];
    return [
      ...task.achievements.filter(a => a.unlocked),
      ...task.achievements.filter(a => !a.unlocked),
    ];
  });

  const loadAchievements = async () => {
    loading.value = true;
    try {
      const [diaryResult, typingResult, taskResult, diaryStatsResult, typingStatsResult] = await Promise.all([
        diaryGameAPI.getAchievements().catch(() => ({ success: false })),
        typingAPI.getAchievements().catch(() => ({ success: false })),
        api.get('/achievements').catch(() => ({ success: false })),
        diaryGameAPI.getAchievementStats().catch(() => ({ success: false })),
        typingAPI.getAchievementStats().catch(() => ({ success: false })),
      ]);

      const allAchievements = [];

      if (diaryResult.success) {
        allAchievements.push(...DIARY_ACHIEVEMENTS.map(config => {
          const unlockData = diaryResult.data.find(d => d.code === config.code);
          return {
            ...config,
            unlocked: unlockData?.unlocked || false,
            unlockedAt: unlockData?.unlockedAt || null,
            progress: unlockData?.progress || 0,
          };
        }));
      }

      if (typingResult.success) {
        allAchievements.push(...TYPING_ACHIEVEMENTS.map(config => {
          const unlockData = typingResult.data.find(d => d.code === config.code);
          return {
            ...config,
            unlocked: unlockData?.unlocked || false,
            unlockedAt: unlockData?.unlockedAt || null,
            progress: unlockData?.progress || 0,
          };
        }));
      }

      const taskData = taskResult;
      if (taskData?.success && taskData.achievements) {
        const systemPrefixes = TASK_ACHIEVEMENT_MAP.map(t => t.prefix);
        // 只取非任务的已有前缀（过滤掉系统级 DIARY_STREAK_* 等已在日记成就中定义的）
        const filteredTaskAchs = taskData.achievements.filter(a => {
          const hasPrefix = systemPrefixes.some(p => a.code.startsWith(p));
          if (!hasPrefix) return true;
          // 避免与日记/打字独立系统中的成就重复
          if (a.code.startsWith('DIARY_') || a.code.startsWith('TYPING_')) {
            return !allAchievements.some(ex => ex.code === a.code);
          }
          return true;
        });
        allAchievements.push(...filteredTaskAchs.map(a => ({
          code: a.code,
          name: a.name,
          description: a.description,
          emoji: a.icon,
          icon: a.icon,
          category: a.category ? a.category.toLowerCase() : 'special',
          rewardPoints: a.rewardPoints || 0,
          unlocked: a.isUnlocked || false,
          unlockedAt: a.unlockedAt || null,
          progress: a.progress?.percentage || 0,
          progressCurrent: a.progress?.current || 0,
          progressTarget: a.progress?.target || 0,
        })));
      }

      achievements.value = allAchievements;

      const diaryStats = diaryStatsResult.success ? diaryStatsResult : {};
      const typingStats = typingStatsResult.success ? typingStatsResult : {};

      const totalUnlocked = allAchievements.filter(a => a.unlocked).length;
      const totalPoints = allAchievements.reduce((s, a) => s + (a.unlocked ? (a.rewardPoints || 0) : 0), 0);

      stats.value = {
        totalUnlocked,
        totalAchievements: allAchievements.length,
        totalPoints,
        currentStreak: Math.max(diaryStats.currentStreak || 0, typingStats.currentStreak || 0),
        rank: diaryStats.rank || typingStats.rank || 'bronze',
      };
    } catch (error) {
      message.error('加载成就数据失败');
      console.error('加载成就失败:', error);
    } finally {
      loading.value = false;
    }
  };

  const rankConfig = {
    bronze: { name: '青铜', color: '#cd7f32', icon: '🥉' },
    silver: { name: '白银', color: '#c0c0c0', icon: '🥈' },
    gold: { name: '黄金', color: '#ffd700', icon: '🥇' },
    platinum: { name: '铂金', color: '#e5e4e2', icon: '💎' },
    diamond: { name: '钻石', color: '#b9f2ff', icon: '💠' },
    master: { name: '大师', color: '#9b59b6', icon: '👑' },
  };

  const currentRank = computed(() => rankConfig[stats.value.rank] || rankConfig.bronze);

  const progressPercent = computed(() => {
    if (stats.value.totalAchievements === 0) return 0;
    return Math.round((stats.value.totalUnlocked / stats.value.totalAchievements) * 100);
  });

  function selectTask(taskKey) {
    selectedTask.value = selectedTask.value === taskKey ? null : taskKey;
  }

  return {
    loading,
    achievements,
    stats,
    recentUnlocked,
    currentRank,
    progressPercent,
    loadAchievements,
    selectedTask,
    selectTask,
    achievementsByTask,
    otherAchievements,
    currentTaskAchievements,
  };
}
