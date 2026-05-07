添加新的前端页面

## 用途

按照项目规范添加新的Vue页面。

## 参数

- `name`: 页面名称 (PascalCase，如 NewFeature)
- `path`: 路由路径 (如 /new-feature)
- `module`: 所属模块 (可选，如 textbook, admin)

## 执行步骤

### 1. 创建页面文件

位置: `frontend/src/views/[Module/]Name.vue`

```vue
<template>
  <div class="p-4">
    <n-card title="页面标题">
      <!-- 内容 -->
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
// 从 api/index.js 导入需要的 API
// import { xxxAPI } from '@/api'

const message = useMessage()

// 状态定义
const loading = ref(false)

// 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>
```

### 2. 添加路由

编辑 `frontend/src/router/index.js`，在适当位置添加:

```javascript
{
  path: '/new-feature',
  name: 'NewFeature',
  component: () => import('@/views/NewFeature.vue'),
  meta: { requiresAuth: true, title: '页面标题' }
}
```

### 3. 添加菜单（如需要）

编辑 `frontend/src/config/menuConfig.js` 添加菜单项。

## 注意事项

- 页面中不要直接使用 axios，使用 api/index.js 中的 API 对象
- 复杂逻辑提取到 composables
- 遵循命名规范: [Module][Name].vue
