/**
 * Socket.io客户端封装
 * 用于实时聊天和系统消息推送
 */

import { io } from 'socket.io-client';

let socket = null;
let chatStore = null;

/**
 * 连接Socket服务器
 * @param {string} token - JWT认证Token
 * @returns {Socket} socket实例
 */
export const connectSocket = (token) => {
  if (socket?.connected) {
    console.log('[Socket] 已连接，跳过重复连接');
    return socket;
  }

  // 动态获取后端地址：支持局域网访问
  // 使用当前访问的host（可能是localhost、127.0.0.1或局域网IP）+ 后端端口
  const currentHost = window.location.hostname;
  const backendPort = '12251';
  const backendUrl = import.meta.env.VITE_API_BASE_URL || `http://${currentHost}:${backendPort}`;

  console.log('[Socket] 连接地址:', backendUrl);
  console.log('[Socket] 当前主机:', currentHost);

  socket = io(backendUrl, {
    auth: { token },
    transports: ['websocket', 'polling'], // 优先websocket，失败自动降级polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
    withCredentials: true, // 允许跨域连接
    autoConnect: true,
    forceNew: false
  });

  // 连接成功
  socket.on('connect', () => {
    console.log('[Socket] ✅ 连接成功');
    if (chatStore) {
      chatStore.setConnectionStatus(true);
    }
  });

  // 连接断开
  socket.on('disconnect', (reason) => {
    console.log('[Socket] ❌ 断开连接:', reason);
    if (chatStore) {
      chatStore.setConnectionStatus(false);
    }
  });

  // 连接错误
  socket.on('connect_error', (err) => {
    console.error('[Socket] ⚠️ 连接失败:', err.message);
    if (chatStore) {
      chatStore.setConnectionStatus(false);
    }
  });

  // 接收新消息
  socket.on('new_message', (message) => {
    console.log('[Socket] 📨 收到新消息:', message);
    if (chatStore) {
      chatStore.receiveMessage(message);
    }
  });

  // 接收系统消息
  socket.on('system_message', (message) => {
    console.log('[Socket] 🔔 收到系统消息:', message);
    if (chatStore) {
      chatStore.receiveSystemMessage(message);
    }
  });

  // 消息发送确认
  socket.on('message_sent', (data) => {
    console.log('[Socket] ✓ 消息已发送:', data);
    if (chatStore) {
      chatStore.confirmMessageSent(data);
    }
  });

  // 消息发送失败
  socket.on('message_error', (data) => {
    console.error('[Socket] ✗ 消息发送失败:', data.error);
    if (chatStore) {
      chatStore.handleMessageError(data);
    }
    // 显示错误提示
    if (window.$message) {
      window.$message.error(data.error || '发送消息失败');
    }
  });

  // 用户上线
  socket.on('user_online', ({ userId, username }) => {
    console.log('[Socket] 👤 用户上线:', username);
    if (chatStore) {
      chatStore.setUserOnline(userId, true);
    }
  });

  // 用户下线
  socket.on('user_offline', ({ userId, username }) => {
    console.log('[Socket] 👋 用户下线:', username);
    if (chatStore) {
      chatStore.setUserOnline(userId, false);
    }
  });

  return socket;
};

/**
 * 断开Socket连接
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] 🔌 主动断开连接');
    socket.disconnect();
    socket = null;
  }
};

/**
 * 发送聊天消息
 * @param {string} toUserId - 接收者ID
 * @param {string} content - 消息内容
 * @param {number} tempId - 临时ID
 */
export const sendMessage = (toUserId, content, tempId) => {
  if (!socket || !socket.connected) {
    throw new Error('Socket未连接');
  }

  socket.emit('send_message', {
    toUserId,
    content,
    tempId
  });
};

/**
 * 标记消息为已读
 * @param {string[]} messageIds - 消息ID数组
 */
export const markMessagesRead = (messageIds) => {
  if (socket && socket.connected && messageIds.length > 0) {
    socket.emit('mark_read', { messageIds });
  }
};

/**
 * 获取当前Socket实例
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * 设置ChatStore引用
 * @param {object} store - ChatStore实例
 */
export const setChatStore = (store) => {
  chatStore = store;
};

/**
 * 检查Socket是否已连接
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};
