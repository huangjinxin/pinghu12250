<template>
  <n-popover v-model:show="showPopover" trigger="click" placement="bottom-end" :show-arrow="false" style="padding: 0;">
    <template #trigger>
      <n-badge :value="totalUnread" :max="99" :dot="totalUnread === 0">
        <button
          class="message-center-btn"
          :class="{ 'has-new-message': hasNewMessage }"
        >
          <n-icon :size="20"><ChatbubblesOutline /></n-icon>
        </button>
      </n-badge>
    </template>

    <div class="message-center-panel">
      <!-- 头部 -->
      <div class="panel-header">
        <h3 class="font-semibold text-gray-800">消息中心</h3>
        <div class="flex items-center gap-2">
          <n-button text size="small" @click="markAllRead">全部已读</n-button>
          <n-button text circle size="small" @click="closePanel" title="关闭">
            <template #icon>
              <n-icon :size="18"><CloseOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <!-- 标签页 -->
      <n-tabs v-model:value="activeTab" type="line" size="small">
        <!-- 聊天消息 -->
        <n-tab-pane name="chat" :tab="`聊天 ${chatUnread > 0 ? `(${chatUnread})` : ''}`">
          <div class="message-list">
            <template v-if="conversations.length > 0">
              <div
                v-for="conv in conversations"
                :key="conv.id"
                class="message-item"
                @click="openChat(conv)"
              >
                <div class="relative">
                  <AvatarText :username="conv.username" size="md" />
                  <div
                    v-if="isUserOnline(conv.id)"
                    class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"
                  ></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-sm text-gray-800 truncate">
                      {{ conv.nickname || conv.username }}
                    </span>
                    <span class="text-xs text-gray-400">{{ formatTime(conv.lastMessageTime) }}</span>
                  </div>
                  <div class="flex items-center justify-between mt-1">
                    <p class="text-xs text-gray-500 truncate flex-1">{{ conv.lastMessage }}</p>
                    <n-badge v-if="conv.unreadCount > 0" :value="conv.unreadCount" :max="99" size="small" />
                  </div>
                </div>
              </div>
            </template>
            <n-empty v-else description="暂无聊天消息" size="small" class="py-8" />
          </div>
        </n-tab-pane>

        <!-- 系统消息 -->
        <n-tab-pane name="system" :tab="`系统 ${systemUnread > 0 ? `(${systemUnread})` : ''}`">
          <div class="message-list">
            <template v-if="systemMessages.length > 0">
              <div
                v-for="msg in systemMessages.slice(0, 10)"
                :key="msg.id"
                class="message-item"
                :class="{ 'unread': !msg.isRead }"
                @click="handleSystemMessage(msg)"
              >
                <n-icon :size="32" :color="getSystemMessageColor(msg.messageType)">
                  <component :is="getSystemMessageIcon(msg.messageType)" />
                </n-icon>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-800">{{ msg.content }}</p>
                  <span class="text-xs text-gray-400 mt-1">{{ formatTime(msg.createdAt) }}</span>
                </div>
                <div v-if="!msg.isRead" class="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
              </div>
            </template>
            <n-empty v-else description="暂无系统消息" size="small" class="py-8" />
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 底部 -->
      <div class="panel-footer">
        <n-button text size="small" @click="goToFriends">
          查看学习圈动态
        </n-button>
      </div>
    </div>
  </n-popover>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { messageAPI } from '@/api';
import { useMessage } from 'naive-ui';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ChatbubblesOutline from '@vicons/ionicons5/es/ChatbubblesOutline'
import TrophyOutline from '@vicons/ionicons5/es/TrophyOutline'
import Cart from '@vicons/ionicons5/es/Cart'
import PersonAdd from '@vicons/ionicons5/es/PersonAdd'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'

const router = useRouter();
const chatStore = useChatStore();
const message = useMessage();

const showPopover = ref(false);
const activeTab = ref('chat');
const hasNewMessage = ref(false);
let flashTimer = null;

// 计算属性
const conversations = computed(() => chatStore.conversations);
const systemMessages = computed(() => chatStore.systemMessages);
const chatUnread = computed(() => chatStore.totalUnread);
const systemUnread = computed(() => chatStore.systemUnread);
const totalUnread = computed(() => chatStore.allUnread);

// 检查用户是否在线
const isUserOnline = (userId) => {
  return chatStore.onlineUsers.has(userId);
};

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

// 监听未读消息变化，触发闪动效果
watch(totalUnread, (newVal, oldVal) => {
  if (newVal > oldVal && newVal > 0) {
    hasNewMessage.value = true;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      hasNewMessage.value = false;
    }, 3000);
  }
});

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer);
});

// 打开聊天（标记已读并跳转到好友主页）
const openChat = async (conv) => {
  if (conv.unreadCount > 0) {
    try {
      await messageAPI.markChatRead(conv.id);
      conv.unreadCount = 0;
    } catch (e) { /* ignore */ }
  }
  router.push(`/users/${conv.id}`);
  showPopover.value = false;
};

// 处理系统消息点击
const handleSystemMessage = async (msg) => {
  // 标记为已读
  if (!msg.isRead) {
    await chatStore.markSystemMessagesRead([msg.id]);
  }

  // 根据消息类型跳转
  const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
  if (metadata?.link) {
    router.push(metadata.link);
    // 关闭消息中心弹窗
    showPopover.value = false;
  }
};

// 全部已读
const markAllRead = async () => {
  if (activeTab.value === 'system') {
    const unreadIds = systemMessages.value
      .filter(m => !m.isRead)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      await chatStore.markSystemMessagesRead(unreadIds);
      message.success('已全部标记为已读');
    }
  } else {
    message.info('聊天消息需要打开对话才能标记已读');
  }
};

// 获取系统消息图标
const getSystemMessageIcon = (type) => {
  const icons = {
    SYSTEM_ACHIEVEMENT: TrophyOutline,
    SYSTEM_PURCHASE: Cart,
    SYSTEM_FOLLOW: PersonAdd,
    SYSTEM_FRIEND: PeopleOutline,
    SYSTEM_TASK: CheckmarkCircleOutline
  };
  return icons[type] || CheckmarkCircleOutline;
};

// 获取系统消息颜色
const getSystemMessageColor = (type) => {
  const colors = {
    SYSTEM_ACHIEVEMENT: '#f59e0b',
    SYSTEM_PURCHASE: '#10b981',
    SYSTEM_FOLLOW: '#3b82f6',
    SYSTEM_FRIEND: '#8b5cf6',
    SYSTEM_TASK: '#6366f1'
  };
  return colors[type] || '#6b7280';
};

// 关闭消息中心弹窗
const closePanel = () => {
  showPopover.value = false;
};

// 跳转到好友页面
const goToFriends = () => {
  router.push('/friends');
  showPopover.value = false;
};
</script>

<style scoped>
.message-center-btn {
  @apply p-2 rounded-lg transition-all duration-200;
  @apply hover:bg-gray-100;
}

.message-center-btn.has-new-message {
  animation: flash 1s ease-in-out infinite;
}

@keyframes flash {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.message-center-panel {
  width: 380px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  @apply flex items-center justify-between px-4 py-3 border-b border-gray-100;
}

.message-list {
  @apply max-h-96 overflow-y-auto;
}

.message-item {
  @apply flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors;
  @apply hover:bg-gray-50;
}

.message-item.unread {
  @apply bg-primary-50/30;
}

.panel-footer {
  @apply px-4 py-2 border-t border-gray-100 text-center;
}
</style>
