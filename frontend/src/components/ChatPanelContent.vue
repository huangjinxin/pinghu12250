<template>
  <div class="chat-panel-content">
    <!-- 会话列表视图 -->
    <ConversationList
      v-if="currentView === 'list'"
      :conversations="unifiedList"
      :is-pinned="chatStore.panelState === 'pinned'"
      :online-user-ids="chatStore.onlineUsers"
      @select="openConversation"
      @new-chat="showFriendSelector = true"
      @toggle-pin="chatStore.togglePin"
      @minimize="chatStore.minimizePanel"
      @close="chatStore.closePanel"
    />

    <!-- 聊天详情视图 -->
    <ChatView
      v-else-if="currentView === 'chat' && currentContact"
      :contact="currentContact"
      :messages="currentMessages"
      :current-user-id="authStore.user?.id"
      :current-username="authStore.user?.username"
      :is-online="isUserOnline(currentContact.id)"
      @back="backToList"
      @send="handleSend"
      @share="handleShare"
    />

    <!-- 系统消息视图 -->
    <SystemMessageView
      v-else-if="currentView === 'system'"
      :messages="chatStore.systemMessages"
      @back="backToList"
      @select="handleSystemMessageClick"
      @mark-all-read="markAllSystemMessagesRead"
    />

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
              <AvatarText :username="friend.username" size="md" />
              <div v-if="isUserOnline(friend.id)" class="online-indicator-small"></div>
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { SearchOutline } from '@vicons/ionicons5';
import AvatarText from '@/components/AvatarText.vue';
import ConversationList from './chat/ConversationList.vue';
import ChatView from './chat/ChatView.vue';
import SystemMessageView from './chat/SystemMessageView.vue';

const router = useRouter();
const chatStore = useChatStore();
const authStore = useAuthStore();

// 视图状态
const currentView = ref('list'); // 'list' | 'chat' | 'system'
const currentContactId = ref('');
const showFriendSelector = ref(false);
const friendSearch = ref('');

// 当前联系人信息
const currentContact = computed(() => {
  if (!currentContactId.value) return null;
  const conv = chatStore.conversations.find(c => c.id === currentContactId.value);
  if (!conv) return null;
  return {
    id: conv.id,
    name: conv.nickname || conv.username,
    username: conv.username,
    avatar: conv.avatar
  };
});

// 当前消息列表
const currentMessages = computed(() => {
  if (!currentContactId.value) return [];
  return chatStore.messages[currentContactId.value] || [];
});

// 统一消息列表（系统通知 + 好友会话）
const unifiedList = computed(() => {
  // 系统通知（只取前10条）
  const systemNotifications = chatStore.systemMessages.slice(0, 10).map(msg => ({
    id: 'system',
    type: 'system',
    name: '系统通知',
    username: 'system',
    lastMessage: msg.content,
    timestamp: msg.createdAt,
    unreadCount: chatStore.systemUnread
  }));

  // 好友会话
  const friendConversations = chatStore.conversations.map(conv => ({
    id: conv.id,
    type: 'friend',
    name: conv.nickname || conv.username,
    username: conv.username,
    avatar: conv.avatar,
    lastMessage: conv.lastMessage,
    timestamp: conv.lastMessageTime,
    unreadCount: conv.unreadCount || 0
  }));

  // 合并并排序：未读优先，然后按时间降序
  const all = [...systemNotifications, ...friendConversations];
  return all.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
});

// 过滤好友列表
const filteredFriends = computed(() => {
  const friends = chatStore.allFriends;
  if (!friendSearch.value) return friends;
  return friends.filter(friend =>
    (friend.profile?.nickname || friend.username)
      .toLowerCase()
      .includes(friendSearch.value.toLowerCase())
  );
});

// 判断用户是否在线
const isUserOnline = (userId) => {
  return chatStore.onlineUsers.has(userId);
};

// 打开会话
const openConversation = (item) => {
  if (item.type === 'system') {
    currentView.value = 'system';
  } else {
    currentContactId.value = item.id;
    currentView.value = 'chat';
    // 加载聊天历史
    chatStore.loadChatHistory(item.id);
    // 标记会话为已读
    chatStore.markConversationRead(item.id);
  }
};

// 返回列表
const backToList = () => {
  currentView.value = 'list';
  currentContactId.value = '';
};

// 发送消息
const handleSend = async (content) => {
  if (!content.trim() || !currentContactId.value) return;
  await chatStore.sendMessage(currentContactId.value, content);
};

// 分享内容
const handleShare = async (data) => {
  if (!currentContactId.value) return;
  const shareMessage = JSON.stringify(data);
  await chatStore.sendMessage(currentContactId.value, shareMessage);
};

// 选择好友开始聊天
const selectFriendToChat = (friend) => {
  showFriendSelector.value = false;
  friendSearch.value = '';
  currentContactId.value = friend.id;
  currentView.value = 'chat';
  // 加载聊天历史
  chatStore.loadChatHistory(friend.id);
};

// 处理系统消息点击
const handleSystemMessageClick = (message) => {
  // 标记为已读
  chatStore.markSystemMessageRead([message.id]);

  // 如果有链接，跳转
  if (message.metadata?.link) {
    chatStore.closePanel();
    router.push(message.metadata.link);
  }
};

// 标记所有系统消息为已读
const markAllSystemMessagesRead = () => {
  const unreadIds = chatStore.systemMessages
    .filter(msg => !msg.isRead)
    .map(msg => msg.id);
  if (unreadIds.length > 0) {
    chatStore.markSystemMessageRead(unreadIds);
  }
};
</script>

<style scoped>
.chat-panel-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.friend-selector-modal {
  padding: 16px 0;
}

.friend-selector-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-selector-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.friend-selector-item:hover {
  background: #f5f5f5;
}

.friend-info {
  font-size: 14px;
  color: #333;
}

.online-indicator-small {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: #52c41a;
  border: 2px solid white;
  border-radius: 50%;
}
</style>
