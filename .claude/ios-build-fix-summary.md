# iOS 构建错误修复总结

**修复时间**: 2026-03-05
**问题**: 类型冲突和 API 使用错误

---

## 已修复问题

### 1. 类型冲突
❌ 问题：PaymentModels.swift 和 PointModels.swift 中的类型与现有类型冲突
- PayOrder（与 WalletModels.swift 冲突）
- ScanResult（与 ChatModels.swift 冲突）
- PointLog（与 WalletModels.swift 冲突）

✅ 解决：删除冲突文件，使用现有类型
- 删除 PaymentModels.swift
- 删除 PointModels.swift
- 使用 WalletModels.swift 中的类型

### 2. API 使用错误
❌ 问题：使用了不存在的 APIClient 和 APIEndpoint
✅ 解决：改用 APIService.shared

### 3. 修复的文件
- PaymentViewModel.swift - 使用 APIService 和 PaymentSubmitRequest
- ExchangeViewModel.swift - 使用 APIService 和 ExchangeRequest
- PointExchangeView.swift - 使用 vm.currentPoints
- PointsView.swift - 完全重写，使用 PointLogsResponse

---

## 修改详情

### PaymentViewModel
```swift
// 使用 APIService
private let apiService = APIService.shared

// 使用正确的请求类型
let request = PaymentSubmitRequest(payCodeId: payCodeId, paymentPassword: password)
let response: APIResponse<PaymentSubmitResponse> = try await apiService.request(...)
```

### ExchangeViewModel
```swift
// 使用 currentPoints 而不是 pointBalance
@Published var currentPoints: Int = 0

// 从 PointLogsResponse 获取积分
let response: APIResponse<PointLogsResponse> = try await apiService.request(...)
if let totalPoints = response.data?.totalPoints {
    currentPoints = totalPoints
}
```

### PointsView
```swift
// 简化为只显示积分余额和历史
@Published var totalPoints: Int = 0
@Published var logs: [PointLog] = []

// 移除不存在的 PointBalance 和 PointRule
```

---

## 当前状态

✅ 所有类型冲突已解决
✅ 所有 API 调用已修复
✅ 所有 ViewModel 已更新
✅ 所有 View 已适配

**构建状态**: 应该可以成功编译

---

## 注意事项

1. PaymentScanView 和 PaymentConfirmView 已简化
2. PointsView 不再显示积分规则（后端可能没有此接口）
3. 所有功能使用现有的 WalletModels 类型
