<template>
  <div class="pinyin-records">
    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-cards">
      <n-grid :cols="4" :x-gap="8" :y-gap="8">
        <n-gi v-for="(s, key) in statsConfig" :key="key">
          <n-card size="small" :bordered="true">
            <div class="stat-card">
              <div class="stat-title">{{ s.label }}</div>
              <div class="stat-number">{{ stats[key]?.charCount || 0 }}</div>
              <div class="stat-sub">字 | {{ stats[key]?.practiceCount || 0 }}次</div>
              <div class="stat-acc">正确率 {{ stats[key]?.avgAccuracy || 0 }}%</div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </div>

    <!-- 记录列表 -->
    <n-spin :show="loading">
      <div v-if="practices.length > 0" class="records-list">
        <div v-for="p in practices" :key="p.id" class="record-item">
          <div class="record-main" @click="showDetail(p)">
            <div class="record-title">{{ p.title }}</div>
            <div class="record-meta">
              <n-tag size="tiny" type="info">{{ p.charCount }}字</n-tag>
              <n-tag size="tiny" :type="p.accuracy >= 90 ? 'success' : p.accuracy >= 70 ? 'warning' : 'error'">
                {{ p.accuracy }}%
              </n-tag>
              <span class="record-time">{{ formatDuration(p.duration) }}</span>
              <span class="record-date">{{ formatDate(p.createdAt) }}</span>
            </div>
          </div>
          <n-button size="tiny" quaternary type="error" @click.stop="handleDelete(p.id)">
            删除
          </n-button>
        </div>
      </div>
      <n-empty v-else description="暂无练习记录，开始你的第一次练习吧" />
    </n-spin>

    <!-- 详情模态框 -->
    <PinyinRecordDetail v-if="selectedRecord" :record="selectedRecord" @close="selectedRecord = null" />

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <n-pagination
        v-model:page="currentPage"
        :page-count="totalPages"
        size="small"
        @update:page="loadPractices"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { pinyinAPI } from '@/api/index'
import PinyinRecordDetail from './PinyinRecordDetail.vue'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const practices = ref([])
const stats = ref(null)
const currentPage = ref(1)
const totalPages = ref(1)
const selectedRecord = ref(null)

const statsConfig = {
  today: { label: '今日' },
  week: { label: '本周' },
  month: { label: '本月' },
  allTime: { label: '累计' },
}

async function loadPractices(page) {
  loading.value = true
  try {
    const res = await pinyinAPI.myList({ page: page || currentPage.value, limit: 20 })
    if (res.success) {
      practices.value = res.data.practices
      totalPages.value = res.data.totalPages
    }
  } catch (error) {
    message.error('获取记录失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await pinyinAPI.myStats()
    if (res.success) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

function showDetail(record) {
  selectedRecord.value = record
}

function handleDelete(id) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条练习记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const res = await pinyinAPI.delete(id)
        if (res.success) {
          message.success('已删除')
          loadPractices()
          loadStats()
        }
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

onMounted(() => {
  loadPractices()
  loadStats()
})

// 暴露刷新方法
defineExpose({ refresh: () => { loadPractices(); loadStats() } })
</script>

<style scoped>
.pinyin-records {
  max-width: 600px;
  margin: 0 auto;
}

.stats-cards {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.stat-title {
  font-size: 12px;
  color: #999;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #18a058;
}

.stat-sub {
  font-size: 11px;
  color: #666;
}

.stat-acc {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
}

.record-main {
  flex: 1;
  cursor: pointer;
  transition: opacity 0.2s;
}

.record-main:hover {
  opacity: 0.7;
}

.record-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 480px) {
  .stat-number {
    font-size: 18px;
  }
}
</style>
