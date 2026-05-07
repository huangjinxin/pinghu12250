# iOS 侧边栏导航架构重构方案

**创建时间**: 2026-03-05
**目标**: 将 iOS 应用改为侧边栏导航模式，对接 Web 端数据

---

## 一、架构变更

### 当前架构
```
底部 TabView
├── 消息 Tab（左侧会话列表 + 右侧聊天）
├── 通讯录 Tab（全屏）
├── 学习圈 Tab（全屏）
└── 我的 Tab（全屏）
```

### 目标架构
```
┌───────────┬─────────────────────────┐
│ [消息]    │                         │
│ [通讯录]  │                         │
│ [更多]    │      右侧详情页面        │
│ [我的]    │      (占满整个右侧)      │
│───────────│                         │
│  列表内容  │                         │
└───────────┴─────────────────────────┘
```

---

## 二、数据对接

### 1. 学习圈（Feed）
**Web API**: `GET /api/feed`
**返回数据**:
- 动态列表（post, photo, gallery, recitation, diary-analysis, poetry）
- 包含作者信息、内容、图片、点赞数、评论数

**iOS 模型**:
```swift
struct FeedItem: Codable, Identifiable {
    let id: String
    let type: String  // post, photo, gallery, etc.
    let content: String?
    let images: [String]?
    let author: FeedAuthor?
    let likesCount: Int?
    let commentsCount: Int?
    let createdAt: String?
}

struct FeedAuthor: Codable {
    let id: String
    let name: String?
    let avatar: String?
}
```

### 2. 好友列表（学伴）
**Web API**: `GET /api/follows/friends`
**返回数据**: 互相关注的用户列表

**iOS 模型**:
```swift
struct Friend: Codable, Identifiable {
    let id: String
    let username: String
    let profile: UserProfile?
}

struct UserProfile: Codable {
    let nickname: String?
    let avatar: String?
    let bio: String?
}
```

### 3. 用户主页
**Web API**: `GET /api/users/:id`
**返回数据**: 用户详细信息和统计

---

## 三、实施步骤

### 阶段 1: 重构主布局（2小时）

**文件**: `NewMainTabView.swift`

**目标**: 改为侧边栏导航模式

**实现**:
```swift
struct SidebarNavigationView: View {
    @State private var selectedMenu: MenuType = .messages
    @State private var selectedItem: Any?

    var body: some View {
        HStack(spacing: 0) {
            // 左侧区域 (1/3)
            VStack(spacing: 0) {
                // 顶部菜单按钮
                MenuButtonsView(selected: $selectedMenu)

                // 列表内容
                ListContentView(menu: selectedMenu, selectedItem: $selectedItem)
            }
            .frame(width: geometry.size.width * 0.33)

            // 右侧详情 (2/3)
            DetailContentView(menu: selectedMenu, item: selectedItem)
                .frame(width: geometry.size.width * 0.67)
        }
    }
}
```

**创建文件**:
- `SidebarNavigationView.swift` - 主布局
- `MenuButtonsView.swift` - 顶部菜单按钮
- `MenuType.swift` - 菜单枚举

### 阶段 2: 实现学习圈（3小时）

**文件**:
- `FeedModels.swift` - 数据模型
- `FeedViewModel.swift` - 业务逻辑
- `FeedListView.swift` - 动态列表
- `FeedItemView.swift` - 动态卡片

**API 对接**:
```swift
class FeedViewModel: ObservableObject {
    @Published var items: [FeedItem] = []

    func loadFeed() async {
        let response: APIResponse<[FeedItem]> = try await apiService.get("/api/feed")
        items = response.data ?? []
    }
}
```

**UI 实现**:
- 动态卡片（作者头像、内容、图片、点赞评论）
- 下拉刷新
- 点击跳转详情

### 阶段 3: 实现通讯录（2小时）

**文件**:
- `FriendModels.swift` - 好友模型
- `FriendListView.swift` - 好友列表
- `UserProfileView.swift` - 用户主页

**API 对接**:
```swift
class FriendViewModel: ObservableObject {
    @Published var friends: [Friend] = []

    func loadFriends() async {
        let response: APIResponse<[Friend]> = try await apiService.get("/api/follows/friends")
        friends = response.data ?? []
    }
}
```

**用户主页**:
- 对接 `GET /api/users/:id`
- 显示用户信息、统计数据
- 显示用户作品列表

### 阶段 4: 实现更多菜单（1小时）

**文件**:
- `MoreMenuView.swift` - 功能菜单列表

**菜单项**:
1. 学习圈（最上面）→ FeedListView
2. 我的教材 → TextbookListView
3. 我的作业 → HomeworkListView
4. 我的笔记 → AllNotesView
5. 我的作品 → WorksGalleryView
6. 学习统计 → DashboardView
7. 照片管理 → PhotosView
8. 日记列表 → DiaryListView
9. 写作功能 → WritingView
10. 成长记录 → MyGrowthView

### 阶段 5: 实现我的菜单（1小时）

**文件**:
- `ProfileMenuView.swift` - 个人功能菜单

**菜单项**:
1. 我的钱包 → WalletView
2. 我的积分 → PointsView
3. 系统设置 → SystemSettingsView
4. 个人资料 → ProfileEditView
5. 关于 → AboutView

---

## 四、文件结构

```
ios-app/pinghu12250/Features/
├── Main/
│   ├── SidebarNavigationView.swift      # 主布局
│   ├── MenuButtonsView.swift            # 菜单按钮
│   ├── MenuType.swift                   # 菜单枚举
│   └── ListContentView.swift            # 列表内容路由
├── Feed/
│   ├── Models/
│   │   └── FeedModels.swift
│   ├── ViewModels/
│   │   └── FeedViewModel.swift
│   └── Views/
│       ├── FeedListView.swift
│       └── FeedItemView.swift
├── Friends/
│   ├── Models/
│   │   └── FriendModels.swift
│   ├── ViewModels/
│   │   └── FriendViewModel.swift
│   └── Views/
│       ├── FriendListView.swift
│       └── UserProfileView.swift
├── More/
│   └── MoreMenuView.swift
└── Profile/
    └── ProfileMenuView.swift
```

---

## 五、实施顺序

### Day 1: 基础架构（4小时）
1. 创建 MenuType 枚举
2. 实现 SidebarNavigationView
3. 实现 MenuButtonsView
4. 测试基础导航

### Day 2: 学习圈和通讯录（5小时）
1. 实现 FeedModels 和 FeedViewModel
2. 实现 FeedListView
3. 实现 FriendListView
4. 实现 UserProfileView
5. 测试数据加载

### Day 3: 菜单和集成（3小时）
1. 实现 MoreMenuView
2. 实现 ProfileMenuView
3. 集成所有功能
4. 全面测试

---

## 六、关键技术点

### 1. 菜单状态管理
```swift
enum MenuType: String, CaseIterable {
    case messages = "消息"
    case contacts = "通讯录"
    case more = "更多"
    case profile = "我的"
}
```

### 2. 动态路由
```swift
@ViewBuilder
func listContent(for menu: MenuType) -> some View {
    switch menu {
    case .messages:
        ConversationListSidebarView(selectedBot: $selectedBot)
    case .contacts:
        FriendListView(selectedFriend: $selectedFriend)
    case .more:
        MoreMenuView(selectedItem: $selectedMoreItem)
    case .profile:
        ProfileMenuView(selectedItem: $selectedProfileItem)
    }
}
```

### 3. API 响应处理
```swift
struct APIResponse<T: Decodable>: Decodable {
    let success: Bool?
    let data: T?
    let error: String?
}
```

---

## 七、测试计划

### 功能测试
- [ ] 点击菜单按钮，左侧列表切换
- [ ] 点击列表项，右侧详情显示
- [ ] 学习圈数据正确加载
- [ ] 好友列表正确显示
- [ ] 用户主页正确显示
- [ ] 所有功能页面正常跳转

### 性能测试
- [ ] 列表滚动流畅
- [ ] 图片加载正常
- [ ] 内存占用合理

---

## 八、风险和应对

### 风险1: API 数据格式不匹配
**应对**: 先用 Postman 测试 API，确认数据结构

### 风险2: 布局适配问题
**应对**: 使用 GeometryReader 动态计算尺寸

### 风险3: 状态管理复杂
**应对**: 使用 @State 和 @Binding 清晰传递状态

---

**准备开始实施，预计总工期：3天（12小时）**
