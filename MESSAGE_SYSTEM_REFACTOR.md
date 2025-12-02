# 消息系统重构说明

## 概述

消息系统已重构为微信风格的单界面架构，提供更好的移动端体验和更清晰的导航逻辑。

## 新架构特点

### 1. 单界面设计
- **列表视图**：统一展示系统通知和好友会话
- **详情视图**：独立的聊天窗口或通知详情页
- **模态弹窗**：发起新聊天时的好友选择器

### 2. 界面切换逻辑
```
消息列表
  ├─ 点击会话 → 聊天详情（可返回）
  ├─ 点击通知 → 通知详情（可返回）
  └─ 点击新建 → 好友选择器 → 聊天详情
```

### 3. 数据排序规则
- 系统通知固定置顶
- 未读消息优先显示
- 按最新时间降序排列

## 组件结构

### 主组件
**ChatPanelContent.vue** - 消息系统主面板
- 管理视图状态（list/detail）
- 统一消息列表展示
- 好友选择器弹窗
- 路由控制和数据加载

### 子组件

#### 1. ChatDetail.vue - 聊天详情组件
**功能：**
- 显示聊天历史消息
- 发送文本消息
- 分享内容（日记、作业、作品、书籍、游戏）
- 消息状态显示（发送中、已发送、失败）
- 自动滚动到最新消息

**Props：**
- `item`: 当前聊天对象信息
- `messages`: 消息列表

**Events：**
- `send-message`: 发送消息事件

#### 2. SystemMessageDetail.vue - 系统通知详情组件
**功能：**
- 显示系统通知内容
- 通知类型识别（成就、购买、关注、好友、任务）
- 元数据展示
- 标记已读功能
- 跳转到相关页面

**Props：**
- `item`: 通知对象信息

**通知类型：**
- `SYSTEM_ACHIEVEMENT` - 成就通知（橙色）
- `SYSTEM_PURCHASE` - 购买通知（绿色）
- `SYSTEM_FOLLOW` - 关注通知（蓝色）
- `SYSTEM_FRIEND` - 好友通知（紫色）
- `SYSTEM_TASK` - 任务通知（靛蓝色）

## 核心功能

### 1. 统一消息列表
```javascript
const unifiedList = computed(() => {
  // 系统通知（前10条）
  const systemNotifications = systemMessages.value.slice(0, 10).map(msg => ({
    id: msg.id,
    type: 'system',
    name: '系统通知',
    avatar: '/logo.png',
    lastMessage: msg.content,
    timestamp: msg.createdAt,
    unreadCount: msg.isRead ? 0 : 1,
    originalItem: msg
  }));

  // 好友会话
  const friendConversations = conversations.value.map(conv => ({
    id: conv.id,
    type: 'friend',
    name: conv.nickname || conv.username,
    avatar: conv.avatar,
    lastMessage: conv.lastMessage,
    timestamp: conv.lastMessageTime,
    unreadCount: conv.unreadCount || 0,
    originalItem: conv
  }));

  // 合并并排序
  return [...systemNotifications, ...friendConversations].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
});
```

### 2. 视图切换
```javascript
// 列表 → 详情
const openItem = (item) => {
  currentItem.value = item;

  if (item.type === 'system') {
    selectedConversationId.value = 'system';
  } else {
    selectedConversationId.value = item.id;
    chatStore.loadChatHistory(item.id);
    chatStore.markConversationRead(item.id);
  }

  currentView.value = 'detail';
};

// 详情 → 列表
const backToList = () => {
  currentView.value = 'list';
  currentItem.value = null;
  selectedConversationId.value = '';
};
```

### 3. 发起新聊天
```javascript
const selectFriendToChat = (friend) => {
  const existing = conversations.value.find(c => c.id === friend.id);

  if (existing) {
    openItem({...existing});
  } else {
    // 创建新会话
    const newConversation = {
      id: friend.id,
      username: friend.username,
      nickname: friend.profile?.nickname || friend.username,
      avatar: friend.avatar,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };

    conversations.value.unshift(newConversation);
    openItem({...newConversation});
  }

  showFriendSelector.value = false;
};
```

## UI 设计细节

### 1. 微信风格元素
- **在线状态**：绿色圆点指示器（#07c160 微信绿）
- **消息气泡**：发送消息使用微信绿背景
- **系统徽章**：红色"系统"标签
- **未读角标**：Processing 动画效果

### 2. 响应式设计
- 桌面端：宽松的内边距和间距
- 移动端：紧凑的布局，优化触控体验
- 自适应滚动条样式

### 3. 交互细节
- **悬停效果**：灰色背景高亮
- **点击效果**：深灰色背景反馈
- **加载状态**：按钮 loading 动画
- **过渡动画**：平滑的视图切换

## API 使用

### Store 方法调用
```javascript
// 数据加载
chatStore.loadConversations();      // 加载会话列表
chatStore.loadSystemMessages();     // 加载系统消息
chatStore.syncFriends();            // 同步好友列表

// 消息操作
chatStore.loadChatHistory(friendId);      // 加载聊天历史
chatStore.sendMessage(friendId, content); // 发送消息
chatStore.markConversationRead(friendId); // 标记会话已读
chatStore.markSystemMessagesRead([ids]);  // 标记系统消息已读
```

## 样式规范

### 颜色方案
```css
/* 微信绿 */
--wechat-green: #07c160;

/* 系统红 */
--system-red: #ff4f4f;

/* 背景色 */
--bg-primary: #ffffff;
--bg-secondary: #f5f5f5;

/* 文字颜色 */
--text-primary: #000000;
--text-secondary: #333333;
--text-tertiary: #666666;
--text-quaternary: #999999;
```

### 间距规范
- **列表项内边距**：12px 16px
- **头部内边距**：16px
- **消息气泡内边距**：10px 14px
- **间隙**：12px（头像到内容）

## 移动端优化

### 触控友好
- 最小点击区域：48x48px
- 按钮间距：8px以上
- 滚动区域流畅

### 性能优化
- 虚拟列表（可选，数据量大时）
- 懒加载消息历史
- 防抖搜索输入

## 使用示例

### 1. 查看消息列表
用户打开消息面板，看到：
- 最上方：未读的系统通知（红色徽章）
- 中间：未读的好友消息（绿色角标）
- 下方：已读的历史会话

### 2. 查看聊天详情
点击某个好友会话：
- 显示返回按钮
- 加载聊天历史
- 显示输入框和发送按钮
- 可以分享内容

### 3. 发起新聊天
点击"+"按钮：
- 弹出好友列表
- 支持搜索好友
- 点击好友进入聊天

### 4. 查看系统通知
点击系统通知：
- 显示通知详情
- 展示元数据信息
- 可以标记已读
- 可以跳转相关页面

## 注意事项

1. **数据同步**：面板打开时自动刷新数据
2. **消息标记**：进入聊天详情自动标记已读
3. **滚动定位**：新消息自动滚动到底部
4. **状态管理**：使用 Pinia store 统一管理
5. **错误处理**：网络请求失败时显示提示

## 未来改进方向

1. **消息搜索**：全局搜索消息内容
2. **消息撤回**：2分钟内撤回消息
3. **语音消息**：支持语音输入
4. **表情包**：丰富的表情选择器
5. **消息转发**：转发消息给其他好友
6. **群聊功能**：创建群组聊天
7. **离线消息**：缓存未读消息

## 文件清单

```
frontend/src/components/
├── ChatPanelContent.vue      # 主面板（重构）
├── ChatDetail.vue             # 聊天详情（新增）
├── SystemMessageDetail.vue    # 通知详情（新增）
├── MessageCenter.vue          # 消息中心图标（保留）
├── ShareSelector.vue          # 分享选择器（保留）
└── ShareCard.vue              # 分享卡片（保留）

frontend/src/stores/
└── chat.js                    # 聊天状态管理（已更新）
```

## 总结

新的消息系统采用微信风格的单界面架构，提供：
- ✅ 更清晰的信息层级
- ✅ 更友好的移动端体验
- ✅ 更直观的导航逻辑
- ✅ 统一的系统通知和好友消息展示
- ✅ 完整的消息发送、接收、已读功能
- ✅ 丰富的内容分享能力

用户可以像使用微信一样，在列表和详情之间流畅切换，获得一致的使用体验。
