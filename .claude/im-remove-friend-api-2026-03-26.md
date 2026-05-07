# 删除好友接口说明（2026-03-26）

## 目标
在不改动 iOS 当前 IM 已使用接口的前提下，新增正式的“解除好友”接口，供 iOS 通讯录直接调用。

## 新增接口
- `DELETE /api/follows/friends/:userId`

## 实现位置
- 路由：`backend/src/routes/follows.js`
- 服务：`backend/src/services/followService.js`

## 处理逻辑
- 校验目标用户 ID
- 校验不能对自己操作
- 通过 `getFriendship(userId1, userId2)` 查好友关系
- 删除 `friendship`
- 双方 `friendsCount - 1`
- 依赖 Prisma 级联自动删除：
  - `conversation`
  - `message`

## 返回格式
成功：

```json
{
  "success": true,
  "data": {
    "targetUserId": "...",
    "relationStatus": "none",
    "isFriend": false,
    "canMessage": false,
    "conversationDeleted": true,
    "historyDeleted": true
  }
}
```

失败：

```json
{ "error": "..." }
```

## 相关 IM 错误码
### 1. 删除好友后重新打开聊天
- 接口：`POST /api/conversations/create-or-get`
- 失败返回：

```json
{
  "code": "NOT_FRIEND",
  "error": "不是好友关系"
}
```

### 2. 删除好友后 REST 发消息
- 接口：`POST /api/messages/send`
- 失败返回：

```json
{
  "code": "NOT_FRIEND",
  "error": "只能向好友发送消息"
}
```

### 3. 删除好友后 Socket 发消息
- 事件：`message_error`
- 失败载荷：

```json
{
  "tempId": "本地临时ID",
  "code": "NOT_FRIEND",
  "error": "只能向好友发送消息"
}
```

## 删除好友后的后端行为
- 好友列表接口不再返回该用户
- 会话列表接口不再返回该会话
- 消息历史接口当前会返回空列表（因为消息已被级联删除）
- `create-or-get` 不会重新建会话
- socket 正常不会再收到该用户新消息，因为发送阶段已被 friendship 校验拦截

## 已保持不变的接口
- `POST /api/friend-requests`
- `POST /api/friend-requests/:requestId/accept`
- `GET /api/follows/friends`
- `POST /api/conversations/create-or-get`
- `POST /api/messages/send`
- `GET /api/messages/conversations/list`
- `GET /api/messages/:userId`
- `POST /api/messages/mark-chat-read`

## 前端接入建议
iOS 删除好友成功后：
- 从好友列表移除该用户
- 从会话列表移除该会话
- 若当前正在聊天，返回空态或上一级
- 清掉该用户本地消息缓存
- 强制重新拉一次会话列表兜底
