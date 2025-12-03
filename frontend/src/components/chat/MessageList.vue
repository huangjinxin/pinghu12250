<template>
  <div ref="messageListRef" class="chat-messages">
    <!-- 空状态 -->
    <div v-if="!messages || messages.length === 0" class="empty-messages">
      <n-empty description="暂无消息，开始聊天吧" size="small">
        <template #extra>
          <p class="text-sm text-gray-500">和 {{ contactName }} 打个招呼吧！</p>
        </template>
      </n-empty>
    </div>

    <!-- 消息列表 -->
    <div v-else class="messages-container">
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-sent="msg.fromUserId === currentUserId"
        :sender-username="msg.fromUserId === currentUserId ? currentUsername : contactUsername"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import MessageBubble from './MessageBubble.vue';

const props = defineProps({
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
  contactName: {
    type: String,
    required: true
  },
  contactUsername: {
    type: String,
    required: true
  }
});

const messageListRef = ref(null);

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

// 监听消息变化，自动滚动到底部
watch(() => props.messages, scrollToBottom, { deep: true });

onMounted(() => {
  scrollToBottom();
});

// 暴露方法供父组件调用
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.messages-container {
  display: flex;
  flex-direction: column;
}
</style>
