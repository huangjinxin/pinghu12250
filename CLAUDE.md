# @AI:CONFIG pinghu12250
# 格式: 紧凑型机器优化，减少token消耗
# 标记说明: L=锁定 M=仅改 A=可增 ✗=禁止

:stack: vue3,express,prisma,postgres
:containers: children-growth-{backend,postgres,nginx}
:ports: fe=12250 be=12251 db=12252

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 前端部署方式（✗ Docker）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:frontend:
  serve: 本地 vite preview --port 12250  # ✗ Docker容器
  build: cd frontend && npm run build    # 输出到 frontend/dist/
  restart: kill旧进程后 npx vite preview --port 12250 --host
  # docker-compose.yml中frontend服务已注释，✗ 勿恢复

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 绝对规则（违反将导致系统故障）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:must:
  prisma: require('../lib/prisma')  # ✗ new PrismaClient()
  api_file: fe/api/index.js仅此一个文件  # ✗ 新增api/*.js
  response: { success:bool, data|error }
  date: ISO8601

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 目录权限矩阵
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:dirs:
  # frontend/src/
  fe/api:          L  # 仅改index.js
  fe/stores:       M  # 新增需审批
  fe/utils:        M
  fe/composables:  A  # 业务逻辑必须放这里
  fe/components:   A  # 按模块子目录
  fe/views:        A

  # backend/src/
  be/lib:          L  # 绝对禁止
  be/controllers:  M  # 结构已定
  be/middleware:   M
  be/routes:       A
  be/services:     A  # 业务逻辑必须放这里
  be/dto:          A

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 层级调用规则
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:deps:
  view      → [comp,composable,store,utils]
  component → [composable,store,utils] ✗api ✗axios ✗fetch
  composable→ [api,store,utils] ✗component
  store     → [api,utils]
  controller→ [service] ✗prisma直接调用

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 命名规范
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:naming:
  component:  [Module][Name].vue      # TextbookReader.vue
  composable: use[Module][Action].js  # useTextbookChat.js
  service:    [module]Service.js      # textbookService.js
  api_obj:    [module]API             # textbookAPI

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 已废弃（使用右侧替代）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:deprecated:
  components/Chat*.vue        → textbook/Chat*.vue
  components/ChatPanel*.vue   → textbook/AiConversationPanel.vue
  TextSelectionMenu.vue       → UnifiedSelectionMenu.vue
  *.vue.bak,*.vue.old         → 删除

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 大文件警告（新功能提取到composables）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:large_files:
  AssistMode.vue(1990L): 提取→ useTextbookNotes,useAiStream,usePdfSearch
  api/index.js(868L):    仅在末尾追加,不重构

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 快捷命令
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:commands:
  /db-migrate  # schema修改后执行
  /restart     # 重启后端
  /add-api     # 添加新API标准流程

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 索引文件（按需读取）
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:index:
  modules:  .claude/index.yaml
  api_map:  .claude/api-map.yaml
  schema:   .claude/schema-summary.yaml
  ios:      ios-app/pinghu12250/.claude/index.yaml

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 测试账号
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:test:
  student: xiaoming/123456
  parent:  parent_ming/123456
  teacher: teacher_wang/123456
