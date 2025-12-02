# 儿童成长记录系统 - 项目文档

## 系统架构

### 技术栈
- **前端**: Vue 3 + Vite + Naive UI + TailwindCSS
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: PostgreSQL
- **部署**: Docker + Docker Compose

### 数据库结构

#### 1. 用户系统 (User System)
- `User` - 用户主表 (学生/家长/教师/管理员)
- `Profile` - 用户个人资料
- `School` - 学校/分校
- `Class` - 班级
- `Teacher` - 教师信息表
- `Student` - 学生信息表
- `TeacherClass` - 教师-班级关联
- `StudentParent` - 学生-家长关联

#### 2. 学习记录 (Learning Records)
- `Diary` - 日记
- `Homework` - 作业记录
- `Note` - 课堂笔记
- `Tag` - 标签
- `ContentTag` - 内容标签关联表

#### 3. 书籍阅读系统 (Reading System)
- `Book` - 书籍库（全局共享）
- `UserBookshelf` - 用户书架
- `ReadingLog` - 阅读笔记

#### 4. HTML作品 (HTML Works)
- `HTMLWork` - HTML作品表
- 支持Fork功能
- 支持点赞和评论

#### 5. 游戏评测系统 (Game Review System)
- `Game` - 游戏库（管理员维护）
- `UserGameRecord` - 用户游戏记录
- `GameShortReview` - 短评（100字限制）
- `GameLongReview` - 长评（富文本）
- `GameReviewComment` - 长评评论
- `GameLongReviewLike` - 长评点赞

#### 6. 时间轴与互动 (Timeline & Interaction)
- `Dynamic` - 动态时间轴
- `Like` - 点赞记录
- `Comment` - 评论记录

#### 7. 任务系统 (Task System)
- `Task` - 任务表
- `TaskSubmission` - 任务提交

#### 8. 日历 (Calendar)
- `CalendarEvent` - 日历事件

#### 9. 积分系统 (Point System)
- `PointRule` - 积分规则
- `PointLog` - 积分记录
- User.totalPoints - 用户积分汇总

#### 10. 活动日志 (Activity Logs)
- `ActivityLog` - 用户活动日志

## API 路由结构

### 认证相关 (`/api/auth`)
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `POST /refresh` - 刷新Token

### 用户相关 (`/api/users`)
- `GET /me` - 获取当前用户信息
- `PUT /me` - 更新用户信息
- `PUT /me/password` - 修改密码
- `POST /me/avatar` - 上传头像
- `GET /:id` - 获取用户详情
- `GET /:id/stats` - 获取用户统计

### 学习记录 (`/api/diaries`, `/api/homeworks`, `/api/notes`)
- `GET /` - 获取列表
- `POST /` - 创建记录
- `PUT /:id` - 更新记录
- `DELETE /:id` - 删除记录

### 书籍系统 (`/api/books`)
- `GET /books` - 搜索书籍
- `POST /books` - 添加书籍（管理员）
- `GET /bookshelf` - 我的书架
- `POST /bookshelf` - 添加到书架
- `GET /reading-logs` - 阅读笔记列表
- `POST /reading-logs` - 写阅读笔记

### HTML作品 (`/api/html-works`)
- `GET /` - 获取作品列表
- `POST /` - 创建作品
- `GET /:id` - 获取作品详情
- `PUT /:id` - 更新作品
- `DELETE /:id` - 删除作品
- `POST /:id/fork` - Fork作品
- `POST /:id/like` - 点赞作品
- `POST /:id/comments` - 评论作品

### 游戏系统 (`/api/games`)
- `GET /feed` - 最新评测（短评+长评混合）
- `GET /hot` - 热门游戏
- `GET /search` - 搜索游戏
- `GET /types` - 游戏类型列表
- `GET /:id` - 游戏详情
- `GET /:id/short-reviews` - 短评列表
- `GET /:id/long-reviews` - 长评列表
- `GET /my/library` - 我的游戏库
- `POST /:id/add-to-library` - 添加到游戏库
- `POST /:id/short-review` - 写短评
- `POST /:id/long-review` - 写长评
- `GET /long-review/:id` - 长评详情
- `POST /long-review/:id/like` - 点赞长评
- `POST /long-review/:id/comment` - 评论长评

### 动态时间轴 (`/api/dynamics`)
- `GET /` - 获取动态列表
- `POST /` - 发布动态
- `POST /:id/like` - 点赞动态
- `POST /:id/comments` - 评论动态

### 任务系统 (`/api/tasks`)
- `GET /` - 获取任务列表
- `POST /` - 创建任务（教师/管理员）
- `GET /:id` - 任务详情
- `POST /:id/submit` - 提交任务
- `PUT /:id/complete` - 完成任务

### 积分系统 (`/api/points`)
- `GET /me` - 我的积分
- `GET /records` - 积分记录
- `GET /stats` - 积分统计
- `GET /leaderboard` - 积分排行榜
- `GET /admin/rules` - 获取积分规则（管理员）
- `POST /admin/rules` - 创建积分规则（管理员）
- `POST /admin/adjust` - 调整用户积分（管理员）

### 管理员功能 (`/api/admin`)
- `GET /users` - 用户列表
- `PUT /users/:id/status` - 更新用户状态
- `GET /schools` - 学校列表
- `POST /schools` - 创建学校
- `GET /classes` - 班级列表
- `POST /classes` - 创建班级
- `GET /activity-logs` - 活动日志
- `GET /stats` - 系统统计

## 前端页面结构

### 公共页面
- `/login` - 登录页
- `/register` - 注册页

### 学生页面
- `/` - 首页（Dashboard + 双时间轴）
- `/profile` - 个人中心
- `/diaries` - 日记列表
- `/homeworks` - 作业列表
- `/notes` - 笔记列表
- `/bookshelf` - 我的书架
- `/books/search` - 书库搜索
- `/reading-logs` - 阅读笔记
- `/works` - HTML作品列表
- `/works/create` - 作品编辑器
- `/works/:id` - 作品详情
- `/games` - 游戏大厅
- `/my-games` - 我的游戏库
- `/games/:id` - 游戏详情
- `/games/review/:id` - 长评详情
- `/tasks` - 任务列表
- `/calendar` - 日历
- `/points` - 积分中心
- `/points/leaderboard` - 积分排行榜

### 教师页面
- `/teacher/classes` - 我的班级
- `/teacher/class/:id` - 班级详情
- `/teacher/students` - 学生列表
- `/teacher/tasks` - 任务管理

### 家长页面
- `/parent/children` - 我的孩子
- `/parent/child/:id` - 孩子详情

### 管理员页面
- `/admin/users` - 用户管理
- `/admin/schools` - 学校管理
- `/admin/classes` - 班级管理
- `/admin/games` - 游戏管理
- `/admin/points` - 积分管理
- `/admin/logs` - 活动日志

## 测试账号

### 管理员
- 用户名: `admin`
- 密码: `admin123`

### 教师（5个）
- 用户名: `teacher1` ~ `teacher5`
- 密码: `123456`

### 学生（10个）
- 用户名: `student1` ~ `student10`
- 密码: `123456`

## 启动说明

### 开发环境启动
```bash
# 启动所有服务（Docker）
./start.sh

# 或手动启动
docker-compose up -d
```

### 本地启动（无Docker）
```bash
# 启动本地服务
./start-local.sh

# 或手动启动
cd backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

### 访问地址
- 前端: http://localhost:3000
- 后端: http://localhost:12251
- 数据库: localhost:12252

## 环境变量

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:12252/children_growth?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=12251
NODE_ENV=development
```

## Docker服务

- `children-growth-db` - PostgreSQL数据库
- `children-growth-backend` - Node.js后端
- `children-growth-frontend` - Vue前端

## 数据库命令

```bash
# 生成Prisma Client
npx prisma generate

# 推送Schema到数据库
npx prisma db push

# 重置数据库
npx prisma db push --force-reset

# 运行Seed数据
npx prisma db seed

# 打开Prisma Studio
npx prisma studio
```
