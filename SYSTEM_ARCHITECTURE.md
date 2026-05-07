# 苹湖少儿空间 - 系统架构设计文档

> 版本: 1.0 | 日期: 2026-03-29 | 状态: 设计中

---

## 目录

1. [系统愿景与设计原则](#1-系统愿景与设计原则)
2. [多元身份与动态授权模型](#2-多元身份与动态授权模型)
3. [即时通讯(IM)与Bot自动化架构](#3-即时通讯im与bot自动化架构)
4. [分布式存储与硬件联动预留](#4-分布式存储与硬件联动预留)
5. [API安全与性能优化](#5-api安全与性能优化)
6. [数据库迁移路线图](#6-数据库迁移路线图)

---

## 1. 系统愿景与设计原则

### 1.1 核心理念

**学生主导授权 (Student-Led Authorization)**
- 学生是数据的真正主人
- 所有数据访问需经学生明确授权
- 家长/教师仅有被授予的查看权限
- 授权可随时撤回

**高度可扩展性 (High Extensibility)**
- 无需修改代码即可开启/关闭功能
- 新功能通过配置文件即可启用
- 模块化设计，支持渐进式演进

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **前向兼容** | 新增表/字段不影响现有功能 |
| **渐进式迁移** | 支持 V1/V2 数据格式共存 |
| **事件驱动** | 解耦业务逻辑，异步处理非核心流程 |
| **零信任安全** | 每次请求都需验证，不依赖网络位置 |

### 1.3 现有架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   Web App   │   iOS App   │  Android   │   OpenWrt Box   │
│  (Vue3)     │  (Swift)    │  (Kotlin)  │   (本地存储)    │
└──────┬──────┴──────┬──────┴─────┬──────┴────────┬────────┘
       │             │            │               │
       ▼             ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │  REST    │  │  WebSocket│  │  File    │   │
│  │  Router  │  │  Routes  │  │  (Socket.IO)│ │  Upload  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │  Message │  │  Content │  │  AI      │   │
│  │  Service │  │  Service │  │  Service │  │  Service │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │ S3/MinIO │  │ pgvector │   │
│  │(主数据库) │  │ (缓存/队列)│ │ (文件存储)│  │(向量存储)│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 多元身份与动态授权模型

### 2.1 现有 User 模型分析

当前 `User` 模型字段:

```prisma
// 现有模型 (简化展示)
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  password      String    // bcrypt hash
  role          Role      @default(STUDENT)
  status        UserStatus @default(ACTIVE)
  
  // 2FA
  twoFactorEnabled   Boolean   @default(false)
  twoFactorSecret   String?   // AES-256-GCM 加密
  twoFactorBackupCodes String[]
  
  // 关系
  studentParents StudentParent[]
  profile       Profile?
  
  // 预留字段 (建议扩展)
  homeNodeUrl   String?
  
  // 扩展配置 (需新增)
  preferences   Json?     // 功能开关
  grants        UserGrant[] // 授权关系
}
```

### 2.2 新增授权表设计

#### 2.2.1 UserGrant 表 (核心授权表)

```prisma
// ============================================================
// 动态授权表 - 实现学生主导的权限控制
// ============================================================
model UserGrant {
  id          String      @id @default(uuid())
  
  // 授权方 (通常是学生)
  granterId   String
  granter     User        @relation("GrantsGiven", fields: [granterId], references: [id])
  
  // 被授权方 (家长/教师/其他学生)
  granteeId   String
  grantee     User        @relation("GrantsReceived", fields: [granteeId], references: [id])
  
  // 授权类型
  grantType   GrantType
  
  // 授权范围 (JSONB 灵活配置)
  // 格式: { resources: ["diary", "homework"], actions: ["read", "comment"], expiresAt: null }
  scope       Json
  
  // 状态机
  status      GrantStatus @default(PENDING)
  
  // 审核信息 (管理员介入时使用)
  reviewedBy  String?
  reviewedAt  DateTime?
  reviewNote  String?
  
  // 撤销信息
  revokedAt   DateTime?
  revokeNote  String?
  
  // 有效期
  startsAt    DateTime   @default(now())
  expiresAt   DateTime?
  
  // 元数据
  reason      String?     // 申请理由
  ipAddress   String?    // 申请IP
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  // 索引
  @@index([granterId, status])
  @@index([granteeId, status])
  @@index([grantType, status])
  
  @@unique([granterId, granteeId, grantType, status])
}

// 授权类型枚举
enum GrantType {
  // 数据查看类
  VIEW_DIARY          // 查看日记
  VIEW_HOMEWORK       // 查看作业
  VIEW_PROGRESS       // 查看学习进度
  VIEW_MESSAGES       // 查看消息
  
  // 协作类
  COMMENT_CONTENT     // 评论内容
  MESSAGE_CHILD       // 给学生发消息
  
  // 管理类
  MANAGE_TASKS        // 管理任务
  APPROVE_SUBMISSIONS // 审核提交
  
  // 家长特定
  PARENT_VIEW         // 家长查看子女
  PARENT_MESSAGE      // 家长发消息
  
  // 教师特定
  TEACHER_VIEW_CLASS  // 查看班级学生
  TEACHER_ASSIGN      // 布置任务
}

// 授权状态枚举
enum GrantStatus {
  PENDING     // 待审核 (需要管理员审批)
  ACTIVE      // 已生效
  REJECTED    // 已拒绝
  EXPIRED     // 已过期
  REVOKED     // 已撤销 (学生主动撤回)
}
```

#### 2.2.2 GrantRequest 表 (授权申请记录)

```prisma
// ============================================================
// 授权申请记录 - 完整的状态机流转
// ============================================================
model GrantRequest {
  id          String      @id @default(uuid())
  
  // 申请人
  requesterId String
  requester   User        @relation(fields: [requesterId], references: [id])
  
  // 目标用户 (被申请授权的对象)
  targetId    String
  target      User        @relation(fields: [targetId], references: [id])
  
  // 申请类型
  grantType   GrantType
  
  // 申请范围
  scope       Json
  
  // 申请理由
  reason      String
  
  // 状态流转
  status      RequestStatus @default(PENDING)
  
  // 学生响应
  studentResponse String?   // 同意/拒绝理由
  studentRespondedAt DateTime?
  
  // 管理员审核 (如需)
  adminReviewedBy   String?
  adminReviewedAt   DateTime?
  adminNote         String?
  
  // 最终授权 (审批通过后创建)
  createdGrantId String?    @unique
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@index([targetId, status])
  @@index([requesterId])
}

// 请求状态
enum RequestStatus {
  PENDING_STUDENT    // 等待学生确认
  PENDING_ADMIN      // 等待管理员审核
  APPROVED           // 已批准
  REJECTED_STUDENT   // 学生拒绝
  REJECTED_ADMIN     // 管理员拒绝
  CANCELLED          // 申请人取消
}
```

### 2.3 状态机流转逻辑

#### 2.3.1 家长申请绑定流程

```
┌──────────────────────────────────────────────────────────────────────┐
│                    家长申请绑定学生账号流程                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   家长                    学生                   系统/管理员           │
│    │                       │                        │                 │
│    │──── 1. 申请绑定 ─────▶│                        │                 │
│    │                       │                        │                 │
│    │              2. 收到通知                      │                 │
│    │                       │                        │                 │
│    │              3. 查看申请详情                   │                 │
│    │                       │                        │                 │
│    │       ┌───────────────┴───────────────┐        │                 │
│    │       │                               │        │                 │
│    │   4a. 同意                        4b. 拒绝       │                 │
│    │       │                               │        │                 │
│    │       ▼                               ▼        │                 │
│    │   ┌─────────┐                    ┌─────────┐   │                 │
│    │   │ 创建    │                    │ 拒绝    │   │                 │
│    │   │ Grant  │                    │ 请求    │   │                 │
│    │   │ ACTIVE │                    │ REJECTED│   │                 │
│    │   └─────────┘                    └─────────┘   │                 │
│    │       │                               │        │                 │
│    │       ▼                               │        │                 │
│    │   5. 收到绑定成功通知                 │        │                 │
│    │       │                               │        │                 │
│    │◀──────┴───────────────────────────────┘        │                 │
│    │                                                        │         │
└──┴────────────────────────────────────────────────────────────────┘
```

#### 2.3.2 教师访问学生数据流程 (需审核)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    教师访问学生数据流程 (需审核)                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   教师                    学生                   管理员                │
│    │                       │                        │                 │
│    │──── 1. 申请查看 ─────▶│                        │                 │
│    │                       │                        │                 │
│    │              2. 收到通知                      │                 │
│    │                       │                        │                 │
│    │       ┌───────────────┴───────────────┐        │                 │
│    │       │                               │        │                 │
│    │   3a. 同意                        3b. 拒绝       │                 │
│    │       │                               │        │                 │
│    │       ▼                               ▼        │                 │
│    │   ┌─────────┐                    ┌─────────┐   │                 │
│    │   │ PENDING  │                    │ REJECTED│   │                 │
│    │   │  ADMIN  │                    │         │   │                 │
│    │   └────┬────┘                    └─────────┘   │                 │
│    │        │                               │        │                 │
│    │        ▼                               │        │                 │
│    │   4. 管理员审核                         │        │                 │
│    │        │                               │        │                 │
│    │   ┌────┴────┐                          │        │                 │
│    │   │         │                          │        │                 │
│    │ ▼       ▼                            │        │                 │
│    │批准     拒绝                          │        │                 │
│    │ │       │                            │        │                 │
│    │ ▼       ▼                            │        │                 │
│    │创建     拒绝                          │        │                 │
│    │Grant   请求                           │        │                 │
│    │ │       │                            │        │                 │
│    │◀┴───────┴────────────────────────────┘        │                 │
│    │                                                        │         │
└──┴────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 学生撤回授权

```
学生可随时撤回授权，撤回后:
1. Grant 状态变为 REVOKED
2. 被授权方立即失去访问权限
3. 撤回操作记录到审计日志
4. 通知被授权方
```

### 2.4 preferences 字段设计 (功能开关)

```prisma
// 在 User 模型中新增 preferences 字段
model User {
  // ... 现有字段 ...
  
  // 功能开关配置 (JSONB)
  // 支持 "无代码改动" 的功能配置
  preferences Json @default("{}")
}

// preferences 字段结构设计
interface UserPreferences {
  // 隐私设置
  privacy: {
    profilePublic: boolean;           // 主页是否公开
    showInLeaderboard: boolean;        // 是否出现在排行榜
    allowStrangerMessage: boolean;     // 允许陌生人私信
    autoAcceptFriend: boolean;          // 自动同意好友申请
  };
  
  // 通知设置
  notifications: {
    email: boolean;                    // 邮件通知
    push: boolean;                     // 推送通知
    friendRequest: boolean;            // 好友申请通知
    comment: boolean;                   // 评论通知
    achievement: boolean;              // 成就通知
    dailyReminder: string | null;       // 每日提醒时间 "09:00"
  };
  
  // 功能开关 (Beta 功能)
  features: {
    aiCompanion: boolean;              // AI 学伴功能
    voiceRecording: boolean;            // 语音录音
    locationTag: boolean;              // 位置标记
    gamification: boolean;             // 游戏化元素
    socialFeed: boolean;                // 社交动态
  };
  
  // 家长控制 (由家长设置，子女可申请修改)
  parentalControls: {
    dailyLimit: number | null;          // 每日使用分钟数
    allowedHours: string[] | null;      // 允许使用时间段 ["09:00-12:00", "14:00-18:00"]
    requireApproval: string[] | null;   // 哪些操作需要家长审批
  };
  
  // 界面定制
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
    fontSize: 'small' | 'medium' | 'large';
    reduceMotion: boolean;             // 减少动画
  };
}

// 功能开关配置项参考
const FEATURE_FLAGS = {
  // 稳定功能
  diary: true,
  homework: true,
  notes: true,
  books: true,
  
  // Beta 功能
  aiChatbot: true,
  voiceRecording: false,
  videoUpload: false,
  
  // 实验功能
  arLearning: false,
  blockchainBadge: false,
};
```

### 2.5 授权检查中间件

```javascript
// backend/src/middleware/grantAuth.js

const { checkGrant } = require('../services/grantService');

/**
 * 基于 Grant 的授权检查中间件
 * 
 * @param {GrantType[]} requiredGrants - 需要的授权类型
 * @param {Object} options - 配置选项
 */
const requireGrants = (requiredGrants, options = {}) => {
  const { 
    requireActive = true,    // 是否要求授权状态为 ACTIVE
    checkExpiry = true,       // 是否检查过期时间
    allowSelf = false        // 是否允许用户访问自己的资源
  } = options;
  
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const resourceOwnerId = req.params.userId || req.body.userId;
      
      // 1. 自身访问检查
      if (allowSelf && userId === resourceOwnerId) {
        return next();
      }
      
      // 2. 角色权限兜底
      const roleGrants = {
        ADMIN: ['*'],  // 管理员拥有所有权限
        TEACHER: ['TEACHER_VIEW_CLASS', 'TEACHER_ASSIGN'],
        PARENT: ['PARENT_VIEW', 'PARENT_MESSAGE'],
      };
      
      if (roleGrants[req.user?.role]?.includes('*') || 
          requiredGrants.some(g => roleGrants[req.user?.role]?.includes(g))) {
        return next();
      }
      
      // 3. 检查动态授权
      const hasGrants = await checkGrant({
        granterId: resourceOwnerId,
        granteeId: userId,
        grantTypes: requiredGrants,
        requireActive,
        checkExpiry
      });
      
      if (!hasGrants) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您没有访问此资源的权限',
          requiredGrants,
          canRequest: true  // 告知客户端可以发起授权申请
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 检查是否有任何有效授权
 */
const requireAnyGrant = (grantTypes) => {
  return requireGrants(grantTypes, { requireActive: true });
};

/**
 * 检查是否有全部所需授权
 */
const requireAllGrants = (grantTypes) => {
  return async (req, res, next) => {
    const hasAll = await checkGrant({
      granterId: req.params.userId,
      granteeId: req.user.id,
      grantTypes,
      requireAll: true
    });
    
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: 'MISSING_GRANTS',
        message: '权限不足'
      });
    }
    
    next();
  };
};

module.exports = {
  requireGrants,
  requireAnyGrant,
  requireAllGrants
};
```

### 2.6 Grant Service 实现

```javascript
// backend/src/services/grantService.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 检查用户是否拥有所需的授权
 */
const checkGrant = async ({
  granterId,
  granteeId,
  grantTypes,
  requireActive = true,
  checkExpiry = true,
  requireAll = false
}) => {
  const conditions = {
    granterId,
    granteeId,
    status: requireActive ? 'ACTIVE' : undefined,
  };
  
  if (checkExpiry) {
    conditions.OR = [
      { expiresAt: null },           // 永不过期
      { expiresAt: { gt: new Date() } }  // 未过期
    ];
  }
  
  if (Array.isArray(grantTypes)) {
    conditions.grantType = { in: grantTypes };
  } else {
    conditions.grantType = grantTypes;
  }
  
  const count = await prisma.userGrant.count({ where: conditions });
  
  return requireAll ? count === grantTypes.length : count > 0;
};

/**
 * 创建授权
 */
const createGrant = async ({
  granterId,
  granteeId,
  grantType,
  scope,
  expiresAt = null,
  reason = null
}) => {
  // 检查是否已存在有效授权
  const existing = await prisma.userGrant.findFirst({
    where: {
      granterId,
      granteeId,
      grantType,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });
  
  if (existing) {
    // 更新现有授权
    return prisma.userGrant.update({
      where: { id: existing.id },
      data: { expiresAt, scope }
    });
  }
  
  // 创建新授权
  return prisma.userGrant.create({
    data: {
      granterId,
      granteeId,
      grantType,
      scope: scope || {},
      expiresAt,
      status: 'ACTIVE',
      reason
    }
  });
};

/**
 * 撤销授权
 */
const revokeGrant = async (grantId, granterId, note = null) => {
  return prisma.userGrant.update({
    where: { id: grantId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokeNote: note
    }
  });
};

/**
 * 获取用户的授权列表
 */
const getUserGrants = async (userId, { as = 'granter' | 'grantee' } = {}) => {
  const where = as === 'granter' 
    ? { granterId: userId }
    : { granteeId: userId };
  
  return prisma.userGrant.findMany({
    where,
    include: {
      granter: { select: { id: true, username: true, realName: true } },
      grantee: { select: { id: true, username: true, realName: true } },
    },
    orderBy: { createdAt: 'desc' }
  });
};

module.exports = {
  checkGrant,
  createGrant,
  revokeGrant,
  getUserGrants
};
```

---

## 3. 即时通讯(IM)与Bot自动化架构

### 3.1 现有 Message 模型分析

```prisma
// 现有模型
model Message {
  id             String       @id @default(uuid())
  conversationId  String
  fromUserId     String
  toUserId       String
  messageType    MessageType
  content        String
  metadata       Json?        // 扩展信息
  isRead         Boolean      @default(false)
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  fromUser       User         @relation("SentMessages", fields: [fromUserId], references: [id])
  toUser         User         @relation("ReceivedMessages", fields: [toUserId], references: [id])
  
  createdAt      DateTime     @default(now())
}

enum MessageType {
  CHAT
  SYSTEM_ACHIEVEMENT
  SYSTEM_TASK
  SYSTEM_PURCHASE
  SYSTEM_FOLLOW
  SYSTEM_FRIEND
  SYSTEM_REWARD
  SYSTEM_TEACHER_REWARD
  SYSTEM_QUESTION
}
```

### 3.2 MessagePayload 协议设计

```typescript
// ============================================================
// 标准消息协议 - 统一的 Payload 格式
// ============================================================

interface BasePayload {
  id: string;              // 消息唯一ID (UUID)
  type: MessageType;       // 消息类型
  timestamp: number;       // Unix timestamp (毫秒)
  version: '1.0';          // 协议版本
  
  from: {
    userId: string;
    username: string;
    avatar?: string;
    role: UserRole;
  };
  
  to: {
    type: 'user' | 'group' | 'system';
    id: string;
  };
}

interface TextPayload extends BasePayload {
  type: 'TEXT';
  content: {
    text: string;              // 纯文本内容
    mentions?: string[];       // @的用户ID列表
    replyTo?: string;          // 回复的消息ID
    forwardFrom?: string;      // 转发的原始消息ID
  };
}

interface ImagePayload extends BasePayload {
  type: 'IMAGE';
  content: {
    url: string;               // 原图URL
    thumbnailUrl: string;      // 缩略图URL (200x200)
    width: number;
    height: number;
    size: number;              // 文件大小 (bytes)
    format: 'jpeg' | 'png' | 'gif' | 'webp';
    alt?: string;             // alt文字
  };
}

interface VoicePayload extends BasePayload {
  type: 'VOICE';
  content: {
    url: string;               // 语音文件URL
    duration: number;          // 时长 (秒)
    durationMs: number;        // 毫秒精度
    
    // AI 处理后填充
    transcript?: string;       // 转写文本
    transcriptConfidence?: number; // 转写置信度
    
    format: 'mp3' | 'wav' | 'ogg' | 'm4a';
    size: number;
  };
}

interface FilePayload extends BasePayload {
  type: 'FILE';
  content: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    icon?: string;             // 文件类型图标
  };
}

interface CallPayload extends BasePayload {
  type: 'CALL';
  content: {
    callType: 'audio' | 'video';
    status: 'missed' | 'rejected' | 'completed' | 'cancelled';
    duration?: number;          // 通话时长 (秒)
    startTime: number;         // 开始时间
    endTime?: number;
  };
}

interface SystemPayload extends BasePayload {
  type: 'SYSTEM';
  content: {
    action: SystemAction;
    data: Record<string, any>;
    importance: 'low' | 'normal' | 'high';
  };
}

// 消息联合类型
type MessagePayload = 
  | TextPayload 
  | ImagePayload 
  | VoicePayload 
  | FilePayload 
  | CallPayload 
  | SystemPayload;

// 系统动作类型
type SystemAction = 
  | 'ACHIEVEMENT_UNLOCKED'
  | 'TASK_ASSIGNED'
  | 'TASK_DEADLINE_REMINDER'
  | 'SUBMISSION_REVIEWED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FOLLOW_NEW'
  | 'REWARD_EARNED'
  | 'DIARY_COMMENT'
  | 'MENTION'
  | 'GROUP_JOINED'
  | 'GROUP_LEFT';
```

### 3.3 数据库模型扩展

```prisma
// ============================================================
// 扩展 Message 模型 - 支持富媒体消息
// ============================================================

model Message {
  id             String       @id @default(uuid())
  localId        String?      @unique  // 客户端本地ID，用于离线消息同步
  conversationId String
  fromUserId     String
  toUserId       String?
  
  // 消息类型 (扩展枚举)
  messageType    ExtendedMessageType @default(CHAT)
  
  // 内容存储 - 使用 JSONB 存储结构化 Payload
  content        Json         // MessagePayload 结构
  
  // 兼容旧字段 (可选，用于迁移)
  legacyContent  String?      // 旧版纯文本内容
  
  // 消息状态
  isRead         Boolean      @default(false)
  isDeleted      Boolean      @default(false)      // 软删除
  isPinned       Boolean      @default(false)      // 置顶
  isEdited       Boolean      @default(false)      // 是否被编辑
  
  // AI 处理状态
  aiProcessed    Boolean      @default(false)
  aiResult       Json?       // AI 分析结果
  
  // 元数据
  metadata       Json?        // 扩展信息
  replyToId      String?      // 回复的消息ID
  
  // 安全
  encrypted      Boolean      @default(false)      // 是否端到端加密
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  // 关系
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  fromUser       User         @relation("SentMessages", fields: [fromUserId], references: [id])
  replyTo        Message?     @relation("Replies", fields: [replyToId], references: [id])
  replies        Message[]    @relation("Replies")
  
  @@index([conversationId, createdAt])
  @@index([fromUserId])
  @@index([toUserId])
  @@index([messageType])
  @@index([localId])
}

// 扩展消息类型
enum ExtendedMessageType {
  // 基础类型
  CHAT
  SYSTEM
  
  // 媒体类型
  IMAGE
  VOICE
  VIDEO
  FILE
  
  // 互动类型
  LOCATION
  CONTACT
  CARD         // 名片/链接卡片
  
  // 通话
  CALL_MISSED
  CALL_REJECTED
  CALL_COMPLETED
  
  // 特殊
  ENCRYPTED
  REVOKED
}
```

### 3.4 事件驱动的 Bot 架构

```typescript
// ============================================================
// 事件驱动的 Bot 集成架构
// ============================================================

// 事件总线
interface EventBus {
  emit(event: BotEvent, payload: any): Promise<void>;
  on(event: BotEvent, handler: EventHandler): void;
  off(event: BotEvent, handler: EventHandler): void;
}

// Bot 事件类型
enum BotEvent {
  // 消息事件
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_EDITED = 'message:edited',
  
  // 媒体事件
  VOICE_RECEIVED = 'voice:received',
  IMAGE_RECEIVED = 'image:received',
  
  // 用户事件
  USER_REGISTERED = 'user:registered',
  ACHIEVEMENT_UNLOCKED = 'achievement:unlocked',
  
  // 内容事件
  DIARY_CREATED = 'diary:created',
  WORK_SUBMITTED = 'work:submitted',
  
  // 定时事件
  DAILY_REMINDER = 'cron:daily_reminder',
  WEEKLY_REPORT = 'cron:weekly_report',
}

// Bot 接口定义
interface Bot {
  id: string;
  name: string;
  avatar: string;
  enabled: boolean;
  
  // 支持的事件
  supportedEvents: BotEvent[];
  
  // 事件处理器
  handle(event: BotEvent, context: BotContext): Promise<BotResponse>;
}

interface BotContext {
  event: BotEvent;
  payload: any;
  user: User;
  message?: Message;
  metadata: Record<string, any>;
}

interface BotResponse {
  // 回复消息
  messages?: MessagePayload[];
  
  // 执行的动作
  actions?: BotAction[];
  
  // 更新上下文
  updateContext?: Partial<BotContext>;
  
  // 错误处理
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Bot 操作类型
type BotAction = 
  | { type: 'SEND_MESSAGE'; to: string; message: MessagePayload }
  | { type: 'CREATE_TASK'; task: Partial<Task> }
  | { type: 'AWARD_POINTS'; userId: string; amount: number; reason: string }
  | { type: 'SEND_NOTIFICATION'; userId: string; notification: any }
  | { type: 'UPDATE_PROGRESS'; userId: string; achievementId: string; progress: number }
  | { type: 'ARCHIVE_CONTENT'; contentId: string; contentType: string };
```

### 3.5 Bot 实现示例

```typescript
// ============================================================
// AI 语音转文字 Bot
// ============================================================

import { EventBus } from '../core/eventBus';
import { speechToText } from '../services/ai/speech';

class VoiceTranscriptBot implements Bot {
  id = 'voice-transcript-bot';
  name = '语音转文字助手';
  avatar = '/bots/voice-bot.png';
  enabled = true;
  
  supportedEvents = [BotEvent.VOICE_RECEIVED];
  
  async handle(event: BotEvent, context: BotContext): Promise<BotResponse> {
    if (event !== BotEvent.VOICE_RECEIVED) {
      return { actions: [] };
    }
    
    const { message } = context;
    const voiceContent = message.content as VoicePayload['content'];
    
    // 检查是否已转写
    if (voiceContent.transcript) {
      return { actions: [] };
    }
    
    try {
      // 调用 AI 服务转写
      const result = await speechToText({
        audioUrl: voiceContent.url,
        language: 'zh-CN'
      });
      
      // 更新消息内容
      const actions: BotAction[] = [
        {
          type: 'UPDATE_MESSAGE',
          messageId: message.id,
          updates: {
            'content.transcript': result.text,
            'content.transcriptConfidence': result.confidence,
            aiProcessed: true
          }
        }
      ];
      
      // 如果置信度低，发送提示
      if (result.confidence < 0.7) {
        actions.push({
          type: 'SEND_MESSAGE',
          to: message.fromUserId,
          message: {
            type: 'TEXT',
            content: {
              text: `📝 语音已转写（置信度 ${Math.round(result.confidence * 100)}%）：\n${result.text}`
            }
          }
        });
      }
      
      return { actions };
      
    } catch (error) {
      return {
        error: {
          code: 'TRANSCRIPT_FAILED',
          message: '语音转写失败',
          retryable: true
        }
      };
    }
  }
}

// ============================================================
// 图片 OCR Bot
// ============================================================

class ImageOcrBot implements Bot {
  id = 'image-ocr-bot';
  name = '图片文字识别助手';
  avatar = '/bots/ocr-bot.png';
  enabled = true;
  
  supportedEvents = [BotEvent.IMAGE_RECEIVED];
  
  async handle(event: BotEvent, context: BotContext): Promise<BotResponse> {
    const { message } = context;
    const imageContent = message.content as ImagePayload['content'];
    
    // OCR 识别图片中的文字
    const ocrResult = await performOcr({
      imageUrl: imageContent.url,
      language: 'zh-CN'
    });
    
    if (!ocrResult.text) {
      return { actions: [] };
    }
    
    // 自动归档到笔记
    const actions: BotAction[] = [
      {
        type: 'CREATE_NOTE',
        userId: message.fromUserId,
        note: {
          title: `OCR_${new Date().toLocaleDateString()}`,
          content: ocrResult.text,
          source: {
            type: 'message',
            messageId: message.id
          }
        }
      }
    ];
    
    return {
      actions,
      messages: [{
        type: 'TEXT',
        content: {
          text: `📄 图片文字已识别并保存到笔记`
        }
      }]
    };
  }
}

// ============================================================
// 作品自动归档 Bot
// ============================================================

class WorkArchiveBot implements Bot {
  id = 'work-archive-bot';
  name = '作品归档助手';
  avatar = '/bots/archive-bot.png';
  enabled = true;
  
  supportedEvents = [
    BotEvent.DIARY_CREATED,
    BotEvent.WORK_SUBMITTED
  ];
  
  async handle(event: BotEvent, context: BotContext): Promise<BotResponse> {
    const { user, metadata } = context;
    
    // 更新用户的作品统计
    const actions: BotAction[] = [
      {
        type: 'UPDATE_USER_STATS',
        userId: user.id,
        stats: {
          totalWorks: { $inc: 1 },
          lastWorkAt: new Date()
        }
      }
    ];
    
    // 检查是否达成成就
    const newAchievements = await checkAchievements(user.id);
    for (const achievement of newAchievements) {
      actions.push({
        type: 'UNLOCK_ACHIEVEMENT',
        userId: user.id,
        achievementId: achievement.id
      });
      
      actions.push({
        type: 'SEND_NOTIFICATION',
        userId: user.id,
        notification: {
          type: 'ACHIEVEMENT_UNLOCKED',
          title: '🏆 新成就解锁',
          body: achievement.name,
          data: { achievementId: achievement.id }
        }
      });
    }
    
    return { actions };
  }
}
```

### 3.6 多端存储策略

```typescript
// ============================================================
// 多端存储策略
// ============================================================

interface StorageStrategy {
  // 存储优先级
  priority: ('local' | 'cloud')[];
  
  // 文件大小阈值
  sizeThresholds: {
    immediate: number;    // 立即上传大小 (KB)
    lazy: number;         // 延迟上传大小 (MB)
    block: number;        // 阻止上传大小 (MB)
  };
  
  // TTL 策略
  ttl: {
    server: number;       // 服务器保留天数
    localCache: number;   // 本地缓存天数
    thumbnail: number;     // 缩略图保留天数
  };
}

// 存储策略配置
const STORAGE_STRATEGY: StorageStrategy = {
  priority: ['local', 'cloud'],
  
  sizeThresholds: {
    immediate: 100,        // >100KB 立即上传
    lazy: 10 * 1024,       // >10MB 延迟上传
    block: 100 * 1024,     // >100MB 阻止上传
  },
  
  ttl: {
    server: 7,            // 服务器 7 天后清理未引用的文件
    localCache: 30,        // 本地缓存 30 天
    thumbnail: 90,         // 缩略图 90 天
  }
};

// ============================================================
// 文件上传服务
// ============================================================

class FileUploadService {
  
  /**
   * Web 端上传 - 优先 IndexedDB
   */
  async uploadWeb(file: File, options: UploadOptions): Promise<UploadResult> {
    const { userId, conversationId, messageType } = options;
    
    // 1. 生成唯一 ID
    const fileId = generateUUID();
    const localId = `local_${fileId}`;
    
    // 2. 检查文件大小
    if (file.size > STORAGE_STRATEGY.sizeThresholds.block * 1024 * 1024) {
      throw new Error('FILE_TOO_LARGE');
    }
    
    // 3. 立即上传大文件，小文件暂存 IndexedDB
    if (file.size > STORAGE_STRATEGY.sizeThresholds.immediate * 1024) {
      // 直接上传到服务器
      const cloudResult = await this.uploadToCloud(file, {
        userId,
        folder: `messages/${conversationId}`,
        metadata: { messageType }
      });
      
      // 生成缩略图
      const thumbnail = await this.generateThumbnail(file);
      
      return {
        localId,
        cloudUrl: cloudResult.url,
        thumbnailUrl: thumbnail.url,
        size: file.size,
        status: 'uploaded'
      };
    } else {
      // 暂存本地，稍后同步
      await this.storeToIndexedDB(file, localId);
      
      return {
        localId,
        cloudUrl: null,
        thumbnailUrl: null,
        size: file.size,
        status: 'pending_sync'
      };
    }
  }
  
  /**
   * App 端上传 - 优先本地 SQLite
   */
  async uploadApp(filePath: string, options: UploadOptions): Promise<UploadResult> {
    const { userId, conversationId } = options;
    
    const fileId = generateUUID();
    const localId = `app_${fileId}`;
    
    // 1. 保存到本地 SQLite
    await this.storeToSQLite(filePath, localId);
    
    // 2. 后台上传到云端
    this.scheduleCloudUpload(localId).catch(console.error);
    
    // 3. 生成缩略图并保存
    const thumbnail = await this.generateThumbnail(filePath);
    
    return {
      localId,
      cloudUrl: null,  // 稍后填充
      thumbnailUrl: thumbnail.url,
      size: file.size,
      status: 'pending_sync'
    };
  }
  
  /**
   * 后台同步任务
   */
  async syncPendingFiles(userId: string): Promise<SyncResult> {
    // 1. 获取待同步文件
    const pending = await this.getPendingFiles(userId);
    
    const results: SyncResult = {
      success: [],
      failed: []
    };
    
    for (const file of pending) {
      try {
        // 上传到云端
        const cloudResult = await this.uploadToCloud(file.localPath, {
          userId,
          folder: `messages/${file.conversationId}`
        });
        
        // 更新状态
        await this.markAsSynced(file.localId, cloudResult.url);
        
        results.success.push(file.localId);
      } catch (error) {
        results.failed.push({
          localId: file.localId,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * 清理过期文件 (服务器端定时任务)
   */
  async cleanupExpiredFiles(): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - STORAGE_STRATEGY.ttl.server);
    
    // 1. 查找未引用的过期文件
    const expiredFiles = await prisma.fileMetadata.findMany({
      where: {
        uploadedAt: { lt: cutoffDate },
        referencedBy: null  // 未被任何消息引用
      }
    });
    
    const results: CleanupResult = {
      deleted: 0,
      preserved: 0
    };
    
    for (const file of expiredFiles) {
      // 删除云端文件
      await this.deleteFromCloud(file.cloudKey);
      
      // 删除数据库记录
      await prisma.fileMetadata.delete({
        where: { id: file.id }
      });
      
      results.deleted++;
    }
    
    return results;
  }
}
```

### 3.7 IndexedDB / SQLite 存储实现

```typescript
// ============================================================
// Web 端 IndexedDB 缓存
// ============================================================

class IndexedDBCache {
  private db: IDBDatabase;
  private dbName = 'pinghu_cache';
  private version = 1;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 消息缓存
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('conversationId', 'conversationId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 文件缓存
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'localId' });
          fileStore.createIndex('status', 'status', { unique: false });
          fileStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // 草稿
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'conversationId' });
        }
      };
    });
  }
  
  async cacheMessage(message: MessagePayload): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      
      const request = store.put({
        ...message,
        cachedAt: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getCachedMessages(conversationId: string, since?: number): Promise<MessagePayload[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('conversationId');
      
      const request = index.getAll(conversationId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let messages = request.result;
        
        if (since) {
          messages = messages.filter(m => m.timestamp > since);
        }
        
        // 按时间排序
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        resolve(messages);
      };
    });
  }
  
  async cacheFile(localId: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      
      const request = store.put({
        localId,
        blob,
        ...metadata,
        status: 'cached',
        cachedAt: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async getFileBlob(localId: string): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      
      const request = store.get(localId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.blob || null);
      };
    });
  }
  
  async getPendingUploads(): Promise<FileMetadata[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const index = store.index('status');
      
      const request = index.getAll('pending_sync');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// ============================================================
// App 端 SQLite 存储 (使用 react-native-sqlite-storage)
// ============================================================

class SQLiteCache {
  private db: SQLiteDatabase;
  
  async init(): Promise<void> {
    this.db = await SQLite.openDatabase({
      name: 'pinghu_cache.db',
      location: 'default'
    });
    
    // 创建表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        from_user_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);
    
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS files (
        local_id TEXT PRIMARY KEY,
        cloud_url TEXT,
        status TEXT DEFAULT 'pending',
        size INTEGER,
        mime_type TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
    `);
    
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversation_id, timestamp);
    `);
  }
  
  async insertMessage(message: MessagePayload): Promise<void> {
    await this.db.executeSql(
      `INSERT OR REPLACE INTO messages 
       (id, conversation_id, type, content, from_user_id, timestamp, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.to.id,
        message.type,
        JSON.stringify(message),
        message.from.userId,
        message.timestamp,
        0
      ]
    );
  }
  
  async getMessages(conversationId: string, since?: number): Promise<MessagePayload[]> {
    let query = 'SELECT * FROM messages WHERE conversation_id = ?';
    const params: any[] = [conversationId];
    
    if (since) {
      query += ' AND timestamp > ?';
      params.push(since);
    }
    
    query += ' ORDER BY timestamp ASC';
    
    const [results] = await this.db.executeSql(query, params);
    const messages: MessagePayload[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      messages.push(JSON.parse(results.rows.item(i).content));
    }
    
    return messages;
  }
  
  async markAsSynced(localId: string, cloudUrl: string): Promise<void> {
    await this.db.executeSql(
      'UPDATE files SET status = ?, cloud_url = ? WHERE local_id = ?',
      ['synced', cloudUrl, localId]
    );
  }
}
```

---

## 4. 分布式存储与硬件联动预留

### 4.1 用户模型扩展

```prisma
// ============================================================
// User 模型扩展 - 支持家庭节点
// ============================================================

model User {
  // ... 现有字段 ...
  
  // 家庭节点配置
  homeNodeId    String?      @unique  // 关联的家庭节点
  homeNode      HomeNode?    @relation(fields: [homeNodeId], references: [id])
  
  // 存储偏好
  storagePreference StoragePreference @default(CLOUD_FIRST)
  
  // 同步状态
  lastSyncedAt   DateTime?
  syncToken      String?                // 增量同步 token
  
  // 设备管理
  devices        Device[]
}

// 存储偏好
enum StoragePreference {
  CLOUD_FIRST     // 云端优先
  LOCAL_FIRST     // 本地优先 (OpenWrt)
  LOCAL_ONLY      // 仅本地
  HYBRID          // 混合模式
}

// ============================================================
// 家庭节点 (OpenWrt 盒子)
// ============================================================

model HomeNode {
  id          String    @id @default(uuid())
  
  // 节点信息
  name        String                      // 节点名称 (如 "客厅盒子")
  model       String?                     // 设备型号
  macAddress  String    @unique           // MAC 地址
  publicKey   String?                    // WireGuard 公钥
  
  // 网络配置
  localIp     String?                    // 局域网 IP
  port        Int       @default(8080)    // 服务端口
  
  // Tailscale 配置
  tailscaleIp String?                    // Tailscale IP
  tailscaleUrl String?                   // Tailscale 域名 (xxx.tailnet)
  
  // 存储配置
  storagePath String    @default('/mnt/sda1/pinghu')  // 存储路径
  maxStorage  BigInt    @default(107374182400)  // 最大存储 (100GB)
  usedStorage BigInt    @default(0)
  
  // 状态
  status      NodeStatus @default(OFFLINE)
  lastSeenAt  DateTime?
  
  // 心跳配置
  heartbeatInterval Int @default(60)       // 心跳间隔 (秒)
  
  // 用户关联
  ownerId     String                      // 所有者 (用户ID)
  owner       User     @relation(fields: [ownerId], references: [id])
  members     HomeNodeMember[]            // 允许访问的成员
  
  // 元数据
  firmware    String?                    // 固件版本
  location    String?                    // 物理位置
  metadata    Json?                      // 自定义元数据
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([ownerId])
  @@index([status])
}

enum NodeStatus {
  OFFLINE
  ONLINE
  SYNCING
  ERROR
}

// ============================================================
// 节点成员
// ============================================================

model HomeNodeMember {
  id          String    @id @default(uuid())
  
  nodeId      String
  node        HomeNode  @relation(fields: [nodeId], references: [id])
  
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  
  // 权限级别
  permission  NodePermission @default(READ)
  
  // 存储配额
  quota       BigInt    @default(10737418240)  // 10GB
  
  // 使用量
  usedQuota   BigInt    @default(0)
  
  createdAt   DateTime  @default(now())
  
  @@unique([nodeId, userId])
}

enum NodePermission {
  READ        // 仅读取
  WRITE       // 读写
  ADMIN       // 管理
}

// ============================================================
// 文件索引 (云端仅存索引)
// ============================================================

model FileIndex {
  id          String    @id @default(uuid())
  
  // 文件标识
  localId    String    @unique           // 本地唯一ID
  cloudId    String?   @unique           // 云端ID (如果已上传)
  
  // 存储位置
  storageType StorageType
  
  // 云端存储
  cloudBucket String?                    // S3 bucket
  cloudKey    String?                    // S3 key
  cloudUrl    String?                    // CDN URL
  
  // 本地节点存储
  nodeId     String?
  node       HomeNode? @relation(fields: [nodeId], references: [id])
  localPath  String?                    // 本地路径
  
  // 文件元数据
  filename   String
  mimeType   String
  size       BigInt
  checksum   String?                    // SHA-256
  
  // 缩略图
  thumbnailCloudKey String?
  thumbnailUrl     String?
  
  // 引用计数 (消息、笔记等)
  refCount   Int       @default(0)
  
  // 生命周期
  uploadedAt DateTime  @default(now())
  expiresAt  DateTime?                    // 过期时间 (TTL)
  
  // 状态
  status     FileStatus @default(PENDING)
  
  // 保留记录 (即使文件被删除)
  isDeleted  Boolean   @default(false)
  deletedAt  DateTime?
  
  @@index([storageType, status])
  @@index([cloudBucket, cloudKey])
  @@index([nodeId])
  @@index([expiresAt])
}

enum StorageType {
  CLOUD       // 仅云端
  LOCAL_NODE  // 仅本地节点
  HYBRID      // 混合 (同时存在于云端和本地)
  SYNCING     // 同步中
}

enum FileStatus {
  PENDING     // 待处理
  UPLOADED    // 已上传
  SYNCED      // 已同步
  EXPIRED     // 已过期
  DELETED     // 已删除
}
```

### 4.2 混合存储服务

```typescript
// ============================================================
// 混合存储服务 - App 优先写入本地 OpenWrt
// ============================================================

class HybridStorageService {
  
  /**
   * 上传文件 - 根据用户偏好选择存储策略
   */
  async upload(file: File, options: UploadOptions): Promise<StorageResult> {
    const { userId, preference } = options;
    
    // 获取用户存储偏好
    const userPref = preference || await this.getUserStoragePreference(userId);
    
    switch (userPref) {
      case 'LOCAL_FIRST':
        return this.uploadLocalFirst(file, options);
        
      case 'CLOUD_FIRST':
        return this.uploadCloudFirst(file, options);
        
      case 'HYBRID':
        return this.uploadHybrid(file, options);
        
      case 'LOCAL_ONLY':
        return this.uploadToNode(file, options);
        
      default:
        return this.uploadCloudFirst(file, options);
    }
  }
  
  /**
   * 本地优先策略
   * 
   * 1. 先写入本地 OpenWrt 节点
   * 2. 返回本地 URL (可立即访问)
   * 3. 后台异步同步到云端
   * 4. 设备离线时仅本地存储
   */
  async uploadLocalFirst(file: File, options: UploadOptions): Promise<StorageResult> {
    const { userId } = options;
    
    // 1. 获取用户的本地节点
    const node = await this.getUserHomeNode(userId);
    
    if (!node || node.status !== 'ONLINE') {
      // 节点离线，降级到云端
      console.warn('HomeNode offline, falling back to cloud storage');
      return this.uploadToCloud(file, options);
    }
    
    const fileId = generateUUID();
    const localPath = `${node.storagePath}/files/${userId}/${fileId}`;
    
    try {
      // 2. 上传到本地节点
      await this.uploadToNode(file, {
        ...options,
        node,
        path: localPath
      });
      
      // 3. 创建索引记录
      const index = await prisma.fileIndex.create({
        data: {
          localId: fileId,
          storageType: 'SYNCING',
          nodeId: node.id,
          localPath,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          status: 'PENDING'
        }
      });
      
      // 4. 后台同步到云端
      this.scheduleCloudSync(index.id, file).catch(console.error);
      
      // 5. 返回本地访问 URL (通过 Tailscale)
      return {
        id: fileId,
        url: this.getLocalAccessUrl(node, localPath),
        thumbnailUrl: null,  // 缩略图稍后生成
        storageType: 'LOCAL_NODE',
        status: 'pending_sync'
      };
      
    } catch (error) {
      // 本地上传失败，降级到云端
      console.error('Local upload failed:', error);
      return this.uploadToCloud(file, options);
    }
  }
  
  /**
   * 获取本地访问 URL (通过 Tailscale)
   */
  private getLocalAccessUrl(node: HomeNode, path: string): string {
    // 优先使用 Tailscale Funnel 公网访问
    if (node.tailscaleUrl) {
      return `https://${node.tailscaleUrl}/api/storage/files/${path}`;
    }
    
    // 否则使用 Tailscale 内部 IP (仅限内网)
    if (node.tailscaleIp) {
      return `http://${node.tailscaleIp}:${node.port}/api/storage/files/${path}`;
    }
    
    throw new Error('Node not accessible');
  }
  
  /**
   * 后台同步到云端
   */
  private async scheduleCloudSync(indexId: string, file: File | string): Promise<void> {
    const index = await prisma.fileIndex.findUnique({
      where: { id: indexId },
      include: { node: true }
    });
    
    if (!index?.node) return;
    
    try {
      // 从本地节点下载文件
      const fileContent = await this.downloadFromNode(index.node, index.localPath!);
      
      // 上传到云端
      const cloudResult = await this.uploadToCloud(fileContent, {
        userId: index.node.ownerId
      });
      
      // 更新索引
      await prisma.fileIndex.update({
        where: { id: indexId },
        data: {
          cloudId: cloudResult.id,
          cloudBucket: cloudResult.bucket,
          cloudKey: cloudResult.key,
          cloudUrl: cloudResult.url,
          storageType: 'HYBRID',
          status: 'SYNCED'
        }
      });
      
    } catch (error) {
      console.error('Cloud sync failed:', error);
      // 标记同步失败，后续重试
      await prisma.fileIndex.update({
        where: { id: indexId },
        data: { status: 'PENDING' }
      });
    }
  }
  
  /**
   * 获取文件 - 智能选择来源
   */
  async getFile(fileId: string, userId: string): Promise<FileAccessResult> {
    const index = await prisma.fileIndex.findUnique({
      where: { localId: fileId }
    });
    
    if (!index) {
      throw new Error('FILE_NOT_FOUND');
    }
    
    // 检查引用计数
    if (index.refCount <= 0 && index.isDeleted) {
      throw new Error('FILE_EXPIRED');
    }
    
    // 根据存储类型和可用性选择来源
    if (index.storageType === 'HYBRID') {
      // 混合存储，优先云端
      if (index.cloudUrl) {
        return { url: index.cloudUrl, source: 'cloud' };
      }
      // 云端不可用，降级到本地
    }
    
    if (index.storageType === 'LOCAL_NODE') {
      // 仅本地，检查节点是否在线
      const node = await prisma.homeNode.findUnique({
        where: { id: index.nodeId! }
      });
      
      if (node?.status === 'ONLINE') {
        return {
          url: this.getLocalAccessUrl(node, index.localPath!),
          source: 'local'
        };
      }
      
      throw new Error('LOCAL_NODE_OFFLINE');
    }
    
    // 云端存储
    if (index.cloudUrl) {
      return { url: index.cloudUrl, source: 'cloud' };
    }
    
    throw new Error('FILE_NOT_ACCESSIBLE');
  }
}
```

### 4.3 安全传输设计

```typescript
// ============================================================
// 安全传输架构
// ============================================================

/**
 * 当前网络架构:
 * 
 *                    ┌─────────────────────────────────────┐
 *                    │           公网 (Internet)           │
 *                    │                                      │
 *     ┌──────────────┼────────────────────────────────────┐ │
 *     │              │                                     │ │
 *     │   ┌──────────▼──────────┐                         │ │
 *     │   │   Nginx Reverse     │                         │ │
 *     │   │   Proxy + SSL       │                         │ │
 *     │   │   (12250/12251)     │                         │ │
 *     │   └──────────┬──────────┘                         │ │
 *     │              │                                     │ │
 *     │◀─────────────┼──────────────────────────────────▶│ │
 *     │              │       HTTPS / WSS                   │ │
 *     │              │                                     │ │
 *     └──────────────┼────────────────────────────────────┘ │
 *                    │                                      │
 *                    │◀──────── Tailscale Funnel ────────▶│
 *                    │                                      │
 *     ┌──────────────┼────────────────────────────────────┐ │
 *     │              │                                     │ │
 *     │   ┌──────────▼──────────┐                         │ │
 *     │   │   Tailscale        │                         │ │
 *     │   │   VPN Overlay       │                         │ │
 *     │   │   Network          │                         │ │
 *     │   └──────────┬──────────┘                         │ │
 *     │              │                                     │ │
 *     │◀─────────────┼──────────────────────────────────▶│ │
 *     │              │     Tailscale WireGuard              │ │
 *     │              │                                     │ │
 *     └──────────────┼────────────────────────────────────┘ │
 *                    │                                      │
 *     ┌──────────────┼────────────────────────────────────┐ │
 *     │              │                                     │ │
 *     │   ┌──────────▼──────────┐                         │ │
 *     │   │   OpenWrt Box       │                         │ │
 *     │   │   (Home Node)       │                         │ │
 *     │   │                     │                         │ │
 *     │   │   ┌─────────────┐   │                         │ │
 *     │   │   │ WireGuard  │   │                         │ │
 *     │   │   │ Server     │   │                         │ │
 *     │   │   └─────────────┘   │                         │ │
 *     │   │                     │                         │ │
 *     │   │   ┌─────────────┐   │                         │ │
 *     │   │   │ Storage     │   │                         │ │
 *     │   │   │ Service     │   │                         │ │
 *     │   │   └─────────────┘   │                         │ │
 *     │   └─────────────────────┘                         │ │
 *     │                                                 │ │
 *     │◀──────── Local Network ────────────────────────▶│ │
 *     │              │                                     │ │
 *     └──────────────┼────────────────────────────────────┘ │
 *                    │                                      │
 *                    └─────────────────────────────────────┘
 */

interface SecurityConfig {
  // 传输层安全
  tls: {
    enabled: boolean;
    minVersion: '1.2' | '1.3';
    certPath: string;
    keyPath: string;
  };
  
  // Tailscale 配置
  tailscale: {
    enabled: boolean;
    funnels: { port: number; https: boolean }[];
  };
  
  // WireGuard (Home Node)
  wireguard: {
    enabled: boolean;
    port: number;
    persistentKeepalive: number;
  };
  
  // 端到端加密 (可选)
  e2ee: {
    enabled: boolean;
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
    keyExchange: 'X25519';
  };
}

// 安全传输服务
class SecureTransportService {
  
  /**
   * 生成端到端加密密钥对
   */
  async generateKeyPair(): Promise<KeyPair> {
    // 使用 libsodium 或 WebCrypto API
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return {
      publicKey: await this.exportKey(keyPair.publicKey),
      privateKey: await this.exportKey(keyPair.privateKey)
    };
  }
  
  /**
   * 加密消息 (发送前)
   */
  async encryptMessage(
    message: Uint8Array,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedMessage> {
    // 生成临时密钥
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['encrypt', 'decrypt']
    );
    
    // 导出临时公钥
    const ephemeralPublicKey = await this.exportKey(ephemeralKeyPair.publicKey);
    
    // 派生共享密钥
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientPublicKey
      },
      ephemeralKeyPair.privateKey,
      256
    );
    
    // 生成 IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      ),
      message
    );
    
    return {
      version: 1,
      ephemeralPublicKey,
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext))
    };
  }
  
  /**
   * 解密消息 (接收后)
   */
  async decryptMessage(
    encrypted: EncryptedMessage,
    privateKey: CryptoKey
  ): Promise<Uint8Array> {
    // 导入临时公钥
    const ephemeralPublicKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(encrypted.ephemeralPublicKey),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    
    // 派生共享密钥
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: ephemeralPublicKey
      },
      privateKey,
      256
    );
    
    // 解密
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encrypted.iv)
      },
      await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      ),
      new Uint8Array(encrypted.ciphertext)
    );
    
    return new Uint8Array(plaintext);
  }
}
```

---

## 5. API 安全与性能优化

### 5.1 Auth 路由频率限制

```typescript
// ============================================================
// 频率限制中间件
// ============================================================

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';

// Redis 客户端 (共享)
const redis = new Redis(process.env.REDIS_URL);

// 不同场景的限制配置
const RATE_LIMITS = {
  // 登录相关 - 严格限制
  login: {
    windowMs: 15 * 60 * 1000,    // 15 分钟
    max: 5,                       // 5 次
    message: '登录尝试过于频繁，请 15 分钟后再试',
    skipSuccessful: false,         // 成功的登录也计数
  },
  
  // 注册 - 中等限制
  register: {
    windowMs: 60 * 60 * 1000,    // 1 小时
    max: 3,                       // 3 次
    message: '注册过于频繁，请 1 小时后再试',
  },
  
  // 密码重置
  passwordReset: {
    windowMs: 60 * 60 * 1000,    // 1 小时
    max: 3,
    message: '密码重置请求过于频繁',
  },
  
  // 2FA 验证
  twoFactor: {
    windowMs: 5 * 60 * 1000,     // 5 分钟
    max: 3,
    message: '验证码尝试次数过多，请 5 分钟后再试',
  },
  
  // 通用 API
  api: {
    windowMs: 60 * 1000,         // 1 分钟
    max: 100,
    message: '请求过于频繁，请稍后再试',
  },
  
  // 文件上传
  upload: {
    windowMs: 60 * 60 * 1000,    // 1 小时
    max: 50,
    message: '上传过于频繁',
  },
};

// 速率限制器工厂
const createRateLimiter = (config: RateLimitConfig) => {
  return rateLimit({
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    ...config,
    
    // 自定义 key 生成 - 基于 IP + 用户 ID
    keyGenerator: (req) => {
      const ip = req.ip;
      const userId = req.user?.id || 'anonymous';
      return `${ip}:${userId}`;
    },
    
    // 跳过已验证用户 (可选)
    skip: (req) => {
      // 已验证的用户放宽限制
      if (req.user?.id && config.max > 10) {
        return false; // 不跳过
      }
      return false;
    },
    
    //  handler
    handler: (req, res, next, options) => {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
    
    // 响应头
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 应用到路由
const authLimiter = createRateLimiter(RATE_LIMITS.login);
const registerLimiter = createRateLimiter(RATE_LIMITS.register);
const apiLimiter = createRateLimiter(RATE_LIMITS.api);

// routes/auth.js
router.post('/login', authLimiter, authController.login);
router.post('/register', registerLimiter, authController.register);

// 全局 API 限制 (应用于所有 /api/* 路由)
app.use('/api', apiLimiter);
```

### 5.2 精细化接口拦截

```typescript
// ============================================================
// 增强的 auth 中间件 - 支持 Grant 权限检查
// ============================================================

// backend/src/middleware/auth.js (扩展)

const { checkGrant, getUserPreferences } = require('../services/authService');
const { checkUserStatus } = require('../services/userService');

/**
 * 增强的认证中间件
 * 支持:
 * - JWT 验证
 * - 账户状态检查
 * - Grant 权限验证
 * - 功能开关检查
 */
const authenticate = (options = {}) => {
  const {
    checkStatus = true,          // 检查账户状态
    checkGrants = [],            // 需要的授权类型
    checkFeatures = [],          // 需要开启的功能
    allowPending = false,        // 允许待审核账户
  } = options;
  
  return async (req, res, next) => {
    try {
      // 1. 基础 JWT 验证
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '请先登录'
        });
      }
      
      // 验证 Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 2. 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          preferences: true,
          needsReview: true,
        }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: '用户不存在'
        });
      }
      
      // 3. 账户状态检查
      if (checkStatus) {
        const statusCheck = checkUserStatus(user);
        
        if (!statusCheck.allowed) {
          return res.status(statusCheck.code).json({
            success: false,
            error: statusCheck.error,
            message: statusCheck.message,
            action: statusCheck.action  // 告诉客户端如何处理
          });
        }
      }
      
      // 4. Grant 权限检查
      if (checkGrants.length > 0) {
        const resourceOwnerId = req.params.userId || req.body.userId;
        
        if (resourceOwnerId && resourceOwnerId !== user.id) {
          // 非自身资源，检查授权
          const hasGrants = await checkGrant({
            granterId: resourceOwnerId,
            granteeId: user.id,
            grantTypes: checkGrants,
            requireActive: true,
            checkExpiry: true
          });
          
          if (!hasGrants) {
            // 检查角色是否有兜底权限
            const roleHasPermission = ROLE_GRANTS[user.role]?.some(
              g => checkGrants.includes(g) || g === '*'
            );
            
            if (!roleHasPermission) {
              return res.status(403).json({
                success: false,
                error: 'GRANT_REQUIRED',
                message: '您没有访问此资源的权限',
                requiredGrants: checkGrants,
                canRequest: true,
                requestGrantUrl: `/api/grants/request`
              });
            }
          }
        }
      }
      
      // 5. 功能开关检查
      if (checkFeatures.length > 0) {
        const preferences = user.preferences || {};
        const features = preferences.features || {};
        
        const disabledFeatures = checkFeatures.filter(f => !features[f]);
        
        if (disabledFeatures.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'FEATURE_DISABLED',
            message: '该功能暂未开启',
            disabledFeatures
          });
        }
      }
      
      // 附加用户信息到请求
      req.user = user;
      req.preferences = user.preferences;
      
      next();
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: '登录已过期，请重新登录'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: '无效的登录凭证'
        });
      }
      
      next(error);
    }
  };
};

/**
 * 角色兜底权限
 */
const ROLE_GRANTS = {
  ADMIN: ['*'],  // 管理员拥有所有权限
  TEACHER: ['TEACHER_VIEW_CLASS', 'TEACHER_ASSIGN', 'MANAGE_TASKS'],
  PARENT: ['PARENT_VIEW', 'PARENT_MESSAGE', 'VIEW_PROGRESS'],
  STUDENT: ['VIEW_DIARY', 'VIEW_HOMEWORK', 'COMMENT_CONTENT'],
};

/**
 * 用户状态检查
 */
const checkUserStatus = (user) => {
  // 待审核账户检查
  if (user.needsReview && user.status === 'PENDING') {
    return {
      allowed: false,
      code: 403,
      error: 'ACCOUNT_PENDING',
      message: '您的账户正在等待管理员审核',
      action: 'WAIT_REVIEW'
    };
  }
  
  // 24 小时审核期检查
  if (user.needsReview) {
    const reviewCutoff = new Date(user.createdAt);
    reviewCutoff.setHours(reviewCutoff.getHours() + 24);
    
    if (new Date() > reviewCutoff && user.status === 'PENDING') {
      return {
        allowed: false,
        code: 403,
        error: 'REVIEW_TIMEOUT',
        message: '审核超时，账户已被锁定',
        action: 'CONTACT_ADMIN'
      };
    }
  }
  
  // 禁用账户
  if (user.status === 'DISABLED') {
    return {
      allowed: false,
      code: 403,
      error: 'ACCOUNT_DISABLED',
      message: '您的账户已被禁用',
      action: 'CONTACT_SUPPORT'
    };
  }
  
  return { allowed: true };
};

/**
 * 导出便捷中间件
 */
const optionalAuth = authenticate({ checkStatus: false });

const requireAuth = authenticate({
  checkStatus: true,
  allowPending: false
});

const requireStudent = authenticate({
  checkStatus: true,
  allowPending: true,
  checkGrants: ['*']
});

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  optionalAuth,
  requireAuth,
  requireStudent,
  requireGrants
};
```

### 5.3 性能优化策略

```typescript
// ============================================================
// 性能优化策略
// ============================================================

/**
 * 1. 查询优化 - 使用 Prisma 扩展
 */

// 创建 Prisma 扩展 - 自动处理常见优化
const prismaExtension = Prisma.defineExtension({
  name: 'performance',
  model: {
    $allModels: {
      // 链式调用优化
      async findManyOptimized<T>(
        this: T,
        args: any,
        options: { includeRelations?: boolean; pagination?: { page: number; pageSize: number } }
      ) {
        const model = this as any;
        let query = model.findMany(args);
        
        // 自动分页
        if (options.pagination) {
          const { page, pageSize } = options.pagination;
          query = query.skip((page - 1) * pageSize).take(pageSize);
        }
        
        // N+1 优化 - 预加载关联
        if (options.includeRelations && args.include === undefined) {
          query = query.include({
            fromUser: { select: { id: true, username: true, avatar: true } },
            toUser: { select: { id: true, username: true, avatar: true } }
          });
        }
        
        return query;
      }
    }
  }
});

/**
 * 2. 缓存策略 - Redis 多层缓存
 */

// 缓存键前缀
const CACHE_KEYS = {
  USER: 'user',
  USER_PROFILE: 'profile',
  CONVERSATION: 'conv',
  MESSAGE_LIST: 'msgs',
  FEED: 'feed',
};

// 缓存 TTL (秒)
const CACHE_TTL = {
  [CACHE_KEYS.USER]: 300,           // 5 分钟
  [CACHE_KEYS.USER_PROFILE]: 600,  // 10 分钟
  [CACHE_KEYS.CONVERSATION]: 60,    // 1 分钟
  [CACHE_KEYS.MESSAGE_LIST]: 30,    // 30 秒
};

// 缓存服务
class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await redis.setex(key, ttl || 60, JSON.stringify(value));
  }
  
  async del(key: string): Promise<void> {
    await redis.del(key);
  }
  
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
  
  // 用户缓存
  async getUser(userId: string) {
    return this.get(`${CACHE_KEYS.USER}:${userId}`);
  }
  
  async setUser(userId: string, user: any) {
    await this.set(`${CACHE_KEYS.USER}:${userId}`, user, CACHE_TTL.USER);
  }
  
  async invalidateUser(userId: string) {
    await this.del(`${CACHE_KEYS.USER}:${userId}`);
    await this.del(`${CACHE_KEYS.USER_PROFILE}:${userId}`);
  }
  
  // 会话缓存
  async getMessages(conversationId: string, page: number) {
    return this.get(`${CACHE_KEYS.MESSAGE_LIST}:${conversationId}:${page}`);
  }
  
  async setMessages(conversationId: string, page: number, messages: any[]) {
    await this.set(
      `${CACHE_KEYS.MESSAGE_LIST}:${conversationId}:${page}`,
      messages,
      CACHE_TTL.MESSAGE_LIST
    );
  }
  
  async invalidateConversation(conversationId: string) {
    await this.delPattern(`${CACHE_KEYS.MESSAGE_LIST}:${conversationId}:*`);
    await this.del(`${CACHE_KEYS.CONVERSATION}:${conversationId}`);
  }
}

/**
 * 3. 数据库连接池优化
 */

// prisma/schema.prisma 或环境变量配置
// DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=10"

// 自定义 Prisma Client 配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
    
  // 连接池配置 (通过 URL 参数)
  // pool_timeout: 10,  // 等待连接超时 (秒)
});

/**
 * 4. 索引优化 (在数据库迁移中添加)
 */

// 迁移文件 - 添加性能索引
// migration: add_performance_indexes.sql

/*
-- 消息表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_time 
ON "Message" ("conversationId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_from_user_time 
ON "Message" ("fromUserId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type_time 
ON "Message" ("messageType", "createdAt" DESC);

-- 用户表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON "User" ("email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username 
ON "User" ("username");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_status 
ON "User" ("role", "status");

-- 授权表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_grants_granter_status 
ON "UserGrant" ("granterId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_grants_grantee_status 
ON "UserGrant" ("granteeId", "status");

-- 文件索引表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_index_expires 
ON "FileIndex" ("expiresAt") WHERE "expiresAt" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_index_node_status 
ON "FileIndex" ("nodeId", "status");
*/
```

---

## 6. 数据库迁移路线图

### 6.1 迁移顺序

```sql
-- ============================================================
-- Phase 1: 基础扩展 (无依赖)
-- ============================================================

-- 1.1 添加 preferences 字段到 User 表
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}';

-- 1.2 添加 homeNodeUrl 预留字段
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "homeNodeUrl" VARCHAR(500);

-- 1.3 添加 storagePreference 字段
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "storagePreference" VARCHAR(20) DEFAULT 'CLOUD_FIRST';

-- ============================================================
-- Phase 2: 授权系统 (新增表)
-- ============================================================

-- 2.1 创建授权类型枚举
CREATE TYPE "GrantType" AS ENUM (
  'VIEW_DIARY',
  'VIEW_HOMEWORK', 
  'VIEW_PROGRESS',
  'VIEW_MESSAGES',
  'COMMENT_CONTENT',
  'MESSAGE_CHILD',
  'MANAGE_TASKS',
  'APPROVE_SUBMISSIONS',
  'PARENT_VIEW',
  'PARENT_MESSAGE',
  'TEACHER_VIEW_CLASS',
  'TEACHER_ASSIGN'
);

-- 2.2 创建授权状态枚举
CREATE TYPE "GrantStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'EXPIRED',
  'REVOKED'
);

-- 2.3 创建请求状态枚举
CREATE TYPE "RequestStatus" AS ENUM (
  'PENDING_STUDENT',
  'PENDING_ADMIN',
  'APPROVED',
  'REJECTED_STUDENT',
  'REJECTED_ADMIN',
  'CANCELLED'
);

-- 2.4 创建 UserGrant 表
CREATE TABLE "UserGrant" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR(36),
  "granterId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "granteeId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "grantType" "GrantType" NOT NULL,
  "scope" JSONB DEFAULT '{}',
  "status" "GrantStatus" DEFAULT 'PENDING',
  "reviewedBy" VARCHAR(36),
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokeNote" TEXT,
  "startsAt" TIMESTAMP(3) DEFAULT NOW(),
  "expiresAt" TIMESTAMP(3),
  "reason" TEXT,
  "ipAddress" VARCHAR(45),
  "createdAt" TIMESTAMP(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) DEFAULT NOW(),
  
  CONSTRAINT "UserGrant_unique" UNIQUE ("granterId", "granteeId", "grantType", "status")
);

-- 2.5 创建 GrantRequest 表
CREATE TABLE "GrantRequest" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR(36),
  "requesterId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "targetId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "grantType" "GrantType" NOT NULL,
  "scope" JSONB DEFAULT '{}',
  "reason" TEXT NOT NULL,
  "status" "RequestStatus" DEFAULT 'PENDING_STUDENT',
  "studentResponse" TEXT,
  "studentRespondedAt" TIMESTAMP(3),
  "adminReviewedBy" VARCHAR(36),
  "adminReviewedAt" TIMESTAMP(3),
  "adminNote" TEXT,
  "createdGrantId" VARCHAR(36) UNIQUE,
  "createdAt" TIMESTAMP(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) DEFAULT NOW()
);

-- 2.6 添加索引
CREATE INDEX "UserGrant_granterId_status_idx" ON "UserGrant" ("granterId", "status");
CREATE INDEX "UserGrant_granteeId_status_idx" ON "UserGrant" ("granteeId", "status");
CREATE INDEX "UserGrant_grantType_status_idx" ON "UserGrant" ("grantType", "status");
CREATE INDEX "GrantRequest_targetId_status_idx" ON "GrantRequest" ("targetId", "status");

-- ============================================================
-- Phase 3: 消息系统扩展
-- ============================================================

-- 3.1 扩展 MessageType 枚举 (PostgreSQL 不支持修改枚举，需重建)
-- 创建新的枚举类型
CREATE TYPE "ExtendedMessageType" AS ENUM (
  'CHAT',
  'SYSTEM',
  'IMAGE',
  'VOICE',
  'VIDEO',
  'FILE',
  'LOCATION',
  'CONTACT',
  'CARD',
  'CALL_MISSED',
  'CALL_REJECTED',
  'CALL_COMPLETED',
  'ENCRYPTED',
  'REVOKED'
);

-- 3.2 添加消息扩展字段
ALTER TABLE "Message" 
ADD COLUMN IF NOT EXISTS "localId" VARCHAR(36) UNIQUE,
ADD COLUMN IF NOT EXISTS "content" JSONB,
ADD COLUMN IF NOT EXISTS "legacyContent" TEXT,
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "aiProcessed" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "aiResult" JSONB,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "replyToId" VARCHAR(36),
ADD COLUMN IF NOT EXISTS "encrypted" BOOLEAN DEFAULT FALSE;

-- 3.3 添加索引
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message" ("conversationId", "createdAt" DESC);
CREATE INDEX "Message_localId_idx" ON "Message" ("localId") WHERE "localId" IS NOT NULL;
CREATE INDEX "Message_isDeleted_idx" ON "Message" ("isDeleted") WHERE "isDeleted" = FALSE;

-- ============================================================
-- Phase 4: 分布式存储 (可选 - Home Node 功能)
-- ============================================================

-- 4.1 创建节点状态枚举
CREATE TYPE "NodeStatus" AS ENUM ('OFFLINE', 'ONLINE', 'SYNCING', 'ERROR');

-- 4.2 创建节点权限枚举
CREATE TYPE "NodePermission" AS ENUM ('READ', 'WRITE', 'ADMIN');

-- 4.3 创建存储类型枚举
CREATE TYPE "StorageType" AS ENUM ('CLOUD', 'LOCAL_NODE', 'HYBRID', 'SYNCING');

-- 4.4 创建文件状态枚举
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'UPLOADED', 'SYNCED', 'EXPIRED', 'DELETED');

-- 4.5 创建 HomeNode 表
CREATE TABLE "HomeNode" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR(36),
  "name" VARCHAR(100) NOT NULL,
  "model" VARCHAR(100),
  "macAddress" VARCHAR(17) UNIQUE,
  "publicKey" TEXT,
  "localIp" VARCHAR(15),
  "port" INTEGER DEFAULT 8080,
  "tailscaleIp" VARCHAR(45),
  "tailscaleUrl" VARCHAR(255),
  "storagePath" VARCHAR(500) DEFAULT '/mnt/sda1/pinghu',
  "maxStorage" BIGINT DEFAULT 107374182400,
  "usedStorage" BIGINT DEFAULT 0,
  "status" "NodeStatus" DEFAULT 'OFFLINE',
  "lastSeenAt" TIMESTAMP(3),
  "heartbeatInterval" INTEGER DEFAULT 60,
  "ownerId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "firmware" VARCHAR(50),
  "location" VARCHAR(100),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) DEFAULT NOW()
);

-- 4.6 创建 HomeNodeMember 表
CREATE TABLE "HomeNodeMember" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR(36),
  "nodeId" VARCHAR(36) NOT NULL REFERENCES "HomeNode"("id") ON DELETE CASCADE,
  "userId" VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "permission" "NodePermission" DEFAULT 'READ',
  "quota" BIGINT DEFAULT 10737418240,
  "usedQuota" BIGINT DEFAULT 0,
  "createdAt" TIMESTAMP(3) DEFAULT NOW(),
  UNIQUE ("nodeId", "userId")
);

-- 4.7 创建 FileIndex 表
CREATE TABLE "FileIndex" (
  "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR(36),
  "localId" VARCHAR(36) UNIQUE NOT NULL,
  "cloudId" VARCHAR(36) UNIQUE,
  "storageType" "StorageType" NOT NULL,
  "cloudBucket" VARCHAR(255),
  "cloudKey" VARCHAR(500),
  "cloudUrl" VARCHAR(1000),
  "nodeId" VARCHAR(36) REFERENCES "HomeNode"("id"),
  "localPath" VARCHAR(1000),
  "filename" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(100),
  "size" BIGINT NOT NULL,
  "checksum" VARCHAR(64),
  "thumbnailCloudKey" VARCHAR(500),
  "thumbnailUrl" VARCHAR(1000),
  "refCount" INTEGER DEFAULT 0,
  "uploadedAt" TIMESTAMP(3) DEFAULT NOW(),
  "expiresAt" TIMESTAMP(3),
  "status" "FileStatus" DEFAULT 'PENDING',
  "isDeleted" BOOLEAN DEFAULT FALSE,
  "deletedAt" TIMESTAMP(3)
);

-- 4.8 添加索引
CREATE INDEX "HomeNode_ownerId_idx" ON "HomeNode" ("ownerId");
CREATE INDEX "HomeNode_status_idx" ON "HomeNode" ("status");
CREATE INDEX "FileIndex_storageType_status_idx" ON "FileIndex" ("storageType", "status");
CREATE INDEX "FileIndex_expiresAt_idx" ON "FileIndex" ("expiresAt") WHERE "expiresAt" IS NOT NULL;
```

### 6.2 回滚策略

```typescript
// ============================================================
// 迁移回滚策略
// ============================================================

/**
 * 渐进式回滚 - 每个阶段可独立回滚
 */

// Phase 1 回滚
const rollbackPhase1 = async () => {
  await prisma.$executeRaw`
    ALTER TABLE "User" DROP COLUMN IF EXISTS "preferences";
    ALTER TABLE "User" DROP COLUMN IF EXISTS "homeNodeUrl";
    ALTER TABLE "User" DROP COLUMN IF EXISTS "storagePreference";
  `;
};

// Phase 2 回滚
const rollbackPhase2 = async () => {
  await prisma.$executeRaw`
    DROP TABLE IF EXISTS "GrantRequest";
    DROP TABLE IF EXISTS "UserGrant";
    DROP TYPE IF EXISTS "RequestStatus";
    DROP TYPE IF EXISTS "GrantStatus";
    DROP TYPE IF EXISTS "GrantType";
  `;
};

// Phase 3 回滚
const rollbackPhase3 = async () => {
  await prisma.$executeRaw`
    ALTER TABLE "Message" 
      DROP COLUMN IF EXISTS "localId",
      DROP COLUMN IF EXISTS "content",
      DROP COLUMN IF EXISTS "legacyContent",
      DROP COLUMN IF EXISTS "isDeleted",
      DROP COLUMN IF EXISTS "isPinned",
      DROP COLUMN IF EXISTS "isEdited",
      DROP COLUMN IF EXISTS "aiProcessed",
      DROP COLUMN IF EXISTS "aiResult",
      DROP COLUMN IF EXISTS "metadata",
      DROP COLUMN IF EXISTS "replyToId",
      DROP COLUMN IF EXISTS "encrypted";
    
    -- 删除索引
    DROP INDEX IF EXISTS "Message_conversationId_createdAt_idx";
    DROP INDEX IF EXISTS "Message_localId_idx";
    DROP INDEX IF EXISTS "Message_isDeleted_idx";
    
    -- 删除枚举 (需要先删除依赖)
    DROP TYPE IF EXISTS "ExtendedMessageType";
  `;
};

// Phase 4 回滚
const rollbackPhase4 = async () => {
  await prisma.$executeRaw`
    DROP TABLE IF EXISTS "FileIndex";
    DROP TABLE IF EXISTS "HomeNodeMember";
    DROP TABLE IF EXISTS "HomeNode";
    
    DROP TYPE IF EXISTS "FileStatus";
    DROP TYPE IF EXISTS "StorageType";
    DROP TYPE IF EXISTS "NodePermission";
    DROP TYPE IF EXISTS "NodeStatus";
  `;
};
```

---

## 附录

### A. 相关文件索引

| 文件路径 | 说明 |
|---------|------|
| `backend/prisma/schema.prisma` | 数据库模型定义 |
| `backend/src/middleware/auth.js` | 认证中间件 |
| `backend/src/controllers/authController.js` | 认证控制器 |
| `backend/src/routes/message.js` | 消息路由 |
| `backend/src/services/grantService.js` | 授权服务 (需创建) |
| `frontend/src/stores/auth.js` | 前端认证状态 |
| `frontend/src/stores/chat.js` | 前端聊天状态 |

### B. 环境变量清单

```bash
# 数据库
DATABASE_URL="postgresql://user:pass@host:5432/pinghu"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Redis (速率限制)
REDIS_URL="redis://localhost:6379"

# 文件存储
S3_BUCKET="pinghu-files"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="xxx"
S3_SECRET_ACCESS_KEY="xxx"

# Tailscale (Home Node)
TAILSCALE_AUTH_KEY="tskey-auth-xxx"
TAILSCALE_FUNNEL_PORT="8443"

# AI 服务
OPENAI_API_KEY="sk-xxx"
SPEECH_TO_TEXT_MODEL="whisper-1"
```

### C. 版本历史

| 版本 | 日期 | 修改内容 |
|-----|------|---------|
| 1.0 | 2026-03-29 | 初始版本 |

---

*本文档为技术设计文档，随着系统迭代持续更新。*
