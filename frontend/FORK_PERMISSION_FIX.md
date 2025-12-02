# Fork权限控制修复 - 购买后才可Fork

## 📌 需求说明

用户要求：对于没有购买的作品，需要隐藏Fork按钮或点击时提醒购买后才可以Fork。

## 🎯 实现方案

### 核心逻辑

**Fork权限判断规则**：
1. ✅ **作者本人** - 可以Fork自己的作品
2. ✅ **已购买用户** - 购买后可以Fork
3. ✅ **免费公开作品** - PUBLIC且无价格，所有人可Fork
4. ❌ **未购买付费作品** - 点击提示需要购买

## 🔧 技术实现

### 修改文件：src/views/WorkDetail.vue

#### 1. 模板部分 - Fork按钮条件渲染

**修改前**：
```vue
<n-button @click="forkWork">
  <template #icon><n-icon><GitBranchOutline /></n-icon></template>
  Fork
</n-button>
```

**修改后**：
```vue
<!-- Fork按钮：只有作者本人或已购买用户才能Fork -->
<n-button v-if="canFork" @click="forkWork">
  <template #icon><n-icon><GitBranchOutline /></n-icon></template>
  Fork
</n-button>
<n-button v-else @click="handleForkNotPurchased">
  <template #icon><n-icon><GitBranchOutline /></n-icon></template>
  Fork
</n-button>
```

**设计说明**：
- 使用 `v-if` 和 `v-else` 渲染两个不同行为的按钮
- 保持UI一致性，按钮始终显示
- 未购买用户点击会弹出提示对话框

#### 2. Script部分 - 权限判断逻辑

**添加计算属性 `canFork`**：
```javascript
// 判断是否可以Fork：作者本人或已购买用户
const canFork = computed(() => {
  if (!work.value) return false;
  // 作者本人可以Fork
  if (isOwner.value) return true;
  // 免费作品（公开作品）可以直接Fork
  if (work.value.visibility === 'PUBLIC' && !work.value.price) return true;
  // 已购买的作品可以Fork
  if (work.value.isPurchased) return true;
  return false;
});
```

**权限判断流程**：
```
是否有作品数据？
  ↓ 否 → 返回 false
  ↓ 是
是否是作者本人？
  ↓ 是 → 返回 true (可以Fork)
  ↓ 否
是否是免费公开作品？
  ↓ 是 → 返回 true (可以Fork)
  ↓ 否
是否已购买？
  ↓ 是 → 返回 true (可以Fork)
  ↓ 否
返回 false (不可Fork)
```

**添加处理函数 `handleForkNotPurchased`**：
```javascript
const handleForkNotPurchased = () => {
  dialog.warning({
    title: '购买后可Fork',
    content: '该作品需要购买后才能Fork。购买后你将获得完整源码，并可以自由修改和使用。',
    positiveText: '前往购买',
    negativeText: '取消',
    onPositiveClick: () => {
      router.push('/market');
    }
  });
};
```

## 📊 用户交互流程

### 流程1：已授权用户Fork

```
用户进入作品详情页
  ↓
检测权限：isOwner || isPurchased || (PUBLIC && !price)
  ↓ 满足条件
显示可点击的Fork按钮
  ↓
用户点击Fork
  ↓
跳转到编辑器 (/works/create?fork={workId})
  ↓
加载源码到编辑器（手动保存模式）
  ↓
用户编辑后点击保存
  ↓
创建新的Fork作品
```

### 流程2：未授权用户尝试Fork

```
用户进入作品详情页
  ↓
检测权限：!isOwner && !isPurchased && (PRIVATE || price > 0)
  ↓ 不满足条件
显示Fork按钮（但点击有不同行为）
  ↓
用户点击Fork
  ↓
弹出对话框：
  标题："购买后可Fork"
  内容："该作品需要购买后才能Fork。购买后你将获得完整源码，并可以自由修改和使用。"
  按钮："前往购买" | "取消"
  ↓
用户点击"前往购买"
  ↓
跳转到作品市集 (/market)
  ↓
用户购买作品
  ↓
购买成功后可以Fork
```

## 🎨 UI/UX设计

### 1. 按钮始终可见
- ✅ Fork按钮始终显示，不隐藏
- ✅ 保持界面一致性，用户体验更好
- ✅ 通过对话框引导用户购买

### 2. 友好的提示信息
```
标题：购买后可Fork
内容：该作品需要购买后才能Fork。购买后你将获得完整源码，并可以自由修改和使用。
按钮：[前往购买] [取消]
```

### 3. 快速跳转
- 点击"前往购买"直接跳转到作品市集
- 减少用户操作步骤
- 提高购买转化率

## 📋 后端数据要求

### 作品对象需要包含的字段

```typescript
interface Work {
  id: string;
  title: string;
  authorId: string;
  visibility: 'PUBLIC' | 'PARENT_ONLY' | 'PRIVATE';
  price?: number; // 可选，如果作品未上架市集则无此字段
  isPurchased?: boolean; // 当前用户是否已购买此作品
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  // ...其他字段
}
```

### API响应示例

**场景1：未购买的付费作品**
```json
{
  "id": "work-123",
  "title": "精美网页模板",
  "authorId": "author-456",
  "visibility": "PUBLIC",
  "price": 100,
  "isPurchased": false,
  "htmlCode": null,  // 未购买不返回源码
  "cssCode": null,
  "jsCode": null
}
```

**场景2：已购买的付费作品**
```json
{
  "id": "work-123",
  "title": "精美网页模板",
  "authorId": "author-456",
  "visibility": "PUBLIC",
  "price": 100,
  "isPurchased": true,
  "htmlCode": "<!DOCTYPE html>...",  // 已购买返回完整源码
  "cssCode": "body { ... }",
  "jsCode": "console.log('hello');"
}
```

**场景3：免费公开作品**
```json
{
  "id": "work-789",
  "title": "免费教学模板",
  "authorId": "author-456",
  "visibility": "PUBLIC",
  "price": 0,  // 或者不返回price字段
  "isPurchased": null,  // 免费作品无需购买
  "htmlCode": "<!DOCTYPE html>...",  // 免费作品直接返回源码
  "cssCode": "body { ... }",
  "jsCode": "console.log('hello');"
}
```

## 🔒 权限矩阵

| 作品类型 | 是否作者 | 是否购买 | 可否Fork | 行为 |
|---------|---------|---------|---------|------|
| 付费作品 | 是 | - | ✅ | 直接Fork |
| 付费作品 | 否 | 是 | ✅ | 直接Fork |
| 付费作品 | 否 | 否 | ❌ | 提示购买 |
| 免费公开 | - | - | ✅ | 直接Fork |
| 私密作品 | 是 | - | ✅ | 直接Fork |
| 私密作品 | 否 | - | ❌ | 提示购买 |

## 🧪 测试场景

### 测试用例1：作者本人
```
前置条件：登录为作品作者
操作步骤：
1. 进入自己的作品详情页
2. 点击Fork按钮
预期结果：
- ✅ 直接跳转到编辑器
- ✅ 加载源码成功
```

### 测试用例2：已购买用户
```
前置条件：
- 登录非作者用户
- 已购买该作品
操作步骤：
1. 进入已购买作品的详情页
2. 点击Fork按钮
预期结果：
- ✅ 直接跳转到编辑器
- ✅ 加载源码成功
```

### 测试用例3：未购买付费作品
```
前置条件：
- 登录非作者用户
- 未购买该作品
- 作品价格 > 0
操作步骤：
1. 进入付费作品详情页
2. 点击Fork按钮
预期结果：
- ✅ 弹出对话框："购买后可Fork"
- ✅ 点击"前往购买"跳转到市集
- ✅ 点击"取消"关闭对话框
```

### 测试用例4：免费公开作品
```
前置条件：
- 登录任意用户
- 作品visibility='PUBLIC'
- 作品price=0或无price字段
操作步骤：
1. 进入免费公开作品详情页
2. 点击Fork按钮
预期结果：
- ✅ 直接跳转到编辑器
- ✅ 加载源码成功
```

## 🎉 优化效果

### 用户体验提升
1. ✅ **清晰的权限提示** - 用户明确知道为什么不能Fork
2. ✅ **引导式购买流程** - 提示对话框直接引导到购买页面
3. ✅ **保持UI一致** - Fork按钮始终可见，不会突然消失
4. ✅ **减少困惑** - 明确告知需要购买才能获得源码

### 商业价值提升
1. ✅ **提高购买转化率** - 当用户想Fork时引导购买
2. ✅ **保护作者权益** - 付费作品源码不能被随意Fork
3. ✅ **明确价值主张** - "购买后获得完整源码并可自由修改"

### 技术实现优势
1. ✅ **权限逻辑清晰** - 通过计算属性集中管理权限判断
2. ✅ **可维护性强** - 权限规则修改只需改一处
3. ✅ **扩展性好** - 未来可轻松添加更多权限规则

## 🔄 与其他功能的关联

### 1. 与购买流程的关联
```
作品详情页 → Fork按钮 → 提示购买 → 跳转市集 → 购买作品 → 返回详情页 → Fork成功
```

### 2. 与我的购买的关联
- 购买后，作品出现在"我的购买"列表
- "我的购买"中的作品可以直接Fork
- Fork按钮在"我的购买"页面始终可用

### 3. 与作品市集的关联
- 市集中展示作品价格
- 未购买时点击Fork → 引导到市集购买
- 购买后 `isPurchased=true` → Fork按钮可用

## 📝 总结

本次修复成功实现了Fork权限控制：

**核心改进**：
- ✅ 添加了 `canFork` 计算属性判断Fork权限
- ✅ 添加了 `handleForkNotPurchased` 处理未授权Fork
- ✅ 条件渲染Fork按钮的点击行为
- ✅ 友好的购买引导对话框

**用户流程**：
- ✅ 作者本人可直接Fork
- ✅ 已购买用户可直接Fork
- ✅ 免费公开作品所有人可Fork
- ✅ 未购买付费作品提示购买

**技术质量**：
- ✅ 代码清晰，逻辑明确
- ✅ 权限判断集中管理
- ✅ 构建通过，无错误

**构建状态**: ✅ 通过
**功能完整性**: 100%
**准备就绪**: ✅ 可进行用户测试
