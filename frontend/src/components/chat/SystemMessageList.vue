<template>
  <div class="system-message-list">
    <!-- 头部 -->
    <div class="system-message-list-header">
      <div class="flex items-center gap-2">
        <n-icon :size="24"><NotificationsOutline /></n-icon>
        <span class="text-lg font-semibold">系统通知</span>
        <n-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" />
      </div>
      <div class="flex items-center gap-2">
        <!-- 全部标记为已读 -->
        <n-button
          v-if="unreadCount > 0"
          text
          size="small"
          @click="$emit('mark-all-read')"
        >
          全部已读
        </n-button>

        <!-- 关闭按钮 -->
        <n-button
          text
          circle
          size="small"
          @click="$emit('close')"
          title="关闭"
        >
          <template #icon>
            <n-icon :size="20"><CloseOutline /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 系统消息列表内容 -->
    <div class="system-message-list-content">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-list">
        <n-empty description="暂无系统通知" size="small" />
      </div>

      <!-- 消息列表 -->
      <div v-else class="system-messages">
        <SystemMessageItem
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          @click="$emit('select', msg)"
        />
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="load-more">
        <n-button text @click="$emit('load-more')" :loading="loading">
          加载更多
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  NotificationsOutline,
  CloseOutline
} from '@vicons/ionicons5';
import SystemMessageItem from './SystemMessageItem.vue';
import { computed } from 'vue';

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['select', 'mark-all-read', 'load-more', 'close']);

// 未读消息数
const unreadCount = computed(() => {
  return props.messages.filter(msg => !msg.isRead).length;
});
</script>

<style scoped>
.system-message-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.system-message-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.system-message-list-content {
  flex: 1;
  overflow-y: auto;
}

.empty-list {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.system-messages {
  display: flex;
  flex-direction: column;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 16px;
}
</style>
