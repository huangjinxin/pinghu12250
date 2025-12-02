<template>
  <!-- 只显示一个聊天窗口，内部使用tabs切换 -->
  <transition name="chat">
    <div v-if="chatStore.openChats.length > 0" class="chat-window-container">
      <ChatWindow />
    </div>
  </transition>
</template>

<script setup>
import { useChatStore } from '@/stores/chat';
import ChatWindow from './ChatWindow.vue';

const chatStore = useChatStore();
</script>

<style scoped>
.chat-window-container {
  position: fixed;
  bottom: 0;
  right: 20px;
  z-index: 1000;
}

/* 聊天窗口进入/离开动画 */
.chat-enter-active,
.chat-leave-active {
  transition: all 0.3s ease;
}

.chat-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.chat-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-window-container {
    right: 0;
    left: 0;
    width: 100%;
  }
}
</style>
