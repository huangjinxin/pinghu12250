# 苹湖少儿空间 - AI 编程指南

## 项目基础信息

| 项目 | 值 |
|------|-----|
| 项目名称 | 苹湖少儿空间（儿童成长记录系统） |
| 项目目录 | `/Users/beichentech/pinghu12250` |
| 前端端口 | 12250 |
| 后端端口 | 12251 |
| 数据库端口 | 12252 |

## 技术栈

**前端**: Vue 3 + Vite + TailwindCSS + Pinia + Naive UI
**后端**: Node.js + Express.js + Prisma ORM
**数据库**: PostgreSQL

## 目录结构

```
pinghu12250/
├── backend/
│   ├── prisma/schema.prisma    # 数据库模型定义
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   ├── routes/             # API 路由
│   │   ├── services/           # 业务逻辑层
│   │   ├── middleware/         # 中间件 (auth, upload)
│   │   ├── lib/prisma.js       # Prisma 单例
│   │   └── index.js            # 应用入口
│   └── uploads/                # 上传文件目录
├── frontend/
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   ├── components/         # 公共组件
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── api/index.js        # API 封装
│   │   └── router/index.js     # 路由配置
│   └── vite.config.js
└── docker-compose.yml
```

## 核心开发规范

### Prisma 使用（重要）

```javascript
// 正确：使用单例
const prisma = require('../lib/prisma');

// 错误：直接实例化会导致连接池耗尽
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
```

### 数据库修改流程

```bash
# 1. 修改 backend/prisma/schema.prisma
# 2. 推送变更
npx prisma db push
# 3. 重新生成客户端
npx prisma generate
# 4. 重启后端
docker restart beichen33-backend-1
```

### 文件上传路径

```
uploads/images/   # 图片
uploads/audios/   # 音频
uploads/avatars/  # 头像
```

## Docker 容器

```bash
# 容器名称
beichen33-frontend-1    # 前端
beichen33-backend-1     # 后端
beichen33-postgres-1    # 数据库

# 常用命令
docker restart beichen33-backend-1
docker logs beichen33-backend-1 -f
docker exec -it beichen33-postgres-1 psql -U postgres -d children_growth
```

## 用户角色

| 角色 | 权限 |
|------|------|
| STUDENT | 学生 - 基础功能 |
| PARENT | 家长 - 查看孩子信息 |
| TEACHER | 老师 - 班级管理、发布任务 |
| ADMIN | 管理员 - 全部权限 |

## 核心模块

1. **用户系统**: 注册登录、JWT认证、角色权限
2. **内容创作**: 日记、作业、笔记、HTML作品
3. **动态系统**: 发布动态、点赞评论
4. **积分系统**: 积分规则、排行榜
5. **成就系统**: 徽章解锁、进度追踪
6. **挑战系统**: 每日挑战、奖励领取
7. **关注系统**: 单向关注、双向好友
8. **标签系统**: 全局标签管理
9. **任务系统**: 老师发布任务、学生完成

## API 响应格式

```javascript
// 成功
{ success: true, data: {...}, message: "操作成功" }

// 失败
{ success: false, error: "错误信息" }
```

## 测试账号

- 学生: `xiaoming` / `123456`
- 家长: `parent_ming` / `123456`
- 老师: `teacher_wang` / `123456`

---

> 本文件是 AI 编程的唯一参考文档，请勿创建其他临时 md 文件。
