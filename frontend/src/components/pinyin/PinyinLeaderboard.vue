<template>
  <div class="pinyin-leaderboard">
    <!-- 时间维度切换 -->
    <div class="period-tabs">
      <n-tabs v-model:value="period" type="segment" size="small" @update:value="loadLeaderboard">
        <n-tab name="today">今日</n-tab>
        <n-tab name="week">本周</n-tab>
        <n-tab name="month">本月</n-tab>
      </n-tabs>
    </div>

    <n-spin :show="loading">
      <div v-if="leaderboard.length > 0" class="leaderboard-list">
        <div
          v-for="item in leaderboard"
          :key="item.rank"
          class="leaderboard-item"
          :class="{ 'is-me': item.user.id === currentUserId }"
        >
          <div class="rank" :class="{ 'top-3': item.rank <= 3 }">
            <span v-if="item.rank <= 3" class="rank-medal">
              {{ ['🥇', '🥈', '🥉'][item.rank - 1] }}
            </span>
            <span v-else>{{ item.rank }}</span>
          </div>
          <div class="user-info">
            <n-avatar :size="32" :src="item.user.avatar" round>
              {{ (item.user.profile?.nickname || item.user.username || '?')[0] }}
            </n-avatar>
            <span class="username">
              {{ item.user.profile?.nickname || item.user.username }}
              <n-tag v-if="item.user.id === currentUserId" size="tiny" type="primary">我</n-tag>
            </span>
          </div>
          <div class="user-stats">
            <div class="stat-primary">{{ item.charCount }}字</div>
            <div class="stat-secondary">{{ item.practiceCount }}次 | {{ item.avgAccuracy }}%</div>
          </div>
        </div>
      </div>
      <n-empty v-else description="暂无排行数据" />
    </n-spin>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <n-pagination
        v-model:page="currentPage"
        :page-count="totalPages"
        size="small"
        @update:page="loadLeaderboard"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { pinyinAPI } from '@/api/index'

const message = useMessage()

const loading = ref(false)
const period = ref('week')
const leaderboard = ref([])
const currentUserId = ref(null)
const currentPage = ref(1)
const totalPages = ref(1)

async function loadLeaderboard() {
  loading.value = true
  try {
    const res = await pinyinAPI.leaderboard({
      period: period.value,
      page: currentPage.value,
      limit: 20,
    })
    if (res.success) {
      leaderboard.value = res.data.leaderboard
      totalPages.value = res.data.totalPages
      currentUserId.value = res.data.currentUserId || null
    }
  } catch (error) {
    message.error('获取排行榜失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLeaderboard()
})
</script>

<style scoped>
.pinyin-leaderboard {
  max-width: 600px;
  margin: 0 auto;
}

.period-tabs {
  margin-bottom: 16px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
}

.leaderboard-item.is-me {
  background: #f0faf4;
  border-color: #18a058;
}

.rank {
  width: 36px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #999;
}

.rank.top-3 {
  font-size: 22px;
}

.rank-medal {
  line-height: 1;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-stats {
  text-align: right;
  flex-shrink: 0;
}

.stat-primary {
  font-size: 16px;
  font-weight: bold;
  color: #18a058;
}

.stat-secondary {
  font-size: 11px;
  color: #999;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
