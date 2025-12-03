<template>
  <div class="conversation-item" @click="$emit('click')">
    <!-- 用户头像 -->
    <div class="avatar-container">
      <AvatarText :username="conversation.username" size="lg" />
      <!-- 在线状态指示器 -->
      <div v-if="isOnline" class="online-indicator"></div>
    </div>

    <!-- 消息内容 -->
    <div class="conversation-content">
      <div class="conversation-header">
        <span class="name">{{ conversation.name }}</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
      <div class="conversation-preview">
        <n-badge v-if="conversation.unreadCount > 0" :value="conversation.unreadCount" :max="99" processing />
        <span class="preview-text">{{ conversation.lastMessage || '暂无消息' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AvatarText from '@/components/AvatarText.vue';

const props = defineProps({
  conversation: {
    type: Object,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);

// 格式化时间
const formattedTime = computed(() => {
  if (!props.conversation.timestamp) return '';
  try {
    return formatDistanceToNow(new Date(props.conversation.timestamp), {
      addSuffix: true,
      locale: zhCN
    });
  } catch {
    return '';
  }
});
</script>

<style scoped>
.conversation-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.conversation-item:hover {
  background: #f5f5f5;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #52c41a;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.conversation-preview {
  display: flex;
  align-items: center;
  gap: 8px;
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
