/**
 * Vue Router 配置
 */

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { initAnalytics } from '@/composables/useAnalytics';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false });

const routes = [
  // 公开页面（无需登录）
  {
    path: '/diary/:id',
    name: 'DiaryDetail',
    component: () => import('@/views/DiaryDetail.vue'),
    meta: { public: true, title: '日记详情' },
  },
  {
    path: '/gallery/:id',
    name: 'GalleryDetail',
    component: () => import('@/views/GalleryDetail.vue'),
    meta: { public: true, title: '作品详情' },
  },
  {
    path: '/recitation/:id',
    name: 'RecitationDetail',
    component: () => import('@/views/RecitationDetail.vue'),
    meta: { public: true, title: '朗诵详情' },
  },
  {
    path: '/htmlwork/:id',
    name: 'HtmlWorkView',
    component: () => import('@/views/HtmlWorkView.vue'),
    meta: { public: true, title: '作品详情' },
  },
  {
    path: '/poetry',
    name: 'PublicPoetry',
    component: () => import('@/views/PublicPoetry.vue'),
    meta: { public: true, title: '诗词天地' },
  },
  {
    path: '/poetry/:id',
    name: 'PoetryView',
    component: () => import('@/views/PoetryView.vue'),
    meta: { public: true, title: '诗词详情' },
  },
  {
    path: '/diary-analysis/:id/public',
    name: 'DiaryAnalysisPublic',
    component: () => import('@/views/DiaryAnalysisPublic.vue'),
    meta: { public: true, title: '日记分析' },
  },
  {
    path: '/gallery',
    name: 'PublicGallery',
    component: () => import('@/views/PublicGallery.vue'),
    meta: { public: true, title: '作品展示' },
  },
  // 公开排行榜（无需登录）
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
    meta: { public: true, title: '排行榜' },
  },
  // 关于我们页面（无需登录）
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { public: true, title: '关于我们' },
  },
  // 公开数据看板（无需登录）
  {
    path: '/dashboard',
    name: 'PublicDashboard',
    component: () => import('@/views/admin/DataDashboard.vue'),
    props: { isPublic: true },
    meta: { public: true, isPublic: true, title: '数据看板' },
  },
  // 电子课本（独立页面）
  {
    path: '/textbook',
    name: 'TextbookPublic',
    component: () => import('@/views/textbook/TextbookPublic.vue'),
    meta: { public: true, title: '电子课本' },
  },
  {
    path: '/textbook/workspace',
    name: 'TextbookWorkspace',
    component: () => import('@/views/textbook/TextbookWorkspace.vue'),
    meta: { requiresAuth: true, title: '教材工作区' },
  },
  {
    path: '/textbook/admin',
    name: 'TextbookAdmin',
    component: () => import('@/views/textbook/TextbookAdmin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '教材管理' },
  },
  {
    path: '/textbook/reader/:id',
    name: 'TextbookReader',
    component: () => import('@/views/textbook/TextbookReader.vue'),
    meta: { requiresAuth: true, title: '教材阅读' },
  },
  {
    path: '/textbook/focus/:noteId',
    name: 'FocusMode',
    component: () => import('@/views/textbook/FocusMode.vue'),
    meta: { requiresAuth: true, title: '专注模式' },
  },
  // 公开首页（未登录用户访问）
  {
    path: '/home',
    name: 'PublicHome',
    component: () => import('@/views/PublicHome.vue'),
    meta: { public: true, title: '苹湖少儿空间' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true, title: '注册' },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '苹湖少儿空间' },
      },
      {
        path: 'submit',
        name: 'Submit',
        component: () => import('@/views/SubmitTask.vue'),
        meta: { title: '日记提交' },
      },
      // Timeline 已合并到 Friends（动态流）
      {
        path: 'diaries',
        name: 'Diaries',
        component: () => import('@/views/Diaries.vue'),
        meta: { title: '我的日记' },
      },
      {
        path: 'photos',
        name: 'Photos',
        component: () => import('@/views/Photos.vue'),
        meta: { title: '我的照片' },
      },
      {
        path: 'moments',
        name: 'MomentsSquare',
        component: () => import('@/views/MomentsSquare.vue'),
        meta: { title: '同学圈' },
      },
      {
        path: 'homeworks',
        name: 'Homeworks',
        component: () => import('@/views/Homeworks.vue'),
        meta: { title: '我的作业' },
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/Notes.vue'),
        meta: { title: '学习笔记' },
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('@/views/Books.vue'),
        meta: { title: '图书馆' },
      },
      {
        path: 'books/:id',
        name: 'BookDetail',
        component: () => import('@/views/BookDetail.vue'),
        meta: { title: '书籍详情' },
      },
      {
        path: 'my-notes',
        name: 'MyNotes',
        component: () => import('@/views/MyNotes.vue'),
        meta: { title: '我的笔记' },
      },
      {
        path: 'writing',
        name: 'Writing',
        component: () => import('@/views/Writing.vue'),
        meta: { title: '写作练习' },
      },
      {
        path: 'pinyin',
        name: 'PinyinTyping',
        component: () => import('@/views/PinyinTyping.vue'),
        meta: { title: '拼音打字' },
      },
      {
        path: 'typing',
        name: 'Typing',
        component: () => import('@/views/Typing.vue'),
        meta: { title: '打字练习' },
      },
      {
        path: 'movies',
        name: 'Movies',
        component: () => import('@/views/Movies.vue'),
        meta: { title: '观影记录' },
      },
      {
        path: 'works',
        name: 'Works',
        component: () => import('@/views/Works.vue'),
        meta: { title: '作品广场' },
      },
      {
        path: 'shopping',
        name: 'Shopping',
        component: () => import('@/views/Shopping.vue'),
        meta: { title: '积分商城' },
      },
      {
        path: 'works/my',
        name: 'MyWorks',
        component: () => import('@/views/MyWorks.vue'),
        meta: { title: '我的作品' },
      },
      {
        path: 'works/create',
        name: 'WorkCreate',
        component: () => import('@/views/WorkEditor.vue'),
        meta: { title: '创作作品' },
      },
      {
        path: 'works/:id',
        name: 'WorkDetail',
        component: () => import('@/views/WorkDetail.vue'),
        meta: { title: '作品详情' },
      },
      {
        path: 'works/:id/edit',
        name: 'WorkEdit',
        component: () => import('@/views/WorkEditor.vue'),
        meta: { title: '编辑作品' },
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('@/views/Tasks.vue'),
        meta: { title: '任务清单' },
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/Calendar.vue'),
        meta: { title: '学习日历' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人资料' },
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '学习统计' },
      },
      {
        path: 'learning-tracker',
        name: 'LearningTracker',
        component: () => import('@/views/LearningTracker.vue'),
        meta: { title: '学习追踪' },
      },
      {
        path: 'learning-stats',
        name: 'LearningStats',
        component: () => import('@/views/LearningStats.vue'),
        meta: { title: '学习报告' },
      },
      {
        path: 'about-me',
        name: 'AboutMe',
        component: () => import('@/views/AboutMe.vue'),
        meta: { title: '关于我' },
      },
      {
        path: 'timer/:projectId',
        name: 'Timer',
        component: () => import('@/views/Timer.vue'),
        meta: { title: '计时器' },
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/Points.vue'),
        meta: { title: '我的积分' },
      },
      // Notifications 已合并到 MessageCenter
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/Search.vue'),
        meta: { title: '搜索' },
      },
      // 每日挑战
      {
        path: 'challenges',
        name: 'Challenges',
        component: () => import('@/views/Challenges.vue'),
        meta: { title: '每日挑战' },
      },
      {
        path: 'challenges/history',
        name: 'ChallengeHistory',
        component: () => import('@/views/ChallengeHistory.vue'),
        meta: { title: '挑战历史' },
      },
      
      // 标签系统
      {
        path: 'tags',
        name: 'TagSquare',
        component: () => import('@/views/TagSquare.vue'),
        meta: { title: '标签广场' },
      },
      {
        path: 'tags/:tagName',
        name: 'TagDetail',
        component: () => import('@/views/TagDetail.vue'),
        meta: { title: '标签详情' },
      },
      // 成就系统
      {
        path: 'achievements',
        name: 'Achievements',
        component: () => import('@/views/AchievementsNew.vue'),
        meta: { title: '成就系统' },
      },
      {
        path: 'achievements/:id',
        name: 'AchievementDetail',
        component: () => import('@/views/AchievementDetail.vue'),
        meta: { title: '成就详情' },
      },
      // 成长记录
      {
        path: 'my-growth',
        name: 'MyGrowth',
        component: () => import('@/views/MyGrowth.vue'),
        meta: { title: '我的成长' },
      },
      // 老师系统
      {
        path: 'my-teacher',
        name: 'MyTeacher',
        component: () => import('@/views/teacher/MyTeacher.vue'),
        meta: { title: '我的老师' },
      },
      {
        path: 'my-students',
        name: 'MyStudents',
        component: () => import('@/views/teacher/MyStudents.vue'),
        meta: { title: '我的学生' },
      },
      {
        path: 'delegated-reviews',
        name: 'DelegatedReviews',
        component: () => import('@/views/teacher/DelegatedReviews.vue'),
        meta: { title: '委托批阅' },
      },
      {
        path: 'teacher-leaderboard',
        name: 'TeacherLeaderboard',
        component: () => import('@/views/teacher/TeacherLeaderboard.vue'),
        meta: { title: '教师排行' },
      },
      // 好友系统（已整合到学习圈）
      {
        path: 'friends',
        redirect: '/moments',
      },
      {
        path: 'friends/leaderboard',
        redirect: '/moments?tab=leaderboard',
      },
      {
        path: 'users/:userId',
        name: 'UserProfile',
        component: () => import('@/views/UserProfile.vue'),
        meta: { title: '用户主页' },
      },
      {
        path: 'settings/sessions',
        name: 'SessionManager',
        component: () => import('@/views/settings/SessionManager.vue'),
        meta: { title: '会话管理' },
      },
      {
        path: 'messages',
        name: 'MessageCenter',
        component: () => import('@/views/MessageCenter.vue'),
        meta: { title: '消息中心' },
      },
      // 知识问答
      {
        path: 'questions',
        name: 'Questions',
        component: () => import('@/views/Questions.vue'),
        meta: { title: '知识问答' },
      },
      {
        path: 'questions/:id',
        name: 'QuestionDetail',
        component: () => import('@/views/QuestionDetail.vue'),
        meta: { title: '问答详情' },
      },
      // 作品市集
      {
        path: 'market',
        name: 'Market',
        component: () => import('@/views/Market.vue'),
        meta: { title: '作品市集' },
      },
      {
        path: 'market/leaderboard',
        name: 'MarketLeaderboard',
        component: () => import('@/views/MarketLeaderboard.vue'),
        meta: { title: '市集排行' },
      },
      {
        path: 'wallet',
        name: 'Wallet',
        component: () => import('@/views/Wallet.vue'),
        meta: { title: '我的钱包' },
      },
      {
        path: 'wallet/credit-history',
        name: 'CreditHistory',
        component: () => import('@/views/CreditHistory.vue'),
        meta: { title: '积分记录' },
      },
      {
        path: 'my-purchases',
        name: 'MyPurchases',
        component: () => import('@/views/MyPurchases.vue'),
        meta: { title: '我的购买' },
      },
      {
        path: 'my-shop',
        name: 'MyShop',
        component: () => import('@/views/MyShop.vue'),
        meta: { title: '我的店铺' },
      },
      // 管理员路由
      {
        path: 'admin',
        name: 'AdminHome',
        component: () => import('@/views/admin/AdminHome.vue'),
        meta: { requiresAdmin: true, title: '管理后台' },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'admin/user-review',
        name: 'UserReview',
        component: () => import('@/views/admin/UserReview.vue'),
        meta: { requiresAdmin: true, title: '用户审核' },
      },
      {
        path: 'admin/invite-codes',
        name: 'InviteCodeManagement',
        component: () => import('@/views/admin/InviteCodeManagement.vue'),
        meta: { requiresAdmin: true, title: '邀请码管理' },
      },
      {
        path: 'admin/logs',
        name: 'ActivityLogs',
        component: () => import('@/views/admin/ActivityLogs.vue'),
        meta: { title: '操作日志' },
      },
      {
        path: 'admin/campuses',
        name: 'CampusManagement',
        component: () => import('@/views/admin/CampusManagement.vue'),
        meta: { title: '校区管理' },
      },
      {
        path: 'admin/classes',
        name: 'ClassManagement',
        component: () => import('@/views/admin/ClassManagement.vue'),
        meta: { title: '班级管理' },
      },
      {
        path: 'admin/paycodes',
        name: 'PayCodeManagement',
        component: () => import('@/views/admin/PayCodeManagement.vue'),
        meta: { title: '付款码管理' },
      },
      {
        path: 'admin/reward-rules',
        name: 'RewardManagement',
        component: () => import('@/views/admin/RewardManagement.vue'),
        meta: { title: '奖励规则' },
      },
      {
        path: 'admin/analytics',
        name: 'AdminAnalytics',
        component: () => import('@/views/admin/Analytics.vue'),
        meta: { requiresAdmin: true, title: '数据分析' },
      },
      {
        path: 'admin/dashboard',
        name: 'DataDashboard',
        component: () => import('@/views/admin/DataDashboard.vue'),
        meta: { requiresAdmin: true, title: '数据看板' },
      },
      {
        path: 'admin/feedback',
        name: 'AdminFeedback',
        component: () => import('@/views/admin/FeedbackAdmin.vue'),
        meta: { requiresAdmin: true, title: '反馈管理' },
      },
      {
        path: 'admin/payment-plans',
        name: 'AdminPaymentPlans',
        component: () => import('@/views/admin/PaymentPlanAdmin.vue'),
        meta: { requiresAdmin: true, title: '支付计划管理' },
      },
      {
        path: 'admin/imessage-logs',
        name: 'ImessageLogs',
        component: () => import('@/views/admin/ImessageLogs.vue'),
        meta: { requiresAdmin: true, title: '消息日志' },
      },
      {
        path: 'admin/bots',
        name: 'BotManagement',
        component: () => import('@/views/admin/BotManagement.vue'),
        meta: { requiresAdmin: true, title: '机器人管理' },
      },
      {
        path: 'admin/bot-chats',
        name: 'BotChats',
        component: () => import('@/views/admin/BotChats.vue'),
        meta: { requiresAdmin: true, title: '机器人聊天' },
      },
      {
        path: 'admin/qrcode',
        name: 'QRCodeGenerator',
        component: () => import('@/views/admin/QRCodeGenerator.vue'),
        meta: { requiresAdmin: true, title: '二维码生成' },
      },
      {
        path: 'admin/interaction',
        name: 'InteractionManagement',
        component: () => import('@/views/admin/InteractionManagement.vue'),
        meta: { requiresAdmin: true, title: '互动管理' },
      },
      {
        path: 'admin/campus-class',
        name: 'CampusClassManagement',
        component: () => import('@/views/admin/CampusClassManagement.vue'),
        meta: { requiresAdmin: true, title: '校区班级' },
      },
      {
        path: 'admin/credit-rules',
        name: 'CreditRuleManagement',
        component: () => import('@/views/admin/CreditRuleManagement.vue'),
        meta: { requiresAdmin: true, title: '积分规则' },
      },
      // 用户付款计划
      {
        path: 'payment-plans',
        name: 'PaymentPlans',
        component: () => import('@/views/PaymentPlans.vue'),
        meta: { title: '支付计划' },
      },
      // 教师路由
      {
        path: 'teacher/classes',
        name: 'TeacherClasses',
        component: () => import('@/views/teacher/MyClasses.vue'),
        meta: { title: '我的班级' },
      },
      {
        path: 'teacher/class/:classId',
        name: 'ClassStudents',
        component: () => import('@/views/teacher/ClassStudents.vue'),
        meta: { title: '班级详情' },
      },
      {
        path: 'teacher/student/:studentId',
        name: 'StudentDetail',
        component: () => import('@/views/teacher/StudentDetail.vue'),
        meta: { title: '学生详情' },
      },
      // 家长路由
      {
        path: 'parent/children',
        name: 'ParentChildren',
        component: () => import('@/views/parent/MyChildren.vue'),
        meta: { title: '我的孩子' },
      },
      {
        path: 'parent/child/:childId/records',
        name: 'ChildRecords',
        component: () => import('@/views/parent/ChildRecords.vue'),
        meta: { title: '成长记录' },
      },
      {
        path: 'parent/submissions',
        name: 'ParentSubmissions',
        component: () => import('@/views/parent/ParentSubmissions.vue'),
        meta: { title: '提交记录' },
      },
      {
        path: 'parent/review',
        name: 'ParentReview',
        component: () => import('@/views/parent/ParentReview.vue'),
        meta: { title: '家长批阅' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  NProgress.start();
  const authStore = useAuthStore();

  // 公开页面直接放行
  if (to.meta.public) {
    // 已登录用户访问公开首页时，重定向到后台首页
    if (to.path === '/home' && authStore.isAuthenticated) {
      next('/');
    } else {
      next();
    }
  } else if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 未登录用户访问需要认证的页面时，重定向到公开首页
    next('/home');
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // 已登录用户访问登录/注册页时重定向
    if (authStore.user?.role === 'PARENT') {
      next('/parent/children');
    } else {
      next('/');
    }
  } else if (to.path === '/' && authStore.user?.role === 'PARENT') {
    // 家长访问首页时重定向到我的孩子页面
    next('/parent/children');
  } else if (to.meta.requiresAdmin) {
    // 管理员页面直接放行（不做访问限制）
    next();
  } else {
    next();
  }
});

router.afterEach((to) => {
  NProgress.done();
  const title = to.meta.title || '苹湖少儿空间';
  document.title = title === '苹湖少儿空间' ? title : `${title} - 苹湖少儿空间`;
});

// 初始化埋点系统
initAnalytics(router);

export default router;
