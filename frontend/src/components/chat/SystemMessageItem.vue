<template>
  <div class="system-message-item" :class="{ 'unread': !message.isRead }" @click="$emit('click')">
    <!-- 系统图标 -->
    <div class="system-icon">
      <n-icon :size="24" :color="iconColor">
        <component :is="messageIcon" />
      </n-icon>
    </div>

    <!-- 消息内容 -->
    <div class="system-message-content">
      <div class="system-message-header">
        <span class="system-label">系统通知</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
      <div class="system-message-text">
        {{ message.content }}
      </div>
      <div v-if="message.metadata?.link" class="system-message-action">
        点击查看详情 →
      </div>
    </div>

    <!-- 未读标记 -->
    <div v-if="!message.isRead" class="unread-dot"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  TrophyOutline,
  CartOutline,
  PersonAddOutline,
  PeopleOutline,
  CheckmarkCircleOutline,
  NotificationsOutline
} from '@vicons/ionicons5';

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
});

defineEmits(['click']);

// 根据消息类型获取图标
const messageIcon = computed(() => {
  const typeMap = {
    SYSTEM_ACHIEVEMENT: TrophyOutline,
    SYSTEM_PURCHASE: CartOutline,
    SYSTEM_FOLLOW: PersonAddOutline,
    SYSTEM_FRIEND: PeopleOutline,
    SYSTEM_TASK: CheckmarkCircleOutline
  };
  return typeMap[props.message.messageType] || NotificationsOutline;
});

// 根据消息类型获取图标颜色
const iconColor = computed(() => {
  const colorMap = {
    SYSTEM_ACHIEVEMENT: '#faad14',
    SYSTEM_PURCHASE: '#52c41a',
    SYSTEM_FOLLOW: '#1890ff',
    SYSTEM_FRIEND: '#722ed1',
    SYSTEM_TASK: '#13c2c2'
  };
  return colorMap[props.message.messageType] || '#8c8c8c';
});

// 格式化时间
const formattedTime = computed(() => {
  if (!props.message.createdAt) return '';
  try {
    return formatDistanceToNow(new Date(props.message.createdAt), {
      addSuffix: true,
      locale: zhCN
    });
  } catch {
    return '';
  }
});
</script>

<style scoped>
.system-message-item {
  display: flex;
  gap: 12px;
  padding: 12px;
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

.system-message-content {
  flex: 1;
  min-width: 0;
}

.system-message-header {
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

.time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.system-message-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 4px;
}

.system-message-action {
  font-size: 12px;
  color: #1890ff;
}

.unread-dot {
  position: absolute;
  top: 18px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
}
</style>
