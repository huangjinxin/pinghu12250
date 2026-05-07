# IM APNs / Push Token 最小可用说明（2026-03-26）

## 目标
解决 iOS 后台/锁屏场景下 IM 新消息无提醒问题，提供最小可用版本：
- 注册 iOS push token
- 多设备存储
- 新消息离线时自动发 APNs
- payload 带会话路由字段
- payload 带权威 badge
- token 失效自动清理

## 现有能力复用
直接复用 `SyncDevice.pushToken`，不新增独立 token 表。

相关结构：
- `backend/prisma/schema.prisma` -> `SyncDevice`
- 字段：`deviceId`, `deviceType`, `pushToken`, `isActive`

## 新增接口
### 1. 注册 push token
- `POST /api/push-tokens/register`

请求体：

```json
{
  "token": "apns-device-token",
  "platform": "ios",
  "deviceId": "ios-device-uuid",
  "deviceName": "iPhone 15 Pro"
}
```

成功返回：

```json
{
  "success": true,
  "data": {
    "deviceId": "ios-device-uuid",
    "platform": "ios",
    "tokenRegistered": true
  }
}
```

### 2. 注销 push token
- `POST /api/push-tokens/unregister`

请求体（任选其一，建议都传）：

```json
{
  "token": "apns-device-token",
  "deviceId": "ios-device-uuid"
}
```

成功返回：

```json
{
  "success": true,
  "data": {
    "count": 1,
    "tokenUnregistered": true
  }
}
```

## 兼容旧接口
保留：
- `PUT /api/users/me/device-token`

增强点：
- 继续更新 `User.deviceToken`
- 若传了 `deviceId`，会同步写入 `SyncDevice.pushToken`

请求体示例：

```json
{
  "deviceToken": "apns-device-token",
  "deviceId": "ios-device-uuid",
  "deviceName": "iPhone 15 Pro"
}
```

## APNs 发送规则
### 发送时机
- IM 新消息入库成功后
- 接收方不在线时自动触发 APNs

触发点：
- Socket 主通道：`backend/src/index.js`
- REST 发消息：`backend/src/routes/message.js`

### 多设备策略
- 对用户所有 `deviceType='ios' && isActive=true && pushToken != null` 的设备发送

### badge 计算
- 每次推送前按 `Message` 表实时计算接收方未读总数
- 使用当前权威值下发 `badge`

## APNs payload
当前 IM 推送 payload：

```json
{
  "aps": {
    "alert": {
      "title": "发送者用户名",
      "body": "消息内容摘要"
    },
    "badge": 5,
    "sound": "default"
  },
  "type": "im_message",
  "conversationId": "conversation-id",
  "fromUserId": "sender-user-id",
  "messageId": "message-id",
  "senderName": "发送者用户名",
  "badge": 5
}
```

说明：
- `type` 固定为 `im_message`
- `conversationId` 可直接用于打开会话
- `fromUserId` 可作为兜底路由参数
- `messageId` 用于精确定位
- `senderName` 用于展示
- `badge` 是服务端权威未读数

## token 失效清理
APNs 返回以下失败原因时，后端会自动清理：
- `BadDeviceToken`
- `DeviceTokenNotForTopic`
- `Unregistered`

处理方式：
- 将对应 `SyncDevice.pushToken` 置空
- `isActive = false`

## 前端最小接入建议
1. iOS 获取 APNs token 成功后调用：
   - `POST /api/push-tokens/register`
2. 退出登录时调用：
   - `POST /api/push-tokens/unregister`
3. 用户点击通知时，优先读取：
   - `conversationId`
   - `fromUserId`
4. App 回前台时：
   - 调未读数接口纠正 badge
5. 已读消息后：
   - 继续走现有已读接口，确保后端未读总数正确

## 相关接口
- 未读总数：`GET /api/messages/unread/count`
- 标记已读：`POST /api/messages/mark-chat-read`

## 已知边界
- 当前 badge 的刷新仍主要依赖“下次推送”与“前端回前台纠正”
- 还没有单独做“已读后主动推送 badge 同步到其他设备”的广播机制
- 作为最小可用版本，已足够解决后台/锁屏无提醒问题
