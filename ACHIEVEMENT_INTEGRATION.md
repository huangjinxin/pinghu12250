# 成就徽章系统集成文档

本文档提供成就系统的完整集成指南，包括已完成的集成、待集成的触发点以及使用方法。

## 系统概述

成就徽章系统通过在各种用户行为触发点调用 `achievementService.checkAchievements()` 来自动解锁成就并发放奖励。

### 核心文件

- **Schema**: `backend/prisma/schema.prisma` - Achievement, UserAchievement, AchievementProgress 模型
- **Service**: `backend/src/services/achievementService.js` - 成就检查和管理逻辑
- **Routes**: `backend/src/routes/achievements.js` - 成就API接口
- **Seed**: `backend/scripts/seed-achievements.js` - 37个预定义成就

## 已完成的集成

### ✅ 日记模块 (diary.js)

**文件**: `backend/src/routes/diary.js`

**集成点**: 创建日记后

```javascript
// 检查成就
achievementService.checkAchievements(req.user.id, 'diary_published', {
  count: 1,
});
achievementService.checkAchievements(req.user.id, 'diary_streak', {});
```

**触发成就**:
- FIRST_DIARY (第1篇日记)
- DIARY_WRITER_50 (50篇日记)
- DIARY_WRITER_200 (200篇日记)
- DIARY_STREAK_7 (连续7天写日记)
- DIARY_STREAK_30 (连续30天)
- DIARY_STREAK_100 (连续100天)

---

### ✅ 学习追踪模块 (learning.js)

**文件**: `backend/src/routes/learning.js`

**集成点**: 停止学习后

```javascript
// 1. 学习时长成就
achievementService.checkAchievements(req.user.id, 'learning_duration', { duration });

// 2. 早起/晚睡成就
const startHour = timer.startTime.getHours();
if (startHour < 6) {
  achievementService.checkAchievements(req.user.id, 'learning_early', {});
}
if (startHour >= 22) {
  achievementService.checkAchievements(req.user.id, 'learning_late', {});
}

// 3. 番茄钟成就
if (timer.mode === 'POMODORO') {
  achievementService.checkAchievements(req.user.id, 'pomodoro_complete', {});
}

// 4. 学习连续天数成就
achievementService.checkAchievements(req.user.id, 'study_streak', {});
```

**触发成就**:
- STUDY_10H, STUDY_100H, STUDY_500H (学习时长)
- QUICK_LEARNER (单日5小时)
- SUPER_LEARNER (单日10小时)
- EARLY_BIRD (早起学习)
- NIGHT_OWL (晚睡学习)
- FOCUS_MASTER (30个番茄钟)
- STUDY_STREAK_7, STUDY_STREAK_30 (连续学习)

---

### ✅ 阅读模块 (bookController.js)

**文件**: `backend/src/controllers/bookController.js`

**集成点1**: 完成书籍后

```javascript
// 检查读书成就
achievementService.checkAchievements(req.user.id, 'book_finished', {});
```

**集成点2**: 发布阅读记录后

```javascript
// 检查阅读记录成就
achievementService.checkAchievements(req.user.id, 'reading_log_published', {});
```

**触发成就**:
- BOOK_WORM (读完20本书)
- BOOK_LOVER_50 (读完50本书)
- READING_LOG_100 (100条阅读记录)

---

### ✅ HTML作品模块 (htmlWorkController.js)

**文件**: `backend/src/controllers/htmlWorkController.js`

**集成点**: 创建作品后

```javascript
// 检查作品成就
achievementService.checkAchievements(req.user.id, 'work_published', {});
```

**触发成就**:
- FIRST_WORK (第1个作品)
- WORK_CREATOR_10 (10个作品)
- WORK_CREATOR_50 (50个作品)

---

## 待集成的触发点

以下是需要添加成就检查的其他触发点：

### ⏳ 点赞系统

**需要修改的文件**:
- 日记点赞: `backend/src/routes/post.js` 或类似的点赞路由
- 作品点赞: `backend/src/controllers/htmlWorkController.js` 的 toggleLike 方法
- 阅读记录点赞: `backend/src/controllers/bookController.js` 的 toggleReadingLogLike 方法
- 游戏评测点赞: 游戏评测相关的点赞路由

**集成代码模板**:

```javascript
// 在点赞成功后添加
// 1. 检查点赞者的社交成就
achievementService.checkAchievements(userId, 'likes_sent', {});

// 2. 检查作者的点赞总数成就
achievementService.checkAchievements(authorId, 'total_likes_received', {});

// 3. 检查作品的点赞阈值成就（对于作品）
achievementService.checkAchievements(authorId, 'work_likes', {
  workId: workId, // 用于检查单个作品的点赞数
});
```

**触发成就**:
- FIRST_LIKE (给他人点赞10次)
- SOCIAL_EXPERT (累计获得100个赞)
- POPULAR (累计获得500个赞)
- INFLUENCER (累计获得1000个赞)
- POPULAR_WORK (单作品100赞)
- VIRAL_WORK (单作品500赞)

---

### ⏳ 评论系统

**需要修改的文件**:
- 通用评论路由或各模块的评论方法

**集成代码**:

```javascript
// 在评论发表后
achievementService.checkAchievements(req.user.id, 'comments_sent', {});
```

**触发成就**:
- COMMENTER (发表50条评论)
- ACTIVE_COMMENTER (发表200条评论)

---

### ⏳ 登录系统

**需要修改的文件**: `backend/src/routes/auth.js`

**集成点**: 登录成功后

**集成代码**:

```javascript
// 在登录成功、更新连续登录天数后
achievementService.checkAchievements(user.id, 'login_streak', {});
```

**触发成就**:
- LOGIN_STREAK_30 (连续30天登录)
- LOGIN_STREAK_100 (连续100天登录)

**注意**: 需要在登录时更新 User 表的 `loginStreakDays` 字段。

---

### ⏳ 每日挑战系统

**需要修改的文件**: `backend/src/routes/challenge.js` 或 `challengeService.js`

**集成点**: 领取挑战奖励后

**集成代码**:

```javascript
// 在用户完成挑战并领取奖励后
achievementService.checkAchievements(userId, 'challenge_streak', {});
```

**触发成就**:
- CHALLENGE_STREAK_7 (连续7天完成挑战)
- PERFECT (连续30天完成全部3个挑战)

---

### ⏳ 积分更新

**需要修改的文件**: `backend/src/services/pointService.js`

**集成点**: 用户积分更新后

**集成代码**:

```javascript
// 在 addPoints 方法中，更新用户总积分后
achievementService.checkAchievements(userId, 'total_points', {});
```

**触发成就**:
- POINT_TYCOON (累计10000积分)

---

### ⏳ 全能选手成就

**需要修改的文件**: 各内容创建路由

**集成代码**:

```javascript
// 在任何内容创建后都检查一次
achievementService.checkAchievements(userId, 'all_types', {});
```

**触发成就**:
- ALL_ROUNDER (每种内容类型至少发布10个)

---

### ⏳ 传奇用户成就

**说明**: 这个成就会在每次解锁其他成就时自动检查，已在 `achievementService` 的 `_unlockAchievement` 方法中实现，无需额外集成。

**触发成就**:
- LEGEND (解锁所有其他成就)

---

## API 接口

### 获取所有成就

```http
GET /api/achievements
```

返回所有成就列表，如果用户已登录，会包含解锁状态和进度。

### 获取我的成就

```http
GET /api/achievements/my
```

获取当前用户已解锁的成就。

### 获取成就统计

```http
GET /api/achievements/stats
```

获取当前用户的成就统计信息（解锁数量、稀有度统计等）。

### 设置成就展示

```http
PUT /api/achievements/:achievementId/showcase
Content-Type: application/json

{
  "isShowcased": true
}
```

设置某个成就是否在个人主页展示（最多展示3个）。

### 查看其他用户成就

```http
GET /api/achievements/users/:userId
```

查看其他用户的成就信息。

### 手动检查成就（测试用）

```http
POST /api/achievements/check
Content-Type: application/json

{
  "action": "work_published",
  "data": {}
}
```

---

## 部署步骤

### 1. 运行数据库迁移

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add_achievement_system
# 或使用 push
npx prisma db push
```

### 2. 初始化成就数据

```bash
node scripts/seed-achievements.js
```

**预期输出**:
```
开始初始化成就系统...

========== 成就系统初始化完成 ==========
✓ 创建了 37 个新成就
✓ 更新了 0 个现有成就

成就分类统计：
- 创作成就 (CREATION): 8个
- 学习成就 (LEARNING): 7个
- 坚持成就 (PERSISTENCE): 8个
- 社交成就 (SOCIAL): 6个
- 特殊成就 (SPECIAL): 8个

稀有度统计：
- 普通 (COMMON): 10个
- 稀有 (RARE): 14个
- 史诗 (EPIC): 9个
- 传说 (LEGENDARY): 4个
- 隐藏成就: 2个
=========================================
```

### 3. 重启后端服务

```bash
npm run dev
```

---

## 测试清单

部署后，按以下步骤测试：

### 创作成就测试

- [ ] 发布第1个HTML作品，检查是否解锁 FIRST_WORK
- [ ] 发布第1篇日记，检查是否解锁 FIRST_DIARY
- [ ] 连续7天写日记，检查是否解锁 DIARY_STREAK_7

### 学习成就测试

- [ ] 学习10分钟，检查是否有进度更新
- [ ] 学习累计10小时，检查是否解锁 STUDY_10H
- [ ] 使用番茄钟模式学习，检查番茄钟计数
- [ ] 早上6点前学习，检查 EARLY_BIRD 进度
- [ ] 晚上10点后学习，检查 NIGHT_OWL 进度

### 阅读成就测试

- [ ] 将一本书标记为已读完，检查是否有进度
- [ ] 读完20本书，检查是否解锁 BOOK_WORM
- [ ] 发布阅读记录，检查进度更新

### 社交成就测试

- [ ] 给他人点赞10次，检查 FIRST_LIKE
- [ ] 发表评论，检查评论计数
- [ ] 内容获得赞数，检查作者的社交成就进度

### 坚持成就测试

- [ ] 连续登录7天，检查连续天数更新
- [ ] 连续完成每日挑战，检查挑战连续天数

### 特殊成就测试

- [ ] 积分达到10000，检查 POINT_TYCOON
- [ ] 每种内容类型发布10个以上，检查 ALL_ROUNDER

---

## 成就系统架构

### 触发映射表

`achievementService.js` 中定义了触发映射表：

```javascript
const ACHIEVEMENT_TRIGGERS = {
  // 创作类
  work_published: ['FIRST_WORK', 'WORK_CREATOR_10', 'WORK_CREATOR_50'],
  work_likes: ['POPULAR_WORK', 'VIRAL_WORK'],
  diary_published: ['FIRST_DIARY', 'DIARY_WRITER_50', 'DIARY_WRITER_200'],

  // 学习类
  learning_duration: ['STUDY_10H', 'STUDY_100H', 'STUDY_500H', 'QUICK_LEARNER', 'SUPER_LEARNER'],
  learning_early: ['EARLY_BIRD'],
  learning_late: ['NIGHT_OWL'],
  pomodoro_complete: ['FOCUS_MASTER'],
  book_finished: ['BOOK_WORM', 'BOOK_LOVER_50'],
  reading_log_published: ['READING_LOG_100'],

  // 坚持类
  diary_streak: ['DIARY_STREAK_7', 'DIARY_STREAK_30', 'DIARY_STREAK_100'],
  study_streak: ['STUDY_STREAK_7', 'STUDY_STREAK_30'],
  login_streak: ['LOGIN_STREAK_30', 'LOGIN_STREAK_100'],
  challenge_streak: ['CHALLENGE_STREAK_7', 'PERFECT'],

  // 社交类
  total_likes_received: ['SOCIAL_EXPERT', 'POPULAR', 'INFLUENCER'],
  comments_sent: ['COMMENTER', 'ACTIVE_COMMENTER'],
  likes_sent: ['FIRST_LIKE'],

  // 特殊类
  total_points: ['POINT_TYCOON'],
  all_types: ['ALL_ROUNDER'],
  all_achievements: ['LEGEND'],
};
```

### 成就条件类型

1. **COUNT** (计数型): 累计次数达到目标值
2. **STREAK** (连续型): 连续天数达到目标值
3. **TOTAL** (总量型): 累计总量达到目标值（如总学习时长）
4. **THRESHOLD** (阈值型): 单次或单项达到阈值（如单作品获赞数）

### 奖励发放

成就解锁时自动发放：
- **积分**: 通过 `pointService.addPoints()` 发放
- **金币**: 通过 `walletService.addCoins()` 发放

---

## 前端集成

### 成就通知

建议在前端实现成就解锁通知：

```javascript
// 在API调用后检查响应
if (response.unlockedAchievements && response.unlockedAchievements.length > 0) {
  // 显示成就解锁动画
  showAchievementUnlockModal(response.unlockedAchievements);
}
```

### 成就页面

参考 `Challenges.vue` 的结构，创建：
- **Achievements.vue**: 成就列表页（所有成就，显示解锁状态和进度）
- **AchievementCard.vue**: 成就卡片组件
- **AchievementUnlockModal.vue**: 解锁动画弹窗

---

## 注意事项

1. **异步调用**: `achievementService.checkAchievements()` 是异步的，但不需要等待返回，避免阻塞主流程
2. **错误处理**: 已在各触发点的 try-catch 中处理，成就检查失败不影响主要功能
3. **性能考虑**: 成就检查会查询数据库，但已优化为只检查相关成就，不会造成明显性能影响
4. **重复解锁**: 已有防重复机制，已解锁的成就不会再次触发
5. **隐藏成就**: 用户未登录时API不会返回隐藏成就，保持神秘感

---

## 故障排查

### 成就没有解锁

1. 检查数据库中是否有该成就定义 (`Achievement` 表)
2. 检查触发映射表中是否包含该 action
3. 检查 `_calculateCurrentValue` 方法中是否正确实现了该成就的计算逻辑
4. 查看后端日志是否有错误输出

### 进度不更新

1. 检查 `AchievementProgress` 表中是否有记录
2. 确认触发点是否正确调用了 `checkAchievements`
3. 检查用户ID是否正确传递

### 奖励未发放

1. 检查 `PointLog` 和 `WalletTransaction` 表
2. 确认 `pointService` 和 `walletService` 是否正常工作
3. 查看 `_unlockAchievement` 方法的错误日志

---

## 扩展指南

### 添加新成就

1. 在 `seed-achievements.js` 中添加成就定义
2. 在 `ACHIEVEMENT_TRIGGERS` 中添加触发映射
3. 在 `_calculateCurrentValue` 中实现计算逻辑
4. 重新运行种子脚本

### 自定义成就类型

如果需要新的成就条件类型（除了 COUNT/STREAK/TOTAL/THRESHOLD）：

1. 在 Prisma schema 的 `AchievementConditionType` 枚举中添加新类型
2. 在 `_calculateCurrentValue` 中实现新类型的计算逻辑
3. 更新文档说明新类型的使用方法

---

**完整实现后，系统将拥有功能完善的成就徽章系统，激励用户持续创作和学习！**
