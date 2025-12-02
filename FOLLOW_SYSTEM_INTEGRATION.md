# 好友关注系统集成文档

本文档提供好友关注系统的完整集成指南，包括后端已完成部分和前端待实现部分。

## 系统概述

好友关注系统采用**单向关注机制**：
- 用户A可以关注用户B，B不一定关注A
- 当A和B互相关注时，自动建立好友关系
- 任何一方取消关注，好友关系自动解除

### 核心文件

**后端（已完成）**:
- **Schema**: `backend/prisma/schema.prisma` - UserFollow, Friendship 模型
- **Service**: `backend/src/services/followService.js` - 关注/好友管理逻辑
- **Routes**: `backend/src/routes/follows.js` - API接口
- **Documentation**: `POINT_SYSTEM.md` - 好友关注模块规范

**前端（待实现）**:
- `frontend/src/views/Friends.vue` - 好友主页
- `frontend/src/views/FriendsLeaderboard.vue` - 好友排行榜
- `frontend/src/views/UserProfile.vue` - 用户主页
- `frontend/src/components/UserCard.vue` - 用户卡片组件
- `frontend/src/components/FollowButton.vue` - 关注按钮组件

---

## 已完成的后端实现

### 1. 数据库设计 ✅

#### User 模型扩展
在 User 表中添加了统计字段和关系：
```prisma
model User {
  // ... 其他字段

  // 好友关注系统
  followersCount  Int          @default(0) // 粉丝数
  followingCount  Int          @default(0) // 关注数
  friendsCount    Int          @default(0) // 好友数
  followers       UserFollow[] @relation("UserFollowers")
  following       UserFollow[] @relation("UserFollowing")
  friendships1    Friendship[] @relation("User1Friendships")
  friendships2    Friendship[] @relation("User2Friendships")
}
```

#### UserFollow 模型（关注关系表）
```prisma
model UserFollow {
  id          String   @id @default(uuid())
  followerId  String   // 关注者ID（谁关注了）
  follower    User     @relation("UserFollowing", fields: [followerId], references: [id])
  followingId String   // 被关注者ID（被谁关注）
  following   User     @relation("UserFollowers", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
```

#### Friendship 模型（好友关系表）
```prisma
model Friendship {
  id        String   @id @default(uuid())
  userId1   String   // 较小的用户ID
  user1     User     @relation("User1Friendships", fields: [userId1], references: [id])
  userId2   String   // 较大的用户ID
  user2     User     @relation("User2Friendships", fields: [userId2], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId1, userId2])
}
```

### 2. FollowService 服务 ✅

**核心方法**:

- `follow(followerId, followingId)` - 关注用户
  - 防刷检查（不能关注自己，每日上限100次）
  - 创建关注关系
  - 更新统计数
  - 检查互相关注并创建好友关系
  - 返回是否成为好友

- `unfollow(followerId, followingId)` - 取消关注
  - 删除关注关系
  - 更新统计数
  - 如果是好友，解除好友关系
  - 返回是否之前是好友

- `getRelationshipStatus(currentUserId, targetUserId)` - 获取关系状态
  - 返回：`{ isFollowing, isFollower, isFriend }`

- `getFollowing(userId, options)` - 获取关注列表
- `getFollowers(userId, options)` - 获取粉丝列表
- `getFriends(userId, options)` - 获取好友列表

- `getRecommendations(userId, limit)` - 获取推荐关注
  - 优先级1：同班级同学
  - 优先级2：共同关注（我关注的人也关注的人）
  - 优先级3：活跃用户（本周发布内容多）

### 3. API 路由 ✅

#### 关注操作

**POST /api/follows/:userId** - 关注用户
```javascript
// Request
POST /api/follows/user-abc-123
Authorization: Bearer <token>

// Response
{
  "success": true,
  "message": "关注成功" | "关注成功，已成为好友",
  "isFriend": false | true
}
```

**DELETE /api/follows/:userId** - 取消关注
```javascript
// Request
DELETE /api/follows/user-abc-123
Authorization: Bearer <token>

// Response
{
  "success": true,
  "message": "取消关注成功" | "取消关注成功，已解除好友关系",
  "wasFriend": false | true
}
```

#### 查询接口

**GET /api/follows/following?userId=X&page=1&limit=20** - 查询关注的人
```javascript
// Response
{
  "users": [
    {
      "id": "user-id",
      "username": "username",
      "avatar": "url",
      "role": "STUDENT",
      "followersCount": 10,
      "followingCount": 5,
      "friendsCount": 3,
      "profile": {
        "nickname": "昵称",
        "bio": "个人简介"
      }
    }
  ],
  "total": 50,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**GET /api/follows/followers?userId=X&page=1&limit=20** - 查询粉丝

**GET /api/follows/friends?userId=X&page=1&limit=20** - 查询好友

**GET /api/follows/status/:userId** - 查询关系状态
```javascript
// Response
{
  "isFollowing": true,  // 我是否关注了他
  "isFollower": false,  // 他是否关注了我
  "isFriend": false     // 是否是好友
}
```

**GET /api/follows/recommendations?limit=10** - 获取推荐关注
```javascript
// Response
{
  "recommendations": [
    {
      "id": "user-id",
      "username": "username",
      "avatar": "url",
      "role": "STUDENT",
      "followersCount": 10,
      "followingCount": 5,
      "friendsCount": 3,
      "profile": {
        "nickname": "昵称",
        "bio": "个人简介"
      },
      "reason": "同班同学" | "共同关注" | "活跃用户"
    }
  ]
}
```

**GET /api/follows/stats/:userId** - 获取用户统计
```javascript
// Response
{
  "followersCount": 100,
  "followingCount": 50,
  "friendsCount": 30
}
```

---

## 待实现的前端部分

### 1. 好友主页（Friends.vue）

**路由**: `/friends`

**页面结构**:
```vue
<template>
  <div class="friends-page">
    <!-- 顶部统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ friendsCount }}</div>
        <div class="stat-label">我的好友</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ followingCount }}</div>
        <div class="stat-label">我关注的</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ followersCount }}</div>
        <div class="stat-label">关注我的</div>
      </div>
    </div>

    <!-- Tab切换 -->
    <el-tabs v-model="activeTab">
      <el-tab-pane label="我的好友" name="friends">
        <user-card
          v-for="user in friends"
          :key="user.id"
          :user="user"
          :show-stats="true"
          :show-follow-btn="true"
        />
      </el-tab-pane>

      <el-tab-pane label="我关注的" name="following">
        <user-card
          v-for="user in following"
          :key="user.id"
          :user="user"
          :show-stats="true"
          :show-follow-btn="true"
        />
      </el-tab-pane>

      <el-tab-pane label="关注我的" name="followers">
        <user-card
          v-for="user in followers"
          :key="user.id"
          :user="user"
          :show-stats="true"
          :show-follow-btn="true"
        />
      </el-tab-pane>

      <el-tab-pane label="推荐关注" name="recommendations">
        <user-card
          v-for="user in recommendations"
          :key="user.id"
          :user="user"
          :show-stats="true"
          :show-follow-btn="true"
          :reason="user.reason"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      :current-page="page"
      :page-size="limit"
      :total="total"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script>
import axios from '../api/axios';
import UserCard from '../components/UserCard.vue';

export default {
  name: 'Friends',
  components: { UserCard },
  data() {
    return {
      activeTab: 'friends',
      friends: [],
      following: [],
      followers: [],
      recommendations: [],
      friendsCount: 0,
      followingCount: 0,
      followersCount: 0,
      page: 1,
      limit: 20,
      total: 0,
    };
  },
  watch: {
    activeTab(newTab) {
      this.page = 1;
      this.loadData(newTab);
    },
  },
  mounted() {
    this.loadStats();
    this.loadData(this.activeTab);
  },
  methods: {
    async loadStats() {
      try {
        const res = await axios.get('/follows/stats/:userId'); // TODO: 传入当前用户ID
        this.friendsCount = res.data.friendsCount;
        this.followingCount = res.data.followingCount;
        this.followersCount = res.data.followersCount;
      } catch (error) {
        console.error('加载统计失败:', error);
      }
    },
    async loadData(tab) {
      try {
        let url = '';
        switch (tab) {
          case 'friends':
            url = `/follows/friends?page=${this.page}&limit=${this.limit}`;
            break;
          case 'following':
            url = `/follows/following?page=${this.page}&limit=${this.limit}`;
            break;
          case 'followers':
            url = `/follows/followers?page=${this.page}&limit=${this.limit}`;
            break;
          case 'recommendations':
            url = `/follows/recommendations?limit=${this.limit}`;
            break;
        }

        const res = await axios.get(url);

        if (tab === 'recommendations') {
          this.recommendations = res.data.recommendations;
        } else {
          this[tab] = res.data.users;
          this.total = res.data.total;
        }
      } catch (error) {
        console.error('加载列表失败:', error);
      }
    },
    handlePageChange(newPage) {
      this.page = newPage;
      this.loadData(this.activeTab);
    },
  },
};
</script>
```

### 2. 用户卡片组件（UserCard.vue）

**使用场景**: 好友列表、推荐关注、排行榜等

```vue
<template>
  <div class="user-card">
    <!-- 左侧：头像 -->
    <router-link :to="`/users/${user.id}`" class="avatar-link">
      <img :src="user.avatar || '/default-avatar.png'" class="avatar" />
    </router-link>

    <!-- 中间：用户信息 -->
    <div class="user-info">
      <div class="user-name">
        <router-link :to="`/users/${user.id}`" class="name-link">
          {{ user.profile?.nickname || user.username }}
        </router-link>
        <span v-if="user.role === 'TEACHER'" class="role-badge teacher">老师</span>
        <span v-if="user.role === 'STUDENT'" class="role-badge student">学生</span>
      </div>

      <div v-if="user.profile?.bio" class="user-bio">{{ user.profile.bio }}</div>

      <!-- 统计信息 -->
      <div v-if="showStats" class="user-stats">
        <span>粉丝 {{ user.followersCount }}</span>
        <span>关注 {{ user.followingCount }}</span>
        <span>好友 {{ user.friendsCount }}</span>
      </div>

      <!-- 推荐理由 -->
      <div v-if="reason" class="reason-tag">{{ reason }}</div>
    </div>

    <!-- 右侧：关注按钮 -->
    <div v-if="showFollowBtn && user.id !== currentUserId" class="action-area">
      <follow-button :user-id="user.id" @follow-change="$emit('follow-change')" />
    </div>
  </div>
</template>

<script>
import FollowButton from './FollowButton.vue';

export default {
  name: 'UserCard',
  components: { FollowButton },
  props: {
    user: {
      type: Object,
      required: true,
    },
    showStats: {
      type: Boolean,
      default: true,
    },
    showFollowBtn: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  computed: {
    currentUserId() {
      return this.$store.state.user?.id; // 从Vuex获取当前用户ID
    },
  },
};
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: box-shadow 0.3s;
}

.user-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.name-link {
  text-decoration: none;
  color: #111827;
}

.name-link:hover {
  color: #3b82f6;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.teacher {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.student {
  background: #dbeafe;
  color: #1e40af;
}

.user-bio {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 8px;
}

.user-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.reason-tag {
  display: inline-block;
  padding: 4px 8px;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 8px;
}
</style>
```

### 3. 关注按钮组件（FollowButton.vue）

```vue
<template>
  <button
    :class="['follow-btn', buttonClass]"
    :disabled="loading"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    {{ buttonText }}
  </button>
</template>

<script>
import axios from '../api/axios';

export default {
  name: 'FollowButton',
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      status: {
        isFollowing: false,
        isFollower: false,
        isFriend: false,
      },
      isHovering: false,
    };
  },
  computed: {
    buttonText() {
      if (this.loading) return '处理中...';

      if (this.status.isFriend) {
        return this.isHovering ? '取消关注' : '好友';
      }

      if (this.status.isFollowing) {
        return this.isHovering ? '取消关注' : '已关注';
      }

      return '关注';
    },
    buttonClass() {
      if (this.status.isFriend) {
        return this.isHovering ? 'unfollow-danger' : 'friend';
      }

      if (this.status.isFollowing) {
        return this.isHovering ? 'unfollow-danger' : 'following';
      }

      return 'follow-primary';
    },
  },
  mounted() {
    this.loadStatus();
  },
  methods: {
    async loadStatus() {
      try {
        const res = await axios.get(`/follows/status/${this.userId}`);
        this.status = res.data;
      } catch (error) {
        console.error('加载关注状态失败:', error);
      }
    },
    async handleClick() {
      if (this.loading) return;

      this.loading = true;

      try {
        if (this.status.isFollowing) {
          // 取消关注
          await axios.delete(`/follows/${this.userId}`);
          this.$message.success('取消关注成功');
        } else {
          // 关注
          const res = await axios.post(`/follows/${this.userId}`);
          this.$message.success(res.data.message);
        }

        await this.loadStatus();
        this.$emit('follow-change');
      } catch (error) {
        this.$message.error(error.response?.data?.error || '操作失败');
      } finally {
        this.loading = false;
      }
    },
    handleMouseEnter() {
      if (this.status.isFollowing || this.status.isFriend) {
        this.isHovering = true;
      }
    },
    handleMouseLeave() {
      this.isHovering = false;
    },
  },
};
</script>

<style scoped>
.follow-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.follow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.follow-primary {
  background: #3b82f6;
  color: white;
}

.follow-primary:hover {
  background: #2563eb;
}

.following {
  background: #e5e7eb;
  color: #6b7280;
}

.friend {
  background: #10b981;
  color: white;
}

.unfollow-danger {
  background: #ef4444;
  color: white;
}
</style>
```

### 4. 用户主页（UserProfile.vue）

**路由**: `/users/:userId`

**主要功能**:
- 显示用户基本信息（头像、昵称、简介）
- 显示关注按钮和关系标签（好友/已关注/粉丝）
- 统计信息：作品数、日记数、学习时长、积分
- Tab区域：
  - 动态（该用户的公开动态）
  - 作品
  - 成就墙
  - 好友列表

### 5. 好友排行榜（FriendsLeaderboard.vue）

**路由**: `/friends/leaderboard`

**功能**:
- Tab切换：本周学习时长排行、本月积分排行、本周发布内容数排行
- 筛选：全部用户 / 仅好友
- 显示排名、头像、昵称、数据、超越百分比
- 我的排名高亮显示

---

## 集成要点

### 1. 动态筛选功能

在首页动态（Home.vue）中添加筛选Tab：

```vue
<el-tabs v-model="dynamicFilter">
  <el-tab-pane label="全部动态" name="all" />
  <el-tab-pane label="关注的人" name="following" />
  <el-tab-pane label="好友动态" name="friends" />
  <el-tab-pane label="我的动态" name="mine" />
</el-tabs>
```

后端API需要支持：
```javascript
// GET /api/dynamics?filter=all|following|friends|mine
// 在 dynamics路由中添加筛选逻辑
```

### 2. 通知集成

在 `followService.js` 的 `follow()` 方法中添加通知：

```javascript
// 在关注成功后
const notificationService = require('./notificationService');

if (isFriend) {
  // 双方都发送好友通知
  await notificationService.create({
    type: 'friend',
    fromUserId: followerId,
    toUserId: followingId,
    content: `{昵称} 和你成为了好友`,
    link: `/users/${followerId}`,
  });
} else {
  // 发送关注通知
  await notificationService.create({
    type: 'follow',
    fromUserId: followerId,
    toUserId: followingId,
    content: `{昵称} 关注了你`,
    link: `/users/${followerId}`,
  });
}
```

### 3. 成就集成

已在 `follows.js` 路由中集成：

```javascript
achievementService.checkAchievements(followingId, 'follower_gained', {});
```

需要在成就种子数据中添加相关成就（如果还没有）：
- FOLLOWER_10: 获得10个粉丝
- FOLLOWER_100: 获得100个粉丝
- POPULAR_USER: 获得1000个粉丝

### 4. 防刷机制

已在 `FollowService` 中实现：
- ✅ 不能关注自己
- ✅ 每日关注上限100次
- 建议前端添加：
  - 关注按钮防抖（1秒内只能点击1次）
  - 快速取消关注后再关注需要冷却（可选）

---

## 部署步骤

### 1. 运行数据库迁移

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add_follow_system
# 或使用
npx prisma db push
```

### 2. 重启后端服务

```bash
npm run dev
```

### 3. 测试API

使用Postman或curl测试：

```bash
# 关注用户
curl -X POST http://localhost:3000/api/follows/user-id \
  -H "Authorization: Bearer <token>"

# 查询关系状态
curl http://localhost:3000/api/follows/status/user-id \
  -H "Authorization: Bearer <token>"

# 获取推荐
curl http://localhost:3000/api/follows/recommendations?limit=10 \
  -H "Authorization: Bearer <token>"
```

---

## 测试清单

### 后端测试

- [x] 数据库迁移成功
- [ ] 关注用户成功
- [ ] 取消关注成功
- [ ] 互相关注自动成为好友
- [ ] 取消关注解除好友关系
- [ ] 统计数更新正确
- [ ] 每日关注上限生效
- [ ] 不能关注自己
- [ ] 防重复关注
- [ ] 推荐算法返回正确结果

### 前端测试

- [ ] 好友页面正常显示
- [ ] Tab切换正常
- [ ] 关注按钮状态正确
- [ ] 关注/取消关注操作成功
- [ ] 好友标签正确显示
- [ ] 用户卡片正常显示
- [ ] 分页功能正常
- [ ] 推荐关注显示正确
- [ ] 用户主页显示正确
- [ ] 动态筛选功能正常

---

## 扩展功能（可选）

### 1. 隐私设置

在用户设置中添加：
- 谁可以关注我：所有人/仅同班级
- 谁可以看我的好友列表：所有人/仅好友/仅自己
- 好友发布动态时通知我：开/关

在 Profile 表中添加字段：
```prisma
model Profile {
  // ... 其他字段

  whoCanFollow      String  @default("all") // all / classmate
  friendListVisibility String @default("all") // all / friends / private
  notifyOnFriendPost Boolean @default(true)
}
```

### 2. 黑名单功能

添加 UserBlock 表：
```prisma
model UserBlock {
  id        String   @id @default(uuid())
  userId    String   // 谁拉黑了
  blockedId String   // 被拉黑的人
  createdAt DateTime @default(now())

  @@unique([userId, blockedId])
}
```

### 3. 关注分组

允许用户将关注的人分组（如：同学、老师、朋友等）

### 4. 好友动态通知

当好友发布新动态时，给已开启通知的用户发送通知。

---

## 注意事项

1. **关系一致性**：取消关注时必须同步解除好友关系
2. **统计准确性**：所有关注/取消关注操作必须正确更新统计字段
3. **性能优化**：推荐算法可能需要缓存，避免频繁查询
4. **隐私保护**：根据用户设置控制好友列表的可见性
5. **通知频率**：避免过多通知打扰用户

---

**后端已完全实现，前端可以立即开始对接API！** 🚀
