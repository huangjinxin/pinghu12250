# IM 实时通讯实现方案

**制定日期：** 2026-03-15
**技术架构：** Socket.io 全栈方案
**目标：** Web + iOS 实时通讯，iOS前台Socket，后台APNs

---

## 技术选型

### Server端
- **框架：** Socket.io（已有）
- **数据库：** PostgreSQL + Prisma
- **推送：** APNs (node-apn)

### Web端
- **库：** socket.io-client（已有）
- **框架：** Vue3

### iOS端
- **库：** Socket.IO-Client-Swift
- **推送：** APNs
- **本地存储：** CoreData / Realm

---

## 核心架构

### 消息流程

```
发送方 → Socket.emit('send_message') → Server
         ↓
    写入数据库
         ↓
    判断接收方在线状态
         ↓
    ┌─────────┴─────────┐
在线                  离线
    ↓                     ↓
Socket推送          APNs推送
    ↓                     ↓
接收方实时收到      接收方收到通知
```

### Socket事件定义

**客户端 → 服务器：**
- `auth` - 认证（携带JWT token）
- `send_message` - 发送消息
- `sync_messages` - 同步消息（携带lastMessageId）
- `mark_read` - 标记已读

**服务器 → 客户端：**
- `new_message` - 新消息推送
- `sync_result` - 同步结果
- `message_sent` - 消息发送成功确认
- `message_error` - 消息发送失败

---

## 数据模型

### Message表（已有，需确认字段）

```prisma
model Message {
  id          String   @id @default(uuid())
  fromUserId  String
  toUserId    String
  content     String
  messageType String   // CHAT, SYSTEM
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  fromUser User @relation("MessageFrom", fields: [fromUserId], references: [id])
  toUser   User @relation("MessageTo", fields: [toUserId], references: [id])
}
```

---

## 实施步骤

### 阶段1：Server端完善（2天）

#### 1.1 Socket认证机制
```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

#### 1.2 在线用户管理
```javascript
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, socket.id);

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
  });
});
```

#### 1.3 消息发送事件
```javascript
socket.on('send_message', async (data) => {
  const { toUserId, content, tempId } = data;

  // 1. 写入数据库
  const message = await prisma.message.create({
    data: {
      fromUserId: socket.userId,
      toUserId,
      content,
      messageType: 'CHAT'
    }
  });

  // 2. 发送确认
  socket.emit('message_sent', { tempId, message });

  // 3. 推送给接收方
  const receiverSocketId = onlineUsers.get(toUserId);
  if (receiverSocketId) {
    // 在线：Socket推送
    io.to(receiverSocketId).emit('new_message', message);
  } else {
    // 离线：APNs推送
    await sendAPNs(toUserId, message);
  }
});
```

#### 1.4 消息同步事件
```javascript
socket.on('sync_messages', async ({ lastMessageId }) => {
  const messages = await prisma.message.findMany({
    where: {
      id: { gt: lastMessageId },
      OR: [
        { fromUserId: socket.userId },
        { toUserId: socket.userId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  socket.emit('sync_result', { messages });
});
```

#### 1.5 APNs推送模块
```javascript
const apn = require('apn');

const apnProvider = new apn.Provider({
  token: {
    key: process.env.APNS_KEY_PATH,
    keyId: process.env.APNS_KEY_ID,
    teamId: process.env.APNS_TEAM_ID
  },
  production: false // 开发环境
});

async function sendAPNs(userId, message) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deviceToken: true }
  });

  if (!user.deviceToken) return;

  const notification = new apn.Notification({
    alert: {
      title: '新消息',
      body: message.content
    },
    topic: 'com.yourapp.bundleid',
    payload: {
      messageId: message.id,
      fromUserId: message.fromUserId
    }
  });

  await apnProvider.send(notification, user.deviceToken);
}
```

---

### 阶段2：Web端适配（1天）

#### 2.1 Socket连接管理
```javascript
// stores/socket.js
import { io } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null);
  const connected = ref(false);

  function connect() {
    const token = localStorage.getItem('token');
    socket.value = io('http://localhost:12251', {
      auth: { token }
    });

    socket.value.on('connect', () => {
      connected.value = true;
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });
  }

  return { socket, connected, connect };
});
```

#### 2.2 消息发送
```javascript
function sendMessage(toUserId, content) {
  const tempId = Date.now();

  socket.emit('send_message', {
    toUserId,
    content,
    tempId
  });

  // 乐观更新UI
  messages.value.push({
    id: tempId,
    content,
    fromUserId: currentUserId,
    toUserId,
    createdAt: new Date(),
    status: 'sending'
  });
}
```

#### 2.3 消息接收
```javascript
socket.on('new_message', (message) => {
  messages.value.push(message);
  // 播放提示音
  // 更新未读数
});

socket.on('message_sent', ({ tempId, message }) => {
  // 替换临时消息
  const index = messages.value.findIndex(m => m.id === tempId);
  if (index !== -1) {
    messages.value[index] = { ...message, status: 'sent' };
  }
});
```

#### 2.4 消息同步
```javascript
function syncMessages() {
  const lastMessageId = messages.value[messages.value.length - 1]?.id || '0';

  socket.emit('sync_messages', { lastMessageId });

  socket.on('sync_result', ({ messages: newMessages }) => {
    messages.value.push(...newMessages);
  });
}

// 页面加载时同步
onMounted(() => {
  syncMessages();
});
```

---

### 阶段3：iOS端实现（3-4天）

#### 3.1 集成Socket.IO-Client-Swift

**Package.swift 或 Podfile：**
```swift
// SPM
dependencies: [
    .package(url: "https://github.com/socketio/socket.io-client-swift", from: "16.0.0")
]

// 或 CocoaPods
pod 'Socket.IO-Client-Swift', '~> 16.0.0'
```

#### 3.2 Socket管理器
```swift
// SocketManager.swift
import SocketIO

class SocketManager: ObservableObject {
    static let shared = SocketManager()

    private var manager: SocketIOClient.SocketManager?
    private var socket: SocketIOClient?

    @Published var isConnected = false

    func connect() {
        guard let token = AuthService.shared.token else { return }

        manager = SocketIOClient.SocketManager(
            socketURL: URL(string: "http://localhost:12251")!,
            config: [.log(true), .compress]
        )

        socket = manager?.defaultSocket

        socket?.on(clientEvent: .connect) { [weak self] data, ack in
            self?.isConnected = true
            self?.authenticate(token: token)
        }

        socket?.on(clientEvent: .disconnect) { [weak self] data, ack in
            self?.isConnected = false
        }

        setupEventHandlers()
        socket?.connect()
    }

    private func authenticate(token: String) {
        socket?.emit("auth", ["token": token])
    }

    func disconnect() {
        socket?.disconnect()
    }
}
```

#### 3.3 消息发送
```swift
extension SocketManager {
    func sendMessage(toUserId: String, content: String, tempId: String) {
        socket?.emit("send_message", [
            "toUserId": toUserId,
            "content": content,
            "tempId": tempId
        ])
    }
}
```

#### 3.4 消息接收
```swift
extension SocketManager {
    private func setupEventHandlers() {
        // 新消息
        socket?.on("new_message") { [weak self] data, ack in
            guard let messageData = data[0] as? [String: Any] else { return }
            let message = Message(from: messageData)

            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .newMessageReceived,
                    object: message
                )
            }
        }

        // 消息发送确认
        socket?.on("message_sent") { [weak self] data, ack in
            guard let result = data[0] as? [String: Any],
                  let tempId = result["tempId"] as? String,
                  let messageData = result["message"] as? [String: Any] else { return }

            let message = Message(from: messageData)

            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .messageSent,
                    object: ["tempId": tempId, "message": message]
                )
            }
        }
    }
}
```

#### 3.5 消息同步
```swift
extension SocketManager {
    func syncMessages(lastMessageId: String) {
        socket?.emit("sync_messages", ["lastMessageId": lastMessageId])

        socket?.once("sync_result") { data, ack in
            guard let result = data[0] as? [String: Any],
                  let messagesData = result["messages"] as? [[String: Any]] else { return }

            let messages = messagesData.map { Message(from: $0) }

            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .messagesSynced,
                    object: messages
                )
            }
        }
    }
}
```

#### 3.6 App生命周期管理
```swift
// AppDelegate.swift
func applicationDidEnterBackground(_ application: UIApplication) {
    SocketManager.shared.disconnect()
}

func applicationWillEnterForeground(_ application: UIApplication) {
    SocketManager.shared.connect()

    // 同步消息
    if let lastMessageId = MessageStore.shared.lastMessageId {
        SocketManager.shared.syncMessages(lastMessageId: lastMessageId)
    }
}
```

#### 3.7 APNs推送集成
```swift
// AppDelegate.swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
        if granted {
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }

    return true
}

func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()

    // 上传到服务器
    APIService.shared.updateDeviceToken(token)
}

func userNotificationCenter(_ center: UNUserNotificationCenter,
                           didReceive response: UNNotificationResponse,
                           withCompletionHandler completionHandler: @escaping () -> Void) {

    let userInfo = response.notification.request.content.userInfo

    if let messageId = userInfo["messageId"] as? String,
       let fromUserId = userInfo["fromUserId"] as? String {
        // 打开聊天页面
        NotificationCenter.default.post(
            name: .openChat,
            object: ["userId": fromUserId]
        )
    }

    completionHandler()
}
```

---

## 关键注意事项

### 1. iOS后台限制
- iOS进入后台15秒后Socket会断开
- 必须在 `didEnterBackground` 时主动断开
- 在 `willEnterForeground` 时重连并同步消息

### 2. APNs推送去重
- Server端判断用户在线状态
- 在线用户只发Socket，不发APNs
- 避免用户同时收到两次通知

### 3. 消息顺序保证
- 每条消息带 `createdAt` 时间戳
- 客户端按时间戳排序显示
- 处理网络延迟导致的乱序

### 4. 离线消息处理
- Server端不需要维护离线消息队列
- 所有消息都写入数据库
- 客户端通过 `sync_messages` 主动拉取

### 5. 消息状态管理
```
sending → sent → delivered → read
```

### 6. 错误处理
- 网络断开自动重连
- 消息发送失败重试
- 超时处理

---

## 测试清单

### 功能测试
- [ ] Web → Web 实时消息
- [ ] Web → iOS（前台）实时消息
- [ ] iOS（前台）→ Web 实时消息
- [ ] iOS（前台）→ iOS（前台）实时消息
- [ ] iOS（后台）收到APNs推送
- [ ] 点击推送打开聊天页面
- [ ] App重新打开同步未读消息
- [ ] 消息已读状态同步

### 异常测试
- [ ] 网络断开重连
- [ ] 消息发送失败重试
- [ ] 多端同时在线
- [ ] 快速切换前后台
- [ ] 弱网环境
- [ ] 消息乱序处理

### 性能测试
- [ ] 1000条消息加载速度
- [ ] 并发100人在线
- [ ] 内存占用
- [ ] 电量消耗

---

## 扩展功能（未来）

### 群聊
- 使用Socket.io的Room机制
- `socket.join(roomId)`
- `io.to(roomId).emit('new_message')`

### 富媒体消息
- 图片：先上传获取URL，再发送消息
- 语音：同上
- 文件：同上

### 消息撤回
- 添加 `recall_message` 事件
- 2分钟内可撤回
- 双端同步撤回状态

### 已读回执
- 添加 `read_receipt` 事件
- 显示"已读"/"未读"状态

### 输入状态
- 添加 `typing` 事件
- 显示"对方正在输入..."

---

## 参考资料

- Socket.io官方文档：https://socket.io/docs/v4/
- Socket.IO-Client-Swift：https://github.com/socketio/socket.io-client-swift
- APNs官方文档：https://developer.apple.com/documentation/usernotifications
- node-apn：https://github.com/node-apn/node-apn

---

**最后更新：** 2026-03-15
