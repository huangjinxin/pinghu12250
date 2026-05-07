<template>
  <div class="typing-leaderboard">
    <div class="period-tabs">
      <n-tabs v-model:value="period" type="segment" size="small" @update:value="loadLeaderboard">
        <n-tab name="today">今日</n-tab>
        <n-tab name="week">本周</n-tab>
        <n-tab name="month">本月</n-tab>
      </n-tabs>
    </div>

    <n-spin :show="loading">
      <div v-if="multiData" class="leaderboard-cards">
        <div v-for="(board, key) in multiData" :key="key" class="board-card">
          <n-card size="small" :bordered="true">
            <template #header>
              <span class="board-title">{{ board.icon }} {{ board.title }}</span>
            </template>
            <template #header-extra v-if="board.myRank">
              <n-tag size="tiny" type="primary">
                我的排名: #{{ board.myRank.rank }}
              </n-tag>
            </template>
            <div class="board-list">
              <div
                v-for="(item, idx) in board.top5"
                :key="item.user.id"
                class="board-item"
                :class="{ 'is-me': item.user.id === currentUserId }"
              >
                <div class="board-rank" :class="{ 'top-3': idx < 3 }">
                  <span v-if="idx === 0">🥇</span>
                  <span v-else-if="idx === 1">🥈</span>
                  <span v-else-if="idx === 2">🥉</span>
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <div class="board-user">
                  <n-avatar :size="24" :src="item.user.avatar" round>
                    {{ (item.user.profile?.nickname || item.user.username || '?')[0] }}
                  </n-avatar>
                  <span class="board-name">
                    {{ item.user.profile?.nickname || item.user.username }}
                  </span>
                </div>
                <div class="board-value">{{ getBoardValue(item, key) }}</div>
              </div>
              <div v-if="!board.top5.length" class="board-empty">暂无数据</div>
            </div>
          </n-card>
        </div>
      </div>

      <n-empty v-if="!loading && !multiData" description="暂无排行数据" />
    </n-spin>

    <!-- 传统排行榜（展开） -->
    <div class="classic-leaderboard">
      <n-divider>完整榜单</n-divider>
      <n-spin :show="classicLoading">
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
              <div class="stat-primary">{{ item.totalScore }}分</div>
              <div class="stat-secondary">{{ item.bestWpm }}WPM | {{ item.avgAccuracy }}%</div>
            </div>
          </div>
        </div>
        <n-empty v-else description="暂无排行数据" />
      </n-spin>

      <div v-if="totalPages > 1" class="pagination">
        <n-pagination
          v-model:page="currentPage"
          :page-count="totalPages"
          size="small"
          @update:page="loadClassicLeaderboard"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { typingAPI } from '@/api/index'

const message = useMessage()

const loading = ref(false)
const classicLoading = ref(false)
const period = ref('week')
const multiData = ref(null)
const leaderboard = ref([])
const currentUserId = ref(null)
const currentPage = ref(1)
const totalPages = ref(1)

const valueLabels = {
  totalScore: 'totalScore',
  bestWpm: 'bestWpm',
  avgAccuracy: 'avgAccuracy',
  bestCombo: 'bestCombo',
  practiceCount: 'practiceCount',
  avgWpm: 'avgWpm',
}

const valueFormatters = {
  totalScore: (v) => v.totalScore + '分',
  bestWpm: (v) => v.bestWpm + ' WPM',
  avgAccuracy: (v) => v.avgAccuracy + '%',
  bestCombo: (v) => 'x' + v.bestCombo,
  practiceCount: (v) => v.practiceCount + '次',
  avgWpm: (v) => v.avgWpm + ' WPM',
}

function getBoardValue(item, key) {
  return valueFormatters[key] ? valueFormatters[key](item) : item[key]
}

async function loadLeaderboard() {
  loading.value = true
  try {
    const res = await typingAPI.multiLeaderboard({ period: period.value })
    if (res.success) {
      multiData.value = res.data
    }
  } catch (error) {
    message.error('获取排行榜失败')
  } finally {
    loading.value = false
  }
  loadClassicLeaderboard()
}

async function loadClassicLeaderboard() {
  classicLoading.value = true
  try {
    const res = await typingAPI.leaderboard({
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
    classicLoading.value = false
  }
}

onMounted(() => {
  loadLeaderboard()
})
</script>

<style scoped>
.typing-leaderboard {
  max-width: 900px;
  margin: 0 auto;
}

.period-tabs {
  margin-bottom: 16px;
}

.leaderboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.board-card {
  min-width: 0;
}

.board-title {
  font-size: 15px;
  font-weight: bold;
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.board-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f9fafb;
}

.board-item.is-me {
  background: #eef2ff;
  border: 1px solid #6366f1;
}

.board-rank {
  width: 24px;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  color: #999;
}

.board-rank.top-3 {
  font-size: 16px;
}

.board-user {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.board-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-value {
  font-size: 14px;
  font-weight: bold;
  color: #6366f1;
  flex-shrink: 0;
}

.board-empty {
  text-align: center;
  color: #999;
  padding: 12px;
  font-size: 13px;
}

.classic-leaderboard {
  margin-top: 16px;
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
  background: #eef2ff;
  border-color: #6366f1;
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
  color: #6366f1;
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

@media (max-width: 600px) {
  .leaderboard-cards {
    grid-template-columns: 1fr;
  }
}
</style>
