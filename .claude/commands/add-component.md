添加新的前端组件

## 用途

按照项目规范添加新的Vue组件。

## 参数

- `name`: 组件名称 (PascalCase，如 UserCard)
- `module`: 所属模块目录 (如 textbook, diary, works)

## 执行步骤

### 1. 创建组件文件

位置: `frontend/src/components/[module]/[Module][Name].vue`

```vue
<template>
  <div class="component-name">
    <!-- 组件内容 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props 定义
const props = defineProps({
  // propName: { type: String, required: true }
})

// Emits 定义
const emit = defineEmits(['update', 'delete'])

// 状态
const localState = ref(null)

// 计算属性
const computedValue = computed(() => {
  // ...
})

// 方法
const handleAction = () => {
  emit('update', localState.value)
}
</script>

<style scoped>
.component-name {
  /* 样式 */
}
</style>
```

### 2. 在页面中使用

```vue
<script setup>
import ModuleName from '@/components/module/ModuleName.vue'
</script>

<template>
  <ModuleName :prop="value" @update="handleUpdate" />
</template>
```

## 注意事项

- 组件中 **禁止** 直接调用 API (axios/fetch)
- 数据通过 props 传入，事件通过 emit 传出
- 复杂逻辑使用 composables
- 命名规范: [Module][Name].vue
