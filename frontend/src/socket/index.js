/**
 * Socket.io客户端封装
 * 用于实时聊天和系统消息推送
 */

import { io } from 'socket.io-client';

let socket = null;
let chatStore = null;
let connectionErrorCount = 0;
const MAX_ERROR_LOGS = 3; // 最多显示3次错误日志

/**
 * 连接Socket服务器
 * @param {string} token - JWT认证Token
 * @returns {Socket} socket实例
 */
export const connectSocket = (token) => {
  // 如果没有 token，不尝试连接
  if (!token) {
    console.log('[Socket] 无token，跳过连接');
    return null;
  }

  if (socket?.connected) {
    console.log('[Socket] 已连接，跳过重复连接');
    return socket;
  }

  // 先断开旧连接
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // 使用当前页面的origin作为Socket.io连接地址（通过nginx代理）
  // 这样无论是localhost还是外网域名都能正常工作
  const backendUrl = window.location.origin;

  console.log('[Socket] 连接地址:', backendUrl);

  // 重置错误计数
  connectionErrorCount = 0;

  socket = io(backendUrl, {
    path: '/socket.io', // 使用默认路径，通过nginx代理
    auth: { token },
    transports: ['polling', 'websocket'], // 先用polling建立连接，再升级到websocket
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 15000,
    reconnectionAttempts: 2, // 减少重试次数
    timeout: 15000,
    withCredentials: true,
    autoConnect: true,
    forceNew: true,
    upgrade: true // 允许升级到websocket
  });

  // 连接成功
  socket.on('connect', () => {
    console.log('[Socket] ✅ 连接成功');
    connectionErrorCount = 0; // 重置错误计数
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

  // 连接错误 - 限制日志输出并在多次失败后停止重连
  socket.on('connect_error', (err) => {
    connectionErrorCount++;
    if (connectionErrorCount <= MAX_ERROR_LOGS) {
      console.warn('[Socket] ⚠️ 连接失败:', err.message);
      if (connectionErrorCount === MAX_ERROR_LOGS) {
        console.warn('[Socket] 已达到最大重试次数，停止重连');
        // 停止继续重连
        socket.disconnect();
      }
    }
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
