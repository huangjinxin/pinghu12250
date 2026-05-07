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
    meta: { public: true },
  },
  {
    path: '/gallery/:id',
    name: 'GalleryDetail',
    component: () => import('@/views/GalleryDetail.vue'),
    meta: { public: true },
  },
  {
    path: '/recitation/:id',
    name: 'RecitationDetail',
    component: () => import('@/views/RecitationDetail.vue'),
    meta: { public: true },
  },
  {
    path: '/htmlwork/:id',
    name: 'HtmlWorkView',
    component: () => import('@/views/HtmlWorkView.vue'),
    meta: { public: true },
  },
  {
    path: '/poetry',
    name: 'PublicPoetry',
    component: () => import('@/views/PublicPoetry.vue'),
    meta: { public: true },
  },
  {
    path: '/poetry/:id',
    name: 'PoetryView',
    component: () => import('@/views/PoetryView.vue'),
    meta: { public: true },
  },
  {
    path: '/diary-analysis/:id/public',
    name: 'DiaryAnalysisPublic',
    component: () => import('@/views/DiaryAnalysisPublic.vue'),
    meta: { public: true },
  },
  {
    path: '/gallery',
    name: 'PublicGallery',
    component: () => import('@/views/PublicGallery.vue'),
    meta: { public: true },
  },
  // 公开排行榜（无需登录）
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
    meta: { public: true },
  },
  // 关于我们页面（无需登录）
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { public: true },
  },
  // 公开数据看板（无需登录）
  {
    path: '/dashboard',
    name: 'PublicDashboard',
    component: () => import('@/views/admin/DataDashboard.vue'),
    props: { isPublic: true },
    meta: { public: true, isPublic: true },
  },
  // 电子课本（独立页面）
  {
    path: '/textbook',
    name: 'TextbookPublic',
    component: () => import('@/views/textbook/TextbookPublic.vue'),
    meta: { public: true },
  },
  {
    path: '/textbook/workspace',
    name: 'TextbookWorkspace',
    component: () => import('@/views/textbook/TextbookWorkspace.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/textbook/admin',
    name: 'TextbookAdmin',
    component: () => import('@/views/textbook/TextbookAdmin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/textbook/reader/:id',
    name: 'TextbookReader',
    component: () => import('@/views/textbook/TextbookReader.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/textbook/focus/:noteId',
    name: 'FocusMode',
    component: () => import('@/views/textbook/FocusMode.vue'),
    meta: { requiresAuth: true },
  },
  // 公开首页（未登录用户访问）
  {
    path: '/home',
    name: 'PublicHome',
    component: () => import('@/views/PublicHome.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true },
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
      },
      {
        path: 'submit',
        name: 'Submit',
        component: () => import('@/views/SubmitTask.vue'),
      },
      // Timeline 已合并到 Friends（动态流）
      {
        path: 'diaries',
        name: 'Diaries',
        component: () => import('@/views/Diaries.vue'),
      },
      {
        path: 'photos',
        name: 'Photos',
        component: () => import('@/views/Photos.vue'),
      },
      {
        path: 'moments',
        name: 'MomentsSquare',
        component: () => import('@/views/MomentsSquare.vue'),
      },
      {
        path: 'homeworks',
        name: 'Homeworks',
        component: () => import('@/views/Homeworks.vue'),
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/Notes.vue'),
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('@/views/Books.vue'),
      },
      {
        path: 'books/:id',
        name: 'BookDetail',
        component: () => import('@/views/BookDetail.vue'),
      },
      {
        path: 'my-notes',
        name: 'MyNotes',
        component: () => import('@/views/MyNotes.vue'),
      },
      {
        path: 'writing',
        name: 'Writing',
        component: () => import('@/views/Writing.vue'),
      },
      {
        path: 'pinyin',
        name: 'PinyinTyping',
        component: () => import('@/views/PinyinTyping.vue'),
      },
      {
        path: 'typing',
        name: 'Typing',
        component: () => import('@/views/Typing.vue'),
      },
      {
        path: 'movies',
        name: 'Movies',
        component: () => import('@/views/Movies.vue'),
      },
      {
        path: 'works',
        name: 'Works',
        component: () => import('@/views/Works.vue'),
      },
      {
        path: 'shopping',
        name: 'Shopping',
        component: () => import('@/views/Shopping.vue'),
      },
      {
        path: 'works/my',
        name: 'MyWorks',
        component: () => import('@/views/MyWorks.vue'),
      },
      {
        path: 'works/create',
        name: 'WorkCreate',
        component: () => import('@/views/WorkEditor.vue'),
      },
      {
        path: 'works/:id',
        name: 'WorkDetail',
        component: () => import('@/views/WorkDetail.vue'),
      },
      {
        path: 'works/:id/edit',
        name: 'WorkEdit',
        component: () => import('@/views/WorkEditor.vue'),
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('@/views/Tasks.vue'),
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/Calendar.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
      },
      {
        path: 'learning-tracker',
        name: 'LearningTracker',
        component: () => import('@/views/LearningTracker.vue'),
      },
      {
        path: 'learning-stats',
        name: 'LearningStats',
        component: () => import('@/views/LearningStats.vue'),
      },
      {
        path: 'about-me',
        name: 'AboutMe',
        component: () => import('@/views/AboutMe.vue'),
      },
      {
        path: 'timer/:projectId',
        name: 'Timer',
        component: () => import('@/views/Timer.vue'),
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/Points.vue'),
      },
      // Notifications 已合并到 MessageCenter
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/Search.vue'),
      },
      // 每日挑战
      {
        path: 'challenges',
        name: 'Challenges',
        component: () => import('@/views/Challenges.vue'),
      },
      {
        path: 'challenges/history',
        name: 'ChallengeHistory',
        component: () => import('@/views/ChallengeHistory.vue'),
      },
      
      // 标签系统
      {
        path: 'tags',
        name: 'TagSquare',
        component: () => import('@/views/TagSquare.vue'),
      },
      {
        path: 'tags/:tagName',
        name: 'TagDetail',
        component: () => import('@/views/TagDetail.vue'),
      },
      // 成就系统
      {
        path: 'achievements',
        name: 'Achievements',
        component: () => import('@/views/AchievementsNew.vue'),
      },
      {
        path: 'achievements/:id',
        name: 'AchievementDetail',
        component: () => import('@/views/AchievementDetail.vue'),
      },
      // 成长记录
      {
        path: 'my-growth',
        name: 'MyGrowth',
        component: () => import('@/views/MyGrowth.vue'),
      },
      // 老师系统
      {
        path: 'my-teacher',
        name: 'MyTeacher',
        component: () => import('@/views/teacher/MyTeacher.vue'),
      },
      {
        path: 'my-students',
        name: 'MyStudents',
        component: () => import('@/views/teacher/MyStudents.vue'),
      },
      {
        path: 'delegated-reviews',
        name: 'DelegatedReviews',
        component: () => import('@/views/teacher/DelegatedReviews.vue'),
      },
      {
        path: 'teacher-leaderboard',
        name: 'TeacherLeaderboard',
        component: () => import('@/views/teacher/TeacherLeaderboard.vue'),
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
      },
      {
        path: 'settings/sessions',
        name: 'SessionManager',
        component: () => import('@/views/settings/SessionManager.vue'),
      },
      {
        path: 'messages',
        name: 'MessageCenter',
        component: () => import('@/views/MessageCenter.vue'),
      },
      // 知识问答
      {
        path: 'questions',
        name: 'Questions',
        component: () => import('@/views/Questions.vue'),
      },
      {
        path: 'questions/:id',
        name: 'QuestionDetail',
        component: () => import('@/views/QuestionDetail.vue'),
      },
      // 作品市集
      {
        path: 'market',
        name: 'Market',
        component: () => import('@/views/Market.vue'),
      },
      {
        path: 'market/leaderboard',
        name: 'MarketLeaderboard',
        component: () => import('@/views/MarketLeaderboard.vue'),
      },
      {
        path: 'wallet',
        name: 'Wallet',
        component: () => import('@/views/Wallet.vue'),
      },
      {
        path: 'wallet/credit-history',
        name: 'CreditHistory',
        component: () => import('@/views/CreditHistory.vue'),
      },
      {
        path: 'my-purchases',
        name: 'MyPurchases',
        component: () => import('@/views/MyPurchases.vue'),
      },
      {
        path: 'my-shop',
        name: 'MyShop',
        component: () => import('@/views/MyShop.vue'),
      },
      // 管理员路由
      {
        path: 'admin',
        name: 'AdminHome',
        component: () => import('@/views/admin/AdminHome.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
      },
      {
        path: 'admin/user-review',
        name: 'UserReview',
        component: () => import('@/views/admin/UserReview.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/invite-codes',
        name: 'InviteCodeManagement',
        component: () => import('@/views/admin/InviteCodeManagement.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/logs',
        name: 'ActivityLogs',
        component: () => import('@/views/admin/ActivityLogs.vue'),
      },
      {
        path: 'admin/campuses',
        name: 'CampusManagement',
        component: () => import('@/views/admin/CampusManagement.vue'),
      },
      {
        path: 'admin/classes',
        name: 'ClassManagement',
        component: () => import('@/views/admin/ClassManagement.vue'),
      },
      {
        path: 'admin/paycodes',
        name: 'PayCodeManagement',
        component: () => import('@/views/admin/PayCodeManagement.vue'),
      },
      {
        path: 'admin/reward-rules',
        name: 'RewardManagement',
        component: () => import('@/views/admin/RewardManagement.vue'),
      },
      {
        path: 'admin/analytics',
        name: 'AdminAnalytics',
        component: () => import('@/views/admin/Analytics.vue'),
        meta: { requiresAdmin: true },
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
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/payment-plans',
        name: 'AdminPaymentPlans',
        component: () => import('@/views/admin/PaymentPlanAdmin.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/imessage-logs',
        name: 'ImessageLogs',
        component: () => import('@/views/admin/ImessageLogs.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/bots',
        name: 'BotManagement',
        component: () => import('@/views/admin/BotManagement.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/bot-chats',
        name: 'BotChats',
        component: () => import('@/views/admin/BotChats.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/qrcode',
        name: 'QRCodeGenerator',
        component: () => import('@/views/admin/QRCodeGenerator.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/interaction',
        name: 'InteractionManagement',
        component: () => import('@/views/admin/InteractionManagement.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/campus-class',
        name: 'CampusClassManagement',
        component: () => import('@/views/admin/CampusClassManagement.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/credit-rules',
        name: 'CreditRuleManagement',
        component: () => import('@/views/admin/CreditRuleManagement.vue'),
        meta: { requiresAdmin: true },
      },
      // 用户付款计划
      {
        path: 'payment-plans',
        name: 'PaymentPlans',
        component: () => import('@/views/PaymentPlans.vue'),
      },
      // 教师路由
      {
        path: 'teacher/classes',
        name: 'TeacherClasses',
        component: () => import('@/views/teacher/MyClasses.vue'),
      },
      {
        path: 'teacher/class/:classId',
        name: 'ClassStudents',
        component: () => import('@/views/teacher/ClassStudents.vue'),
      },
      {
        path: 'teacher/student/:studentId',
        name: 'StudentDetail',
        component: () => import('@/views/teacher/StudentDetail.vue'),
      },
      // 家长路由
      {
        path: 'parent/children',
        name: 'ParentChildren',
        component: () => import('@/views/parent/MyChildren.vue'),
      },
      {
        path: 'parent/child/:childId/records',
        name: 'ChildRecords',
        component: () => import('@/views/parent/ChildRecords.vue'),
      },
      {
        path: 'parent/submissions',
        name: 'ParentSubmissions',
        component: () => import('@/views/parent/ParentSubmissions.vue'),
      },
      {
        path: 'parent/review',
        name: 'ParentReview',
        component: () => import('@/views/parent/ParentReview.vue'),
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

router.afterEach(() => { NProgress.done(); });

// 初始化埋点系统
initAnalytics(router);

export default router;
