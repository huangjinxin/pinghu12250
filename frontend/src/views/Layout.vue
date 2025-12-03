<template>
  <div class="min-h-screen bg-gray-50">
    <!-- PC端侧边栏 -->
    <aside class="sidebar w-60 hidden lg:block">
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-gray-100">
          <router-link to="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">平</span>
            </div>
            <span class="text-lg font-bold text-gray-800">平湖少儿空间</span>
          </router-link>
        </div>

        <!-- 导航菜单 -->
        <nav class="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <template v-for="item in menuItems" :key="item.key">
            <!-- 有子菜单的项 -->
            <div v-if="item.children" class="menu-group">
              <div
                class="menu-group-header"
                :class="{ 'active': isMenuItemActive(item) }"
                @click="toggleExpanded(item.key)"
              >
                <div class="flex items-center space-x-3 flex-1">
                  <n-icon :size="20">
                    <component :is="item.icon" />
                  </n-icon>
                  <span>{{ item.label }}</span>
                </div>
                <n-icon :size="16" class="expand-icon" :class="{ 'expanded': isExpanded(item.key) }">
                  <ChevronDownOutline />
                </n-icon>
              </div>
              <transition name="menu-collapse">
                <div v-show="isExpanded(item.key)" class="menu-children">
                  <router-link
                    v-for="child in item.children"
                    :key="child.key"
                    :to="child.path"
                    class="menu-child-item"
                    :class="{ 'active': isActiveRoute(child.path) }"
                  >
                    <n-icon :size="18">
                      <component :is="child.icon" />
                    </n-icon>
                    <span>{{ child.label }}</span>
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- 无子菜单的项 -->
            <router-link
              v-else
              :to="item.path"
              class="sidebar-nav-item"
              :class="{ 'active': isActiveRoute(item.path) }"
            >
              <n-icon :size="20">
                <component :is="item.icon" />
              </n-icon>
              <span>{{ item.label }}</span>
              <n-badge
                v-if="item.badge"
                :value="item.badge()"
                :max="999"
                class="ml-auto"
                size="small"
              />
            </router-link>
          </template>
        </nav>

        <!-- 用户信息 -->
        <div class="p-4 border-t border-gray-100">
          <router-link to="/profile" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <AvatarText :username="authStore.user?.username" size="md" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ authStore.user?.profile?.nickname || authStore.user?.username }}
              </p>
              <p class="text-xs text-gray-500">{{ roleLabel }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </aside>

    <!-- 平板端侧边栏遮罩 -->
    <transition name="fade">
      <div
        v-if="sidebarOpen && isTablet"
        class="sidebar-overlay"
        @click="sidebarOpen = false"
      ></div>
    </transition>

    <!-- 平板端可折叠侧边栏 -->
    <aside
      v-if="isTablet"
      class="sidebar w-60"
      :class="{ '-translate-x-full': !sidebarOpen }"
    >
      <div class="flex flex-col h-full">
        <div class="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <router-link to="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">平</span>
            </div>
            <span class="text-lg font-bold text-gray-800">平湖少儿空间</span>
          </router-link>
          <button @click="sidebarOpen = false" class="p-1 rounded hover:bg-gray-100">
            <n-icon :size="20"><CloseOutline /></n-icon>
          </button>
        </div>

        <nav class="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <template v-for="item in menuItems" :key="item.key">
            <!-- 有子菜单的项 -->
            <div v-if="item.children" class="menu-group">
              <div
                class="menu-group-header"
                :class="{ 'active': isMenuItemActive(item) }"
                @click="toggleExpanded(item.key)"
              >
                <div class="flex items-center space-x-3 flex-1">
                  <n-icon :size="20">
                    <component :is="item.icon" />
                  </n-icon>
                  <span>{{ item.label }}</span>
                </div>
                <n-icon :size="16" class="expand-icon" :class="{ 'expanded': isExpanded(item.key) }">
                  <ChevronDownOutline />
                </n-icon>
              </div>
              <transition name="menu-collapse">
                <div v-show="isExpanded(item.key)" class="menu-children">
                  <router-link
                    v-for="child in item.children"
                    :key="child.key"
                    :to="child.path"
                    class="menu-child-item"
                    :class="{ 'active': isActiveRoute(child.path) }"
                    @click="sidebarOpen = false"
                  >
                    <n-icon :size="18">
                      <component :is="child.icon" />
                    </n-icon>
                    <span>{{ child.label }}</span>
                  </router-link>
                </div>
              </transition>
            </div>

            <!-- 无子菜单的项 -->
            <router-link
              v-else
              :to="item.path"
              class="sidebar-nav-item"
              :class="{ 'active': isActiveRoute(item.path) }"
              @click="sidebarOpen = false"
            >
              <n-icon :size="20">
                <component :is="item.icon" />
              </n-icon>
              <span>{{ item.label }}</span>
              <n-badge
                v-if="item.badge"
                :value="item.badge()"
                :max="999"
                class="ml-auto"
                size="small"
              />
            </router-link>
          </template>
        </nav>

        <div class="p-4 border-t border-gray-100">
          <router-link to="/profile" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50" @click="sidebarOpen = false">
            <AvatarText :username="authStore.user?.username" size="md" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">
                {{ authStore.user?.profile?.nickname || authStore.user?.username }}
              </p>
              <p class="text-xs text-gray-500">{{ roleLabel }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </aside>

    <!-- 顶部导航栏 -->
    <header class="top-navbar">
      <div class="h-16 flex items-center justify-between px-4 lg:px-6">
        <!-- 左侧 -->
        <div class="flex items-center space-x-4">
          <!-- 汉堡菜单 (平板端) -->
          <button
            v-if="isTablet"
            @click="sidebarOpen = true"
            class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <n-icon :size="24"><MenuOutline /></n-icon>
          </button>

          <!-- 移动端 Logo -->
          <router-link to="/" class="lg:hidden flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">平</span>
            </div>
            <span class="text-lg font-bold text-gray-800 hidden sm:block">平湖少儿空间</span>
          </router-link>

          <!-- 搜索框 -->
          <div class="hidden sm:block lg:ml-4">
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索..."
              round
              clearable
              style="width: 200px"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="flex items-center space-x-3">
          <!-- 金币余额 -->
          <router-link to="/wallet" class="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition-colors">
            <n-icon :size="18" color="#f59e0b"><Wallet /></n-icon>
            <span class="font-bold text-yellow-600 text-sm hidden md:inline">{{ Number(walletBalance || 0).toFixed(2) }}</span>
          </router-link>

          <!-- 消息中心 -->
          <MessageCenter />

          <!-- 用户头像 (非PC端) -->
          <router-link to="/profile" class="lg:hidden">
            <AvatarText :username="authStore.user?.username" size="md" />
          </router-link>

          <!-- 退出按钮 (PC端) -->
          <n-button
            text
            @click="handleLogout"
            class="hidden lg:flex"
          >
            <template #icon>
              <n-icon><LogOutOutline /></n-icon>
            </template>
            退出登录
          </n-button>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main-content">
      <div class="p-4 lg:p-6">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 移动端底部导航栏 -->
    <nav v-if="isMobile" class="bottom-nav">
      <div class="flex items-center justify-around h-14">
        <router-link
          v-for="item in bottomNavItems"
          :key="item.path"
          :to="item.path"
          class="bottom-nav-item"
          :class="{ 'active': isActiveRoute(item.path) }"
        >
          <n-icon :size="22">
            <component :is="item.icon" />
          </n-icon>
          <span class="text-xs mt-0.5">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- 返回顶部按钮 -->
    <button
      class="back-to-top"
      :class="{ 'visible': showBackToTop }"
      @click="scrollToTop"
    >
      <n-icon :size="20"><ChevronUpOutline /></n-icon>
    </button>

    <!-- 聊天面板 -->
    <ChatPanel />
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useMessage, useDialog } from 'naive-ui';
import api from '@/api';
import { connectSocket, disconnectSocket, setChatStore } from '@/socket';
import ChatPanel from '@/components/ChatPanel.vue';
import MessageCenter from '@/components/MessageCenter.vue';
import {
  HomeOutline,
  TimeOutline,
  CodeSlashOutline,
  CheckboxOutline,
  CalendarOutline,
  PersonOutline,
  SearchOutline,
  NotificationsOutline,
  MenuOutline,
  CloseOutline,
  LogOutOutline,
  ChevronUpOutline,
  BookOutline,
  CreateOutline,
  BusinessOutline,
  SchoolOutline,
  PeopleOutline,
  StatsChartOutline,
  ListOutline,
  DocumentTextOutline,
  TrophyOutline,
  GameControllerOutline,
  LibraryOutline,
  TimerOutline,
  FlagOutline,
  Pricetags,
  Ribbon,
  PersonAdd,
  Cart,
  Wallet,
  BrushOutline,
  SettingsOutline,
  StarOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  EaselOutline,
  BagHandleOutline,
  StorefrontOutline,
  HelpCircleOutline,
  QrCodeOutline,
  MusicalNotesOutline,
  FilmOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();
const message = useMessage();
const dialog = useDialog();

// 响应式状态
const sidebarOpen = ref(false);
const searchQuery = ref('');
const showBackToTop = ref(false);
const windowWidth = ref(window.innerWidth);
const walletBalance = ref(0);
const expandedKeys = ref(JSON.parse(localStorage.getItem('menuExpandedKeys') || '[]'));

// 默认头像

// 设备类型判断
const isMobile = computed(() => windowWidth.value < 768);
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);

// 用户角色标签
const roleLabel = computed(() => {
  const role = authStore.user?.role;
  const labels = {
    STUDENT: '学生',
    PARENT: '家长',
    TEACHER: '老师',
    ADMIN: '管理员',
  };
  return labels[role] || '用户';
});

// 学生基础菜单结构（7个一级菜单）
const baseMenuItems = [
  {
    key: 'home',
    path: '/',
    label: '首页',
    icon: HomeOutline
  },

  {
    key: 'learning',
    label: '我的学习',
    icon: LibraryOutline,
    children: [
      { key: 'diaries', path: '/diaries', icon: BookOutline, label: '日记' },
      { key: 'homeworks', path: '/homeworks', icon: DocumentTextOutline, label: '作业' },
      { key: 'books', path: '/books', icon: BookOutline, label: '读书' },
      { key: 'music', path: '/music', icon: MusicalNotesOutline, label: '音乐' },
      { key: 'movies', path: '/movies', icon: FilmOutline, label: '影视' },
      { key: 'learning-tracker', path: '/learning-tracker', icon: TimerOutline, label: '学习追踪' },
    ]
  },

  {
    key: 'works-center',
    label: '作品中心',
    icon: EaselOutline,
    children: [
      { key: 'works-square', path: '/works', icon: CodeSlashOutline, label: '作品广场' },
      { key: 'my-works', path: '/works/my', icon: BrushOutline, label: '我的创作' },
      { key: 'market', path: '/market', icon: Cart, label: '作品市集' },
      { key: 'my-purchases', path: '/my-purchases', icon: BagHandleOutline, label: '我的购买' },
      { key: 'my-shop', path: '/my-shop', icon: StorefrontOutline, label: '我的商店' },
    ]
  },

  {
    key: 'games',
    path: '/games',
    label: '游戏大厅',
    icon: GameControllerOutline
  },

  {
    key: 'growth',
    label: '成长激励',
    icon: TrophyOutline,
    children: [
      { key: 'challenges', path: '/challenges', icon: FlagOutline, label: '每日挑战' },
      { key: 'achievements', path: '/achievements', icon: Ribbon, label: '成就中心' },
      { key: 'points', path: '/points', icon: StarOutline, label: '积分中心' },
    ]
  },

  {
    key: 'social',
    label: '社交互动',
    icon: PeopleOutline,
    children: [
      { key: 'friends', path: '/friends', icon: PersonAdd, label: '好友' },
      { key: 'timeline', path: '/timeline', icon: TimeOutline, label: '动态' },
      { key: 'tags', path: '/tags', icon: Pricetags, label: '标签广场' },
      { key: 'questions', path: '/questions', icon: HelpCircleOutline, label: '知识问答' },
    ]
  },

  {
    key: 'tools',
    label: '工具箱',
    icon: SettingsOutline,
    children: [
      { key: 'tasks', path: '/tasks', icon: CheckboxOutline, label: '任务看板' },
      { key: 'calendar', path: '/calendar', icon: CalendarOutline, label: '日历' },
      { key: 'statistics', path: '/statistics', icon: StatsChartOutline, label: '统计' },
    ]
  },

  {
    key: 'wallet',
    path: '/wallet',
    label: '我的钱包',
    icon: Wallet,
    badge: () => walletBalance.value
  },

  {
    key: 'profile',
    path: '/profile',
    label: '个人中心',
    icon: PersonOutline
  },
];

// 管理员专属菜单（放在最前面）
const adminMenuItems = [
  {
    key: 'admin',
    label: '系统管理',
    icon: SettingsOutline,
    children: [
      { key: 'admin-users', path: '/admin/users', icon: PeopleOutline, label: '用户管理' },
      { key: 'admin-campuses', path: '/admin/campuses', icon: BusinessOutline, label: '校区管理' },
      { key: 'admin-classes', path: '/admin/classes', icon: SchoolOutline, label: '班级管理' },
      { key: 'admin-games', path: '/admin/games', icon: GameControllerOutline, label: '游戏管理' },
      { key: 'admin-paycodes', path: '/admin/paycodes', icon: QrCodeOutline, label: '收款码管理' },
      { key: 'admin-logs', path: '/admin/logs', icon: ListOutline, label: '活动日志' },
    ]
  },
];

// 老师专属菜单
const teacherMenuItems = [
  {
    key: 'teacher-classes',
    path: '/teacher/classes',
    label: '我的班级',
    icon: SchoolOutline
  },
];

// 家长专属菜单
const parentMenuItems = [
  {
    key: 'parent-children',
    path: '/parent/children',
    label: '我的孩子',
    icon: PeopleOutline
  },
];

// 侧边栏菜单项 (根据角色动态生成)
const menuItems = computed(() => {
  const role = authStore.user?.role;
  let items = [];

  // 根据角色添加专属菜单
  if (role === 'ADMIN') {
    items = [...adminMenuItems, ...baseMenuItems];
  } else if (role === 'TEACHER') {
    items = [...teacherMenuItems, ...baseMenuItems];
  } else if (role === 'PARENT') {
    items = [...parentMenuItems, ...baseMenuItems];
  } else {
    items = [...baseMenuItems];
  }

  return items;
});

// 底部导航项 (移动端，根据角色动态生成)
const bottomNavItems = computed(() => {
  const role = authStore.user?.role;

  // 管理员移动端导航
  if (role === 'ADMIN') {
    return [
      { path: '/', label: '首页', icon: HomeOutline },
      { path: '/admin/users', label: '管理', icon: SettingsOutline },
      { path: '/works', label: '作品', icon: EaselOutline },
      { path: '/timeline', label: '社交', icon: PeopleOutline },
      { path: '/profile', label: '我的', icon: PersonOutline },
    ];
  }

  // 老师移动端导航
  if (role === 'TEACHER') {
    return [
      { path: '/', label: '首页', icon: HomeOutline },
      { path: '/teacher/classes', label: '班级', icon: SchoolOutline },
      { path: '/works', label: '作品', icon: EaselOutline },
      { path: '/timeline', label: '社交', icon: PeopleOutline },
      { path: '/profile', label: '我的', icon: PersonOutline },
    ];
  }

  // 家长移动端导航
  if (role === 'PARENT') {
    return [
      { path: '/', label: '首页', icon: HomeOutline },
      { path: '/parent/children', label: '孩子', icon: PeopleOutline },
      { path: '/works', label: '作品', icon: EaselOutline },
      { path: '/timeline', label: '社交', icon: TimeOutline },
      { path: '/profile', label: '我的', icon: PersonOutline },
    ];
  }

  // 学生/默认移动端导航
  return [
    { path: '/', label: '首页', icon: HomeOutline },
    { path: '/diaries', label: '学习', icon: LibraryOutline },
    { path: '/works', label: '作品', icon: EaselOutline },
    { path: '/friends', label: '社交', icon: PeopleOutline },
    { path: '/profile', label: '我的', icon: PersonOutline },
  ];
});

// 判断当前路由是否激活
const isActiveRoute = (path) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

// 判断菜单项是否包含当前路由
const isMenuItemActive = (item) => {
  if (item.path) {
    return isActiveRoute(item.path);
  }
  if (item.children) {
    return item.children.some(child => isActiveRoute(child.path));
  }
  return false;
};

// 切换菜单展开状态
const toggleExpanded = (key) => {
  const index = expandedKeys.value.indexOf(key);
  if (index > -1) {
    expandedKeys.value.splice(index, 1);
  } else {
    expandedKeys.value.push(key);
  }
  localStorage.setItem('menuExpandedKeys', JSON.stringify(expandedKeys.value));
};

// 判断菜单是否展开
const isExpanded = (key) => {
  return expandedKeys.value.includes(key);
};

// 搜索跳转
const handleSearch = () => {
  if (searchQuery.value && searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } });
    searchQuery.value = '';
  }
};

// 退出登录
const handleLogout = () => {
  dialog.warning({
    title: '确认退出',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      authStore.logout();
      message.success('已退出登录');
      router.push('/login');
    },
  });
};

// 返回顶部
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 监听滚动显示返回顶部按钮
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 300;
};

// 监听窗口大小变化
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value >= 1024) {
    sidebarOpen.value = false;
  }
};

// 加载钱包余额
const loadWalletBalance = async () => {
  try {
    const response = await api.get('/wallet');
    walletBalance.value = response.wallet?.balance || 0;
  } catch (error) {
    // 静默失败，不影响页面显示
    console.error('加载钱包余额失败:', error);
  }
};

// 自动展开包含当前路由的菜单项
const autoExpandActiveMenu = () => {
  menuItems.value.forEach(item => {
    if (item.children && isMenuItemActive(item)) {
      if (!expandedKeys.value.includes(item.key)) {
        expandedKeys.value.push(item.key);
      }
    }
  });
};

// 钱包余额定时器
let walletTimer = null;

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  loadWalletBalance(); // 加载钱包余额
  autoExpandActiveMenu(); // 自动展开激活的菜单

  // 定时更新钱包余额（每30秒）
  walletTimer = setInterval(loadWalletBalance, 30000);

  // 初始化聊天系统
  if (authStore.token) {
    setChatStore(chatStore);
    connectSocket(authStore.token);
    chatStore.loadConversations();
    chatStore.loadSystemMessages();

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
  if (walletTimer) {
    clearInterval(walletTimer);
  }

  // 断开Socket连接
  disconnectSocket();
});
</script>

<style scoped>
/* 一级菜单项 */
.sidebar-nav-item {
  @apply flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-600 transition-all duration-200;
  @apply hover:bg-gray-50 hover:text-gray-900;
}

.sidebar-nav-item.active {
  @apply bg-primary-50 text-primary-600 font-medium;
}

.sidebar-nav-item.active:hover {
  @apply bg-primary-100;
}

/* 菜单组 */
.menu-group {
  @apply mb-1;
}

.menu-group-header {
  @apply flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 cursor-pointer;
  @apply transition-all duration-200 hover:bg-gray-50 hover:text-gray-900;
}

.menu-group-header.active {
  @apply text-primary-600 font-medium;
}

.menu-group-header:hover {
  @apply bg-gray-50;
}

/* 展开图标动画 */
.expand-icon {
  @apply transition-transform duration-200;
}

.expand-icon.expanded {
  @apply rotate-180;
}

/* 子菜单容器 */
.menu-children {
  @apply mt-1 space-y-1;
}

/* 子菜单项 */
.menu-child-item {
  @apply flex items-center space-x-2 pl-11 pr-3 py-2 rounded-lg text-sm text-gray-600;
  @apply transition-all duration-200 hover:bg-gray-50 hover:text-gray-900;
}

.menu-child-item.active {
  @apply bg-primary-50 text-primary-600 font-medium;
}

.menu-child-item.active:hover {
  @apply bg-primary-100;
}

/* 折叠动画 */
.menu-collapse-enter-active,
.menu-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.menu-collapse-enter-from,
.menu-collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.menu-collapse-enter-to,
.menu-collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
