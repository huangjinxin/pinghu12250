# 儿童成长记录系统

一个功能完整的儿童成长记录与学习管理系统，支持日记、作业、笔记、HTML作品创作等多种学习记录方式。

## 技术栈

### 前端
- Vue 3 - 渐进式JavaScript框架
- Vite - 下一代前端构建工具
- TailwindCSS - 实用优先的CSS框架
- Pinia - Vue状态管理
- Vue Router - 官方路由
- Axios - HTTP客户端
- Monaco Editor - 代码编辑器
- Tiptap - 富文本编辑器
- ECharts - 数据可视化

### 后端
- Node.js - JavaScript运行时
- Express - Web应用框架
- Prisma ORM - 数据库工具
- PostgreSQL - 关系型数据库
- JWT - 身份认证
- Bcrypt - 密码加密
- Multer - 文件上传
- Sharp - 图片处理

### 部署
- Docker - 容器化
- Docker Compose - 多容器编排
- Nginx - 反向代理与静态文件服务

## 核心功能

### 1. 用户系统
- 支持三种角色：学生、家长、老师
- JWT认证与授权
- 家长与学生关联管理

### 2. 双时间轴
- **个人时间轴**：展示个人动态
- **公共时间轴**：展示全员可见的动态
- 支持点赞、评论功能

### 3. 学习记录
- **日记**：富文本编辑，支持心情、天气标记
- **作业记录**：记录作业内容、难度、花费时间
- **课堂笔记**：按科目分类的笔记管理
- **读书笔记**：书籍信息与阅读感受
- **标签系统**：多对多关系的标签管理

### 4. HTML作品系统
- 在线代码编辑器（HTML/CSS/JS）
- 实时预览功能
- 作品发布与分享
- 可见性控制（公开/仅家长/私密）
- 点赞、评论、Fork功能

### 5. 任务系统
- 老师发布任务给指定学生
- 任务状态跟踪（待完成/进行中/已完成/已逾期）
- 任务完成情况统计

### 6. 统计面板
- 学习热力图（按日期显示活动）
- 基础数据统计（日记数、作品数、笔记数等）
- 点赞数统计

### 7. 日历功能
- 展示任务截止日期
- 个人事项提醒
- 日期范围筛选

### 8. 个人中心
- 头像上传与裁剪
- 基本信息编辑（昵称、简介、年级、兴趣标签）
- 账号设置（修改密码、隐私设置）
- 个人数据展示（加入天数、作品数、点赞数）

## 项目结构

```
.
├── frontend/              # 前端应用
│   ├── src/
│   │   ├── api/          # API接口
│   │   ├── assets/       # 静态资源
│   │   ├── components/   # Vue组件
│   │   ├── router/       # 路由配置
│   │   ├── stores/       # Pinia状态管理
│   │   ├── views/        # 页面组件
│   │   ├── App.vue       # 根组件
│   │   ├── main.js       # 入口文件
│   │   └── style.css     # 全局样式
│   ├── Dockerfile        # 生产环境Dockerfile
│   ├── Dockerfile.dev    # 开发环境Dockerfile
│   ├── nginx.conf        # Nginx配置
│   ├── package.json
│   └── vite.config.js    # Vite配置
│
├── backend/              # 后端应用
│   ├── prisma/
│   │   ├── schema.prisma # 数据库Schema
│   │   └── seed.js       # 种子数据
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由
│   │   ├── utils/        # 工具函数
│   │   └── index.js      # 入口文件
│   ├── uploads/          # 上传文件目录
│   ├── Dockerfile        # 生产环境Dockerfile
│   ├── Dockerfile.dev    # 开发环境Dockerfile
│   ├── .env.example      # 环境变量示例
│   └── package.json
│
├── docker-compose.yml         # 开发环境Docker Compose
├── docker-compose.prod.yml    # 生产环境Docker Compose
├── .env.example              # 环境变量示例
├── .gitignore
└── README.md
```

## 快速开始

### 方式一：使用Docker（推荐）

#### 开发环境

1. 克隆项目
```bash
git clone <repository-url>
cd 12250
```

2. 创建环境变量文件
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

3. 启动所有服务
```bash
docker-compose up -d
```

4. 初始化数据库
```bash
# 执行数据库迁移
docker-compose exec backend npx prisma migrate deploy

# 填充种子数据（可选）
docker-compose exec backend npm run prisma:seed
```

5. 访问应用
- 前端：http://localhost:12250
- 后端API：http://localhost:12251
- 数据库：localhost:12252

测试账号：
- 学生1：`xiaoming` / `123456`
- 学生2：`xiaohong` / `123456`
- 家长：`parent_ming` / `123456`
- 老师：`teacher_wang` / `123456`

6. 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

7. 停止服务
```bash
docker-compose down

# 同时删除数据卷（会清空数据库）
docker-compose down -v
```

#### 生产环境

1. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置强密码和密钥
```

2. 启动生产环境
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. 初始化数据库
```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 方式二：本地开发（不使用Docker）

#### 前置要求
- Node.js 18+
- PostgreSQL 15+
- npm 或 yarn

#### 后端设置

1. 安装依赖
```bash
cd backend
npm install
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env，修改数据库连接等配置
```

3. 数据库迁移
```bash
npx prisma migrate dev
npx prisma generate
```

4. 填充种子数据（可选）
```bash
npm run prisma:seed
```

5. 启动开发服务器
```bash
npm run dev
```

后端将运行在 http://localhost:12251

#### 前端设置

1. 安装依赖
```bash
cd frontend
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

前端将运行在 http://localhost:12250

## API文档

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新token

### 用户相关
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/me` - 更新当前用户信息
- `PUT /api/users/me/password` - 修改密码
- `POST /api/users/me/avatar` - 上传头像
- `GET /api/users/:id` - 获取指定用户信息
- `GET /api/users/:id/stats` - 获取用户统计数据
- `POST /api/users/link-parent` - 关联家长
- `GET /api/users/me/children` - 获取孩子列表

### 动态相关
- `GET /api/posts` - 获取动态列表
- `GET /api/posts/:id` - 获取单个动态
- `POST /api/posts` - 创建动态
- `DELETE /api/posts/:id` - 删除动态
- `POST /api/posts/:id/like` - 点赞/取消点赞
- `POST /api/posts/:id/comments` - 添加评论
- `DELETE /api/posts/:id/comments/:commentId` - 删除评论

### 日记相关
- `GET /api/diaries` - 获取日记列表
- `POST /api/diaries` - 创建日记
- `PUT /api/diaries/:id` - 更新日记
- `DELETE /api/diaries/:id` - 删除日记

### 作业相关
- `GET /api/homeworks` - 获取作业列表
- `POST /api/homeworks` - 创建作业记录
- `DELETE /api/homeworks/:id` - 删除作业记录

### 笔记相关
- `GET /api/notes` - 获取笔记列表
- `POST /api/notes` - 创建笔记

### 读书笔记相关
- `GET /api/reading-notes` - 获取读书笔记列表
- `POST /api/reading-notes` - 创建读书笔记

### HTML作品相关
- `GET /api/html-works` - 获取作品列表
- `GET /api/html-works/:id` - 获取单个作品
- `POST /api/html-works` - 创建作品
- `PUT /api/html-works/:id` - 更新作品
- `DELETE /api/html-works/:id` - 删除作品
- `POST /api/html-works/:id/fork` - Fork作品
- `POST /api/html-works/:id/like` - 点赞/取消点赞
- `POST /api/html-works/:id/comments` - 添加评论

### 任务相关
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务（仅老师）
- `PUT /api/tasks/:id/complete` - 完成任务（学生）

### 标签相关
- `GET /api/tags` - 获取标签列表
- `POST /api/tags` - 创建标签

### 日历相关
- `GET /api/calendar` - 获取日历事件
- `POST /api/calendar` - 创建日历事件
- `DELETE /api/calendar/:id` - 删除日历事件

### 统计相关
- `GET /api/stats/heatmap` - 获取学习热力图数据
- `GET /api/stats/overview` - 获取概览统计

## 数据库Schema

详见 `backend/prisma/schema.prisma`

主要模型：
- User - 用户
- Profile - 用户配置
- StudentParent - 学生-家长关联
- Post - 动态
- Diary - 日记
- Homework - 作业
- Note - 笔记
- ReadingNote - 读书笔记
- HTMLWork - HTML作品
- Tag - 标签
- TagOnRecord - 标签关联
- Task - 任务
- TaskAssignment - 任务分配
- Comment - 评论
- Like - 点赞
- CalendarEvent - 日历事件

## 端口配置

- 前端Web应用：12250
- 后端API：12251
- PostgreSQL数据库：12252

## 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 遵循Vue 3 Composition API最佳实践
- 后端遵循RESTful API设计原则
- 使用Prisma进行类型安全的数据库操作

### 模块化设计
- 前端按功能模块划分组件
- 后端采用MVC架构
- API层与业务逻辑分离
- 可复用组件统一管理

### 后续迭代建议
- 集成Monaco Editor实现代码高亮
- 集成Tiptap实现富文本编辑
- 集成ECharts实现数据可视化
- 添加实时通知功能（WebSocket）
- 添加文件上传进度显示
- 实现图片裁剪功能
- 添加单元测试和E2E测试

## 常见问题

### 1. 数据库连接失败
确保PostgreSQL服务正常运行，检查环境变量中的DATABASE_URL配置是否正确。

### 2. 前端无法连接后端
检查后端服务是否启动，确认端口12251没有被占用。

### 3. Docker容器启动失败
检查Docker和Docker Compose版本，确保端口12250、12251、12252未被占用。

### 4. Prisma迁移失败
删除prisma/migrations目录，重新执行`npx prisma migrate dev`。

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题，请提交Issue或联系开发团队。
