// 系统版本和更新日志配置
export const VERSION = '1.3.0';

export const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2025-01-27',
    changes: {
      added: [
        '✨ 在个人中心添加"系统设置"tab页',
        '✨ 添加版本号显示和更新日志查看功能',
        '📝 创建CHANGELOG.md更新日志文件'
      ],
      fixed: [
        '🐛 修复所有@vicons/ionicons5图标导入错误',
        '  - 替换 PersonAddOutline → PersonAdd',
        '  - 替换 CartOutline → Cart',
        '  - 替换 WalletOutline → Wallet',
        '  - 替换 GiftOutline → Gift',
        '  - 替换 RibbonOutline → Ribbon',
        '  - 替换 PricetagsOutline → Pricetags',
        '  - 替换 PushPinOutline / PushOutline → Pin',
        '✅ 修复后前端构建成功，无图标相关错误'
      ],
      improved: [
        '🎨 优化了7个Vue组件的图标引用',
        '  - ChatPanelContent.vue',
        '  - Layout.vue',
        '  - WorkDetail.vue',
        '  - Market.vue',
        '  - Tasks.vue',
        '  - UserProfile.vue',
        '  - MessageCenter.vue'
      ]
    }
  },
  {
    version: '1.2.0',
    date: '2025-01-27',
    changes: {
      added: [
        '✨ 实现作品打赏功能',
        '  - 支持预设金额打赏(5/10/20/50金币)',
        '  - 支持自定义金额打赏(1-1000金币)',
        '  - 支持打赏留言功能',
        '  - 实时显示用户金币余额',
        '✨ 实现老师奖励金币功能',
        '  - 老师可向学生发放系统奖励金币',
        '  - 奖励金额范围1-100金币',
        '  - 需填写奖励原因(最多200字)',
        '  - 由系统发放，不扣除老师金币',
        '✨ 实现学习资料付费功能',
        '  - 支持日记设置价格(0-100金币)',
        '  - 0表示免费，其他金额需购买',
        '  - 购买后可查看完整内容'
      ],
      backend: [
        '🗄️ 创建Transaction交易记录表',
        '🗄️ 创建PaidContent付费内容表',
        '🗄️ 创建ContentPurchase内容购买表',
        '🗄️ 新增TransactionType枚举类型',
        '🔧 创建transactionService.js服务',
        '🚀 新增奖励API路由 /api/reward',
        '🔧 修改日记创建API支持price参数'
      ],
      frontend: [
        '🎨 WorkDetail.vue添加打赏和老师奖励UI',
        '🎨 Diaries.vue添加价格设置',
        '🎨 Layout.vue顶部导航栏显示金币余额'
      ],
      database: [
        '📊 使用 npx prisma db push 同步数据库架构',
        '✅ 成功创建5个新表和2个枚举类型'
      ]
    }
  },
  {
    version: '1.1.0',
    date: '2025-01-26',
    changes: {
      added: [
        '✨ 聊天系统内容分享功能',
        '  - 支持分享日记、作业、作品、书籍、游戏',
        '  - 分享卡片样式展示',
        '  - 点击卡片可跳转到对应内容',
        '🎨 优化聊天面板UI/UX',
        '  - 左右分栏布局(会话列表+聊天窗口)',
        '  - 支持置顶/最小化/关闭操作',
        '  - 在线状态实时显示',
        '  - 消息时间格式化显示',
        '  - 分享按钮菜单'
      ],
      improved: [
        '🎨 聊天面板宽度增加到800px',
        '🎨 会话列表宽度优化到300px',
        '🔧 完善ShareSelector组件',
        '🔧 完善ShareCard组件显示逻辑'
      ],
      backend: [
        '🔧 MessageType枚举扩展',
        '  - 添加SYSTEM_PURCHASE、SYSTEM_TEACHER_REWARD等系统消息类型'
      ]
    }
  },
  {
    version: '1.0.0',
    date: '2025-01-25',
    changes: {
      added: [
        '🎉 项目初始化',
        '👤 用户系统 - 注册、登录、个人资料、角色系统',
        '📝 学习模块 - 日记、作业、读书笔记、学习追踪',
        '🎨 作品中心 - HTML作品、作品广场、点赞评论Fork、作品市集',
        '🎮 游戏系统 - 游戏大厅、游戏管理',
        '🏆 成长激励 - 每日挑战、成就中心、积分系统',
        '👥 社交功能 - 好友系统、动态广场、标签广场、实时聊天',
        '🔧 工具模块 - 任务看板、日历、数据统计',
        '💰 钱包系统 - 金币余额管理、交易记录',
        '👨‍💼 管理功能 - 用户/校区/班级/游戏管理、活动日志'
      ],
      tech: [
        '**前端**: Vue 3, Vite, Naive UI, TailwindCSS',
        '**后端**: Node.js, Express, Prisma ORM',
        '**数据库**: PostgreSQL',
        '**实时通信**: Socket.io',
        '**容器化**: Docker, Docker Compose'
      ]
    }
  }
];
