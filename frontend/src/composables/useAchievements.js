/**
 * 成就系统逻辑
 * 聚合所有类型的成就数据（日记 + 打字）
 */
import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { diaryGameAPI, typingAPI } from '@/api';
import { DIARY_ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/config/diaryAchievements';
import { TYPING_ACHIEVEMENTS, TYPING_ACHIEVEMENT_CATEGORIES } from '@/config/typingAchievements';

export function useAchievements() {
  const message = useMessage();

  // 加载状态
  const loading = ref(false);

  // 成就数据
  const achievements = ref([]);
  const stats = ref({
    totalUnlocked: 0,
    totalAchievements: 0,
    totalPoints: 0,
    currentStreak: 0,
    rank: 'bronze',
  });

  // 当前筛选类别
  const currentCategory = ref('all');

  // 类别列表（包含"全部"+ 日记类别 + 打字类别）
  const categories = computed(() => [
    { key: 'all', name: '全部', icon: '🏆' },
    ...ACHIEVEMENT_CATEGORIES,
    ...TYPING_ACHIEVEMENT_CATEGORIES,
  ]);

  // 筛选后的成就列表
  const filteredAchievements = computed(() => {
    if (currentCategory.value === 'all') {
      return achievements.value;
    }
    return achievements.value.filter(a => a.category === currentCategory.value);
  });

  // 已解锁成就
  const unlockedAchievements = computed(() =>
    filteredAchievements.value.filter(a => a.unlocked)
  );

  // 未解锁成就
  const lockedAchievements = computed(() =>
    filteredAchievements.value.filter(a => !a.unlocked)
  );

  // 最近解锁的成就（最多5个）
  const recentUnlocked = computed(() =>
    achievements.value
      .filter(a => a.unlocked && a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, 5)
  );

  // 加载成就数据
  const loadAchievements = async () => {
    loading.value = true;
    try {
      // 并行获取日记成就和打字成就
      const [diaryResult, typingResult, diaryStatsResult, typingStatsResult] = await Promise.all([
        diaryGameAPI.getAchievements().catch(() => ({ success: false })),
        typingAPI.getAchievements().catch(() => ({ success: false })),
        diaryGameAPI.getAchievementStats().catch(() => ({ success: false })),
        typingAPI.getAchievementStats().catch(() => ({ success: false })),
      ]);

      const allAchievements = [];

      // 合并日记成就
      if (diaryResult.success) {
        const diaryAchievements = DIARY_ACHIEVEMENTS.map(config => {
          const unlockData = diaryResult.data.find(d => d.code === config.code);
          return {
            ...config,
            unlocked: unlockData?.unlocked || false,
            unlockedAt: unlockData?.unlockedAt || null,
            progress: unlockData?.progress || 0,
          };
        });
        allAchievements.push(...diaryAchievements);
      }

      // 合并打字成就
      if (typingResult.success) {
        const typingAchievements = TYPING_ACHIEVEMENTS.map(config => {
          const unlockData = typingResult.data.find(d => d.code === config.code);
          return {
            ...config,
            unlocked: unlockData?.unlocked || false,
            unlockedAt: unlockData?.unlockedAt || null,
            progress: unlockData?.progress || 0,
          };
        });
        allAchievements.push(...typingAchievements);
      }

      achievements.value = allAchievements;

      // 合并统计
      const diaryStats = diaryStatsResult.success ? diaryStatsResult.data : {};
      const typingStats = typingStatsResult.success ? typingStatsResult.data : {};

      const totalUnlocked = (diaryStats.unlockedCount || 0) + (typingStats.unlockedCount || 0);
      const totalPoints = (diaryStats.totalPoints || 0) + (typingStats.totalPoints || 0);

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

  // 段位配置
  const rankConfig = {
    bronze: { name: '青铜', color: '#cd7f32', icon: '🥉' },
    silver: { name: '白银', color: '#c0c0c0', icon: '🥈' },
    gold: { name: '黄金', color: '#ffd700', icon: '🥇' },
    platinum: { name: '铂金', color: '#e5e4e2', icon: '💎' },
    diamond: { name: '钻石', color: '#b9f2ff', icon: '💠' },
    master: { name: '大师', color: '#9b59b6', icon: '👑' },
  };

  // 当前段位信息
  const currentRank = computed(() => rankConfig[stats.value.rank] || rankConfig.bronze);

  // 解锁进度百分比
  const progressPercent = computed(() => {
    if (stats.value.totalAchievements === 0) return 0;
    return Math.round((stats.value.totalUnlocked / stats.value.totalAchievements) * 100);
  });

  return {
    loading,
    achievements,
    stats,
    currentCategory,
    categories,
    filteredAchievements,
    unlockedAchievements,
    lockedAchievements,
    recentUnlocked,
    currentRank,
    progressPercent,
    loadAchievements,
  };
}
