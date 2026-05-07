import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import api from '@/api';
import { useSocketStore } from './socket';
import { useAuthStore } from './auth';

const MAX_SYSTEM_MESSAGES = 100;

export const useChatStore = defineStore('chat', () => {
  const socketStore = useSocketStore();
  const authStore = useAuthStore();
  const openChats = ref([]);
  const conversations = ref([]);
  const systemMessages = ref([]);
  const allFriends = ref([]);
  const selectedChatFriendId = ref(null);
  const groupedMessages = ref({});
  const botReplyPollers = new Map();
  const loadedFriends = new Set();
  let lastMessageCount = 0;

  const isConnected = computed(() => socketStore.connected);
  const onlineUsers = computed(() => socketStore.onlineUsers);
  const messages = computed(() => groupedMessages.value);
  const totalUnread = computed(() => conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0));
  const systemUnread = computed(() => systemMessages.value.filter(m => !m.isRead).length);
  const allUnread = computed(() => totalUnread.value + systemUnread.value);

  function trimSystemMessages(list) {
    const seen = new Set();
    const result = [];

    for (const message of list) {
      if (!message?.id || seen.has(message.id)) continue;
      seen.add(message.id);
      result.push(message);
      if (result.length >= MAX_SYSTEM_MESSAGES) break;
    }

    return result;
  }

  function setSystemMessages(list) {
    systemMessages.value = trimSystemMessages(list);
  }

  function rebuildGroupedMessages() {
    const nextGroups = {};
    const currentUserId = authStore.user?.id;

    socketStore.messages.forEach(message => {
      const friendId = message.fromUserId === currentUserId ? message.toUserId : message.fromUserId;
      if (!friendId) return;
      if (!nextGroups[friendId]) nextGroups[friendId] = [];
      nextGroups[friendId].push(message);
    });

    Object.values(nextGroups).forEach(list => {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    groupedMessages.value = nextGroups;
  }

  function upsertConversationFromMessage(message) {
    const currentUserId = authStore.user?.id;
    const friendId = message.fromUserId === currentUserId ? message.toUserId : message.fromUserId;
    if (!friendId) return;

    let conversation = conversations.value.find(conv => conv.id === friendId);
    if (!conversation) {
      conversation = {
        id: friendId,
        username: message.fromUserId === currentUserId ? '' : (message.fromUser?.username || ''),
        nickname: message.fromUserId === currentUserId ? '' : (message.fromUser?.username || ''),
        avatar: message.fromUser?.avatar || null,
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0,
      };
      conversations.value.unshift(conversation);
    }

    conversation.lastMessage = message.content;
    conversation.lastMessageTime = message.createdAt;

    const chatWindow = openChats.value.find(chat => chat.id === friendId);
    if (message.fromUserId !== currentUserId) {
      if (!chatWindow) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      } else if (message.id && !String(message.id).startsWith('rest_')) {
        socketStore.markRead([message.id]);
      }
    }
  }

  function notifyNewMessage(message) {
    const currentUserId = authStore.user?.id;
    if (message.fromUserId === currentUserId) return;
    const friendId = message.fromUserId;
    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      new Notification('新消息', {
        body: `${message.fromUser?.username || '好友'}: ${message.content}`,
        icon: '/logo.png',
        tag: `chat-${friendId}`
      });
    }
  }

  function openChat(friend) {
    const exists = openChats.value.find(chat => chat.id === friend.id);
    if (exists) {
      const index = openChats.value.findIndex(chat => chat.id === friend.id);
      if (index > -1) {
        const chat = openChats.value.splice(index, 1)[0];
        openChats.value.push(chat);
      }
      markConversationRead(friend.id);
      return;
    }

    if (openChats.value.length >= 8) {
      openChats.value.shift();
    }

    openChats.value.push(friend);
    loadChatHistory(friend.id);
    markConversationRead(friend.id);
  }

  function closeChat(friendId) {
    const index = openChats.value.findIndex(chat => chat.id === friendId);
    if (index > -1) {
      openChats.value.splice(index, 1);
    }
  }

  async function loadChatHistory(friendId, force = false) {
    if (!force && loadedFriends.has(friendId)) return;

    try {
      const res = await api.get(`/messages/${friendId}`);
      const list = (res.data?.messages || res.messages || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      socketStore.removeMessages(message => {
        const messageFriendId = message.fromUserId === authStore.user?.id ? message.toUserId : message.fromUserId;
        return messageFriendId === friendId && !message.pendingReply && !message.pending;
      });
      socketStore.mergeMessages(list);
      loadedFriends.add(friendId);
    } catch (error) {
      console.error('加载聊天历史失败:', error);
    }
  }

  async function sendMessage(friendId, content) {
    const tempId = `rest_${Date.now()}_${Math.random()}`;
    const sentAt = Date.now();
    const isBotChat = conversations.value.find(conv => conv.id === friendId)?.isBot;
    const tempMessage = {
      id: tempId,
      tempId,
      fromUserId: authStore.user?.id || null,
      toUserId: friendId,
      content,
      createdAt: new Date(sentAt).toISOString(),
      isRead: true,
      pending: true,
      fromUser: {
        id: authStore.user?.id || null,
        username: authStore.user?.username || '',
        avatar: authStore.user?.avatar || null
      }
    };

    socketStore.mergeMessages([tempMessage]);
    if (isBotChat) {
      socketStore.mergeMessages([{
        id: `thinking_${sentAt}`,
        fromUserId: friendId,
        toUserId: authStore.user?.id || null,
        content: '正在思考中...',
        createdAt: new Date(sentAt).toISOString(),
        pendingReply: true,
        pendingReplyFor: sentAt,
      }]);
    }

    const conversation = conversations.value.find(conv => conv.id === friendId);
    if (conversation) {
      conversation.lastMessage = content;
      conversation.lastMessageTime = tempMessage.createdAt;
    }

    try {
      const res = await api.post('/messages/send', { toUserId: friendId, content });
      const message = res.data?.message || res.message;
      if (message) {
        socketStore.upsertMessage(message, item => item.tempId === tempId || item.id === tempId);
        if (conversation) {
          conversation.lastMessage = message.content;
          conversation.lastMessageTime = message.createdAt;
        }
        await loadChatHistory(friendId, true);
        if (isBotChat) startBotReplyPolling(friendId, sentAt);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      socketStore.removeMessages(message => message.tempId === tempId || message.id === tempId);
      socketStore.sendMessage(friendId, content);
    }
  }

  function startBotReplyPolling(friendId, sentAt) {
    stopBotReplyPolling(friendId);
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      await loadChatHistory(friendId, true);
      const hasBotReply = socketStore.messages.some(message => {
        if (message.fromUserId !== friendId || message.pendingReply || !message.createdAt) return false;
        return new Date(message.createdAt).getTime() > sentAt;
      });
      if (hasBotReply || attempts >= 5) {
        socketStore.removeMessages(message => message.pendingReply && message.pendingReplyFor === sentAt && message.fromUserId === friendId);
        stopBotReplyPolling(friendId);
      }
    }, 2000);
    botReplyPollers.set(friendId, timer);
  }

  function stopBotReplyPolling(friendId) {
    const timer = botReplyPollers.get(friendId);
    if (timer) {
      clearInterval(timer);
      botReplyPollers.delete(friendId);
    }
  }

  function stopAllBotReplyPollers() {
    Array.from(botReplyPollers.keys()).forEach(stopBotReplyPolling);
  }

  function receiveSystemMessage(message) {
    setSystemMessages([message, ...systemMessages.value]);

    if (window.$message) {
      window.$message.info(message.content, {
        duration: 5000
      });
    }

    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      new Notification('系统通知', {
        body: message.content,
        icon: '/logo.png',
        tag: 'system'
      });
    }
  }

  async function loadConversations() {
    try {
      const res = await api.get('/messages/conversations/list');
      conversations.value = res.data || res || [];
    } catch (error) {
      console.error('加载会话列表失败:', error);
      conversations.value = [];
    }
  }

  async function loadSystemMessages(page = 1) {
    try {
      const response = await api.get('/messages/system/list', { params: { page, limit: 20 } });
      const nextMessages = response.messages || [];
      if (page === 1) {
        setSystemMessages(nextMessages);
      } else {
        setSystemMessages([...systemMessages.value, ...nextMessages]);
      }
    } catch (error) {
      console.error('加载系统消息失败:', error);
    }
  }

  async function markSystemMessagesRead(messageIds) {
    try {
      await api.post('/messages/system/mark-read', { messageIds });
      messageIds.forEach(id => {
        const message = systemMessages.value.find(item => item.id === id);
        if (message) {
          message.isRead = true;
        }
      });
    } catch (error) {
      console.error('标记系统消息已读失败:', error);
    }
  }

  function markConversationRead(friendId) {
    const conversation = conversations.value.find(conv => conv.id === friendId);
    if (conversation && conversation.unreadCount > 0) {
      const unreadMessageIds = (messages.value[friendId] || [])
        .filter(message => message.fromUserId === friendId && !message.isRead)
        .map(message => message.id);

      if (unreadMessageIds.length > 0) {
        socketStore.markRead(unreadMessageIds);
      }

      conversation.unreadCount = 0;
    }
  }

  function reset() {
    stopAllBotReplyPollers();
    socketStore.disconnect();
    openChats.value = [];
    conversations.value = [];
    systemMessages.value = [];
    allFriends.value = [];
    selectedChatFriendId.value = null;
    groupedMessages.value = {};
    loadedFriends.clear();
    lastMessageCount = 0;
  }

  async function syncFriends() {
    try {
      const response = await api.get('/follows/friends?limit=100');
      allFriends.value = response.users || [];
    } catch (error) {
      console.error('同步好友列表失败:', error);
      allFriends.value = [];
    }
  }

  async function startNewChat(friend) {
    const existingConversation = conversations.value.find(conv => conv.id === friend.id);
    if (!existingConversation) {
      conversations.value.unshift({
        id: friend.id,
        username: friend.username,
        nickname: friend.profile?.nickname || friend.username,
        avatar: friend.avatar,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      });
    }
    selectChatFriend(friend.id);
  }

  function selectChatFriend(friendId) {
    selectedChatFriendId.value = friendId;
  }

  function clearSelectedChatFriend() {
    selectedChatFriendId.value = null;
  }

  watch(
    () => socketStore.messages.map(message => message.id || message.tempId || `${message.fromUserId}-${message.toUserId}-${message.createdAt}`).join('|'),
    () => {
      rebuildGroupedMessages();
      const currentMessages = socketStore.messages;
      if (currentMessages.length <= lastMessageCount) {
        lastMessageCount = currentMessages.length;
        return;
      }

      const latestMessage = currentMessages[currentMessages.length - 1];
      if (!latestMessage) {
        lastMessageCount = currentMessages.length;
        return;
      }

      upsertConversationFromMessage(latestMessage);
      notifyNewMessage(latestMessage);
      lastMessageCount = currentMessages.length;
    },
    { immediate: true }
  );

  return {
    isConnected,
    openChats,
    conversations,
    messages,
    onlineUsers,
    systemMessages,
    allFriends,
    selectedChatFriendId,
    totalUnread,
    systemUnread,
    allUnread,
    openChat,
    closeChat,
    loadChatHistory,
    sendMessage,
    receiveSystemMessage,
    loadConversations,
    loadSystemMessages,
    markSystemMessagesRead,
    markConversationRead,
    reset,
    syncFriends,
    startNewChat,
    selectChatFriend,
    clearSelectedChatFriend
  };
});
