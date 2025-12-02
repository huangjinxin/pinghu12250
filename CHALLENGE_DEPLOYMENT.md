# 每日挑战系统部署指南

## 已完成内容

### 后端
✅ 数据库 Schema（Prisma）
✅ 虚拟货币服务（WalletService）
✅ 挑战服务（ChallengeService）
✅ 挑战路由（/api/challenges）
✅ 定时任务（每日0点生成挑战）
✅ 日记模块集成
✅ 学习追踪模块集成

### 前端
✅ 挑战页面组件（Challenges.vue）

### 文档
✅ POINT_SYSTEM.md 更新
✅ 挑战模板种子数据
✅ 集成说明文档（CHALLENGE_INTEGRATION.md）

## 部署步骤

### 步骤1：安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖（如果需要）
cd ../frontend
npm install
```

### 步骤2：运行数据库迁移

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name add_challenges_and_wallet

# 如果上面的命令失败，手动应用 schema
npx prisma db push
```

### 步骤3：运行种子数据

```bash
cd backend

# 运行挑战模板种子数据
node scripts/seed-challenges.js

# 如果需要，也可以运行主种子脚本
npm run prisma:seed
```

### 步骤4：配置前端路由

编辑 `frontend/src/router/index.js`（或相应的路由文件），添加挑战路由：

```javascript
{
  path: '/challenges',
  name: 'Challenges',
  component: () => import('@/views/Challenges.vue'),
  meta: { requiresAuth: true }
}
```

### 步骤5：添加导航菜单

编辑 `frontend/src/views/Layout.vue` 或导航组件，添加挑战入口：

```vue
<router-link to="/challenges" class="nav-item">
  <span class="icon">🎯</span>
  <span>每日挑战</span>
</router-link>
```

### 步骤6：在首页添加挑战摘要（可选）

编辑 `frontend/src/views/Home.vue`，添加挑战摘要卡片：

```vue
<template>
  <!-- 在首页顶部添加 -->
  <div class="challenge-banner" v-if="todayChallenges">
    <div class="banner-icon">🎯</div>
    <div class="banner-content">
      <div class="banner-title">今日挑战</div>
      <div class="banner-desc">
        {{ completedCount }}/3 已完成
      </div>
    </div>
    <button @click="$router.push('/challenges')" class="banner-btn">
      查看详情
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      todayChallenges: null,
    };
  },
  computed: {
    completedCount() {
      if (!this.todayChallenges) return 0;
      return this.todayChallenges.filter(c => c.record.status === 'COMPLETED').length;
    },
  },
  mounted() {
    this.loadTodaysChallenges();
  },
  methods: {
    async loadTodaysChallenges() {
      try {
        const response = await this.$axios.get('/challenges/today');
        this.todayChallenges = response.data.challenges;
      } catch (error) {
        console.error('加载挑战失败:', error);
      }
    },
  },
};
</script>
```

### 步骤7：集成其他模块的挑战检查

参考 `CHALLENGE_INTEGRATION.md` 文档，在以下模块添加挑战检查：

1. **HTML作品模块** (`backend/src/routes/htmlWork.js`)
2. **阅读记录模块** (`backend/src/routes/readingNote.js` 或 `book.js`)
3. **社交互动模块** - 所有点赞和评论接口

每个模块添加的代码示例：

```javascript
// 1. 导入服务
const challengeService = require('../services/challengeService');

// 2. 在相应操作后调用
challengeService.checkAndUpdateProgress(req.user.id, 'action_type', {
  count: 1,
  wordCount: contentLength,  // 如果适用
  duration: minutes,         // 如果适用
});
```

### 步骤8：启动服务

```bash
# 启动后端
cd backend
npm run dev

# 启动前端（新终端）
cd frontend
npm run dev
```

### 步骤9：测试功能

#### 测试清单

- [ ] 访问 `/challenges` 页面，查看今日挑战
- [ ] 创建一篇日记，检查挑战进度是否更新
- [ ] 完成学习计时，检查挑战进度是否更新
- [ ] 完成挑战后，领取奖励
- [ ] 检查积分和金币是否正确增加
- [ ] 连续3天完成所有挑战，检查连续奖励
- [ ] 查看历史挑战记录
- [ ] 测试管理员接口（创建/编辑挑战模板）

## API 测试示例

### 获取今日挑战
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/challenges/today
```

### 领取奖励
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/challenges/RECORD_ID/claim
```

### 手动生成今日挑战（管理员）
```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/api/challenges/admin/generate
```

## 常见问题

### 1. Prisma 迁移失败

如果 `prisma migrate` 失败，可以使用：
```bash
npx prisma db push
npx prisma generate
```

### 2. 挑战模板不存在

确保运行了种子脚本：
```bash
node backend/scripts/seed-challenges.js
```

### 3. 定时任务不工作

检查后端日志，确保看到：
```
⏰ 定时任务已启动: 每天0点生成挑战
✓ 今日挑战已就绪
```

### 4. 挑战进度不更新

确保在相应模块调用了 `challengeService.checkAndUpdateProgress()`。

### 5. 前端页面样式问题

确保项目使用 Tailwind CSS 或添加必要的 CSS。

## 性能优化建议

1. **数据库索引**：已在 Schema 中配置
2. **缓存**：可以考虑缓存今日挑战数据
3. **异步检查**：挑战进度检查是异步的，不会阻塞主流程

## 扩展功能建议

1. **推送通知**：挑战完成时发送通知
2. **每周挑战**：添加每周特殊挑战
3. **挑战排行榜**：展示完成挑战最多的用户
4. **成就系统**：基于挑战完成情况的成就徽章
5. **挑战商店**：用金币购买道具或特权

## 监控和日志

关键日志点：
- 定时任务执行：`⏰ 开始生成今日挑战...`
- 挑战生成成功：`✓ 生成今日挑战: YYYY-MM-DD`
- 进度更新：`✓ 更新挑战进度: 标题 - 进度/目标`

## 备份和恢复

定期备份：
- 挑战模板表（`ChallengeTemplate`）
- 每日挑战表（`DailyChallenge`）
- 用户挑战记录（`UserChallengeRecord`）

## 安全注意事项

1. 验证用户权限（所有接口都需要认证）
2. 防止作弊（检查挑战状态和时间）
3. 管理员接口需要额外权限检查
4. 限制领取奖励的频率

## 联系和支持

如有问题，请参考：
- `POINT_SYSTEM.md` - 积分规则
- `CHALLENGE_INTEGRATION.md` - 集成说明
- 项目 Issues

祝部署顺利！🎉
