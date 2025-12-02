<template>
  <div class="chat-window">
    <!-- 聊天窗口头部 -->
    <div class="chat-header">
      <div class="flex items-center space-x-2 flex-1">
        <n-icon :size="24" color="white"><ChatbubblesOutline /></n-icon>
        <span class="font-medium">聊天</span>
      </div>
      <n-button text circle size="small" @click="handleCloseAll">
        <template #icon>
          <n-icon color="white"><CloseOutline /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- Tab切换区域 -->
    <n-tabs
      v-model:value="activeTab"
      type="card"
      size="small"
      closable
      @close="handleCloseTab"
      @update:value="handleTabChange"
      class="chat-tabs"
    >
      <n-tab-pane
        v-for="friend in chatStore.openChats"
        :key="friend.id"
        :name="friend.id"
        :tab="getTabLabel(friend)"
      >
        <!-- 消息列表 -->
        <div :ref="el => setMessageListRef(friend.id, el)" class="chat-messages">
          <div v-if="getMessages(friend.id).length === 0" class="empty-state">
            <n-empty description="暂无消息" size="small" />
          </div>
          <div v-else class="space-y-3 p-3">
            <div
              v-for="msg in getMessages(friend.id)"
              :key="msg.id"
              :class="[
                'flex',
                msg.fromUserId === currentUserId ? 'justify-end' : 'justify-start'
              ]"
            >
              <div
                :class="[
                  'message-bubble',
                  msg.fromUserId === currentUserId ? 'message-sent' : 'message-received'
                ]"
              >
                <div class="text-sm">{{ msg.content }}</div>
                <div class="text-xs opacity-70 mt-1">
                  {{ formatTime(msg.createdAt) }}
                  <span v-if="msg.status === 'sending'" class="ml-1">发送中...</span>
                  <span v-if="msg.status === 'failed'" class="ml-1 text-red-500">发送失败</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="chat-input">
          <n-input
            v-model:value="inputTexts[friend.id]"
            type="textarea"
            placeholder="输入消息..."
            :rows="2"
            :maxlength="500"
            @keydown.enter.exact.prevent="handleSend(friend.id)"
          />
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <n-icon :size="14">
                <component :is="isUserOnline(friend.id) ? CheckmarkCircleOutline : EllipseOutline" />
              </n-icon>
              <span>{{ isUserOnline(friend.id) ? '在线' : '离线' }}</span>
            </div>
            <n-button
              type="primary"
              size="small"
              :disabled="!inputTexts[friend.id] || !inputTexts[friend.id].trim()"
              :loading="sending"
              @click="handleSend(friend.id)"
            >
              发送
            </n-button>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  CloseOutline,
  ChatbubblesOutline,
  CheckmarkCircleOutline,
  EllipseOutline
} from '@vicons/ionicons5';

const chatStore = useChatStore();
const authStore = useAuthStore();

const activeTab = ref('');
const inputTexts = ref({});
const sending = ref(false);
const messageListRefs = ref({});

const currentUserId = computed(() => authStore.user?.id);

// 当openChats变化时，设置默认激活的tab
watch(() => chatStore.openChats, (newChats) => {
  if (newChats.length > 0) {
    // 如果当前activeTab不在openChats中，切换到第一个
    const currentExists = newChats.find(c => c.id === activeTab.value);
    if (!currentExists) {
      activeTab.value = newChats[0].id;
    }
  } else {
    activeTab.value = '';
  }
}, { immediate: true, deep: true });

// 设置消息列表ref
const setMessageListRef = (friendId, el) => {
  if (el) {
    messageListRefs.value[friendId] = el;
  }
};

// 获取tab标签（显示昵称和未读数）
const getTabLabel = (friend) => {
  const conv = chatStore.conversations.find(c => c.id === friend.id);
  const unreadCount = conv?.unreadCount || 0;
  const label = friend.nickname || friend.username;
  return unreadCount > 0 ? `${label} (${unreadCount})` : label;
};

// 获取消息列表
const getMessages = (friendId) => {
  return chatStore.messages[friendId] || [];
};

// 检查用户是否在线
const isUserOnline = (friendId) => {
  return chatStore.onlineUsers.has(friendId);
};

// 格式化时间
const formatTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

// 滚动到底部
const scrollToBottom = (friendId) => {
  nextTick(() => {
    const ref = messageListRefs.value[friendId];
    if (ref) {
      ref.scrollTop = ref.scrollHeight;
    }
  });
};

// 发送消息
const handleSend = async (friendId) => {
  const text = inputTexts.value[friendId];
  if (!text || !text.trim() || sending.value) return;

  sending.value = true;
  try {
    chatStore.sendMessage(friendId, text.trim());
    inputTexts.value[friendId] = '';
    scrollToBottom(friendId);
  } catch (error) {
    window.$message?.error('发送失败：' + error.message);
  } finally {
    sending.value = false;
  }
};

// 关闭某个tab
const handleCloseTab = (tabId) => {
  chatStore.closeChat(tabId);
};

// 关闭整个聊天窗口
const handleCloseAll = () => {
  // 关闭所有聊天
  chatStore.openChats.forEach(chat => {
    chatStore.closeChat(chat.id);
  });
};

// tab切换时
const handleTabChange = (tabId) => {
  activeTab.value = tabId;
  // 标记该会话为已读
  chatStore.markConversationRead(tabId);
  // 滚动到底部
  scrollToBottom(tabId);
};

// 监听消息变化，当前激活tab的消息自动滚动
watch(() => chatStore.messages, (newMessages) => {
  if (activeTab.value && newMessages[activeTab.value]) {
    scrollToBottom(activeTab.value);
  }
}, { deep: true });

onMounted(() => {
  if (activeTab.value) {
    scrollToBottom(activeTab.value);
  }
});
</script>

<style scoped>
.chat-window {
  width: 420px;
  height: 500px;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.chat-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-tabs :deep(.n-tabs-nav) {
  padding: 8px 8px 0 8px;
  background: #f9fafb;
}

.chat-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-tabs :deep(.n-tab-pane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.message-bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  word-wrap: break-word;
}

.message-sent {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-received {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chat-input {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-window {
    width: 100%;
    height: 100vh;
    border-radius: 0;
  }
}
</style>
