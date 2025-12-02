<template>
  <div class="chat-panel-content">
    <!-- 统一列表界面 -->
    <template v-if="currentView === 'list'">
      <!-- 头部 -->
      <div class="chat-panel-header">
        <div class="flex items-center gap-2">
          <n-icon :size="24"><ChatbubblesOutline /></n-icon>
          <span class="text-lg font-semibold">消息</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- 发起新聊天按钮 -->
          <n-button
            text
            circle
            size="small"
            @click="showFriendSelector = true"
            title="发起新聊天"
          >
            <template #icon>
              <n-icon :size="20"><AddOutline /></n-icon>
            </template>
          </n-button>
          <!-- 置顶按钮 -->
          <n-button
            text
            circle
            size="small"
            @click="chatStore.togglePin"
            :title="chatStore.panelState === 'pinned' ? '取消置顶' : '置顶'"
          >
            <template #icon>
              <n-icon :size="20" :color="chatStore.panelState === 'pinned' ? '#667eea' : undefined">
                <Pin />
              </n-icon>
            </template>
          </n-button>
          <!-- 最小化按钮 -->
          <n-button
            text
            circle
            size="small"
            @click="chatStore.minimizePanel"
            title="最小化"
          >
            <template #icon>
              <n-icon :size="20"><RemoveOutline /></n-icon>
            </template>
          </n-button>
          <!-- 关闭按钮 -->
          <n-button
            text
            circle
            size="small"
            @click="chatStore.closePanel"
            title="关闭"
          >
            <template #icon>
              <n-icon :size="20"><CloseOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="chat-list-container">
        <div v-if="unifiedList.length === 0" class="empty-list">
          <n-empty description="暂无消息" size="small">
            <template #extra>
              <n-button text type="primary" @click="showFriendSelector = true">
                发起新聊天
              </n-button>
            </template>
          </n-empty>
        </div>
        <div v-else class="message-list">
          <div
            v-for="item in unifiedList"
            :key="item.id"
            class="message-item"
            @click="openItem(item)"
          >
            <div class="relative">
              <AvatarText :username="item.username" size="lg" />
              <AvatarText :username="item.username" size="md" />
              <div v-if="item.type !== 'system' && isUserOnline(item.id)"
                   class="online-indicator"
              ></div>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="name">{{ item.name }}</span>
                <span class="time">{{ formatTime(item.timestamp) }}</span>
              </div>
              <div class="message-preview">
                <n-badge v-if="item.unreadCount > 0" :value="item.unreadCount" :max="99" processing />
                <span v-if="item.type === 'system'" class="system-badge">系统</span>
                <span class="preview-text">{{ item.lastMessage || '暂无消息' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详情界面（聊天或系统通知） -->
    <template v-else-if="currentView === 'detail'">
      <!-- 调试信息 -->
      <div v-if="false" style="background: yellow; padding: 10px; font-size: 12px;">
        <div>currentView: {{ currentView }}</div>
        <div>currentItem: {{ currentItem }}</div>
        <div>currentItem?.type: {{ currentItem?.type }}</div>
        <div>selectedConversationId: {{ selectedConversationId }}</div>
        <div>currentMessages length: {{ currentMessages?.length }}</div>
      </div>

      <!-- 详情头部 -->
      <div class="details-header">
        <div class="flex items-center gap-2">
          <!-- 返回按钮 -->
          <n-button
            text
            circle
            size="small"
            @click="backToList"
            title="返回"
          >
            <template #icon>
              <n-icon :size="20"><ChevronBackOutline /></n-icon>
            </template>
          </n-button>
          <AvatarText :username="item.username" size="md" />
          <div>
            <div class="font-medium text-gray-800">{{ currentItem?.name }}</div>
            <div v-if="currentItem?.type !== 'system'" class="text-xs text-gray-500">
              {{ isUserOnline(currentItem?.id) ? '在线' : '离线' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天详情或系统通知详情 -->
      <div class="detail-content">
        <component
          :is="currentItem?.type === 'system' ? SystemMessageDetail : ChatDetail"
          :item="currentItem"
          :messages="currentMessages"
          @send-message="handleSend"
        />
      </div>
    </template>

    <!-- 好友选择器弹窗 -->
    <n-modal v-model:show="showFriendSelector" preset="dialog" title="选择好友">
      <div class="friend-selector-modal">
        <n-input
          v-model:value="friendSearch"
          placeholder="搜索好友..."
          clearable
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>

        <div class="friend-selector-list" style="max-height: 400px; overflow-y: auto; margin-top: 16px;">
          <div
            v-for="friend in filteredFriends"
            :key="friend.id"
            class="friend-selector-item"
            @click="selectFriendToChat(friend)"
          >
            <div class="relative">
              <AvatarText :username="item.username" size="md" />
              <div v-if="isUserOnline(friend.id)"
                   class="online-indicator-small"
              ></div>
            </div>
            <div class="friend-info">
              {{ friend.profile?.nickname || friend.username }}
            </div>
          </div>
          <n-empty v-if="filteredFriends.length === 0" description="未找到好友" size="small" class="mt-4" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChatbubblesOutline,
  CloseOutline,
  RemoveOutline,
  Pin,
  ShareSocialOutline,
  BookOutline,
  DocumentTextOutline,
  BrushOutline,
  LibraryOutline,
  GameControllerOutline,
  ChevronBackOutline,
  AddOutline,
  SearchOutline
} from '@vicons/ionicons5';
import ChatDetail from './ChatDetail.vue';
import SystemMessageDetail from './SystemMessageDetail.vue';

const chatStore = useChatStore();
const authStore = useAuthStore();

// 视图控制
const currentView = ref('list'); // list | detail
const currentItem = ref(null);
const showFriendSelector = ref(false);
const friendSearch = ref('');

// 消息相关
const selectedConversationId = ref('');
const inputText = ref('');
const sending = ref(false);
const messageListRef = ref(null);

const currentUserId = computed(() => authStore.user?.id);
const conversations = computed(() => chatStore.conversations);
const systemMessages = computed(() => chatStore.systemMessages);
const friendsList = computed(() => chatStore.allFriends);

const currentMessages = computed(() => {
  if (!selectedConversationId.value) return [];
  return chatStore.messages[selectedConversationId.value] || [];
});

// 统一消息列表（系统通知置顶，按时间排序）
const unifiedList = computed(() => {
  // 系统通知（状态为未读的置顶）
  const systemNotifications = systemMessages.value.slice(0, 10).map((msg, index) => ({
    id: msg.id,
    type: 'system',
    name: '系统通知',
    avatar: '/logo.png', // 可以考虑换成系统头像
    lastMessage: msg.content,
    timestamp: msg.createdAt,
    unreadCount: msg.isRead ? 0 : 1,
    originalItem: msg
  }));

  // 好友会话
  const friendConversations = conversations.value.map(conv => ({
    id: conv.id,
    type: 'friend',
    name: conv.nickname || conv.username,
    avatar: conv.avatar,
    lastMessage: conv.lastMessage,
    timestamp: conv.lastMessageTime,
    unreadCount: conv.unreadCount || 0,
    originalItem: conv
  }));

  // 合并并排序：系统通知置顶，然后按时间降序
  const all = [...systemNotifications, ...friendConversations];
  return all.sort((a, b) => {
    // 未读消息优先
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    // 时间排序，最新的在前
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
});

// 过滤好友
const filteredFriends = computed(() => {
  if (!friendSearch.value) return friendsList.value;
  return friendsList.value.filter(friend =>
    (friend.profile?.nickname || friend.username).toLowerCase().includes(friendSearch.value.toLowerCase())
  );
});

// 检查用户是否在线
const isUserOnline = (userId) => {
  return chatStore.onlineUsers.has(userId);
};

// 格式化时间
const formatTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
};

// 打开某个消息项
const openItem = (item) => {
  console.log('=== openItem 调用 ===');
  console.log('item:', item);
  console.log('item.type:', item.type);
  console.log('item.id:', item.id);

  currentItem.value = item;

  if (item.type === 'system') {
    selectedConversationId.value = 'system';
  } else {
    selectedConversationId.value = item.id;
    console.log('selectedConversationId:', selectedConversationId.value);

    // 加载聊天历史
    chatStore.loadChatHistory(item.id);
    console.log('调用 loadChatHistory:', item.id);

    // 标记会话为已读
    chatStore.markConversationRead(item.id);
  }

  currentView.value = 'detail';
  console.log('currentView 设置为:', currentView.value);
  console.log('currentItem:', currentItem.value);
  console.log('currentMessages:', currentMessages.value);
  console.log('======================');
};

// 返回列表
const backToList = () => {
  currentView.value = 'list';
  currentItem.value = null;
  selectedConversationId.value = '';
};

// 发送消息
const handleSend = async (message) => {
  if (!message.trim() || !selectedConversationId.value || selectedConversationId.value === 'system') return;

  sending.value = true;
  try {
    await chatStore.sendMessage(selectedConversationId.value, message);
    inputText.value = '';
  } catch (error) {
    console.error('发送消息失败:', error);
  } finally {
    sending.value = false;
  }
};

// 选择好友开始聊天
const selectFriendToChat = (friend) => {
  const existing = conversations.value.find(c => c.id === friend.id);
  if (existing) {
    openItem({
      id: existing.id,
      type: 'friend',
      name: existing.nickname || existing.username,
      avatar: existing.avatar,
      lastMessage: existing.lastMessage,
      timestamp: existing.lastMessageTime,
      unreadCount: existing.unreadCount || 0,
      originalItem: existing
    });
  } else {
    // 创建新的会话对象
    const newConversation = {
      id: friend.id,
      username: friend.username,
      nickname: friend.profile?.nickname || friend.username,
      avatar: friend.avatar,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };

    // 添加到会话列表
    conversations.value.unshift(newConversation);

    openItem({
      id: friend.id,
      type: 'friend',
      name: friend.profile?.nickname || friend.username,
      avatar: friend.avatar,
      lastMessage: '',
      timestamp: new Date().toISOString(),
      unreadCount: 0,
      originalItem: newConversation
    });
  }
  showFriendSelector.value = false;
  friendSearch.value = '';
};

// 同步数据
onMounted(() => {
  chatStore.loadConversations();
  chatStore.loadSystemMessages();
  chatStore.syncFriends();
});

// 监听消息变化
watch(() => chatStore.panelVisible, (visible) => {
  if (visible) {
    chatStore.loadConversations();
    chatStore.loadSystemMessages();
    chatStore.syncFriends();
  }
});
</script>

<style scoped>
.chat-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

/* 头部样式 */
.chat-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

/* 消息列表容器 */
.chat-list-container {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.empty-list {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.message-list {
  background: white;
}

/* 消息项样式（微信风格） */
.message-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
  background: white;
}

.message-item:hover {
  background: #f5f5f5;
}

.message-item:active {
  background: #f0f0f0;
}

/* 在线状态指示器 */
.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: #07c160; /* 微信绿色 */
  border-radius: 50%;
  border: 2px solid white;
}

.online-indicator-small {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #07c160;
  border-radius: 50%;
  border: 1px solid white;
}

/* 消息内容区域 */
.message-content {
  flex: 1;
  min-width: 0;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.message-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.system-badge {
  background: #ff4f4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
}

.preview-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* 详情头部 */
.details-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

/* 详情内容区域 */
.detail-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 好友选择器弹窗 */
.friend-selector-modal {
  padding: 16px;
}

.friend-selector-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.friend-selector-item:hover {
  background: #f5f5f5;
}

.friend-selector-item:active {
  background: #f0f0f0;
}

.friend-info {
  flex: 1;
  font-size: 14px;
  color: #000;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar,
.friend-selector-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track,
.friend-selector-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.message-list::-webkit-scrollbar-thumb,
.friend-selector-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover,
.friend-selector-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-panel-header {
    padding: 14px;
  }

  .message-item {
    padding: 10px 14px;
  }

  .name {
    font-size: 15px;
  }

  .message-header {
    margin-bottom: 2px;
  }

  .details-header {
    padding: 14px;
  }
}
</style>