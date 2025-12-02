<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">好友排行榜</h1>
        <p class="text-gray-500 mt-1">和好友一起进步</p>
      </div>
      <n-button @click="$router.back()">
        <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        返回
      </n-button>
    </div>

    <n-tabs v-model:value="period" type="line" animated @update:value="loadLeaderboard">
      <n-tab-pane name="daily" tab="今日" />
      <n-tab-pane name="weekly" tab="本周" />
      <n-tab-pane name="monthly" tab="本月" />
    </n-tabs>

    <n-spin :show="loading">
      <div v-if="leaderboard.length > 0" class="space-y-3">
        <n-card v-for="(user, index) in leaderboard" :key="user.id" size="small">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="rank-badge" :class="getRankClass(index)">
                {{ index + 1 }}
              </div>
              <AvatarText :username="user.username" size="md" />
              <div>
                <h3 class="font-bold">{{ user.profile?.nickname || user.username }}</h3>
                <p class="text-xs text-gray-500">{{ user.stats?.points || 0 }} 积分</p>
              </div>
            </div>
            <n-button size="small" @click="$router.push(`/users/${user.id}`)">
              查看主页
            </n-button>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="暂无数据" class="py-12" />
    </n-spin>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import { ArrowBackOutline } from '@vicons/ionicons5';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const period = ref('daily');
const leaderboard = ref([]);

const loadLeaderboard = async () => {
  loading.value = true;
  try {
    const response = await api.get('/follows/leaderboard', {
      params: { period: period.value }
    });
    leaderboard.value = response.leaderboard || [];
  } catch (error) {
    message.error(error.error || '加载排行榜失败');
  } finally {
    loading.value = false;
  }
};

const getRankClass = (index) => {
  if (index === 0) return 'rank-1';
  if (index === 1) return 'rank-2';
  if (index === 2) return 'rank-3';
  return 'rank-other';
};

onMounted(() => loadLeaderboard());
</script>

<style scoped>
.rank-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 18px;
}
.rank-1 { background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; }
.rank-2 { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #333; }
.rank-3 { background: linear-gradient(135deg, #cd7f32, #daa520); color: white; }
.rank-other { background: #e5e7eb; color: #666; }
</style>
