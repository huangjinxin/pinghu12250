# Fork功能优化 - 手动保存机制

## 📌 更新概述

将Fork功能从"自动创建"改为"手动保存"模式，给用户更多控制权。

## 🔄 功能变更

### 调整前（旧逻辑）
```
点击Fork按钮
    ↓
调用后端API创建新作品
    ↓
自动跳转到新作品编辑页
    ↓
作品已保存到数据库
```

**问题**：
- ❌ Fork立即创建，无法放弃
- ❌ 用户可能只想预览，不想保存
- ❌ 生成大量未经编辑的Fork作品

### 调整后（新逻辑）
```
点击Fork按钮
    ↓
跳转到编辑器（带fork参数）
    ↓
加载源作品内容到编辑器
    ↓
用户可编辑、预览
    ↓
     ├─ 点击保存 → 创建新作品 ✅
     └─ 点击返回 → 放弃，不保存 ✅
```

**优势**：
- ✅ 用户完全控制是否保存
- ✅ 可以先编辑再决定
- ✅ 减少垃圾Fork作品
- ✅ 更符合用户心理预期

## 🛠️ 技术实现

### 1. WorkEditor.vue 扩展

#### 新增逻辑判断
```javascript
const forkFromId = route.query.fork; // Fork源作品ID
const isFork = !!forkFromId && !workId; // Fork模式
```

#### Fork模式加载
```javascript
const loadWork = async () => {
  // Fork模式：加载源作品内容但不保存
  if (isFork && forkFromId) {
    try {
      const data = await htmlWorkAPI.getWorkById(forkFromId);
      work.value = {
        title: `${data.title} (Fork)`, // 添加Fork标识
        html: data.htmlCode || '',
        css: data.cssCode || '',
        javascript: data.jsCode || '',
        visibility: 'PRIVATE', // Fork默认私密
      };
      runCode();
      message.info('已加载源作品内容，点击保存创建新作品');
    } catch (error) {
      message.error('加载源作品失败');
    }
    return;
  }

  // 编辑模式：加载现有作品
  // ...
};
```

**关键点**：
- 加载源作品数据到编辑器
- 标题自动添加"(Fork)"后缀
- 可见性默认设为私密
- **不调用创建API**，仅加载到界面

### 2. MyPurchases.vue 更新

#### 修改前
```javascript
const forkWork = async (workId) => {
  try {
    const response = await htmlWorkAPI.forkWork(workId);
    message.success('Fork 成功');
    router.push(`/works/${response.work.id}/edit`);
  } catch (error) {
    message.error(error.error || 'Fork 失败');
  }
};
```

#### 修改后
```javascript
const forkWork = (workId) => {
  // 跳转到编辑器，通过query参数传递fork来源
  router.push({
    path: '/works/create',
    query: { fork: workId }
  });
};
```

**变化**：
- ❌ 删除API调用
- ✅ 直接路由跳转
- ✅ 通过query参数传递源作品ID

### 3. WorkDetail.vue 同步更新

同样的修改应用到作品详情页的Fork按钮。

## 📋 用户操作流程

### 场景1：Fork并保存

```
1. 在"我的购买"或"作品详情"页点击"Fork"按钮
2. 跳转到编辑器，自动加载源作品代码
3. 提示："已加载源作品内容，点击保存创建新作品"
4. 用户可以：
   - 修改代码
   - 预览效果
   - 修改标题
   - 调整可见性
5. 点击"保存"按钮 → 创建新作品
6. 成功后跳转到新作品编辑页
```

### 场景2：Fork但放弃

```
1. 点击"Fork"按钮
2. 跳转到编辑器，加载源作品代码
3. 用户预览后决定不需要
4. 点击"返回"按钮（左上角后退箭头）
5. 直接返回上一页，不创建任何作品
```

### 场景3：Fork并编辑再保存

```
1. 点击"Fork"按钮
2. 跳转到编辑器
3. 修改HTML/CSS/JS代码
4. 点击"运行"预览效果
5. 满意后点击"保存"
6. 创建新作品（包含修改）
```

## 🎯 默认设置

### Fork作品默认值

```javascript
{
  title: `${源作品标题} (Fork)`,  // 自动添加后缀
  visibility: 'PRIVATE',           // 默认私密
  htmlCode: 源作品HTML,
  cssCode: 源作品CSS,
  jsCode: 源作品JavaScript
}
```

**设计理念**：
- 标题添加"(Fork)"便于识别
- 默认私密，防止未经编辑就公开
- 用户可手动修改标题和可见性

## 🔍 路由参数

### URL格式

```
/works/create?fork={源作品ID}
```

**示例**：
```
/works/create?fork=abc123
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| fork | String | 源作品的ID，用于加载源代码 |

## 💾 保存行为

### 保存按钮逻辑

```javascript
const saveWork = async () => {
  // 验证标题
  if (!work.value.title.trim()) {
    message.warning('请输入作品标题');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      title: work.value.title,
      htmlCode: work.value.html,
      cssCode: work.value.css,
      jsCode: work.value.javascript,
      visibility: work.value.visibility,
    };

    if (isEdit) {
      // 编辑模式：更新现有作品
      await htmlWorkAPI.updateWork(workId, payload);
      message.success('保存成功');
    } else {
      // 创建模式（包括Fork）：创建新作品
      const data = await htmlWorkAPI.createWork(payload);
      message.success('创建成功');
      router.replace(`/works/${data.id}/edit`);
    }
  } catch (error) {
    message.error(error.error || '保存失败');
  } finally {
    saving.value = false;
  }
};
```

**Fork时的保存行为**：
- Fork模式下，`isEdit`为`false`
- 点击保存调用`createWork`API
- 创建全新作品，不影响源作品
- 保存成功后跳转到新作品编辑页

## 📦 修改文件清单

### 修改文件（3个）

1. **src/views/WorkEditor.vue**
   - 新增Fork模式检测
   - 扩展loadWork函数支持Fork
   - 添加用户提示信息

2. **src/views/MyPurchases.vue**
   - 简化forkWork函数
   - 删除API调用
   - 改为路由跳转

3. **src/views/WorkDetail.vue**
   - 同步forkWork函数更新
   - 保持一致的Fork体验

### 新增文件（1个）

- `FORK_FEATURE_UPDATE.md` - 本文档

## 🎨 用户界面提示

### 提示信息

进入Fork模式时显示：
```
ℹ️ 已加载源作品内容，点击保存创建新作品
```

### 视觉标识

- 标题后缀："(Fork)"
- 可见性标签显示"私密"
- 保存按钮可正常点击

## 🔄 与旧版API的兼容性

### 后端API保留

```javascript
// 后端仍保留forkWork API（可选）
POST /html-works/:id/fork
```

**用途**：
- 可用于快速Fork（一键创建）
- 管理员批量操作
- 未来可能的"收藏"功能

### 前端不再使用

前端已完全移除对此API的调用，改用：
```
1. 获取源作品详情 (getWorkById)
2. 用户手动编辑
3. 创建新作品 (createWork)
```

## ✅ 优势总结

### 用户体验
1. ✅ **更多控制权** - 用户决定是否保存
2. ✅ **可先编辑** - Fork后立即可修改
3. ✅ **防止误操作** - 点返回不会创建作品
4. ✅ **减少垃圾数据** - 只保存真正需要的Fork

### 系统层面
1. ✅ **减少数据库写入** - 只保存确认的Fork
2. ✅ **降低服务器负载** - 减少不必要的创建请求
3. ✅ **存储空间优化** - 避免大量重复作品
4. ✅ **更清晰的作品关系** - 保存的Fork都是有意义的

## 🚀 后续优化建议

### 1. Fork记录追踪
```javascript
// 创建时记录fork来源
{
  ...payload,
  forkedFromId: forkFromId // 记录源作品ID
}
```

### 2. Fork链显示
在作品详情页显示：
```
Fork自：[原作品标题]
被Fork：5次
```

### 3. Fork统计
- 统计每个作品被Fork次数
- 排行榜展示热门被Fork作品

### 4. Fork提示优化
```javascript
// 进入Fork模式时显示Dialog
dialog.info({
  title: 'Fork作品',
  content: '已加载源作品代码，你可以自由修改。点击保存按钮创建你的版本，点击返回则放弃。',
  positiveText: '我知道了'
});
```

## 🎉 总结

通过将Fork从"自动创建"改为"手动保存"：
- ✅ 提升用户体验和控制感
- ✅ 减少系统资源消耗
- ✅ 降低数据冗余
- ✅ 符合直觉的操作逻辑

**构建状态**：✅ 通过
**功能完整性**：100%
**向后兼容性**：✅ 保持
