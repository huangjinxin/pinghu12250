# iOS 功能迁移计划
## 项目现状分析报告

**生成时间**: 2026-03-05
**目标**: 将 Web 端成熟功能迁移到 iOS 端，重点关注"我的"标签页中的钱包/支付功能

---

## 一、现状对比总览

### iOS 端已实现功能
```
✅ 基础架构
  - 用户认证 (AuthManager, LoginView, RegisterView)
  - 主界面框架 (NewMainTabView: 消息/通讯录/朋友圈/我的)
  - 网络层 (APIClient, APIEndpoint)

✅ 消息功能
  - Bot 聊天 (ChatView, ChatBubble, ChatViewModel)
  - 会话列表 (ConversationListSidebarView)
  - 消息卡片 (TextbookCardView, HomeworkCardView)

✅ 教材功能
  - 教材阅读器 (TextbookReaderView)
  - 笔记系统 (TextbookNoteView)
  - AI 对话 (TextbookChatView)

✅ 钱包功能（基础版）
  - 钱包模型 (WalletModels.swift: Wallet, Transaction)
  - 钱包视图 (WalletView.swift: 余额显示 + 交易记录列表)
  - 钱包逻辑 (WalletViewModel.swift: 加载余额/交易)

✅ 个人中心
  - 基础资料 (NewProfileView, ProfileHeaderView)
  - 设置页面 (SystemSettingsView)
```

### Web 端已实现功能（iOS 端缺失）
```
❌ 钱包高级功能
  - 支付计划管理 (PaymentPlans.vue)
  - 扫码支付 (QRCodeGenerator.vue, QRCodePrintTab.vue)
  - 支付记录详情 (PaymentRecordsTab.vue)
  - 数据分析 (DataAnalysisTab.vue)

❌ 积分系统
  - 积分规则展示 (Points.vue)
  - 积分兑换虎币 (PointExchange)
  - 每日积分限制追踪

❌ 成就系统
  - 成就列表 (AchievementsNew.vue)
  - 成就进度追踪
  - 成就展示墙

❌ 挑战系统
  - 每日挑战 (Challenges.vue)
  - 挑战历史 (ChallengeHistory.vue)
  - 挑战进度追踪
```

---

## 二、后端 API 支持情况

### 钱包/支付相关 API（✅ 完整支持）
```yaml
wallet:
  - GET /api/wallet/wallet          # 获取钱包信息
  - GET /api/wallet/transactions    # 获取交易记录
  - POST /api/wallet/exchange       # 积分兑换虎币

pay:
  - POST /api/pay/codes             # 创建支付码
  - GET /api/pay/codes              # 获取支付码列表
  - GET /api/pay/scan/:code         # 扫码获取支付信息
  - POST /api/pay/submit            # 提交支付
  - GET /api/pay/orders             # 获取支付订单列表

points:
  - GET /api/points/balance         # 获取积分余额
  - GET /api/points/logs            # 获取积分记录
  - GET /api/points/rules           # 获取积分规则
  - POST /api/points/exchange       # 积分兑换
```

### 数据库模型支持（✅ 完整支持）
```
Wallet              # 钱包主表
WalletTransaction   # 交易记录
PayCode             # 支付码
PayOrder            # 支付订单
PointLog            # 积分记录
PointExchange       # 积分兑换记录
PointRule           # 积分规则
DailyPointsLimit    # 每日积分限制
```

---

## 三、迁移方案选项

### 方案 A：渐进式迁移（推荐 ⭐）
**适合场景**: 稳步推进，降低风险，快速交付核心功能
**总工期**: 3-4 周
**优势**: 每个阶段可独立交付测试，风险可控
**劣势**: 功能上线时间较分散

#### 阶段 1：钱包核心功能增强（1-2 周）
```
优先级: ⭐⭐⭐⭐⭐
工作量: 中等

目标：完善现有钱包功能，实现支付闭环

任务清单：
1. 增强 WalletView
   - 添加"充值"按钮（跳转扫码）
   - 添加"兑换"按钮（积分→虎币）
   - 交易记录筛选（类型、时间）
   - 余额变动动画效果

2. PaymentScanView（新建）
   - AVFoundation 相机扫码
   - 手动输入支付码
   - 调用 GET /api/pay/scan/:code
   - 显示支付确认页

3. PaymentConfirmView（新建）
   - 支付详情展示
   - 6位数字密码键盘
   - 调用 POST /api/pay/submit
   - 支付结果反馈

4. TransactionDetailView（新建）
   - 交易详情完整信息
   - 交易凭证截图分享
   - 相关订单跳转

5. PointExchangeView（新建）
   - 积分余额显示
   - 兑换比例说明
   - 数量输入与计算
   - 调用 POST /api/wallet/exchange

文件结构：
ios-app/pinghu12250/Features/Wallet/
├── Views/
│   ├── EnhancedWalletView.swift
│   ├── PaymentScanView.swift
│   ├── PaymentConfirmView.swift
│   ├── TransactionDetailView.swift
│   └── PointExchangeView.swift
├── ViewModels/
│   ├── WalletViewModel.swift (修改)
│   ├── PaymentViewModel.swift (新建)
│   └── ExchangeViewModel.swift (新建)
└── Models/
    ├── WalletModels.swift (修改)
    └── PaymentModels.swift (新建)
```

#### 阶段 2：积分系统（1 周）
```
优先级: ⭐⭐⭐⭐
工作量: 小

目标：展示积分规则和历史记录

任务清单：
1. PointsView（新建）
   - 顶部卡片：积分余额 + 等级 + 进度条
   - 积分规则列表（LOGIN +5, POST_DIARY +10）
   - 积分历史记录（时间、原因、变动）
   - 下拉刷新

2. 集成到个人中心
   - ProfileMenuView 添加"我的积分"入口
   - 点击跳转 PointsView

文件结构：
ios-app/pinghu12250/Features/Points/
├── PointsView.swift
├── PointsViewModel.swift
└── Models/
    ├── PointRule.swift
    └── PointLog.swift
```

#### 阶段 3：支付计划管理（1 周）
```
优先级: ⭐⭐⭐
工作量: 中等

目标：管理支付码和支付计划

任务清单：
1. PaymentPlansView（新建）
   - 支付计划列表
   - 添加/编辑/删除计划
   - 计划状态管理

2. PayCodeManageView（新建）
   - 我的支付码列表
   - 生成新支付码
   - CoreImage 生成二维码
   - 分享/打印功能

3. PayCodeCreateView（新建）
   - 输入支付码信息
   - 调用 POST /api/pay/codes
   - 显示生成的二维码

文件结构：
ios-app/pinghu12250/Features/Payment/
├── Views/
│   ├── PaymentPlansView.swift
│   ├── PayCodeManageView.swift
│   └── PayCodeCreateView.swift
└── ViewModels/
    └── PaymentPlanViewModel.swift
```

---

### 方案 B：集中突破（快速交付）
**适合场景**: 需要快速上线完整钱包功能
**总工期**: 2 周
**优势**: 功能集中，一次性交付完整体验
**劣势**: 风险较高，测试压力大

#### 实施计划
```
第 1 周：核心功能开发
- Day 1-2: 钱包增强 + 扫码支付
- Day 3-4: 支付确认 + 交易详情
- Day 5: 积分兑换 + 积分展示

第 2 周：高级功能 + 测试
- Day 1-2: 支付计划管理
- Day 3: 支付码生成与管理
- Day 4-5: 集成测试 + Bug 修复

交付物：
- 完整钱包功能模块
- 支付闭环流程
- 积分系统
- 支付计划管理
```

---

### 方案 C：MVP 最小可行产品（极速上线）
**适合场景**: 需要立即验证核心功能
**总工期**: 1 周
**优势**: 最快上线，快速验证
**劣势**: 功能不完整，需后续迭代

#### 实施计划
```
仅实现核心流程：
1. 扫码支付（3 天）
   - PaymentScanView
   - PaymentConfirmView
   - 基础支付流程

2. 积分兑换（2 天）
   - PointExchangeView
   - 兑换流程

3. 集成测试（2 天）

暂不实现：
- 支付计划管理
- 支付码生成
- 交易详情页
- 积分规则展示
```

---

## 四、技术实现要点

### 1. 扫码支付实现
```swift
// AVFoundation 相机扫码
import AVFoundation

class QRScannerViewModel: ObservableObject {
    private var captureSession: AVCaptureSession?

    func startScanning() {
        // 配置相机会话
        // 识别二维码
        // 回调支付码
    }
}
```

### 2. 二维码生成
```swift
// CoreImage 生成二维码
import CoreImage.CIFilterBuiltins

func generateQRCode(from string: String) -> UIImage? {
    let context = CIContext()
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(string.utf8)

    if let outputImage = filter.outputImage {
        if let cgImage = context.createCGImage(outputImage, from: outputImage.extent) {
            return UIImage(cgImage: cgImage)
        }
    }
    return nil
}
```

### 3. 支付密码输入
```swift
// 自定义 6 位数字密码输入框
struct PaymentPasswordField: View {
    @Binding var password: String

    var body: some View {
        HStack(spacing: 12) {
            ForEach(0..<6) { index in
                PasswordDot(isFilled: index < password.count)
            }
        }
        .overlay(
            TextField("", text: $password)
                .keyboardType(.numberPad)
                .opacity(0)
        )
    }
}
```

### 4. 网络请求封装
```swift
// 钱包相关 API
extension APIEndpoint {
    static func getWallet() -> APIEndpoint {
        .init(path: "/api/wallet/wallet", method: .get)
    }

    static func scanPayCode(_ code: String) -> APIEndpoint {
        .init(path: "/api/pay/scan/\(code)", method: .get)
    }

    static func submitPayment(orderId: String, password: String) -> APIEndpoint {
        .init(path: "/api/pay/submit", method: .post, body: [
            "orderId": orderId,
            "password": password
        ])
    }
}
```

---

## 五、风险评估与应对

### 技术风险
```
风险 1: 相机权限被拒绝
应对: 提供手动输入支付码入口

风险 2: 支付密码安全性
应对: 使用 Keychain 存储，传输时加密

风险 3: 二维码识别失败
应对: 提供手动输入 + 识别失败提示

风险 4: 网络请求失败
应对: 完善错误处理 + 重试机制
```

### 业务风险
```
风险 1: 支付流程复杂度高
应对: 分阶段实施，先实现基础流程

风险 2: 用户体验不一致
应对: 参考 Web 端交互，保持一致性

风险 3: 测试覆盖不足
应对: 编写单元测试 + 集成测试
```

---

## 六、推荐方案与理由

### 推荐：方案 A（渐进式迁移）

**理由：**
1. **风险可控**: 每个阶段独立交付，问题可及时发现
2. **质量保证**: 有充足时间进行测试和优化
3. **灵活调整**: 可根据用户反馈调整后续阶段
4. **团队负担**: 开发节奏合理，不会过度压缩

**实施建议：**
- 第 1 阶段完成后立即上线测试版
- 收集用户反馈，优化交互细节
- 第 2、3 阶段根据反馈调整优先级

**关键里程碑：**
- Week 1-2: 钱包核心功能 → 内测版发布
- Week 3: 积分系统 → Beta 版发布
- Week 4: 支付计划 → 正式版发布

---

## 七、资源需求

### 人力需求
```
iOS 开发: 1 人（全职）
UI/UX 设计: 0.5 人（兼职，提供设计稿）
测试: 0.5 人（兼职，编写测试用例）
后端支持: 按需（API 已完备，仅需协助调试）
```

### 时间分配（方案 A）
```
开发: 60%（12 天）
测试: 20%（4 天）
优化: 15%（3 天）
文档: 5%（1 天）
```

---

## 八、验收标准

### 功能验收
```
✅ 钱包余额正确显示
✅ 交易记录完整准确
✅ 扫码支付流程完整
✅ 支付密码验证正确
✅ 积分兑换计算准确
✅ 支付码生成与识别正常
✅ 错误处理完善
```

### 性能验收
```
✅ 页面加载时间 < 1s
✅ 扫码识别响应 < 0.5s
✅ 支付提交响应 < 2s
✅ 无内存泄漏
✅ 流畅度 60fps
```

### 安全验收
```
✅ 支付密码加密传输
✅ 敏感信息不明文存储
✅ 相机权限正确请求
✅ 网络请求 HTTPS
```

---

## 九、后续扩展规划

### 短期扩展（1-2 个月）
```
- 成就系统
- 挑战系统
- 学习统计
- 日记系统
```

### 中期扩展（3-6 个月）
```
- 社交功能（好友、动态）
- 媒体库（图书、音乐、电影）
- 任务系统
- 市集功能
```

### 长期规划（6-12 个月）
```
- 管理后台（教师/家长端）
- 数据分析看板
- 智能推荐系统
- 离线功能支持
```

---

## 十、决策建议

### 如果选择方案 A（推荐）
```
立即开始：
1. 创建 Feature/Wallet 分支
2. 搭建基础文件结构
3. 实现 PaymentScanView
4. 每周五进行阶段性 Review
```

### 如果选择方案 B
```
立即开始：
1. 组织技术评审会议
2. 确定详细开发计划
3. 分配任务到每日
4. 每日站会跟进进度
```

### 如果选择方案 C
```
立即开始：
1. 确定 MVP 功能边界
2. 快速原型开发
3. 内部测试验证
4. 规划迭代计划
```

---

**文档版本**: v1.0
**最后更新**: 2026-03-05
**负责人**: [待定]
**审核人**: [待定]

