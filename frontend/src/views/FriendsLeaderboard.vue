<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">学习榜</h1>
        <p class="text-gray-500 mt-1">和学伴一起进步</p>
      </div>
      <n-button @click="$router.back()">
        <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        返回
      </n-button>
    </div>

    <!-- 维度选择 -->
    <n-tabs v-model:value="dimension" type="segment" animated @update:value="loadLeaderboard">
      <n-tab-pane name="points" tab="积分" />
      <n-tab-pane name="diary" tab="日记" />
      <n-tab-pane name="streak" tab="连续" />
      <n-tab-pane name="learning" tab="学习" />
      <n-tab-pane name="works" tab="作品" />
      <n-tab-pane name="questions" tab="勤学好问" />
    </n-tabs>

    <!-- 时间范围 -->
    <n-radio-group v-model:value="period" size="small" @update:value="loadLeaderboard">
      <n-radio-button value="daily">今日</n-radio-button>
      <n-radio-button value="weekly">本周</n-radio-button>
      <n-radio-button value="monthly">本月</n-radio-button>
    </n-radio-group>

    <n-spin :show="loading">
      <div v-if="leaderboard.length > 0" class="space-y-3">
        <n-card v-for="item in leaderboard" :key="item.user?.id || item.rank" size="small">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="rank-badge" :class="getRankClass(item.rank)">
                {{ item.rank }}
              </div>
              <AvatarText :username="item.user?.username" size="md" />
              <div>
                <h3 class="font-bold">{{ item.user?.profile?.nickname || item.user?.username }}</h3>
                <p class="text-xs text-gray-500">
                  {{ item.value }} {{ item.label }}
                  <span v-if="item.extra" class="ml-1 text-gray-400">{{ item.extra }}</span>
                </p>
              </div>
            </div>
            <n-button size="small" @click="$router.push(`/users/${item.user?.id}`)">查看</n-button>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="暂无数据" class="py-12" />
    </n-spin>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { feedAPI } from '@/api'
import ArrowBackOutline from '@vicons/ionicons5/es/ArrowBackOutline'

const message = useMessage()
const loading = ref(false)
const dimension = ref('points')
const period = ref('weekly')
const leaderboard = ref([])

const loadLeaderboard = async () => {
  loading.value = true
  try {
    const res = await feedAPI.getLeaderboard({ dimension: dimension.value, period: period.value, limit: 20 })
    leaderboard.value = res.data?.leaderboard || []
  } catch (e) {
    message.error('加载排行榜失败')
  } finally {
    loading.value = false
  }
}

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return 'rank-other'
}

onMounted(() => loadLeaderboard())
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
