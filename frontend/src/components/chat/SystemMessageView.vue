<template>
  <div class="system-message-view">
    <!-- 头部 -->
    <div class="system-message-header">
      <n-button
        text
        circle
        size="small"
        @click="$emit('back')"
        title="返回"
      >
        <template #icon>
          <n-icon :size="20"><ChevronBackOutline /></n-icon>
        </template>
      </n-button>
      <div class="flex items-center gap-2">
        <n-icon :size="24"><NotificationsOutline /></n-icon>
        <span class="text-lg font-semibold">系统通知</span>
      </div>
      <n-button
        v-if="unreadCount > 0"
        text
        size="small"
        @click="$emit('mark-all-read')"
      >
        全部已读
      </n-button>
    </div>

    <!-- 消息列表 -->
    <div class="system-message-content">
      <div v-if="messages.length === 0" class="empty-messages">
        <n-empty description="暂无系统通知" size="small" />
      </div>
      <div v-else class="messages-list">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="system-message-item"
          :class="{ 'unread': !msg.isRead }"
          @click="$emit('select', msg)"
        >
          <div class="system-icon">
            <n-icon :size="24" :color="getMessageColor(msg.messageType)">
              <component :is="getMessageIcon(msg.messageType)" />
            </n-icon>
          </div>
          <div class="system-content">
            <div class="system-header">
              <span class="system-label">{{ getMessageTitle(msg.messageType) }}</span>
              <span class="system-time">{{ formatTime(msg.createdAt) }}</span>
            </div>
            <div class="system-text">{{ msg.content }}</div>
            <div v-if="hasLink(msg)" class="system-action">
              点击查看详情 →
            </div>
          </div>
          <div v-if="!msg.isRead" class="unread-dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronBackOutline,
  NotificationsOutline,
  TrophyOutline,
  Cart,
  PersonAdd,
  PeopleOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5';

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  }
});

defineEmits(['back', 'select', 'mark-all-read']);

// 未读数量
const unreadCount = computed(() => {
  return props.messages.filter(msg => !msg.isRead).length;
});

// 获取消息图标
const getMessageIcon = (type) => {
  const icons = {
    SYSTEM_ACHIEVEMENT: TrophyOutline,
    SYSTEM_PURCHASE: Cart,
    SYSTEM_FOLLOW: PersonAdd,
    SYSTEM_FRIEND: PeopleOutline,
    SYSTEM_TASK: CheckmarkCircleOutline
  };
  return icons[type] || NotificationsOutline;
};

// 获取消息颜色
const getMessageColor = (type) => {
  const colors = {
    SYSTEM_ACHIEVEMENT: '#faad14',
    SYSTEM_PURCHASE: '#52c41a',
    SYSTEM_FOLLOW: '#1890ff',
    SYSTEM_FRIEND: '#722ed1',
    SYSTEM_TASK: '#13c2c2'
  };
  return colors[type] || '#8c8c8c';
};

// 获取消息标题
const getMessageTitle = (type) => {
  const titles = {
    SYSTEM_ACHIEVEMENT: '成就通知',
    SYSTEM_PURCHASE: '购买通知',
    SYSTEM_FOLLOW: '关注通知',
    SYSTEM_FRIEND: '好友通知',
    SYSTEM_TASK: '任务通知'
  };
  return titles[type] || '系统通知';
};

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN
    });
  } catch {
    return '';
  }
};

// 检查是否有链接
const hasLink = (msg) => {
  if (!msg.metadata) return false;
  const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
  return metadata && metadata.link;
};
</script>

<style scoped>
.system-message-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.system-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.system-message-content {
  flex: 1;
  overflow-y: auto;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
}

.system-message-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.system-message-item:hover {
  background: #f5f5f5;
}

.system-message-item.unread {
  background: #f0f5ff;
}

.system-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.system-content {
  flex: 1;
  min-width: 0;
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.system-label {
  font-weight: 500;
  color: #1890ff;
  font-size: 13px;
}

.system-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.system-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 4px;
}

.system-action {
  font-size: 12px;
  color: #1890ff;
}

.unread-dot {
  position: absolute;
  top: 18px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
}
</style>
