<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">成就中心</h1>
      <p class="text-gray-500 mt-1">收集徽章，展示成就</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <n-card><n-statistic label="已解锁" :value="stats.unlocked" /></n-card>
      <n-card><n-statistic label="总成就" :value="stats.total" /></n-card>
      <n-card><n-statistic label="完成度" :value="stats.percentage" suffix="%" /></n-card>
      <n-card><n-statistic label="稀有成就" :value="stats.rare" /></n-card>
    </div>

    <n-tabs v-model:value="activeCategory" type="line" animated @update:value="loadAchievements">
      <n-tab-pane name="all" tab="全部" />
      <n-tab-pane name="creative" tab="创作" />
      <n-tab-pane name="learning" tab="学习" />
      <n-tab-pane name="persistence" tab="坚持" />
      <n-tab-pane name="social" tab="社交" />
      <n-tab-pane name="special" tab="特殊" />
    </n-tabs>

    <n-spin :show="loading">
      <div v-if="achievements.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="achievement in achievements"
          :key="achievement.id"
          :class="['achievement-card', getRarityClass(achievement.rarity), { unlocked: achievement.unlocked }]"
          @click="handleAchievementClick(achievement)"
        >
          <div class="achievement-icon">{{ achievement.icon }}</div>
          <h3 class="achievement-name">{{ achievement.name }}</h3>
          <p class="achievement-desc">{{ achievement.description }}</p>
          <div v-if="!achievement.unlocked && achievement.progress !== undefined" class="mt-2">
            <n-progress type="line" :percentage="getProgressPercentage(achievement)" :show-indicator="false" />
          </div>
          <n-tag v-if="achievement.unlocked" type="success" size="tiny" class="mt-2">已解锁</n-tag>
        </div>
      </div>
      <n-empty v-else description="暂无成就" class="py-12" />
    </n-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const activeCategory = ref('all');
const achievements = ref([]);
const stats = reactive({ unlocked: 0, total: 0, percentage: 0, rare: 0 });

const loadAchievements = async () => {
  loading.value = true;
  try {
    const params = {};
    if (activeCategory.value !== 'all') params.category = activeCategory.value;
    const response = await api.get('/achievements/my', { params });
    achievements.value = response.achievements || [];
    if (response.stats) Object.assign(stats, response.stats);
  } catch (error) {
    message.error(error.error || '加载成就失败');
  } finally {
    loading.value = false;
  }
};

const getRarityClass = (rarity) => {
  const classes = {
    common: 'rarity-common',
    rare: 'rarity-rare',
    epic: 'rarity-epic',
    legendary: 'rarity-legendary'
  };
  return classes[rarity] || 'rarity-common';
};

const getProgressPercentage = (achievement) => {
  if (!achievement.target) return 0;
  return Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
};

const handleAchievementClick = (achievement) => {
  router.push(`/achievements/${achievement.id}`);
};

onMounted(() => loadAchievements());
</script>

<style scoped>
.achievement-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid;
  filter: grayscale(100%);
  opacity: 0.6;
}

.achievement-card.unlocked {
  filter: grayscale(0%);
  opacity: 1;
}

.achievement-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}

.achievement-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.achievement-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 12px;
  color: #666;
}

.rarity-common { border-color: #9ca3af; }
.rarity-rare { border-color: #3b82f6; }
.rarity-epic { border-color: #8b5cf6; }
.rarity-legendary { border-color: #f59e0b; }
</style>
