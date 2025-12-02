/**
 * 聊天状态管理Store
 * 管理聊天消息、会话列表、在线状态、系统消息等
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';
import { sendMessage as socketSendMessage, markMessagesRead as socketMarkRead } from '@/socket';

export const useChatStore = defineStore('chat', () => {
  // ========== 状态 ==========

  const isConnected = ref(false); // Socket连接状态
  const openChats = ref([]); // 打开的聊天窗口（最多3个）
  const conversations = ref([]); // 会话列表
  const messages = ref({}); // 消息记录 { friendId: [messages] }
  const onlineUsers = ref(new Set()); // 在线用户Set
  const systemMessages = ref([]); // 系统消息列表
  const shouldOpenPanel = ref(false); // 是否应该打开聊天面板
  const allFriends = ref([]); // 全部好友列表

  // 面板状态管理
  const panelState = ref(localStorage.getItem('chat_panel_state') || 'expanded'); // expanded/minimized/pinned
  const panelWidth = ref(parseInt(localStorage.getItem('chat_panel_width')) || 400); // 置顶模式宽度
  const panelVisible = ref(false); // 面板是否可见

  // ========== 计算属性 ==========

  // 未读消息总数（聊天消息）
  const totalUnread = computed(() => {
    return conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  });

  // 未读系统消息数
  const systemUnread = computed(() => {
    return systemMessages.value.filter(m => !m.isRead).length;
  });

  // 所有未读总数
  const allUnread = computed(() => {
    return totalUnread.value + systemUnread.value;
  });

  // ========== 方法 ==========

  /**
   * 设置Socket连接状态
   */
  function setConnectionStatus(status) {
    isConnected.value = status;
  }

  /**
   * 打开聊天窗口
   * @param {object} friend - 好友对象
   */
  function openChat(friend) {
    // 检查是否已打开
    const exists = openChats.value.find(c => c.id === friend.id);
    if (exists) {
      // 已打开，将其移到最后（最新）
      const index = openChats.value.findIndex(c => c.id === friend.id);
      if (index > -1) {
        const chat = openChats.value.splice(index, 1)[0];
        openChats.value.push(chat);
      }
      return;
    }

    // 最多打开8个tab（tab模式可以容纳更多）
    if (openChats.value.length >= 8) {
      openChats.value.shift(); // 移除最早的
    }

    openChats.value.push(friend);

    // 加载聊天历史
    loadChatHistory(friend.id);

    // 标记该会话为已读
    markConversationRead(friend.id);

    // 确保聊天面板可见
    openPanel();
  }

  /**
   * 关闭聊天窗口
   * @param {string} friendId - 好友ID
   */
  function closeChat(friendId) {
    const index = openChats.value.findIndex(c => c.id === friendId);
    if (index > -1) {
      openChats.value.splice(index, 1);
    }
  }

  /**
   * 加载聊天历史
   * @param {string} friendId - 好友ID
   */
  async function loadChatHistory(friendId) {
    if (messages.value[friendId]) {
      return; // 已加载
    }

    try {
      const response = await api.get(`/messages/${friendId}`);
      messages.value[friendId] = response.messages || [];
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      messages.value[friendId] = [];
    }
  }

  /**
   * 发送消息
   * @param {string} friendId - 好友ID
   * @param {string} content - 消息内容
   * @returns {number} 临时消息ID
   */
  function sendMessage(friendId, content) {
    const tempId = Date.now();

    // 创建临时消息
    const message = {
      id: tempId,
      fromUserId: null, // 当前用户（稍后填充）
      toUserId: friendId,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // 添加到消息列表
    if (!messages.value[friendId]) {
      messages.value[friendId] = [];
    }
    messages.value[friendId].push(message);

    // 通过Socket发送
    try {
      socketSendMessage(friendId, content, tempId);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 更新消息状态为失败
      const msg = messages.value[friendId].find(m => m.id === tempId);
      if (msg) {
        msg.status = 'failed';
      }
      throw error;
    }

    return tempId;
  }

  /**
   * 确认消息已发送（Socket回调）
   * @param {object} data - { tempId, message }
   */
  function confirmMessageSent({ tempId, message }) {
    // 查找临时消息并替换为服务器返回的消息
    for (const friendId in messages.value) {
      const index = messages.value[friendId].findIndex(m => m.id === tempId);
      if (index > -1) {
        messages.value[friendId][index] = {
          ...message,
          status: 'sent'
        };
        break;
      }
    }
  }

  /**
   * 处理消息发送错误
   * @param {object} data - { tempId, error }
   */
  function handleMessageError({ tempId, error }) {
    // 标记消息为失败状态
    for (const friendId in messages.value) {
      const msg = messages.value[friendId].find(m => m.id === tempId);
      if (msg) {
        msg.status = 'failed';
        msg.error = error;
        break;
      }
    }
  }

  /**
   * 接收新消息（Socket推送）
   * @param {object} message - 消息对象
   */
  function receiveMessage(message) {
    const friendId = message.fromUserId;

    // 添加到消息列表
    if (!messages.value[friendId]) {
      messages.value[friendId] = [];
    }
    messages.value[friendId].push(message);

    // 更新会话列表
    const conv = conversations.value.find(c => c.id === friendId);
    if (conv) {
      conv.lastMessage = message.content;
      conv.lastMessageTime = message.createdAt;

      // 如果聊天窗口未打开，增加未读数
      const chatWindow = openChats.value.find(c => c.id === friendId);
      if (!chatWindow) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      } else {
        // 聊天窗口已打开，自动标记已读
        socketMarkRead([message.id]);
      }
    }

    // 桌面通知（如果页面不在前台）
    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      new Notification('新消息', {
        body: `${message.fromUser?.username || '好友'}: ${message.content}`,
        icon: '/logo.png',
        tag: `chat-${friendId}`
      });
    }
  }

  /**
   * 接收系统消息（Socket推送）
   * @param {object} message - 系统消息对象
   */
  function receiveSystemMessage(message) {
    // 添加到系统消息列表
    systemMessages.value.unshift(message);

    // 显示Toast通知
    if (window.$message) {
      window.$message.info(message.content, {
        duration: 5000
      });
    }

    // 桌面通知
    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      new Notification('系统通知', {
        body: message.content,
        icon: '/logo.png',
        tag: 'system'
      });
    }
  }

  /**
   * 加载会话列表
   */
  async function loadConversations() {
    try {
      const data = await api.get('/messages/conversations/list');
      conversations.value = data || [];
    } catch (error) {
      console.error('加载会话列表失败:', error);
      conversations.value = [];
    }
  }

  /**
   * 加载系统消息列表
   */
  async function loadSystemMessages(page = 1) {
    try {
      const response = await api.get('/messages/system/list', { params: { page, limit: 20 } });
      if (page === 1) {
        systemMessages.value = response.messages || [];
      } else {
        systemMessages.value.push(...(response.messages || []));
      }
    } catch (error) {
      console.error('加载系统消息失败:', error);
    }
  }

  /**
   * 标记系统消息为已读
   * @param {string[]} messageIds - 消息ID数组
   */
  async function markSystemMessagesRead(messageIds) {
    try {
      await api.post('/messages/system/mark-read', { messageIds });

      // 更新本地状态
      messageIds.forEach(id => {
        const msg = systemMessages.value.find(m => m.id === id);
        if (msg) {
          msg.isRead = true;
        }
      });
    } catch (error) {
      console.error('标记系统消息已读失败:', error);
    }
  }

  /**
   * 设置用户在线状态
   * @param {string} userId - 用户ID
   * @param {boolean} online - 是否在线
   */
  function setUserOnline(userId, online) {
    if (online) {
      onlineUsers.value.add(userId);
    } else {
      onlineUsers.value.delete(userId);
    }
  }

  /**
   * 标记会话为已读
   * @param {string} friendId - 好友ID
   */
  function markConversationRead(friendId) {
    const conv = conversations.value.find(c => c.id === friendId);
    if (conv && conv.unreadCount > 0) {
      // 获取该会话的所有未读消息ID
      const unreadMsgIds = (messages.value[friendId] || [])
        .filter(m => m.fromUserId === friendId && !m.isRead)
        .map(m => m.id);

      if (unreadMsgIds.length > 0) {
        socketMarkRead(unreadMsgIds);
      }

      conv.unreadCount = 0;
    }
  }

  /**
   * 请求打开聊天面板
   */
  function requestOpenPanel() {
    shouldOpenPanel.value = true;
    panelVisible.value = true;
  }

  /**
   * 确认已打开聊天面板（重置标志）
   */
  function confirmPanelOpened() {
    shouldOpenPanel.value = false;
  }

  /**
   * 设置面板状态
   */
  function setPanelState(state) {
    panelState.value = state;
    localStorage.setItem('chat_panel_state', state);
  }

  /**
   * 切换置顶状态
   */
  function togglePin() {
    if (panelState.value === 'pinned') {
      setPanelState('expanded');
    } else {
      setPanelState('pinned');
    }
  }

  /**
   * 最小化面板
   */
  function minimizePanel() {
    setPanelState('minimized');
  }

  /**
   * 展开面板
   */
  function expandPanel() {
    setPanelState('expanded');
  }

  /**
   * 关闭面板
   */
  function closePanel() {
    panelVisible.value = false;
  }

  /**
   * 打开面板
   */
  function openPanel() {
    panelVisible.value = true;
  }

  /**
   * 设置面板宽度（置顶模式）
   */
  function setPanelWidth(width) {
    panelWidth.value = width;
    localStorage.setItem('chat_panel_width', width.toString());
  }

  /**
   * 重置状态（用于登出）
   */
  function reset() {
    isConnected.value = false;
    openChats.value = [];
    conversations.value = [];
    messages.value = {};
    onlineUsers.value = new Set();
    systemMessages.value = [];
    shouldOpenPanel.value = false;
    allFriends.value = [];
  }

  /**
   * 同步好友列表
   */
  async function syncFriends() {
    try {
      const response = await api.get('/follows/friends?limit=100');
      allFriends.value = response.users || [];
    } catch (error) {
      console.error('同步好友列表失败:', error);
      allFriends.value = [];
    }
  }

  /**
   * 开始新的聊天
   * @param {object} friend - 好友对象
   */
  async function startNewChat(friend) {
    // 检查是否已经是会话列表中的项目
    const existingConv = conversations.value.find(c => c.id === friend.id);
    if (!existingConv) {
      // 添加到会话列表
      const newConv = {
        id: friend.id,
        username: friend.username,
        nickname: friend.profile?.nickname || friend.username,
        avatar: friend.avatar,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      };
      conversations.value.unshift(newConv);
    }

    // 打开聊天面板并选择该好友聊天
    requestOpenPanel();
    // 通知组件选择该好友
    selectChatFriend(friend.id);
  }

  /**
   * 选择聊天好友（供组件调用）
   */
  const selectedChatFriendId = ref(null);

  function selectChatFriend(friendId) {
    selectedChatFriendId.value = friendId;
  }

  function clearSelectedChatFriend() {
    selectedChatFriendId.value = null;
  }

  return {
    // 状态
    isConnected,
    openChats,
    conversations,
    messages,
    onlineUsers,
    systemMessages,
    shouldOpenPanel,
    panelState,
    panelWidth,
    panelVisible,
    allFriends,
    selectedChatFriendId,

    // 计算属性
    totalUnread,
    systemUnread,
    allUnread,

    // 方法
    setConnectionStatus,
    openChat,
    closeChat,
    loadChatHistory,
    sendMessage,
    confirmMessageSent,
    handleMessageError,
    receiveMessage,
    receiveSystemMessage,
    loadConversations,
    loadSystemMessages,
    markSystemMessagesRead,
    setUserOnline,
    markConversationRead,
    requestOpenPanel,
    confirmPanelOpened,
    setPanelState,
    togglePin,
    minimizePanel,
    expandPanel,
    closePanel,
    openPanel,
    setPanelWidth,
    reset,
    syncFriends,
    startNewChat,
    selectChatFriend,
    clearSelectedChatFriend
  };
});
