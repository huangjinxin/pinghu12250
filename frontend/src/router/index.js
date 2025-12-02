/**
 * Vue Router 配置
 */

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
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
        path: 'timeline',
        name: 'Timeline',
        component: () => import('@/views/Timeline.vue'),
      },
      {
        path: 'diaries',
        name: 'Diaries',
        component: () => import('@/views/Diaries.vue'),
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
        path: 'works',
        name: 'Works',
        component: () => import('@/views/Works.vue'),
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
        path: 'timer/:projectId',
        name: 'Timer',
        component: () => import('@/views/Timer.vue'),
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/Points.vue'),
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/Notifications.vue'),
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/views/Search.vue'),
      },
      // 游戏记录路由
      {
        path: 'games',
        name: 'GameHall',
        component: () => import('@/views/GameHall.vue'),
      },
      {
        path: 'my-games',
        name: 'MyGames',
        component: () => import('@/views/MyGames.vue'),
      },
      {
        path: 'games/:id',
        name: 'GameDetail',
        component: () => import('@/views/GameDetail.vue'),
      },
      {
        path: 'games/review/:id',
        name: 'LongReviewDetail',
        component: () => import('@/views/LongReviewDetail.vue'),
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
        component: () => import('@/views/Achievements.vue'),
      },
      {
        path: 'achievements/:id',
        name: 'AchievementDetail',
        component: () => import('@/views/AchievementDetail.vue'),
      },
      // 好友系统
      {
        path: 'friends',
        name: 'Friends',
        component: () => import('@/views/Friends.vue'),
      },
      {
        path: 'friends/leaderboard',
        name: 'FriendsLeaderboard',
        component: () => import('@/views/FriendsLeaderboard.vue'),
      },
      {
        path: 'users/:userId',
        name: 'UserProfile',
        component: () => import('@/views/UserProfile.vue'),
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
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
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
        path: 'admin/games',
        name: 'GameManagement',
        component: () => import('@/views/admin/GameManagement.vue'),
      },
      {
        path: 'admin/paycodes',
        name: 'PayCodeManagement',
        component: () => import('@/views/admin/PayCodeManagement.vue'),
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
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
