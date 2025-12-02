<template>
  <div class="system-message-detail">
    <!-- 系统通知内容区域 -->
    <div class="system-content">
      <!-- 通知图标 -->
      <div class="system-icon">
        <n-icon :size="48" :color="getMessageColor(item.originalItem?.messageType)">
          <component :is="getMessageIcon(item.originalItem?.messageType)" />
        </n-icon>
      </div>

      <!-- 通知标题 -->
      <div class="system-title">
        {{ getMessageTitle(item.originalItem?.messageType) }}
      </div>

      <!-- 通知内容 -->
      <div class="system-message">
        {{ item.originalItem?.content || item.lastMessage }}
      </div>

      <!-- 通知时间 -->
      <div class="system-time">
        {{ formatFullTime(item.originalItem?.createdAt || item.timestamp) }}
      </div>

      <!-- 操作按钮（如果有相关链接） -->
      <div v-if="hasLink" class="system-actions">
        <n-button type="primary" @click="handleAction">
          查看详情
        </n-button>
      </div>

      <!-- 相关信息卡片（如果有元数据） -->
      <div v-if="metadata" class="metadata-card">
        <div class="metadata-item" v-for="(value, key) in displayMetadata" :key="key">
          <span class="metadata-label">{{ formatMetadataKey(key) }}:</span>
          <span class="metadata-value">{{ value }}</span>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="system-footer">
      <n-button
        v-if="!item.originalItem?.isRead"
        text
        type="primary"
        @click="markAsRead"
      >
        标记为已读
      </n-button>
      <span v-else class="read-status">
        <n-icon :size="16" color="#07c160"><CheckmarkCircleOutline /></n-icon>
        已读
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  TrophyOutline,
  Cart,
  PersonAdd,
  PeopleOutline,
  CheckmarkCircleOutline,
  NotificationsOutline
} from '@vicons/ionicons5';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const router = useRouter();
const chatStore = useChatStore();

// 解析元数据
const metadata = computed(() => {
  const msg = props.item.originalItem;
  if (!msg || !msg.metadata) return null;

  try {
    return typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
  } catch {
    return null;
  }
});

// 显示的元数据（排除 link）
const displayMetadata = computed(() => {
  if (!metadata.value) return null;

  const { link, ...rest } = metadata.value;
  return Object.keys(rest).length > 0 ? rest : null;
});

// 是否有链接
const hasLink = computed(() => {
  return metadata.value && metadata.value.link;
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
    SYSTEM_ACHIEVEMENT: '#f59e0b',
    SYSTEM_PURCHASE: '#10b981',
    SYSTEM_FOLLOW: '#3b82f6',
    SYSTEM_FRIEND: '#8b5cf6',
    SYSTEM_TASK: '#6366f1'
  };
  return colors[type] || '#6b7280';
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

// 格式化完整时间
const formatFullTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
};

// 格式化元数据键名
const formatMetadataKey = (key) => {
  const keyMap = {
    points: '积分',
    amount: '金额',
    title: '标题',
    description: '描述',
    username: '用户名',
    nickname: '昵称'
  };
  return keyMap[key] || key;
};

// 处理操作按钮
const handleAction = () => {
  if (metadata.value && metadata.value.link) {
    router.push(metadata.value.link);
  }
};

// 标记为已读
const markAsRead = async () => {
  const msg = props.item.originalItem;
  if (msg && !msg.isRead) {
    await chatStore.markSystemMessagesRead([msg.id]);
    window.$message?.success('已标记为已读');
  }
};
</script>

<style scoped>
.system-message-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.system-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.system-icon {
  margin-bottom: 16px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 50%;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin-bottom: 16px;
}

.system-message {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  max-width: 500px;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.system-time {
  font-size: 12px;
  color: #999;
  margin-bottom: 24px;
}

.system-actions {
  margin-top: 16px;
}

.metadata-card {
  margin-top: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  text-align: left;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.metadata-item:last-child {
  border-bottom: none;
}

.metadata-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.metadata-value {
  font-size: 13px;
  color: #000;
  font-weight: 400;
}

.system-footer {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: center;
}

.read-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #07c160;
}

/* 滚动条 */
.system-content::-webkit-scrollbar {
  width: 6px;
}

.system-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.system-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.system-content::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .system-content {
    padding: 24px 16px;
  }

  .system-title {
    font-size: 16px;
  }

  .system-message {
    font-size: 13px;
  }

  .system-footer {
    padding: 12px 16px;
  }
}
</style>
