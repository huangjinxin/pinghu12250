# 用户数据导入说明

本目录包含用户数据的导入脚本和数据文件，用于快速部署和初始化用户数据。

## 文件说明

- `user-data.json` - 导出的用户数据（包含用户、好友关系、消息等）
- `seed-users.js` - 用户数据导入脚本

## 数据内容

### 包含的数据：

1. **用户账号（30个）**
   - 包含测试用户和真实用户数据
   - 密码已加密存储
   - 包含用户配置和头像

2. **好友关系（18条）**
   - 用户之间的好友关系
   - 支持聊天功能

3. **关注关系（52条）**
   - 用户之间的关注/粉丝关系
   - 支持动态推送

4. **聊天消息（最近100条）**
   - 用户间的聊天记录
   - 包含消息状态（已读/未读）

5. **系统消息（最近50条）**
   - 成就通知
   - 好友通知
   - 关注通知
   - 任务通知

## 使用方法

### 导入用户数据

在后端项目根目录运行：

```bash
# 方式1：使用 npm script（推荐）
npm run seed:users

# 方式2：直接运行脚本
node prisma/seed-users.js

# 方式3：在 Docker 容器中运行
docker exec children-growth-backend node prisma/seed-users.js
```

### 导出新数据

如果需要重新导出当前数据库的用户数据：

```bash
# 1. 使用导出脚本（需要先创建）
node scripts/export-user-data.js

# 2. 导出的数据会保存到 prisma/user-data.json
```

## 测试账号

导入后可用的测试账号：

1. **chattest1**
   - 用户名: `chattest1`
   - 密码: `Test123456`
   - 用途: 聊天功能测试

2. **chattest2**
   - 用户名: `chattest2`
   - 密码: `Test123456`
   - 用途: 聊天功能测试

## 注意事项

1. **幂等性**: 脚本支持重复运行，已存在的用户会自动跳过
2. **数据冲突**: 如果用户ID冲突，该用户及其相关数据会被跳过
3. **密码安全**: 导出的密码是已加密的 bcrypt hash，安全可靠
4. **生产环境**: 建议在生产环境使用前清理敏感的测试数据

## 集成到主 seed 脚本

可以在 `prisma/seed.js` 中导入用户数据：

```javascript
const { execSync } = require('child_process');

async function main() {
  // ... 其他 seed 逻辑 ...

  // 导入用户数据
  console.log('导入用户数据...');
  execSync('node prisma/seed-users.js', { stdio: 'inherit' });
}
```

## 数据更新

建议定期更新用户数据：

1. 在开发环境测试新功能后导出数据
2. 更新 `user-data.json` 文件
3. 提交到 Git 版本控制
4. 部署时运行导入脚本

---

最后更新时间: 2025-12-03
数据版本: v1.0
