查找模块相关文件

## 用途

根据模块名称快速定位相关的前后端文件。

## 参数

- `module`: 模块名称 (如 textbook, diary, user, points 等)

## 执行步骤

1. 读取 `.claude/index.yaml` 获取模块定义
2. 读取 `.claude/api-map.yaml` 获取API映射
3. 列出该模块的所有相关文件:
   - 后端: controller, routes, services
   - 前端: views, components, api
   - 数据模型

## 示例

```
/find-module textbook
```

输出:
- 后端路由: textbook.js, textbookNote.js, textbookChat.js, aiAnalysis.js
- 后端服务: aiService.js
- 前端页面: views/textbook/ (5个)
- 前端组件: components/textbook/ (28个)
- 数据模型: Textbook, TextbookUnit, TextbookLesson...
