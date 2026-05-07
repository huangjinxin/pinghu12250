# iOS 开发常见问题记录

**创建时间**: 2026-03-05
**目的**: 避免重复犯错，提高开发效率

---

## 1. 类型冲突问题

### 问题
在新文件中定义了已存在的类型，导致编译错误：
```
'PayOrder' is ambiguous for type lookup in this context
```

### 原因
- 未检查现有代码就创建新类型
- 多个文件定义了相同名称的类型

### 解决方案
✅ **创建新类型前必须先检查**
```bash
# 搜索是否已存在
grep -r "struct PayOrder" ios-app/
grep -r "struct ScanResult" ios-app/
```

✅ **使用现有类型**
- 检查 WalletModels.swift
- 检查 ChatModels.swift
- 检查其他 Models 文件

---

## 2. API 调用方式错误

### 问题
使用了不存在的 API 方法：
```swift
// ❌ 错误
let response = try await apiClient.request(endpoint: "/api/...", method: "GET")
```

### 原因
- 未查看 APIService 的实际实现
- 假设了 API 接口而不是查看文档

### 解决方案
✅ **先查看 APIService.swift 的方法签名**
```swift
// ✅ 正确
let response: APIResponse<T> = try await apiService.get("/api/...")
let response: APIResponse<T> = try await apiService.post("/api/...", body: request)
```

✅ **记住正确的用法**
- GET: `apiService.get<T>(_ endpoint: String)`
- POST: `apiService.post<T, B>(_ endpoint: String, body: B)`
- PUT: `apiService.put<T, B>(_ endpoint: String, body: B)`
- DELETE: `apiService.delete<T>(_ endpoint: String)`

---

## 3. 缺少必要的 import

### 问题
使用 `@Published` 和 `ObservableObject` 但未导入 Combine：
```
Type 'ViewModel' does not conform to protocol 'ObservableObject'
```

### 原因
- SwiftUI 和 Combine 是分开的框架
- `@Published` 需要 Combine

### 解决方案
✅ **使用 ObservableObject 必须导入 Combine**
```swift
import SwiftUI
import Combine  // ← 必须

@MainActor
class ViewModel: ObservableObject {
    @Published var data: String = ""
}
```

---

## 4. 创建冗余功能

### 问题
创建了已存在的功能，导致代码重复和冲突

### 原因
- 未检查现有功能
- 未查看项目索引文件

### 解决方案
✅ **创建新功能前先检查**
```bash
# 查看索引文件
cat ios-app/.claude/index.yaml

# 搜索相关视图
find ios-app -name "*View.swift" | grep -i wallet
```

✅ **优先使用现有功能**
- WalletView 已有完整支付功能
- 不要重复创建 PaymentScanView

---

## 5. Xcode 缓存问题

### 问题
删除文件后仍然报错，提示文件不存在

### 原因
- Xcode 缓存了项目结构
- DerivedData 未更新

### 解决方案
✅ **删除文件后清理缓存**
```bash
# 清理 DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/pinghu12250-*

# 清理用户状态
rm ios-app/pinghu12250.xcodeproj/project.xcworkspace/xcuserdata/*/UserInterfaceState.xcuserstate
```

✅ **在 Xcode 中操作**
1. 关闭 Xcode
2. 清理缓存
3. 重新打开项目
4. Product → Clean Build Folder
5. Product → Build

---

## 6. 开发流程建议

### ✅ 正确的开发流程

1. **查看现有代码**
   - 读取索引文件 `.claude/index.yaml`
   - 搜索相关功能 `grep -r "功能名"`
   - 检查是否已存在

2. **查看 API 文档**
   - 读取 `APIService.swift`
   - 读取 `Models/*.swift`
   - 确认正确的类型和方法

3. **最小化实现**
   - 只创建必要的文件
   - 优先使用现有类型
   - 避免重复功能

4. **测试编译**
   - 每次修改后立即编译
   - 发现错误立即修复
   - 不要累积错误

5. **清理缓存**
   - 删除文件后清理缓存
   - 遇到奇怪错误时清理缓存

---

## 7. 快速检查清单

创建新功能前：
- [ ] 检查 `.claude/index.yaml` 是否已存在
- [ ] 搜索相关文件 `find ios-app -name "*功能名*"`
- [ ] 查看 Models 文件是否有需要的类型
- [ ] 查看 APIService 的方法签名
- [ ] 确认需要导入的框架（Combine, Foundation 等）

---

## 8. 常用命令

```bash
# 搜索类型定义
grep -r "struct TypeName" ios-app/

# 搜索视图文件
find ios-app -name "*View.swift"

# 搜索 ViewModel
find ios-app -name "*ViewModel.swift"

# 清理 Xcode 缓存
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 查看项目结构
tree ios-app/pinghu12250/Features -L 2
```

---

**记住**: 先查看，再编码，避免重复和冲突！
