# 积分系统规则文档

本文档定义了整个系统的积分规则，任何模块开发时必须严格遵守此规则实现积分触发逻辑。

## 数据库设计

### point_rules 表（积分规则）
```sql
- id: 主键
- category: 行为类型 (diary/reading/homework/work/game/social/login)
- action: 触发动作 (create/like/dislike/delete/finish/fork/login/streak)
- name: 规则名称（中文）
- description: 规则描述
- condition_type: 条件类型 (none/word_count/count/status)
- condition_value: 条件值
- points: 积分值（正数加分，负数扣分）
- daily_limit: 每日上限（0表示无限制）
- is_enabled: 是否启用
```

### point_logs 表（积分记录）
```sql
- id: 主键
- user_id: 用户ID
- rule_id: 规则ID
- points: 获得的积分
- target_type: 关联对象类型 (diary/reading_log/work等)
- target_id: 关联对象ID
- description: 描述
- created_at: 创建时间
```

### user_points 表（用户积分汇总）
```sql
- id: 主键
- user_id: 用户ID（唯一）
- total_points: 总积分
- today_points: 今日积分
- updated_at: 更新时间
```

---

## 积分规则明细

### 日记模块 (category: diary)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| D001 | create | 发布日记-入门级 | 字数≥800 | +5 | 0 | 发布日记时 |
| D002 | create | 发布日记-良好级 | 字数≥1000 | +10 | 0 | 发布日记时 |
| D003 | create | 发布日记-优秀级 | 字数≥1200 | +15 | 0 | 发布日记时 |
| D004 | create | 发布日记-卓越级 | 字数≥1500 | +20 | 0 | 发布日记时 |
| D005 | create | 发布日记-大师级 | 字数≥2000 | +30 | 0 | 发布日记时 |
| D006 | create | 发布日记-不合格 | 字数<800 | -2 | 0 | 发布日记时 |
| D007 | like | 日记被点赞 | 无 | +1 | 0 | 日记被点赞时 |
| D008 | dislike | 日记被点踩 | 无 | -1 | 0 | 日记被点踩时 |
| D009 | delete | 删除日记 | 无 | 取负 | 0 | 删除日记时，扣除该日记所有获得积分 |

**实现要点：**
- 发布日记时：根据字数匹配最高级别规则（2000字只给+30，不累加）
- 删除日记时：查询该日记相关的所有point_logs，将获得的积分全部扣除

---

### 读书笔记模块 (category: reading)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| R001 | create | 添加书籍 | 无 | +2 | 0 | 添加书籍到书架时 |
| R002 | create | 发布阅读记录 | 无 | +5 | 0 | 发布阅读记录时 |
| R003 | like | 阅读记录被点赞 | 无 | +1 | 0 | 阅读记录被点赞时 |
| R004 | dislike | 阅读记录被点踩 | 无 | -1 | 0 | 阅读记录被点踩时 |
| R005 | finish | 读完一本书 | 状态改为finished | +20 | 0 | 书籍状态更新时 |
| R006 | delete | 删除阅读记录 | 无 | -5 | 0 | 删除阅读记录时 |

**实现要点：**
- 添加书籍时直接给2积分
- 读完书奖励只在状态从其他改为finished时触发一次

---

### 作业模块 (category: homework)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| H001 | create | 提交作业 | 无 | +5 | 0 | 提交作业时 |
| H002 | excellent | 作业被评为优秀 | 老师标记excellent | +10 | 0 | 老师评价作业时 |

**实现要点：**
- 提交作业立即给5积分
- 老师标记优秀额外给10积分（不扣除原来的5分）

---

### 作品模块 (category: work)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| W001 | create | 发布HTML作品 | 无 | +10 | 0 | 发布作品时 |
| W002 | like | 作品被点赞 | 无 | +2 | 0 | 作品被点赞时 |
| W003 | dislike | 作品被点踩 | 无 | -2 | 0 | 作品被点踩时 |
| W004 | fork | 作品被Fork | 无 | +5 | 0 | 作品被Fork时 |
| W005 | delete | 删除作品 | 无 | -10 | 0 | 删除作品时 |

---

### 游戏评测模块 (category: game)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| G001 | create | 发布游戏短评 | 无 | +3 | 0 | 发布短评时 |
| G002 | create | 发布游戏长评 | 无 | +10 | 0 | 发布长评时 |
| G003 | like | 长评被点赞 | 无 | +1 | 0 | 长评被点赞时 |

---

### 社交互动模块 (category: social)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| S001 | like | 给他人点赞 | 无 | +1 | 5 | 点赞时（给点赞者） |
| S002 | comment | 发表评论 | 无 | +2 | 10 | 发表评论时 |

**实现要点：**
- 需要检查今日已获得的积分，到达上限后不再给积分

---

### 登录模块 (category: login)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| L001 | login | 每日首次登录 | 当天首次登录 | +1 | 1 | 登录时 |
| L002 | streak | 连续登录7天 | 连续7天登录 | +10 | 0 | 第7天登录时 |
| L003 | break_streak | 中断连续登录 | 未连续登录 | -5 | 0 | 登录时检测到中断 |

**实现要点：**
- 需要在user表或单独表记录last_login_date和login_streak_days
- 每次登录时检查连续天数

---

### 学习追踪模块 (category: learning_tracker)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 每日上限 | 触发时机 |
|--------|--------|---------|---------|-------|---------|---------|
| L101 | complete | 学习10分钟 | 时长≥10分钟 | +2 | 0 | 停止学习时 |
| L102 | complete | 学习30分钟 | 时长≥30分钟 | +5 | 0 | 停止学习时 |
| L103 | complete | 学习1小时 | 时长≥60分钟 | +10 | 0 | 停止学习时 |
| L104 | complete | 学习2小时 | 时长≥120分钟 | +20 | 0 | 停止学习时 |
| L105 | streak | 连续学习7天 | 连续7天有学习记录 | +30 | 0 | 达成连续7天时 |
| L106 | like | 学习记录被点赞 | 无 | +1 | 0 | 学习记录被点赞时 |
| L107 | delete | 删除学习记录 | 无 | -2 | 0 | 删除学习记录时 |

**实现要点：**
- 根据学习时长匹配最高积分规则（120分钟给+20，不累加）
- 单次学习超过180分钟自动停止并防作弊
- 连续7天学习记录触发额外奖励，需检查user表记录学习状态
- content必须20字以上，否则提示无法获得积分

---

## 代码实现规范

### 1. 统一的积分服务类

创建 `PointService` 类处理所有积分逻辑：
```javascript
// backend/services/pointService.js

class PointService {
  /**
   * 添加积分
   * @param {number} userId - 用户ID
   * @param {string} ruleId - 规则ID（如 D001）
   * @param {string} targetType - 对象类型
   * @param {number} targetId - 对象ID
   */
  async addPoints(userId, ruleId, targetType, targetId) {
    // 1. 查询规则
    // 2. 检查每日上限
    // 3. 创建point_log
    // 4. 更新user_points
  }

  /**
   * 扣除积分
   */
  async deductPoints(userId, points, targetType, targetId, description) {
    // 扣除逻辑
  }

  /**
   * 删除内容时扣除积分
   */
  async deductPointsOnDelete(targetType, targetId) {
    // 查询该内容的所有积分记录并扣除
  }
}
```

### 2. 每个模块的触发点

**日记模块（diaries）**
- `POST /api/diaries` 创建时：根据字数调用 `addPoints(userId, 'D001-D006')`
- `POST /api/diaries/:id/like` 点赞时：调用 `addPoints(authorId, 'D007')`
- `POST /api/diaries/:id/dislike` 点踩时：调用 `addPoints(authorId, 'D008')`
- `DELETE /api/diaries/:id` 删除时：调用 `deductPointsOnDelete('diary', id)`

**读书笔记模块（reading）**
- `POST /api/books` 添加书籍时：调用 `addPoints(userId, 'R001')`
- `POST /api/reading-logs` 发布记录时：调用 `addPoints(userId, 'R002')`
- `PUT /api/user-bookshelves/:id` 状态改为finished时：调用 `addPoints(userId, 'R005')`
- `POST /api/reading-logs/:id/like` 点赞时：调用 `addPoints(authorId, 'R003')`
- `DELETE /api/reading-logs/:id` 删除时：调用 `deductPoints(userId, 5)`

**作业模块（homework）**
- `POST /api/homework` 提交时：调用 `addPoints(userId, 'H001')`
- `PUT /api/homework/:id/excellent` 老师标记优秀时：调用 `addPoints(userId, 'H002')`

**作品模块（works）**
- `POST /api/works` 发布时：调用 `addPoints(userId, 'W001')`
- `POST /api/works/:id/like` 点赞时：调用 `addPoints(authorId, 'W002')`
- `POST /api/works/:id/fork` Fork时：调用 `addPoints(authorId, 'W004')`
- `DELETE /api/works/:id` 删除时：调用 `deductPoints(userId, 10)`

**游戏评测模块（game）**
- `POST /api/game-short-reviews` 发布短评时：调用 `addPoints(userId, 'G001')`
- `POST /api/game-long-reviews` 发布长评时：调用 `addPoints(userId, 'G002')`
- `POST /api/game-long-reviews/:id/like` 点赞时：调用 `addPoints(authorId, 'G003')`

**学习追踪模块（learning_tracker）**
- `POST /api/learning/start` 开始计时：无积分，创建活跃计时器
- `POST /api/learning/stop` 停止学习时：
  - 根据持续时间调用 `calculateLearningPoints(duration)` 选择规则
  - 持续时间≥120分钟调用 `addPoints(userId, 'L104')`
  - 持续时间≥60分钟调用 `addPoints(userId, 'L103')`
  - 持续时间≥30分钟调用 `addPoints(userId, 'L102')`
  - 持续时间≥10分钟调用 `addPoints(userId, 'L101')`
  - 检查连续学习天数，触发 L105
- `POST /api/learning-sessions/:id/like` 学习记录被点赞时：调用 `addPoints(sessionAuthorId, 'L106')`
- `DELETE /api/learning-sessions/:id` 删除学习记录时：调用 `addPoints(userId, 'L107')` 扣除积分

**社交模块（social）**
- 任何点赞操作：调用 `addPoints(userId, 'S001')` 给点赞者积分（需检查每日上限）
- 任何评论操作：调用 `addPoints(userId, 'S002')` 给评论者积分（需检查每日上限）

**登录模块（login）**
- `POST /api/auth/login` 登录成功后：
  - 调用 `addPoints(userId, 'L001')` 每日首次登录
  - 检查连续登录天数，满7天调用 `addPoints(userId, 'L002')`
  - 检测到中断调用 `addPoints(userId, 'L003')`

---

## 数据库初始化

执行以下SQL创建默认规则：
```sql
-- 插入所有默认规则
INSERT INTO point_rules (id, category, action, name, description, condition_type, condition_value, points, daily_limit, is_enabled) VALUES
('D001', 'diary', 'create', '发布日记-入门级', '发布字数≥800的日记可获得5积分', 'word_count', 800, 5, 0, true),
('D002', 'diary', 'create', '发布日记-良好级', '发布字数≥1000的日记可获得10积分', 'word_count', 1000, 10, 0, true),
('D003', 'diary', 'create', '发布日记-优秀级', '发布字数≥1200的日记可获得15积分', 'word_count', 1200, 15, 0, true),
('D004', 'diary', 'create', '发布日记-卓越级', '发布字数≥1500的日记可获得20积分', 'word_count', 1500, 20, 0, true),
('D005', 'diary', 'create', '发布日记-大师级', '发布字数≥2000的日记可获得30积分', 'word_count', 2000, 30, 0, true),
('D006', 'diary', 'create', '发布日记-不合格', '发布字数<800的日记扣2积分', 'word_count', 799, -2, 0, true),
('D007', 'diary', 'like', '日记被点赞', '日记被其他用户点赞时获得1积分', 'none', null, 1, 0, true),
('D008', 'diary', 'dislike', '日记被点踩', '日记被其他用户点踩时扣除1积分', 'none', null, -1, 0, true),
('D009', 'diary', 'delete', '删除日记', '删除日记时扣除该日记所有获得积分', 'none', null, -1, 0, true),

('R001', 'reading', 'create', '添加书籍', '添加书籍到书架时获得2积分', 'none', null, 2, 0, true),
('R002', 'reading', 'create', '发布阅读记录', '发布阅读记录时获得5积分', 'none', null, 5, 0, true),
('R003', 'reading', 'like', '阅读记录被点赞', '阅读记录被点赞时获得1积分', 'none', null, 1, 0, true),
('R004', 'reading', 'dislike', '阅读记录被点踩', '阅读记录被点踩时扣除1积分', 'none', null, -1, 0, true),
('R005', 'reading', 'finish', '读完一本书', '书籍状态改为已读完时获得20积分', 'none', null, 20, 0, true),
('R006', 'reading', 'delete', '删除阅读记录', '删除阅读记录时扣除5积分', 'none', null, -5, 0, true),

('H001', 'homework', 'create', '提交作业', '提交作业时获得5积分', 'none', null, 5, 0, true),
('H002', 'homework', 'excellent', '作业被评为优秀', '作业被评为优秀时额外获得10积分', 'none', null, 10, 0, true),

('W001', 'work', 'create', '发布HTML作品', '发布HTML作品时获得10积分', 'none', null, 10, 0, true),
('W002', 'work', 'like', '作品被点赞', '作品被点赞时获得2积分', 'none', null, 2, 0, true),
('W003', 'work', 'dislike', '作品被点踩', '作品被点踩时扣除2积分', 'none', null, -2, 0, true),
('W004', 'work', 'fork', '作品被Fork', '作品被Fork时获得5积分', 'none', null, 5, 0, true),
('W005', 'work', 'delete', '删除作品', '删除作品时扣除10积分', 'none', null, -10, 0, true),

('G001', 'game', 'create', '发布游戏短评', '发布游戏短评时获得3积分', 'none', null, 3, 0, true),
('G002', 'game', 'create', '发布游戏长评', '发布游戏长评时获得10积分', 'none', null, 10, 0, true),
('G003', 'game', 'like', '游戏长评被点赞', '游戏长评被点赞时获得1积分', 'none', null, 1, 0, true),

('L001', 'login', 'login', '每日首次登录', '每日首次登录时获得1积分', 'none', null, 1, 1, true),
('L002', 'login', 'streak', '连续登录7天', '连续7天登录时额外获得10积分', 'none', null, 10, 0, true),
('L003', 'login', 'break_streak', '中断连续登录', '中断连续登录时扣除5积分', 'none', null, -5, 0, true),

('S001', 'social', 'like', '给他人点赞', '给他人内容点赞时获得1积分', 'none', null, 1, 5, true),
('S002', 'social', 'comment', '发表评论', '发表评论时获得2积分', 'none', null, 2, 10, true),

('L101', 'learning_tracker', 'complete', '学习10分钟', '学习时长达到10分钟时获得2积分', 'none', null, 2, 0, true),
('L102', 'learning_tracker', 'complete', '学习30分钟', '学习时长达到30分钟时获得5积分', 'none', null, 5, 0, true),
('L103', 'learning_tracker', 'complete', '学习1小时', '学习时长达到60分钟时获得10积分', 'none', null, 10, 0, true),
('L104', 'learning_tracker', 'complete', '学习2小时', '学习时长达到120分钟时获得20积分', 'none', null, 20, 0, true),
('L105', 'learning_tracker', 'streak', '连续学习7天', '连续7天有学习记录时获得30积分', 'none', null, 30, 0, true),
('L106', 'learning_tracker', 'like', '学习记录被点赞', '学习记录被其他用户点赞时获得1积分', 'none', null, 1, 0, true),
('L107', 'learning_tracker', 'delete', '删除学习记录', '删除学习记录时扣除2积分', 'none', null, -2, 0, true),

('C001', 'daily_challenge', 'complete', '完成简单挑战', '完成easy难度挑战可获得10积分', 'none', null, 10, 0, true),
('C002', 'daily_challenge', 'complete', '完成中等挑战', '完成medium难度挑战可获得20积分', 'none', null, 20, 0, true),
('C003', 'daily_challenge', 'complete', '完成困难挑战', '完成hard难度挑战可获得50积分', 'none', null, 50, 0, true),
('C004', 'daily_challenge', 'streak', '连续完成3天', '连续3天全部完成挑战时额外获得50积分', 'none', null, 50, 0, true),
('C005', 'daily_challenge', 'streak', '连续完成7天', '连续7天全部完成挑战时额外获得100积分', 'none', null, 100, 0, true)
```

---

### 每日挑战模块 (category: daily_challenge)

| 规则ID | action | 规则名称 | 触发条件 | 积分值 | 金币值 | 触发时机 |
|--------|--------|---------|---------|-------|-------|---------|
| C001 | complete | 完成简单挑战 | 完成easy难度 | +10 | +5 | 领取奖励时 |
| C002 | complete | 完成中等挑战 | 完成medium难度 | +20 | +15 | 领取奖励时 |
| C003 | complete | 完成困难挑战 | 完成hard难度 | +50 | +30 | 领取奖励时 |
| C004 | streak | 连续完成3天 | 连续3天全部完成 | +50 | +50 | 达成连续时 |
| C005 | streak | 连续完成7天 | 连续7天全部完成 | +100 | +100 | 达成连续时 |

**实现要点：**
- 每日0点自动生成3个挑战（每个难度1个）
- 挑战按条件自动检测完成，但奖励需要用户手动领取
- 连续完成检测：每次领取奖励时检查连续天数
- 集成虚拟货币系统，同时发放积分和金币

---

### 全局标签模块 (category: tag_system)

本系统使用统一的全局标签系统，所有内容类型共享标签。

**数据结构规范：**
- 所有内容类型统一使用 `content_tags` 关联表
- 支持的内容类型：diary, work, reading_log, learning_session, homework, game_short_review, game_long_review
- 标签名称全局唯一，大小写不敏感
- 标签按分类组织：学科、技能、编程、兴趣、其他

**标签表字段：**
- `global_tags`: id, name(唯一), category, color, use_count, created_by, is_official
- `content_tags`: 关联表，支持多种content_type
- `user_followed_tags`: 用户关注的标签

**触发点：**
- 内容被打标签时，global_tags.use_count +1
- 标签被关注时，记录到 user_followed_tags
- 删除内容时，对应的content_tags记录自动删除（CASCADE）

**标签分类：**
- 学科类：数学、语文、英语、物理、化学、生物、历史、地理
- 技能类：编程、绘画、音乐、写作、演讲、运动
- 编程类：HTML、CSS、JavaScript、Python、Scratch、游戏开发
- 兴趣类：阅读、科学、探索、创意、手工
- 其他：日常、思考、成长、挑战

**颜色方案：**
- 学科类：蓝色系 (#3B82F6, #2563EB, #1D4ED8)
- 技能类：绿色系 (#10B981, #059669, #047857)
- 编程类：紫色系 (#8B5CF6, #7C3AED, #6D28D9)
- 兴趣类：橙色系 (#F59E0B, #D97706, #B45309)
- 其他：灰色系 (#6B7280, #4B5563, #374151)

**API接口规范：**
- GET /api/tags/search?q=关键词 - 搜索标签（自动补全）
- GET /api/tags/hot?days=7 - 热门标签
- GET /api/tags/official - 官方标签列表
- GET /api/tags/:tagName - 标签详情
- GET /api/tags/:tagName/contents - 标签下的内容
- POST /api/tags/:tagId/follow - 关注标签
- DELETE /api/tags/:tagId/follow - 取消关注

**集成要点：**
所有内容创建/更新API都应支持 `tags` 参数（字符串数组），由 TagService 统一处理：
```javascript
await tagService.attachTags('diary', diaryId, userId, ['数学', '学习']);
```

---

### 成就徽章模块 (category: achievement)

成就徽章系统通过设定各类目标，激励用户持续创作和学习。

**触发检查点：**
- 发布内容后（日记/作品/读书等）
- 点赞/评论后
- 学习记录完成后
- 用户登录时（检查连续性成就）
- 积分更新时（检查积分成就）
- 关注/被关注时

**成就奖励：**
- 解锁成就时额外给予积分和金币
- 解锁稀有成就时发送全局通知
- 解锁传说成就时在时间轴展示

**成就分类：**
- **创作成就** (creation): 发布作品、日记等相关
- **学习成就** (learning): 学习时长、读书相关
- **坚持成就** (persistence): 连续天数、习惯养成
- **社交成就** (social): 点赞、评论、关注相关
- **特殊成就** (special): 综合性、隐藏成就

**稀有度等级：**
- **普通** (common): 灰色边框，易于获得
- **稀有** (rare): 蓝色边框，需要一定努力
- **史诗** (epic): 紫色边框，较难获得
- **传说** (legendary): 金色边框，极难获得，有隐藏成就

**成就类型：**
- `count`: 累计次数型（如发布10个作品）
- `streak`: 连续天数型（如连续7天日记）
- `total`: 总量型（如学习100小时）
- `threshold`: 阈值型（如单作品100赞）

**数据表：**
- `achievements`: 成就定义表（预设的所有成就）
- `user_achievements`: 用户已解锁成就
- `achievement_progress`: 用户成就进度跟踪

**API接口：**
- GET /api/achievements - 所有成就列表
- GET /api/achievements/my - 我的成就
- PUT /api/achievements/:id/showcase - 设置展示
- GET /api/achievements/users/:userId - 查看他人成就
- GET /api/achievements/recent - 最近解锁动态

**集成要点：**
在内容发布、互动行为等触发点调用：
```javascript
await achievementService.checkAchievements(userId, 'work_published', { workId });
```

---

### 好友关注模块 (category: social_follow)

好友关注系统采用单向关注机制，互相关注自动成为好友。

**关系规则：**
- **单向关注**：A关注B，B不一定关注A
- **互相关注成为好友**：当A关注B，且B也关注A时，自动建立好友关系
- **取消关注解除好友**：任何一方取消关注，好友关系自动解除
- **防刷机制**：不能关注自己，每日关注上限100人，操作需防抖

**数据表结构：**

`user_follows` 关注关系表：
- id: 主键
- follower_id: 关注者ID（谁关注了）
- following_id: 被关注者ID（被谁关注）
- created_at: 关注时间
- 唯一索引：(follower_id, following_id)
- 索引：follower_id, following_id

`friendships` 好友关系表：
- id: 主键
- user_id_1: 较小的用户ID（按ID排序）
- user_id_2: 较大的用户ID（按ID排序）
- created_at: 成为好友时间
- 唯一索引：(user_id_1, user_id_2)

用户统计字段扩展（users表）：
- followers_count: 粉丝数（默认0）
- following_count: 关注数（默认0）
- friends_count: 好友数（默认0）

**API接口：**

POST /api/follows/:userId - 关注用户
- 检查是否已关注（防重复）
- 创建user_follows记录
- 更新双方统计数（follower的following_count++，following的followers_count++）
- 发送通知给被关注者
- 检查是否互相关注，是则创建friendships记录，更新friends_count，发送好友通知
- 触发成就检查（follower_gained）

DELETE /api/follows/:userId - 取消关注
- 删除user_follows记录
- 更新双方统计数
- 如果之前是好友，删除friendships记录，更新friends_count

GET /api/follows/following?userId=X&page=1 - 查询关注的人
- 默认查询当前用户，传userId查询他人

GET /api/follows/followers?userId=X&page=1 - 查询粉丝

GET /api/follows/friends?userId=X&page=1 - 查询好友
- 从friendships表查询

GET /api/follows/status/:userId - 查询关系状态
- 返回：{ isFollowing, isFollower, isFriend }

GET /api/follows/recommendations?limit=10 - 推荐关注
- 算法优先级：
  1. 同班级同学
  2. 我关注的人也关注的人（共同关注）
  3. 关注相同标签的用户
  4. 活跃用户（本周发布内容多）

**通知触发：**
- 被关注时："{昵称} 关注了你"
- 成为好友："{昵称} 和你成为了好友"
- 好友发布动态（可选，用户可在设置中开关）

**隐私设置：**
- 谁可以关注我：所有人/仅同班级
- 谁可以看我的好友列表：所有人/仅好友/仅自己
- 好友发布动态时通知我：开/关

**前端页面：**
- /friends - 好友主页（好友/关注/粉丝Tab）
- /friends/leaderboard - 好友排行榜
- /users/:userId - 用户主页

**集成要点：**

关注服务调用：
```javascript
// 关注用户
await followService.follow(followerId, followingId);

// 取消关注
await followService.unfollow(followerId, followingId);

// 获取推荐
await followService.getRecommendations(userId, limit);
```

动态筛选支持：
```javascript
// GET /api/dynamics?filter=all|following|friends
// 全部动态 / 关注的人 / 仅好友
```

用户卡片组件显示：
- 头像、昵称、简介、角色标签
- 统计：本周学习时长、发布内容数
- 关注状态按钮（未关注/已关注/好友）

**推荐算法实现：**

同班级同学：
```sql
SELECT * FROM users
WHERE class_id = (SELECT class_id FROM users WHERE id = ?)
AND id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = ?)
LIMIT 5;
```

共同关注：
```sql
SELECT following_id, COUNT(*) as common_count
FROM user_follows
WHERE follower_id IN (SELECT following_id FROM user_follows WHERE follower_id = ?)
AND following_id != ?
GROUP BY following_id
ORDER BY common_count DESC
LIMIT 5;
```

活跃用户：
```sql
SELECT user_id, COUNT(*) as activity
FROM dynamics
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY user_id
ORDER BY activity DESC
LIMIT 5;
```

---

## 测试清单

开发任何模块时，必须测试以下场景：

- [ ] 发布内容时积分正确增加
- [ ] 点赞/点踩时作者积分正确变化
- [ ] 删除内容时积分正确扣除
- [ ] 每日上限正确生效
- [ ] 积分日志正确记录
- [ ] user_points表正确更新

---

**重要提示：**
- 每次修改功能模块时，必须参考本文档实现积分触发
- 不得遗漏任何触发点
- 积分服务必须集中管理，不得在各模块重复实现
```

---

## 文件2：给CLI的提示词
```
请创建积分系统的配置文档和统一服务：

1. 在项目根目录创建 POINT_SYSTEM.md 文档（内容见上面）

2. 实现统一的 PointService 类
   - 路径：backend/services/pointService.js
   - 包含方法：addPoints、deductPoints、deductPointsOnDelete
   - 检查每日上限逻辑
   - 自动更新user_points表

3. 在所有相关API路由中集成积分触发
   - diaries 路由：创建/点赞/点踩/删除
   - reading-logs 路由：创建/点赞/点踩/删除
   - books 路由：创建
   - homework 路由：创建/评为优秀
   - works 路由：创建/点赞/点踩/Fork/删除
   - game-reviews 路由：创建短评/长评/点赞
   - auth 路由：登录时检查连续登录

4. 数据库初始化
   - 在seed文件中插入所有默认积分规则
   - 规则ID使用D001-D009, R001-R006等格式

5. 修复积分管理页面
   - 确保规则列表正确显示
   - 确保规则启用/禁用开关正常工作

6. 测试验证
   - 发布日记并验证积分增加
   - 删除内容并验证积分扣除
   - 点赞并验证作者和点赞者积分变化

请严格按照 POINT_SYSTEM.md 文档实现所有功能。