<template>
  <!-- 最小化模式 -->
  <transition name="slide-up">
    <div
      v-if="chatStore.panelVisible && chatStore.panelState === 'minimized'"
      class="chat-panel-minimized"
      :class="{ 'has-unread': hasUnread }"
      @click="chatStore.expandPanel"
    >
      <n-icon :size="20"><ChatbubblesOutline /></n-icon>
      <span class="font-medium">消息</span>
      <n-badge v-if="totalUnread > 0" :value="totalUnread" :max="99" size="small" class="ml-2" />
      <n-button text circle size="small" @click.stop="chatStore.closePanel" class="ml-auto">
        <template #icon><n-icon :size="16"><CloseOutline /></n-icon></template>
      </n-button>
    </div>
  </transition>

  <!-- 展开模式 -->
  <transition name="slide-up">
    <div
      v-if="chatStore.panelVisible && chatStore.panelState === 'expanded'"
      class="chat-panel-expanded"
    >
      <ChatPanelContent />
    </div>
  </transition>

  <!-- 置顶模式 -->
  <transition name="slide-left">
    <div
      v-if="chatStore.panelVisible && chatStore.panelState === 'pinned'"
      class="chat-panel-pinned"
      :style="{ width: chatStore.panelWidth + 'px' }"
    >
      <!-- 拖拽分隔条 -->
      <div
        class="resize-handle"
        @mousedown="startResize"
      ></div>

      <ChatPanelContent />
    </div>
  </transition>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useChatStore } from '@/stores/chat';
import { ChatbubblesOutline, CloseOutline } from '@vicons/ionicons5';
import ChatPanelContent from './ChatPanelContent.vue';

const chatStore = useChatStore();

const totalUnread = computed(() => chatStore.allUnread);
const hasUnread = computed(() => totalUnread.value > 0);

// 拖拽调整宽度
let isResizing = false;

const startResize = (e) => {
  isResizing = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

const handleResize = (e) => {
  if (!isResizing) return;

  const newWidth = window.innerWidth - e.clientX;
  if (newWidth >= 300 && newWidth <= 600) {
    chatStore.setPanelWidth(newWidth);
  }
};

const stopResize = () => {
  isResizing = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

// 快捷键支持
const handleKeydown = (e) => {
  // Esc关闭面板
  if (e.key === 'Escape' && chatStore.panelVisible) {
    chatStore.closePanel();
  }
  // Ctrl+M最小化/恢复
  if (e.ctrlKey && e.key === 'm') {
    e.preventDefault();
    if (chatStore.panelState === 'minimized') {
      chatStore.expandPanel();
    } else {
      chatStore.minimizePanel();
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<style scoped>
/* 最小化模式 */
.chat-panel-minimized {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 50px;
  background: white;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 2000;
}

.chat-panel-minimized:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.chat-panel-minimized.has-unread {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  50% {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
}

/* 展开模式 */
.chat-panel-expanded {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 800px;
  height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 2000;
}

/* 置顶模式 */
.chat-panel-pinned {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  z-index: 1500;
  display: flex;
}

.resize-handle {
  width: 4px;
  background: transparent;
  cursor: ew-resize;
  position: relative;
  flex-shrink: 0;
}

.resize-handle:hover {
  background: #e5e7eb;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(100%);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-panel-expanded {
    width: 100%;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }

  .chat-panel-minimized {
    bottom: 80px; /* 避开底部导航 */
  }
}
</style>
