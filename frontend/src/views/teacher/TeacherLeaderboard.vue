<template>
  <div class="leaderboard-page">
    <div class="header">
      <h1 class="title">小老师信誉排行榜</h1>
      <p class="subtitle">致敬那些辛勤付出、认真审核的同学们</p>
    </div>

    <n-spin :show="loading">
      <n-card class="leaderboard-card">
        <n-list hoverable clickable v-if="leaderboard.length > 0">
          <n-list-item v-for="(item, index) in leaderboard" :key="item.teacherId">
            <template #prefix>
              <div class="rank" :class="`rank-${index + 1}`">
                <span v-if="index === 0">🏆</span>
                <span v-else-if="index === 1">🥈</span>
                <span v-else-if="index === 2">🥉</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
            </template>
            <n-thing>
              <template #header>
                <div class="user-header">
                  <n-avatar round :src="item.user?.avatar" size="small" />
                  <span class="username">{{ item.user?.profile?.nickname || item.user?.username }}</span>
                  <n-tag type="info" round size="small" class="level-tag">Lv.{{ item.level }}</n-tag>
                </div>
              </template>
              <template #description>
                <div class="stats-row">
                  <span>信誉分：<strong>{{ item.score }}</strong></span>
                  <n-divider vertical />
                  <span>总审核：{{ item.totalReviews }} 次</span>
                  <n-divider vertical />
                  <span>准确率：{{ item.totalReviews > 0 ? Math.round(item.correctReviews / item.totalReviews * 100) : 0 }}%</span>
                </div>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        
        <div v-else class="empty-state">
          <n-empty description="排行榜暂时为空" />
        </div>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { teacherAPI } from '@/api';

const message = useMessage();
const loading = ref(false);
const leaderboard = ref([]);

async function loadData() {
  loading.value = true;
  try {
    const res = await teacherAPI.getLeaderboard();
    if (res.success) {
      leaderboard.value = res.data;
    }
  } catch (error) {
    message.error(error.error || '加载排行榜失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.leaderboard-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}
.header {
  margin-bottom: 24px;
  text-align: center;
}
.title {
  margin: 0;
  font-size: 28px;
  color: #333;
}
.subtitle {
  color: #666;
  margin-top: 8px;
}
.leaderboard-card {
  border-radius: 12px;
}
.rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: #999;
}
.rank-1 { font-size: 24px; }
.rank-2 { font-size: 24px; }
.rank-3 { font-size: 24px; }

.user-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.username {
  font-size: 16px;
  font-weight: 500;
}
.level-tag {
  margin-left: 8px;
}
.stats-row {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 13px;
  margin-top: 8px;
}
.stats-row strong {
  color: #f2a900;
  font-size: 16px;
}
.empty-state {
  padding: 60px 0;
}
</style>
