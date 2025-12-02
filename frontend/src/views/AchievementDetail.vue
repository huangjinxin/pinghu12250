<template>
  <div class="space-y-6">
    <n-card v-if="achievement">
      <div class="text-center">
        <div class="achievement-icon-large">{{ achievement.icon }}</div>
        <h1 class="text-3xl font-bold mt-4">{{ achievement.name }}</h1>
        <p class="text-gray-600 mt-2">{{ achievement.description }}</p>
        <n-tag :type="getRarityType(achievement.rarity)" class="mt-4">
          {{ getRarityText(achievement.rarity) }}
        </n-tag>
        <div v-if="achievement.unlocked" class="mt-4">
          <n-tag type="success">已解锁于 {{ formatDate(achievement.unlockedAt) }}</n-tag>
        </div>
        <div v-else class="mt-4">
          <n-progress type="circle" :percentage="getProgressPercentage(achievement)" />
          <p class="text-sm text-gray-500 mt-2">{{ achievement.progress }} / {{ achievement.target }}</p>
        </div>
      </div>
    </n-card>
    <n-button block @click="$router.back()">返回</n-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';

const route = useRoute();
const message = useMessage();
const achievement = ref(null);

const loadAchievement = async () => {
  try {
    const response = await api.get(`/achievements/${route.params.id}`);
    achievement.value = response.achievement;
  } catch (error) {
    message.error(error.error || '加载成就失败');
  }
};

const getRarityType = (rarity) => {
  const types = { common: 'default', rare: 'info', epic: 'warning', legendary: 'error' };
  return types[rarity] || 'default';
};

const getRarityText = (rarity) => {
  const texts = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
  return texts[rarity] || rarity;
};

const getProgressPercentage = (achievement) => {
  if (!achievement.target) return 0;
  return Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

onMounted(() => loadAchievement());
</script>

<style scoped>
.achievement-icon-large {
  font-size: 120px;
}
</style>
