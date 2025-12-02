# 儿童成长记录系统 API 使用指南

## ✅ 系统状态

所有核心功能已完成并可以使用：
- ✅ 用户认证系统
- ✅ 动态发布
- ✅ 日记系统
- ✅ 作业系统
- ✅ 笔记系统
- ✅ 读书笔记系统（全新）
- ✅ HTML作品系统
- ✅ 积分系统（完整重构）

## 🔐 测试账号

### 管理员账号
- 用户名: `admin`
- 密码: `admin123`
- 角色: ADMIN

### 学生账号 1
- 用户名: `student1`
- 密码: `123456`
- 角色: STUDENT
- 昵称: 小明

### 学生账号 2
- 用户名: `student2`
- 密码: `123456`
- 角色: STUDENT
- 昵称: 小红

## 📚 读书笔记系统 API

### 1. 搜索书籍
```
GET /api/books/search?keyword=<关键词>&page=1&limit=20
```
无需登录即可搜索全局书库。

### 2. 获取书籍详情
```
GET /api/books/:id
```
返回书籍详情，包括统计信息和当前用户的书架状态。

### 3. 添加书籍到书库
```
POST /api/books
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "书名",
  "author": "作者",
  "coverUrl": "封面图URL（可选）",
  "sourceType": "ebook|paper",
  "sourceUrl": "来源链接（可选）",
  "totalPages": 100,
  "description": "简介（可选）"
}
```
任何用户都可以添加书籍到全局书库，奖励 +2 积分。

### 4. 获取我的书架
```
GET /api/books/bookshelf/my?status=<WANT_TO_READ|READING|COMPLETED|DROPPED>&page=1&limit=20
Authorization: Bearer <token>
```
返回当前用户的书架，可按阅读状态筛选。

### 5. 添加书籍到我的书架
```
POST /api/books/bookshelf
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "书籍ID",
  "status": "WANT_TO_READ|READING|COMPLETED|DROPPED"
}
```
将书籍添加到个人书架，默认状态为"想读"。

### 6. 更新书架状态
```
PUT /api/books/bookshelf/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "READING|COMPLETED|DROPPED"
}
```
改为"已读完"时奖励 +20 积分。

### 7. 获取阅读记录（阅读动态）
```
GET /api/books/reading-logs?bookId=<书籍ID>&userId=<用户ID>&page=1&limit=20
```
无需登录，可查看所有公开的阅读记录。

### 8. 创建阅读记录
```
POST /api/books/reading-logs
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "书籍ID",
  "chapterInfo": "第5章",
  "readPages": 30,
  "content": "短评感想（必填）"
}
```
创建阅读记录，奖励 +5 积分，自动累加到书架的阅读页数。

### 9. 点赞/点踩阅读记录
```
POST /api/books/reading-logs/:id/like
Authorization: Bearer <token>
Content-Type: application/json

{
  "isLike": true  // true=点赞，false=点踩
}
```
- 每人每条记录只能选择点赞或点踩其一
- 点赞：作者 +1 积分
- 点踩：作者 -1 积分

### 10. 删除阅读记录
```
DELETE /api/books/reading-logs/:id
Authorization: Bearer <token>
```
删除自己的阅读记录，扣除 -5 积分。

## 📝 日记系统 API

### 1. 获取日记列表
```
GET /api/diaries?userId=<用户ID>&page=1&limit=20
Authorization: Bearer <token>
```

### 2. 创建日记
```
POST /api/diaries
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "标题",
  "content": "内容",
  "mood": "心情（可选）",
  "weather": "天气（可选）",
  "tags": ["标签ID数组（可选）"]
}
```
根据字数奖励积分：
- 800-999字: +5分
- 1000-1199字: +10分
- 1200-1499字: +15分
- 1500-1999字: +20分
- 2000字以上: +30分

### 3. 更新日记
```
PUT /api/diaries/:id
Authorization: Bearer <token>
```

### 4. 删除日记
```
DELETE /api/diaries/:id
Authorization: Bearer <token>
```

## 🌟 动态系统 API

### 1. 获取动态列表
```
GET /api/posts?type=<all|personal|public>&page=1&limit=20
Authorization: Bearer <token>
```

### 2. 发布动态
```
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "动态内容",
  "images": ["图片URL数组"],
  "isPublic": true
}
```

### 3. 点赞动态
```
POST /api/posts/:id/like
Authorization: Bearer <token>
```

### 4. 评论动态
```
POST /api/posts/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "评论内容",
  "parentId": "父评论ID（可选）"
}
```

## 🏆 积分系统 API

### 1. 获取积分规则（管理员）
```
GET /api/points/admin/rules
Authorization: Bearer <token>
```

### 2. 获取我的积分
```
GET /api/points/me
Authorization: Bearer <token>
```

### 3. 获取积分统计
```
GET /api/points/stats
Authorization: Bearer <token>
```

### 4. 获取积分记录
```
GET /api/points/records?page=1&limit=20
Authorization: Bearer <token>
```

### 5. 积分排行榜
```
GET /api/points/leaderboard?page=1&limit=50
Authorization: Bearer <token>
```

## 📊 演示数据

系统已包含以下演示数据：
- 3本书籍：《小王子》、《活着》、《JavaScript高级程序设计》
- 3条阅读记录
- 2篇日记
- 2条动态
- 25条积分规则

## 🚀 快速开始

### 1. 启动服务
```bash
docker-compose up -d
```

### 2. 创建演示数据（可选）
```bash
docker exec children-growth-backend node scripts/create-demo-data.js
```

### 3. 创建管理员账号（可选）
```bash
docker exec children-growth-backend node scripts/seed-data.js
```

## 🔍 测试示例

### 登录
```bash
curl -X POST http://localhost:12251/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"123456"}'
```

### 搜索书籍
```bash
curl http://localhost:12251/api/books/search
```

### 获取阅读记录
```bash
curl http://localhost:12251/api/books/reading-logs
```

### 发布日记
```bash
TOKEN="<你的token>"
curl -X POST http://localhost:12251/api/diaries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "今天的学习",
    "content": "今天学到了很多新知识..."
  }'
```

## ⚠️ 注意事项

1. **积分规则**：所有涉及积分的操作都会自动触发积分计算
2. **字数统计**：日记的积分根据实际字数自动计算
3. **阅读状态**：修改为"已读完"时自动奖励 20 积分
4. **点赞点踩**：每条阅读记录只能选择点赞或点踩其一
5. **权限控制**：只能删除自己的内容

## 🐛 常见问题

### Q: 登录失败？
A: 请检查账号状态是否为 ACTIVE。默认注册的用户状态为 PENDING，需要管理员激活。

### Q: 创建内容没有积分？
A: 检查积分规则是否启用（isEnabled=true），以及是否满足条件（如字数要求）。

### Q: 找不到书籍？
A: 使用 `/api/books/search` 搜索全局书库，如果没有则需要先添加到书库。

## 📞 技术支持

如有问题，请查看：
- Docker logs: `docker-compose logs backend`
- 数据库状态: `docker exec children-growth-db psql -U postgres -d children_growth`
