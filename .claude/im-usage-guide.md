# IM实时通讯系统使用指南

## 架构概览

```
前端组件 → Chat Store → Socket Store → Socket.io Client
                                            ↓
后端 Socket.io Server (JWT认证) → Prisma → PostgreSQL
                ↓
         APNs推送服务 (离线用户)
```

## 一、Socket Store (核心连接层)

**位置**: `frontend/src/stores/socket.js`

### 状态

```javascript
const socketStore = useSocketStore()

socketStore.connected      // Boolean: 连接状态
socketStore.messages       // Array: 所有消息
socketStore.onlineUsers    // Set: 在线用户ID集合
socketStore.unreadCount    // Number: 未读消息数
```

### 方法

```javascript
// 连接Socket (自动在Layout.vue中调用)
socketStore.connect()

// 断开连接
socketStore.disconnect()

// 发送消息
socketStore.sendMessage(toUserId, content)

// 标记已读
socketStore.markRead([messageId1, messageId2])

// 同步消息
socketStore.syncMessages()

// 获取与某用户的对话
socketStore.getConversation(userId)
```

## 二、Chat Store (业务逻辑层)

**位置**: `frontend/src/stores/chat.js`

### 状态

```javascript
const chatStore = useChatStore()

chatStore.isConnected      // 连接状态 (来自Socket Store)
chatStore.conversations    // 会话列表
chatStore.messages         // 消息记录 {friendId: [messages]}
chatStore.openChats        // 打开的聊天窗口
chatStore.systemMessages   // 系统消息
chatStore.totalUnread      // 未读消息总数
```

### 方法

```javascript
// 打开聊天窗口
chatStore.openChat(friend)

// 关闭聊天窗口
chatStore.closeChat(friendId)

// 发送消息
chatStore.sendMessage(friendId, content)

// 标记会话已读
chatStore.markConversationRead(friendId)

// 加载会话列表
await chatStore.loadConversations()

// 加载聊天历史
await chatStore.loadChatHistory(friendId)
```

## 三、后端Socket事件

**位置**: `backend/src/index.js` (line 229-452)

### 客户端发送事件

```javascript
// 发送消息
socket.emit('send_message', {
  toUserId: 'user123',
  content: '消息内容',
  tempId: 'temp_xxx'  // 临时ID用于匹配响应
})

// 标记已读
socket.emit('mark_read', {
  messageIds: ['msg1', 'msg2']
})

// 同步消息
socket.emit('sync_messages', {
  lastMessageId: '0'  // 最后一条消息ID
})
```

### 服务端推送事件

```javascript
// 消息发送成功
socket.on('message_sent', ({ tempId, message }) => {
  // 更新临时消息为真实消息
})

// 消息发送失败
socket.on('message_error', ({ tempId, error }) => {
  // 显示错误
})

// 收到新消息
socket.on('new_message', (message) => {
  // 添加到消息列表
})

// 同步结果
socket.on('sync_result', ({ messages }) => {
  // 批量添加消息
})

// 用户上线
socket.on('user_online', ({ userId, username }) => {
  // 更新在线状态
})

// 用户下线
socket.on('user_offline', ({ userId, username }) => {
  // 更新离线状态
})
```

## 四、使用示例

### 示例1: 在组件中发送消息

```vue
<script setup>
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const message = ref('')

const handleSend = () => {
  chatStore.sendMessage(friendId, message.value)
  message.value = ''
}
</script>
```

### 示例2: 显示在线状态

```vue
<script setup>
import { useSocketStore } from '@/stores/socket'

const socketStore = useSocketStore()

const isOnline = computed(() =>
  socketStore.onlineUsers.has(friendId)
)
</script>

<template>
  <span v-if="isOnline">在线</span>
  <span v-else>离线</span>
</template>
```

### 示例3: 监听新消息

```vue
<script setup>
import { watch } from 'vue'
import { useSocketStore } from '@/stores/socket'

const socketStore = useSocketStore()

watch(() => socketStore.messages, (newMessages) => {
  // 处理新消息
  console.log('收到新消息:', newMessages[newMessages.length - 1])
}, { deep: true })
</script>
```

## 五、后端API

### 设备Token更新 (iOS推送)

```http
PUT /api/users/me/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceToken": "apns_device_token_here"
}
```

### 获取聊天历史

```http
GET /api/messages/:friendId
Authorization: Bearer <token>
```

### 获取会话列表

```http
GET /api/messages/conversations/list
Authorization: Bearer <token>
```

## 六、APNs推送机制

**触发条件**: 接收者离线时自动发送推送

**配置**:
- `APNS_KEY_PATH`: APNs密钥文件路径
- `APNS_KEY_ID`: 密钥ID
- `APNS_TEAM_ID`: 团队ID
- `APNS_BUNDLE_ID`: App Bundle ID

**推送内容**:
```json
{
  "alert": {
    "title": "新消息",
    "body": "消息内容"
  },
  "payload": {
    "type": "new_message",
    "messageId": "msg123",
    "fromUserId": "user456"
  }
}
```

## 七、注意事项

1. **自动连接**: Socket在用户登录后自动连接 (Layout.vue onMounted)
2. **自动断开**: 用户登出或组件卸载时自动断开
3. **消息持久化**: 所有消息存储在数据库，支持历史查询
4. **离线推送**: 接收者离线时通过APNs推送到iOS设备
5. **已读状态**: 打开聊天窗口自动标记消息为已读
6. **桌面通知**: 页面不在前台时显示浏览器通知

## 八、故障排查

### Socket连接失败
- 检查 `VITE_API_BASE_URL` 配置
- 检查JWT token是否有效
- 检查后端Socket.io服务是否启动

### 消息发送失败
- 检查是否为好友关系
- 检查网络连接
- 查看浏览器控制台错误

### APNs推送不工作
- 检查APNs证书配置
- 检查设备token是否已上传
- 检查用户是否真的离线

## 九、相关文件

**前端**:
- `frontend/src/stores/socket.js` - Socket连接管理
- `frontend/src/stores/chat.js` - 聊天业务逻辑
- `frontend/src/views/Layout.vue` - Socket初始化
- `frontend/src/components/ChatWindow.vue` - 聊天窗口UI

**后端**:
- `backend/src/index.js` - Socket.io服务器
- `backend/src/services/apnsService.js` - APNs推送服务
- `backend/src/controllers/userController.js` - 设备token更新
- `backend/prisma/schema.prisma` - 数据模型

**数据库表**:
- `Message` - 消息记录
- `Friendship` - 好友关系
- `User.deviceToken` - iOS设备推送token
