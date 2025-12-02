# 游戏记录模块 - 完整文件清单

## 数据库

### Prisma Schema
- `backend/prisma/schema.prisma` (已更新)
  - 新增Game、GameRecord、GameScreenshot、GameRecordComment、GameRecordLike、GameFavorite模型
  - 新增GamePlayStatus枚举
  - 更新PointAction枚举，添加游戏相关积分类型
  - 更新User模型关联

### 数据库迁移
- `backend/prisma/migrations/20250122_add_game_system/migration.sql`

## 后端

### 服务层
- `backend/src/services/rawgService.js` - RAWG API集成服务
  - searchGames() - 搜索游戏
  - getGameDetails() - 获取游戏详情
  - getTrendingGames() - 获取热门游戏

- `backend/src/services/pointService.js` (已更新)
  - 添加游戏相关积分规则

### 路由层
- `backend/src/routes/game.js` - 游戏主路由
  - GET /api/games/search - 搜索游戏
  - GET /api/games/trending - 热门游戏
  - GET /api/games/:rawgId - 游戏详情
  - POST /api/games/:rawgId/favorite - 收藏/取消收藏
  - GET /api/games/favorites - 我的收藏
  - GET /api/games/:gameId/records - 游戏的所有记录
  - GET /api/games/records/feed - 记录动态流
  - GET /api/games/records/my-library - 我的游戏库
  - POST /api/games/:rawgId/records - 创建记录
  - PUT /api/games/records/:id - 更新记录
  - DELETE /api/games/records/:id - 删除记录
  - GET /api/games/records/:id - 记录详情
  - POST /api/games/records/:id/screenshots - 上传截图
  - DELETE /api/games/screenshots/:id - 删除截图
  - GET /api/games/records/:id/comments - 获取评论
  - POST /api/games/records/:id/comments - 添加评论
  - DELETE /api/games/comments/:id - 删除评论
  - POST /api/games/records/:id/like - 点赞/取消点赞
  - GET /api/games/stats/hot - 热门游戏排行
  - GET /api/games/stats/genres - 类型统计

- `backend/src/routes/admin/gameAdmin.js` - 管理员游戏路由
  - GET /api/admin/games/records - 所有记录
  - DELETE /api/admin/games/records/:id - 删除记录
  - PUT /api/admin/games/:id/block - 屏蔽/取消屏蔽游戏
  - GET /api/admin/games/stats - 统计数据

- `backend/src/index.js` (已更新) - 注册游戏路由

## 前端

### API层
- `frontend/src/api/index.js` (已更新)
  - gameAPI - 游戏相关API
  - adminGameAPI - 管理员游戏API

### 路由配置
- `frontend/src/router/index.js` (已更新)
  - /games - 游戏大厅
  - /games/search - 游戏搜索
  - /games/library - 我的游戏库
  - /games/:rawgId - 游戏详情
  - /games/records/:id - 游戏记录详情
  - /admin/games - 游戏管理

### 页面组件
- `frontend/src/views/GameHub.vue` - 游戏大厅
  - 最新记录动态流
  - 热门游戏展示
  - 游戏类型统计

- `frontend/src/views/GameSearch.vue` - 游戏搜索
  - 搜索RAWG API游戏库
  - 展示热门游戏

- `frontend/src/views/GameDetail.vue` - 游戏详情页
  - 显示游戏信息（API数据 + 本地数据融合）
  - 收藏游戏
  - 创建游玩记录
  - 查看所有玩家记录

- `frontend/src/views/GameRecordDetail.vue` - 游戏记录详情
  - 显示完整记录内容
  - 上传游戏截图
  - 评论系统（支持嵌套回复）
  - 点赞功能

- `frontend/src/views/GameLibrary.vue` - 我的游戏库
  - 我的游戏记录（可按状态筛选）
  - 收藏的游戏

- `frontend/src/views/admin/GameManagement.vue` - 管理员游戏管理
  - 游戏统计数据
  - 管理所有游戏记录
  - 屏蔽不良游戏
  - Top 10热门游戏

### 布局组件
- `frontend/src/views/Layout.vue` (已更新)
  - 添加"游戏大厅"导航菜单
  - 添加管理员"游戏管理"菜单
  - 导入GameControllerOutline图标

## 脚本

### 初始化脚本
- `backend/scripts/init-game-data.js` - 游戏测试数据初始化
  - 创建5个示例游戏
  - 创建示例游戏记录
  - 创建示例评论和收藏

## 功能特性

### 核心功能
1. ✅ 游戏搜索（通过RAWG API）
2. ✅ 游戏详情展示（融合API数据 + 本地数据）
3. ✅ 创建游戏记录（评分、感受、游玩时长、状态）
4. ✅ 上传游戏截图
5. ✅ 公开评论系统（支持嵌套回复）
6. ✅ 点赞游戏记录
7. ✅ 收藏游戏
8. ✅ 游戏大厅（最新、热门、分类）
9. ✅ 个人游戏库（按状态筛选）
10. ✅ 游戏统计和排行

### 积分系统集成
- 发表游戏记录：+1分
- 上传游戏截图：+1分
- 评论游戏记录：+1分

### 管理员功能
- 查看所有游戏记录
- 删除不良记录
- 屏蔽游戏（禁止出现在搜索中）
- 查看游戏统计数据

## 使用说明

### 后端部署

1. 运行数据库迁移：
```bash
cd backend
npx prisma migrate dev --name add_game_system
npx prisma generate
```

2. 初始化测试数据（可选）：
```bash
node scripts/init-game-data.js
```

3. 环境变量（可选，RAWG API Key用于提高API限流）：
```env
RAWG_API_KEY=your_api_key_here
```

### 前端部署

前端代码已自动集成到现有系统，无需额外配置。

### 访问路径

- 游戏大厅：http://localhost:12250/games
- 游戏搜索：http://localhost:12250/games/search
- 我的游戏库：http://localhost:12250/games/library
- 管理员游戏管理：http://localhost:12250/admin/games（需管理员权限）

## API文档

### 公共游戏API
- 所有API均需要认证（Bearer Token）
- RAWG API作为游戏数据源（可匿名调用，有限流）

### 数据模型

**Game（游戏基础信息）**
- 从RAWG API获取并缓存到本地
- 避免重复请求

**GameRecord（用户游戏记录）**
- 一个用户对一个游戏只能有一条记录
- 支持公开/家长可见/私密三种可见性

**GameScreenshot（游戏截图）**
- 关联到游戏记录
- 支持多图

**GameRecordComment（评论）**
- 支持嵌套回复（一级回复）
- 公开可见

**GameRecordLike（点赞）**
- 一个用户对一条记录只能点赞一次

**GameFavorite（收藏）**
- 一个用户可收藏多个游戏

## 技术栈

### 后端
- Express.js
- Prisma ORM
- PostgreSQL
- Axios (调用RAWG API)
- Multer (文件上传)

### 前端
- Vue 3 (Composition API)
- Vue Router
- Naive UI
- Vite

### 第三方服务
- RAWG API (https://api.rawg.io/api)
  - 免费调用
  - 无需API Key（有API Key限流更宽松）

## 注意事项

1. RAWG API免费调用有限流，建议申请API Key
2. 游戏封面图片来自RAWG CDN
3. 上传的游戏截图存储在 backend/uploads 目录
4. 游戏记录可见性设置：PUBLIC（公开）、PARENT_ONLY（家长可见）、PRIVATE（私密）
5. 管理员可屏蔽游戏，屏蔽后不会出现在搜索结果中
