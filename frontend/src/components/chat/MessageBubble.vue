<template>
  <div
    :class="[
      'message-item',
      isSent ? 'message-sent' : 'message-received'
    ]"
  >
    <!-- 发送者头像（接收消息时显示在左侧） -->
    <AvatarText
      v-if="!isSent"
      :username="senderUsername"
      size="md"
    />

    <!-- 消息内容 -->
    <ShareCard
      v-if="isShare"
      :share-data="shareData"
      :is-sent="isSent"
    />
    <div v-else class="message-bubble">
      <div class="message-text">{{ message.content }}</div>
      <div class="message-time">{{ formattedTime }}</div>
      <div v-if="message.status === 'sending'" class="message-status">发送中</div>
      <div v-else-if="message.status === 'failed'" class="message-status failed">发送失败</div>
    </div>

    <!-- 发送者头像（发送消息时显示在右侧） -->
    <AvatarText
      v-if="isSent"
      :username="senderUsername"
      size="md"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AvatarText from '@/components/AvatarText.vue';
import ShareCard from '@/components/ShareCard.vue';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isSent: {
    type: Boolean,
    default: false
  },
  senderUsername: {
    type: String,
    required: true
  }
});

// 判断是否为分享消息
const isShare = computed(() => {
  try {
    const content = typeof props.message.content === 'string'
      ? JSON.parse(props.message.content)
      : props.message.content;
    return content && content.share_type;
  } catch {
    return false;
  }
});

// 获取分享数据
const shareData = computed(() => {
  if (!isShare.value) return null;
  try {
    return typeof props.message.content === 'string'
      ? JSON.parse(props.message.content)
      : props.message.content;
  } catch {
    return null;
  }
});

// 格式化时间
const formattedTime = computed(() => {
  if (!props.message.createdAt) return '';
  return format(new Date(props.message.createdAt), 'HH:mm', { locale: zhCN });
});
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.message-sent {
  flex-direction: row-reverse;
}

.message-received {
  flex-direction: row;
}

.message-bubble {
  max-width: 60%;
  padding: 8px 12px;
  border-radius: 12px;
  position: relative;
}

.message-sent .message-bubble {
  background: #667eea;
  color: white;
}

.message-received .message-bubble {
  background: #f0f0f0;
  color: #333;
}

.message-text {
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
}

.message-time {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.message-status {
  font-size: 11px;
  margin-top: 2px;
  opacity: 0.8;
}

.message-status.failed {
  color: #ff4d4f;
}
</style>
