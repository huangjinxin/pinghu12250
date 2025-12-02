# 系统架构文档

## 目录
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [目录结构](#目录结构)
- [模块划分](#模块划分)
- [数据流](#数据流)
- [认证与授权](#认证与授权)

---

## 技术栈

### 后端
- **运行环境**: Node.js (>=16.x)
- **框架**: Express.js 4.x
- **数据库**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **认证**: JWT (jsonwebtoken)
- **文件上传**: Multer
- **定时任务**: node-cron
- **其他依赖**:
  - bcryptjs - 密码加密
  - cors - 跨域支持
  - dotenv - 环境变量管理

### 前端
- **框架**: Vue.js 3.x
- **构建工具**: Vite
- **UI库**: Element Plus
- **路由**: Vue Router 4.x
- **状态管理**: Vuex 4.x
- **HTTP客户端**: Axios

### 数据库
- **主数据库**: PostgreSQL
- **Schema管理**: Prisma Migrate
- **关系**: 40+ 数据模型
- **特性**: 事务支持、级联删除、索引优化

---

## 系统架构

### 整体架构

```
┌─────────────┐
│   浏览器     │
└──────┬──────┘
       │ HTTP/HTTPS
       │
┌──────▼──────────────────────────────────┐
│          前端服务 (Vue.js)               │
│  ┌────────────────────────────────────┐ │
│  │  Views/Pages                       │ │
│  │  Components                        │ │
│  │  Router                            │ │
│  │  Store (Vuex)                      │ │
│  │  API Service (Axios)               │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │ REST API
               │
┌──────────────▼──────────────────────────┐
│        后端服务 (Express.js)             │
│  ┌────────────────────────────────────┐ │
│  │  Routes (API Endpoints)            │ │
│  │  ├─ auth.js                        │ │
│  │  ├─ user.js                        │ │
│  │  ├─ ...                            │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Middleware                        │ │
│  │  ├─ authenticate                   │ │
│  │  ├─ authorize                      │ │
│  │  ├─ errorHandler                   │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Services (Business Logic)         │ │
│  │  ├─ pointService                   │ │
│  │  ├─ followService                  │ │
│  │  ├─ achievementService             │ │
│  │  ├─ ...                            │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Controllers                       │ │
│  │  ├─ authController                 │ │
│  │  ├─ postController                 │ │
│  │  └─ ...                            │ │
│  └────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │ Prisma Client
               │
┌──────────────▼──────────────────────────┐
│         数据库 (PostgreSQL)              │
│  ┌────────────────────────────────────┐ │
│  │  Tables                            │ │
│  │  ├─ users                          │ │
│  │  ├─ diaries                        │ │
│  │  ├─ point_logs                     │ │
│  │  ├─ achievements                   │ │
│  │  └─ ... (40+ tables)               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 分层架构

**1. 路由层 (Routes)**
- 负责接收HTTP请求
- 验证请求参数
- 调用Service层处理业务逻辑
- 返回响应

**2. 中间件层 (Middleware)**
- 认证中间件 (authenticate)
- 授权中间件 (authorize, isAdmin)
- 错误处理中间件 (errorHandler)
- 文件上传中间件 (upload)

**3. 服务层 (Services)**
- 封装核心业务逻辑
- 处理数据库操作
- 实现业务规则
- 使用类实例导出模式

**4. 控制器层 (Controllers)**
- 处理复杂的请求逻辑
- 协调多个Service
- 处理业务流程

**5. 数据层 (Prisma + PostgreSQL)**
- Prisma Client提供类型安全的数据库访问
- 自动生成类型定义
- 支持事务、迁移、种子数据

---

## 目录结构

```
├── backend/                    # 后端代码
│   ├── prisma/                 # Prisma配置
│   │   ├── schema.prisma       # 数据库Schema
│   │   ├── migrations/         # 数据库迁移文件
│   │   └── seed.js             # 种子数据
│   ├── src/                    # 源代码
│   │   ├── index.js            # 应用入口
│   │   ├── routes/             # 路由定义
│   │   │   ├── auth.js         # 认证路由
│   │   │   ├── user.js         # 用户路由
│   │   │   ├── follows.js      # 关注系统路由
│   │   │   ├── achievements.js # 成就路由
│   │   │   ├── challenge.js    # 挑战路由
│   │   │   └── ...             # 其他路由 (27个)
│   │   ├── services/           # 业务逻辑
│   │   │   ├── pointService.js # 积分服务 (统一)
│   │   │   ├── followService.js# 关注服务
│   │   │   ├── achievementService.js # 成就服务
│   │   │   ├── challengeService.js   # 挑战服务
│   │   │   └── ...
│   │   ├── controllers/        # 控制器
│   │   │   ├── authController.js
│   │   │   ├── postController.js
│   │   │   └── ...
│   │   ├── middleware/         # 中间件
│   │   │   ├── auth.js         # 认证授权中间件
│   │   │   ├── errorHandler.js # 错误处理
│   │   │   └── upload.js       # 文件上传
│   │   └── utils/              # 工具函数
│   │       ├── jwt.js          # JWT工具
│   │       └── ...
│   ├── uploads/                # 上传文件存储
│   └── package.json            # 依赖配置
│
├── frontend/                   # 前端代码
│   ├── src/                    # 源代码
│   │   ├── main.js             # 应用入口
│   │   ├── App.vue             # 根组件
│   │   ├── router/             # 路由配置
│   │   │   └── index.js        # 路由定义
│   │   ├── store/              # Vuex状态管理
│   │   │   └── index.js        # Store配置
│   │   ├── views/              # 页面组件 (31个)
│   │   │   ├── Home.vue
│   │   │   ├── Login.vue
│   │   │   ├── Challenges.vue
│   │   │   └── ...
│   │   ├── components/         # 可复用组件
│   │   │   ├── Heatmap.vue
│   │   │   ├── ImageUpload.vue
│   │   │   └── TagSelector.vue
│   │   ├── api/                # API服务
│   │   │   └── index.js        # API定义 (统一管理)
│   │   ├── assets/             # 静态资源
│   │   └── utils/              # 工具函数
│   ├── public/                 # 公共资源
│   └── package.json            # 依赖配置
│
├── docs/                       # 项目文档
│   ├── ARCHITECTURE.md         # 本文档
│   ├── API_STANDARDS.md        # API规范
│   ├── CODING_STANDARDS.md     # 编码规范
│   ├── API_GUIDE.md            # API接口文档
│   ├── POINT_SYSTEM.md         # 积分系统文档
│   ├── TAG_SYSTEM_GUIDE.md     # 标签系统文档
│   ├── ACHIEVEMENT_INTEGRATION.md # 成就系统文档
│   ├── CHALLENGE_INTEGRATION.md   # 挑战系统文档
│   └── FOLLOW_SYSTEM_INTEGRATION.md # 关注系统文档
│
└── README.md                   # 项目主文档
```

---

## 模块划分

### 1. 用户系统
- **路由**: auth.js, user.js
- **功能**: 注册、登录、用户信息管理、角色权限
- **模型**: User, Profile, Teacher, Student

### 2. 内容创作系统
- **路由**: diary.js, homework.js, note.js, htmlWork.js
- **功能**: 日记、作业、笔记、HTML作品
- **模型**: Diary, Homework, Note, HTMLWork

### 3. 动态系统
- **路由**: post.js
- **控制器**: postController.js
- **功能**: 发布动态、点赞、评论
- **模型**: Dynamic, Like, Comment

### 4. 书籍阅读系统
- **路由**: book.js, readingNote.js
- **功能**: 书籍管理、阅读笔记、书架
- **模型**: Book, UserBookshelf, ReadingLog

### 5. 游戏评测系统
- **路由**: game.js, admin/gameAdmin.js
- **功能**: 游戏库、短评、长评、评论
- **模型**: Game, UserGameRecord, GameShortReview, GameLongReview

### 6. 学习追踪系统
- **路由**: learning.js
- **功能**: 学习项目、计时器、学习记录
- **模型**: LearningProject, LearningSession, ActiveTimer

### 7. 积分系统
- **路由**: pointFull.js
- **服务**: pointService.js (统一)
- **功能**: 积分规则、积分日志、排行榜
- **模型**: PointRule, PointLog, UserPoints

### 8. 成就系统
- **路由**: achievements.js
- **服务**: achievementService.js
- **功能**: 成就定义、解锁、进度追踪
- **模型**: Achievement, UserAchievement, AchievementProgress

### 9. 每日挑战系统
- **路由**: challenge.js
- **服务**: challengeService.js
- **功能**: 挑战模板、每日生成、奖励领取
- **模型**: ChallengeTemplate, DailyChallenge, UserChallengeRecord

### 10. 好友关注系统
- **路由**: follows.js
- **服务**: followService.js
- **功能**: 单向关注、双向好友、推荐算法
- **模型**: UserFollow, Friendship

### 11. 看板系统
- **路由**: board.js
- **功能**: 协作看板、卡片管理、成员权限
- **模型**: Board, List, Card

### 12. 标签系统
- **路由**: tag.js
- **服务**: tagService.js
- **功能**: 全局标签、内容标签、用户关注标签
- **模型**: GlobalTag, ContentTag, UserFollowedTag

### 13. 虚拟货币系统
- **功能**: 金币管理、交易记录
- **模型**: Wallet, WalletTransaction

### 14. 任务系统
- **路由**: task.js
- **功能**: 系统任务、个人任务、完成追踪
- **模型**: Task, TaskSubmission

### 15. 日历系统
- **路由**: calendar.js
- **功能**: 日程管理
- **模型**: CalendarEvent

### 16. 管理系统
- **路由**: admin.js, campus.js, class.js
- **功能**: 用户管理、学校管理、班级管理
- **模型**: School, Class, TeacherClass

---

## 数据流

### 1. 用户请求流程

```
用户操作
  ↓
前端发起请求 (Axios)
  ↓
后端路由接收 (Express Router)
  ↓
中间件处理 (authenticate, authorize)
  ↓
路由处理器 / 控制器
  ↓
调用Service处理业务逻辑
  ↓
Prisma Client查询数据库
  ↓
返回数据
  ↓
路由返回响应
  ↓
前端接收并更新UI
```

### 2. 积分流程示例

```
用户发布日记
  ↓
POST /api/diaries
  ↓
diaryService.create()
  ↓
创建日记记录
  ↓
调用 pointService.addPoints()
  ↓
创建积分日志 + 更新用户总积分
  ↓
检查成就解锁
  ↓
返回结果 (包含积分信息)
```

### 3. 关注成为好友流程

```
用户A关注用户B
  ↓
POST /api/follows/:userId
  ↓
followService.follow(A, B)
  ↓
1. 创建关注关系 (UserFollow)
2. 更新统计数 (followingCount, followersCount)
3. 检查是否互相关注
4. 如果互相关注 → 创建好友关系 (Friendship)
5. 更新好友统计 (friendsCount)
  ↓
触发成就检查
  ↓
返回结果 (isFriend: true/false)
```

---

## 认证与授权

### JWT认证流程

```
1. 用户登录
   POST /api/auth/login
   { email, password }

2. 验证密码
   bcrypt.compare(password, hashedPassword)

3. 生成JWT Token
   jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })

4. 返回Token给前端
   { token, user }

5. 前端存储Token
   localStorage.setItem('token', token)

6. 后续请求携带Token
   Authorization: Bearer <token>

7. 后端验证Token
   authenticate中间件 → jwt.verify()

8. 将用户信息挂载到req.user
   req.user = { id, email, username, role, avatar }
```

### 权限控制

**三层权限控制**:

1. **认证层**: `authenticate` 中间件
   - 验证JWT Token
   - 提取用户信息
   - 所有需要登录的接口都使用此中间件

2. **授权层**: `authorize(...roles)` 或 `isAdmin` 中间件
   - 检查用户角色
   - `authorize('ADMIN', 'TEACHER')` - 允许多个角色
   - `isAdmin` - 仅允许管理员

3. **业务层**: Service内部逻辑
   - 检查资源所有权
   - 例如：只能删除自己的日记

**使用示例**:

```javascript
// 需要登录
router.get('/me', authenticate, async (req, res) => {
  // req.user 包含当前用户信息
});

// 需要管理员权限
router.get('/admin/users', authenticate, isAdmin, async (req, res) => {
  // 只有ADMIN角色可以访问
});

// 需要教师或管理员权限
router.post('/tasks', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  // TEACHER或ADMIN可以访问
});
```

### 角色定义

```prisma
enum Role {
  STUDENT  // 学生
  PARENT   // 家长
  TEACHER  // 老师
  ADMIN    // 管理员
}
```

**权限级别**（从低到高）:
1. STUDENT - 学生权限
2. PARENT - 家长权限（查看孩子信息）
3. TEACHER - 教师权限（管理班级、发布任务）
4. ADMIN - 管理员权限（系统管理、用户审核）

---

## 性能优化

### 1. 数据库优化
- **索引**: 在高频查询字段上添加索引
- **分页**: 所有列表查询都支持分页
- **事务**: 使用Prisma事务确保数据一致性
- **级联操作**: 合理配置cascade delete

### 2. API优化
- **缓存**: 静态资源缓存、API响应缓存
- **压缩**: 启用gzip压缩
- **并发**: 使用Promise.all处理并发查询

### 3. 前端优化
- **懒加载**: 路由懒加载、图片懒加载
- **代码分割**: Vite自动代码分割
- **状态管理**: Vuex集中管理状态

---

## 安全措施

### 1. 认证安全
- JWT Token有效期7天
- 密码使用bcrypt加密（salt rounds: 10）
- 敏感操作需要二次验证

### 2. API安全
- CORS配置限制来源
- 速率限制（待实现）
- 输入验证（待统一）
- SQL注入防护（Prisma ORM）

### 3. 数据安全
- 敏感字段不返回（password等）
- 级联删除防止孤立数据
- 软删除机制（部分模块）

---

## 扩展性

### 1. 模块化设计
- 每个功能模块独立
- Service层封装业务逻辑
- 易于添加新功能

### 2. 统一规范
- API返回格式统一
- 错误处理统一
- 服务导出模式统一

### 3. 可配置
- 环境变量配置
- 数据库连接可配置
- 第三方服务可替换

---

## 部署架构

### 开发环境
```
localhost:5173 (前端)
localhost:3000 (后端)
localhost:5432 (数据库)
```

### 生产环境
```
前端: 静态文件部署到CDN
后端: Node.js服务器 (PM2管理)
数据库: PostgreSQL主从复制
```

---

## 监控与日志

### 日志系统
- **应用日志**: console.log/error
- **访问日志**: Express日志中间件
- **数据库日志**: Prisma日志

### 监控指标
- API响应时间
- 错误率
- 数据库查询性能
- 服务器资源使用

---

## 后续优化方向

1. ✅ 统一服务导出模式
2. ✅ 统一管理员认证
3. ⏳ 添加请求验证中间件（Joi/Yup）
4. ⏳ 实现API速率限制
5. ⏳ 添加Redis缓存层
6. ⏳ 实现实时通知（WebSocket）
7. ⏳ 完善日志系统
8. ⏳ 添加单元测试和集成测试
9. ⏳ 实现CI/CD流程
10. ⏳ 容器化部署（Docker）

---

**文档版本**: v1.0
**最后更新**: 2025-11-25
**维护者**: 开发团队
