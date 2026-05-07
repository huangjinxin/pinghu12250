<template>
  <div class="friend-requests">
    <n-tabs v-model:value="activeTab">
      <n-tab-pane name="received" tab="收到的申请">
        <div v-if="receivedRequests.length > 0" class="request-list">
          <div v-for="req in receivedRequests" :key="req.id" class="request-item">
            <n-avatar
              :src="req.fromUser.avatar"
              :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromUser.username}`"
              round
              :size="48"
            />
            <div class="request-info">
              <div class="user-name">{{ req.fromUser.profile?.nickname || req.fromUser.username }}</div>
              <div class="request-message" v-if="req.message">{{ req.message }}</div>
              <div class="request-time">{{ formatTime(req.createdAt) }}</div>
            </div>
            <div class="request-actions">
              <n-button size="small" type="primary" @click="handleAccept(req.id)" :loading="processing === req.id">
                接受
              </n-button>
              <n-button size="small" @click="handleReject(req.id)" :loading="processing === req.id">
                拒绝
              </n-button>
            </div>
          </div>
        </div>
        <n-empty v-else description="暂无好友申请" />
      </n-tab-pane>

      <n-tab-pane name="sent" tab="发出的申请">
        <div v-if="sentRequests.length > 0" class="request-list">
          <div v-for="req in sentRequests" :key="req.id" class="request-item">
            <n-avatar
              :src="req.toUser.avatar"
              :fallback-src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.toUser.username}`"
              round
              :size="48"
            />
            <div class="request-info">
              <div class="user-name">{{ req.toUser.profile?.nickname || req.toUser.username }}</div>
              <div class="request-time">{{ formatTime(req.createdAt) }}</div>
            </div>
            <n-tag :type="getStatusType(req.status)" size="small">
              {{ getStatusText(req.status) }}
            </n-tag>
          </div>
        </div>
        <n-empty v-else description="暂无发出的申请" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { friendAPI } from '@/api'

const activeTab = ref('received')
const receivedRequests = ref([])
const sentRequests = ref([])
const processing = ref(null)

const loadReceivedRequests = async () => {
  try {
    const res = await friendAPI.getReceivedRequests()
    receivedRequests.value = res.data || []
  } catch (error) {
    console.error('加载收到的申请失败:', error)
  }
}

const loadSentRequests = async () => {
  try {
    const res = await friendAPI.getSentRequests()
    sentRequests.value = res.data || []
  } catch (error) {
    console.error('加载发出的申请失败:', error)
  }
}

const handleAccept = async (requestId) => {
  processing.value = requestId
  try {
    await friendAPI.acceptRequest(requestId)
    window.$message?.success('已接受好友申请')
    await loadReceivedRequests()
  } catch (error) {
    window.$message?.error(error.response?.data?.error || '操作失败')
  } finally {
    processing.value = null
  }
}

const handleReject = async (requestId) => {
  processing.value = requestId
  try {
    await friendAPI.rejectRequest(requestId)
    window.$message?.success('已拒绝好友申请')
    await loadReceivedRequests()
  } catch (error) {
    window.$message?.error(error.response?.data?.error || '操作失败')
  } finally {
    processing.value = null
  }
}

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

const getStatusType = (status) => {
  const types = {
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'error',
    EXPIRED: 'default'
  }
  return types[status] || 'default'
}

const getStatusText = (status) => {
  const texts = {
    PENDING: '等待中',
    ACCEPTED: '已接受',
    REJECTED: '已拒绝',
    EXPIRED: '已过期'
  }
  return texts[status] || status
}

onMounted(() => {
  loadReceivedRequests()
  loadSentRequests()
})
</script>

<style scoped>
.friend-requests {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: white;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
}

.request-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.request-message {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

.request-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.request-actions {
  display: flex;
  gap: 8px;
}
</style>
