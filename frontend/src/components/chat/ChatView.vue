<template>
  <div class="chat-view">
    <!-- 聊天头部 -->
    <div class="chat-view-header">
      <div class="flex items-center gap-2">
        <!-- 返回按钮 -->
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

        <!-- 联系人信息 -->
        <AvatarText :username="contact.username" size="md" />
        <div>
          <div class="font-medium text-gray-800">{{ contact.name }}</div>
          <div class="text-xs text-gray-500">
            {{ isOnline ? '在线' : '离线' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <MessageList
      ref="messageListRef"
      :messages="messages"
      :current-user-id="currentUserId"
      :current-username="currentUsername"
      :contact-name="contact.name"
      :contact-username="contact.username"
    />

    <!-- 消息输入框 -->
    <MessageInput
      @send="handleSend"
      @share="handleShare"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { ChevronBackOutline } from '@vicons/ionicons5';
import AvatarText from '@/components/AvatarText.vue';
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';

const props = defineProps({
  contact: {
    type: Object,
    required: true
  },
  messages: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: String,
    required: true
  },
  currentUsername: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['back', 'send', 'share']);

const messageListRef = ref(null);

// 发送消息
const handleSend = (content) => {
  emit('send', content);
  // 发送后滚动到底部
  nextTick(() => {
    messageListRef.value?.scrollToBottom();
  });
};

// 分享内容
const handleShare = (data) => {
  emit('share', data);
};

// 监听消息变化，新消息到达时滚动到底部
watch(() => props.messages, () => {
  nextTick(() => {
    messageListRef.value?.scrollToBottom();
  });
}, { deep: true });
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.chat-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
</style>
