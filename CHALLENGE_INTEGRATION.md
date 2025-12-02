# 每日挑战系统集成说明

## 已集成模块

### 1. 日记模块 (diary.js)
- **触发点**: POST /api/diaries (创建日记后)
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'diary_create', { wordCount, count: 1 })`
- **状态**: ✅ 已集成

### 2. 学习追踪模块 (learning.js)
- **触发点**: POST /api/learning/stop (停止学习后)
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'learning_stop', { duration, count: 1 })`
- **状态**: ✅ 已集成

## 待集成模块

### 3. HTML作品模块 (htmlWork.js)
- **触发点**: POST /api/html-works (创建作品后)
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'work_create', { count: 1 })`
- **代码示例**:
```javascript
// 在 htmlWork.js 顶部添加
const challengeService = require('../services/challengeService');

// 在创建作品成功后添加
challengeService.checkAndUpdateProgress(req.user.id, 'work_create', {
  count: 1,
});
```

### 4. 阅读记录模块 (readingNote.js 或 book.js)
- **触发点**: POST /api/reading-notes 或 POST /api/books (创建阅读记录后)
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'reading_create', { count: 1, wordCount })`
- **代码示例**:
```javascript
// 在相应路由文件顶部添加
const challengeService = require('../services/challengeService');

// 在创建阅读记录成功后添加
challengeService.checkAndUpdateProgress(req.user.id, 'reading_create', {
  count: 1,
  wordCount: content.length,
});
```

### 5. 社交互动模块 - 点赞
- **触发点**: 所有点赞操作（日记、作品、学习记录等）
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'like', { count: 1 })`
- **需要集成的路由**:
  - POST /api/diaries/:id/like
  - POST /api/html-works/:id/like
  - POST /api/reading-notes/:id/like
  - POST /api/learning/sessions/:id/like
  - 其他点赞接口

### 6. 社交互动模块 - 评论
- **触发点**: 所有评论操作
- **调用**: `challengeService.checkAndUpdateProgress(userId, 'comment', { count: 1 })`
- **需要集成的路由**:
  - POST /api/comments（或各模块的评论接口）

## 集成步骤

### 步骤1：导入服务
在路由文件顶部添加：
```javascript
const challengeService = require('../services/challengeService');
```

### 步骤2：调用检查方法
在相应操作成功后调用：
```javascript
challengeService.checkAndUpdateProgress(userId, action, data);
```

### 步骤3：参数说明
- `userId`: 用户ID
- `action`: 行为类型
  - `diary_create`: 创建日记
  - `learning_stop`: 完成学习
  - `work_create`: 创建作品
  - `reading_create`: 创建阅读记录
  - `like`: 点赞
  - `comment`: 评论
- `data`: 行为数据
  - `wordCount`: 字数（用于字数类型挑战）
  - `duration`: 时长（用于时长类型挑战，单位：分钟）
  - `count`: 次数（用于次数类型挑战）

## 挑战类型映射

| 挑战类型 | 触发行为 | 数据要求 |
|---------|---------|---------|
| DIARY | diary_create | wordCount, count |
| STUDY | learning_stop | duration, count |
| WORK | work_create | count |
| READING | reading_create | wordCount, count |
| SOCIAL (点赞) | like | count |
| SOCIAL (评论) | comment | count |

## 注意事项

1. 挑战检查是异步的，不应阻塞主流程
2. 检查失败不应影响用户操作
3. 进度更新会自动处理，无需额外逻辑
4. 奖励领取由用户主动触发
5. 连续完成奖励在领取时自动检测

## 测试要点

- [ ] 创建日记后挑战进度更新
- [ ] 学习后挑战进度更新
- [ ] 创建作品后挑战进度更新
- [ ] 阅读记录后挑战进度更新
- [ ] 点赞后挑战进度更新
- [ ] 评论后挑战进度更新
- [ ] 完成挑战后可以领取奖励
- [ ] 领取奖励后积分和金币正确增加
- [ ] 连续完成3天和7天奖励正确发放
