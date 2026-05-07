<template>
  <div class="message-center">
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <n-tabs v-model:value="activeTab" type="line" size="large">
          <n-tab name="messages">
            <template #default>
              <div class="tab-label">
                <n-icon :size="18"><ChatbubblesOutline /></n-icon>
                <span>消息</span>
                <n-badge v-if="chatStore.totalUnread > 0" :value="chatStore.totalUnread" :max="99" />
              </div>
            </template>
          </n-tab>
          <n-tab name="contacts">
            <template #default>
              <div class="tab-label">
                <n-icon :size="18"><PeopleOutline /></n-icon>
                <span>通讯录</span>
              </div>
            </template>
          </n-tab>
        </n-tabs>
      </div>

      <div class="sidebar-content">
        <ConversationList
          v-show="activeTab === 'messages'"
          :conversations="chatStore.conversations"
          :online-user-ids="socketStore.onlineUsers"
          @select="handleSelectConversation"
        />

        <div v-show="activeTab === 'contacts'" class="contacts-pane">
          <div class="contacts-tools">
            <div class="tools-title">功能</div>
            <button class="tool-item" :class="{ active: rightPanel === 'friendRequests' }" @click="openFriendRequests">
              <span class="tool-icon"><n-icon :size="18"><PersonAddOutline /></n-icon></span>
              <span class="tool-text">新的朋友</span>
            </button>
            <button class="tool-item" :class="{ active: rightPanel === 'addFriend' }" @click="openAddFriendPanel">
              <span class="tool-icon"><n-icon :size="18"><AddOutline /></n-icon></span>
              <span class="tool-text">添加朋友</span>
            </button>
            <button class="tool-item" :class="{ active: rightPanel === 'friendSettings' }" @click="openFriendSettingsPanel">
              <span class="tool-icon"><n-icon :size="18"><SettingsOutline /></n-icon></span>
              <span class="tool-text">好友设置</span>
            </button>
          </div>

          <div class="contacts-list-wrap">
            <div class="tools-title contacts-title">联系人</div>
            <FriendList
              :online-user-ids="onlineUserArray"
              :extra-contacts="botContacts"
              @select="handleSelectFriend"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="chat-content">
      <SystemMessageList
        v-if="rightPanel === 'system'"
        :messages="chatStore.systemMessages"
        @close="rightPanel = 'empty'"
        @mark-all-read="handleMarkAllSystemRead"
      />
      <ChatView
        v-else-if="rightPanel === 'chat' && selectedConversation"
        :contact="chatContact"
        :messages="currentMessages"
        :current-user-id="currentUserId"
        :current-username="currentUsername"
        :is-online="isContactOnline"
        @back="handleChatBack"
        @send="handleSend"
        @share="handleShare"
      />
      <FriendRequestList v-else-if="rightPanel === 'friendRequests'" />
      <AddFriendModal v-else-if="rightPanel === 'addFriend'" mode="panel" @success="handleAddSuccess" />
      <FriendSettingsModal v-else-if="rightPanel === 'friendSettings'" mode="panel" />
      <div v-else class="empty-state">
        <n-empty :description="activeTab === 'contacts' ? '选择联系人或功能开始查看' : '选择一个会话开始聊天'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSocketStore } from '@/stores/socket'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import ConversationList from '@/components/chat/ConversationList.vue'
import FriendList from '@/components/chat/FriendList.vue'
import FriendRequestList from '@/components/chat/FriendRequestList.vue'
import ChatView from '@/components/chat/ChatView.vue'
import SystemMessageList from '@/components/chat/SystemMessageList.vue'
import AddFriendModal from '@/components/chat/AddFriendModal.vue'
import FriendSettingsModal from '@/components/chat/FriendSettingsModal.vue'
import ChatbubblesOutline from '@vicons/ionicons5/es/ChatbubblesOutline'
import PeopleOutline from '@vicons/ionicons5/es/PeopleOutline'
import PersonAddOutline from '@vicons/ionicons5/es/PersonAddOutline'
import SettingsOutline from '@vicons/ionicons5/es/SettingsOutline'
import AddOutline from '@vicons/ionicons5/es/AddOutline'

const socketStore = useSocketStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const activeTab = ref('messages')
const selectedConversation = ref(null)
const rightPanel = ref('empty')

const currentUserId = computed(() => authStore.user?.id || '')
const currentUsername = computed(() => authStore.user?.username || '')
const onlineUserArray = computed(() => [...socketStore.onlineUsers])
const botContacts = computed(() => chatStore.conversations.filter(c => c.isBot))

const chatContact = computed(() => {
  if (!selectedConversation.value) return {}
  const c = selectedConversation.value
  return {
    ...c,
    name: c.name || c.nickname || c.profile?.nickname || c.username
  }
})

const currentMessages = computed(() => {
  if (!selectedConversation.value) return []
  return chatStore.messages[selectedConversation.value.id] || []
})

const isContactOnline = computed(() => {
  if (!selectedConversation.value) return false
  return socketStore.onlineUsers.has(selectedConversation.value.id)
})

const openRightPanel = (panel) => {
  selectedConversation.value = null
  rightPanel.value = panel
}

const openFriendRequests = () => {
  activeTab.value = 'contacts'
  openRightPanel('friendRequests')
}

const openAddFriendPanel = () => {
  activeTab.value = 'contacts'
  openRightPanel('addFriend')
}

const openFriendSettingsPanel = () => {
  activeTab.value = 'contacts'
  openRightPanel('friendSettings')
}

const handleSelectConversation = (conversation) => {
  activeTab.value = 'messages'
  selectedConversation.value = conversation
  rightPanel.value = 'chat'
  chatStore.openChat(conversation)
}

const handleSelectFriend = (friend) => {
  selectedConversation.value = friend
  rightPanel.value = 'chat'
  chatStore.startNewChat(friend)
}

const handleSend = (content) => {
  if (!selectedConversation.value) return
  chatStore.sendMessage(selectedConversation.value.id, content)
}

const handleShare = (data) => {
  if (!selectedConversation.value) return
  chatStore.sendMessage(selectedConversation.value.id, JSON.stringify(data))
}

const handleChatBack = () => {
  if (selectedConversation.value?.id) {
    chatStore.closeChat(selectedConversation.value.id)
  }
  selectedConversation.value = null
  rightPanel.value = 'empty'
}

const handleAddSuccess = () => {
  window.$message?.success('好友请求已发送')
  rightPanel.value = 'friendRequests'
}

const handleMarkAllSystemRead = () => {
  const unreadIds = chatStore.systemMessages
    .filter(m => !m.isRead)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    chatStore.markSystemMessagesRead(unreadIds)
  }
}

watch(() => chatStore.selectedChatFriendId, (friendId) => {
  if (!friendId) return
  const conv = chatStore.conversations.find(c => c.id === friendId)
  if (conv) {
    handleSelectConversation(conv)
  }
  chatStore.clearSelectedChatFriend()
})

onMounted(async () => {
  await chatStore.loadConversations()
  await chatStore.loadSystemMessages()
})
</script>

<style scoped>
.message-center {
  display: flex;
  width: 100%;
  height: calc(100vh - 112px);
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1023px) {
  .message-center {
    height: calc(100vh - 96px);
  }
}

@media (max-width: 767px) {
  .message-center {
    height: calc(100vh - 152px);
    border-radius: 0;
  }
}

.chat-sidebar {
  width: 320px;
  flex-shrink: 0;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.sidebar-header :deep(.n-tabs) {
  flex: 1;
}

.sidebar-header :deep(.n-tabs-nav) {
  padding: 0;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.sidebar-content > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.contacts-pane {
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.contacts-tools {
  padding: 14px 12px 10px;
  border-bottom: 1px solid #eceff3;
  background: white;
}

.tools-title {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
  padding: 0 6px;
}

.contacts-title {
  padding-top: 10px;
}

.tool-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.tool-item:hover {
  background: #f3f4f6;
}

.tool-item.active {
  background: #eef5ff;
  color: #2563eb;
}

.tool-icon {
  width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-text {
  font-size: 14px;
  font-weight: 500;
}

.contacts-list-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.contacts-list-wrap :deep(.friend-list) {
  flex: 1;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
