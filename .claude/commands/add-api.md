添加新 API 的标准流程

## 步骤

### 1. 数据库模型（如需要）

编辑 `backend/prisma/schema.prisma` 添加新模型：

```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  // ... 其他字段
}
```

然后执行 `/db-migrate`

### 2. 创建后端路由

创建 `backend/src/routes/{name}.js`：

```javascript
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');  // 必须使用单例！
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const data = await prisma.newModel.findMany();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### 3. 注册路由

编辑 `backend/src/index.js`，添加：

```javascript
const newRoutes = require('./routes/{name}');
app.use('/api/{name}', newRoutes);
```

### 4. 添加前端 API

编辑 `frontend/src/api/index.js`，添加：

```javascript
export const newAPI = {
  getList: (params) => api.get('/{name}', { params }),
  create: (data) => api.post('/{name}', data),
  update: (id, data) => api.put(`/{name}/${id}`, data),
  delete: (id) => api.delete(`/{name}/${id}`),
};
```

### 5. 重启验证

执行 `/restart` 并测试 API

## 响应格式

```javascript
// 成功
{ success: true, data: {...}, message: "操作成功" }

// 失败
{ success: false, error: "错误信息" }
```
