<template>
  <div class="conversation-list">
    <div v-if="conversations.length === 0" class="empty">
      <n-empty description="暂无会话" size="small" />
    </div>
    <div
      v-for="conv in filteredConversations"
      :key="conv.id"
      class="conversation-item"
      :class="{ active: conv.id === selectedId }"
      @click="$emit('select', conv.id)"
    >
      <n-avatar :src="conv.avatar" round size="medium" />
      <div class="conv-info">
        <div class="conv-header">
          <span class="conv-name">{{ conv.nickname || conv.username }}</span>
          <span class="conv-time">{{ formatTime(conv.lastMessageTime) }}</span>
        </div>
        <div class="conv-preview">
          <span class="preview-text">{{ conv.lastMessage || '暂无消息' }}</span>
          <n-badge v-if="conv.unreadCount > 0" :value="conv.unreadCount" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  searchQuery: String,
  selectedId: String
})

defineEmits(['select'])

const chatStore = useChatStore()
const conversations = computed(() => chatStore.conversations)

const filteredConversations = computed(() => {
  if (!props.searchQuery) return conversations.value
  return conversations.value.filter(c =>
    (c.nickname || c.username).includes(props.searchQuery)
  )
})

const formatTime = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN })
}
</script>

<style scoped>
.conversation-list {
  height: 100%;
}

.empty {
  padding: 40px 20px;
  text-align: center;
}

.conversation-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f5f5f5;
}

.conversation-item.active {
  background: #e6f7ff;
}

.conv-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.conv-name {
  font-weight: 500;
  font-size: 14px;
}

.conv-time {
  font-size: 12px;
  color: #999;
}

.conv-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-text {
  flex: 1;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
