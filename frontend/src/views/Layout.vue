<template>
  <div class="min-h-screen bg-gray-50">
    <!-- PC端侧边栏 -->
    <aside class="sidebar hidden lg:block transition-all duration-300" :class="sidebarCollapsed ? 'w-16' : 'w-60'">
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="h-16 flex items-center border-b border-gray-100" :class="sidebarCollapsed ? 'px-3 justify-center' : 'px-6'">
          <router-link to="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold text-sm">苹</span>
            </div>
            <span v-if="!sidebarCollapsed" class="text-lg font-bold text-gray-800">苹湖少儿空间</span>
          </router-link>
        </div>

        <!-- 导航菜单 -->
        <nav class="flex-1 py-4 space-y-1 overflow-y-auto" :class="sidebarCollapsed ? 'px-2' : 'px-3'">
          <template v-for="item in menuItems" :key="item.key">
            <!-- 有子菜单的项 -->
            <div v-if="item.children" class="menu-group">
              <!-- 折叠模式：使用下拉菜单 -->
              <n-popover v-if="sidebarCollapsed" trigger="hover" placement="right-start" :show-arrow="false">
                <template #trigger>
                  <div
                    class="sidebar-nav-item collapsed-item"
                    :class="{ 'active': isMenuItemActive(item) }"
                  >
                    <n-icon :size="20">
                      <component :is="item.icon" />
                    </n-icon>
                  </div>
                </template>
                <div class="collapsed-submenu">
                  <div class="text-sm font-medium text-gray-800 px-3 py-2 border-b border-gray-100">{{ item.label }}</div>
                  <router-link
                    v-for="child in item.children"
                    :key="child.key"
                    :to="child.path"
                    class="collapsed-submenu-item"
                    :class="{ 'active': isActiveRoute(child.path) }"
                  >
                    <n-icon :size="16">
                      <component :is="child.icon" />
                    </n-icon>
                    <span>{{ child.label }}</span>
                  </router-link>
                </div>
              </n-popover>
              <!-- 展开模式：正常显示 -->
              <template v-else>
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
              </template>
            </div>

            <!-- 无子菜单的项 -->
            <n-tooltip v-else-if="sidebarCollapsed" placement="right" :show-arrow="false">
              <template #trigger>
                <router-link
                  :to="item.path"
                  class="sidebar-nav-item collapsed-item"
                  :class="{ 'active': isActiveRoute(item.path) }"
                >
                  <n-icon :size="20">
                    <component :is="item.icon" />
                  </n-icon>
                  <n-badge
                    v-if="item.badge && item.badge() > 0"
                    dot
                    class="collapsed-badge"
                  />
                </router-link>
              </template>
              {{ item.label }}
            </n-tooltip>
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

        <!-- 折叠按钮 -->
        <div class="border-t border-gray-100">
          <button
            @click="toggleSidebarCollapse"
            class="w-full flex items-center justify-center py-3 text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
          >
            <n-icon :size="18">
              <ChevronBackOutline v-if="!sidebarCollapsed" />
              <ChevronForwardOutline v-else />
            </n-icon>
            <span v-if="!sidebarCollapsed" class="ml-2 text-sm">收起侧栏</span>
          </button>
        </div>

        <!-- 用户信息 -->
        <div class="p-4 border-t border-gray-100" :class="sidebarCollapsed ? 'p-2' : 'p-4'">
          <n-tooltip v-if="sidebarCollapsed" placement="right" :show-arrow="false">
            <template #trigger>
              <router-link to="/profile" class="flex items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <AvatarText :username="authStore.user?.username" size="md" />
              </router-link>
            </template>
            {{ authStore.user?.profile?.nickname || authStore.user?.username }}
          </n-tooltip>
          <router-link v-else to="/profile" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
              <span class="text-white font-bold text-sm">苹</span>
            </div>
            <span class="text-lg font-bold text-gray-800">苹湖少儿空间</span>
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
    <header class="top-navbar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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
              <span class="text-white font-bold text-sm">苹</span>
            </div>
            <span class="text-lg font-bold text-gray-800 hidden sm:block">苹湖少儿空间</span>
          </router-link>

          <!-- 搜索框（家长不显示） -->
          <div v-if="!isParent" class="hidden sm:block lg:ml-4">
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
          <!-- 连续天数徽章（家长不显示） -->
          <div v-if="!isParent && currentStreak > 0" class="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg">
            <n-icon :size="18" color="#f97316"><FlameOutline /></n-icon>
            <span class="font-bold text-orange-500 text-sm">{{ currentStreak }}</span>
            <span class="text-orange-400 text-xs hidden md:inline">天</span>
          </div>

          <!-- 积分入口（家长不显示） -->
          <router-link v-if="!isParent" to="/wallet" class="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
            <n-icon :size="18" color="#8b5cf6"><StarOutline /></n-icon>
            <span class="font-bold text-purple-600 text-sm hidden md:inline">{{ userPoints || 0 }}</span>
          </router-link>

          <!-- 消息中心（家长不显示） -->
          <MessageCenter v-if="!isParent" />

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
    <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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

    <!-- 反馈按钮 -->
    <FeedbackButton />
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useSocketStore } from '@/stores/socket';
import { useParentStore } from '@/stores/parent';
import { useMessage, useDialog } from 'naive-ui';
import api from '@/api';
const FeedbackButton = defineAsyncComponent(() => import('@/components/FeedbackButton.vue'));
const MessageCenter = defineAsyncComponent(() => import('@/components/MessageCenter.vue'));
// UI框架图标（始终需要）
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import MenuOutline from '@vicons/ionicons5/es/MenuOutline'
import CloseOutline from '@vicons/ionicons5/es/CloseOutline'
import LogOutOutline from '@vicons/ionicons5/es/LogOutOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronForwardOutline from '@vicons/ionicons5/es/ChevronForwardOutline'
import ChevronBackOutline from '@vicons/ionicons5/es/ChevronBackOutline'
import FlameOutline from '@vicons/ionicons5/es/FlameOutline'
import StarOutline from '@vicons/ionicons5/es/StarOutline'

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();
const socketStore = useSocketStore();
const parentStore = useParentStore();
const message = useMessage();
const dialog = useDialog();

// 响应式状态
const sidebarOpen = ref(false);
const sidebarCollapsed = ref(JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false'));
const searchQuery = ref('');
const showBackToTop = ref(false);
const windowWidth = ref(window.innerWidth);
const walletBalance = ref(0);
const userPoints = ref(0);
const currentStreak = ref(0);
const expandedKeys = ref(JSON.parse(localStorage.getItem('menuExpandedKeys') || '[]'));

// 切换侧边栏折叠
const toggleSidebarCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed.value));
};

// 默认头像

// 设备类型判断
const isMobile = computed(() => windowWidth.value < 768);
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);

// 是否是家长角色
const isParent = computed(() => authStore.user?.role === 'PARENT');

// 家长端"我的孩子"导航标签 - 使用 parentStore 中选中的孩子名字
const parentChildLabel = computed(() => {
  const childName = parentStore.selectedChildName;
  return childName && childName !== '孩子' ? `我的${childName}` : '我的孩子';
});

// 家长端"孩子历程"导航标签 - 跟随选中的孩子变化
const parentSubmissionLabel = computed(() => {
  const childName = parentStore.selectedChildName;
  return childName && childName !== '孩子' ? `${childName}历程` : '孩子历程';
});

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

// 按角色动态加载菜单配置
const roleMenuData = ref(null);
const roleBottomNav = ref(null);

async function loadMenuConfig() {
  const role = authStore.user?.role;
  const baseMod = await import('@/config/menuBase.js');
  let baseItems = [...baseMod.baseMenuItems];
  // 给钱包菜单加badge
  const walletItem = baseItems.find(i => i.key === 'wallet');
  if (walletItem) walletItem.badge = () => walletBalance.value;

  if (role === 'ADMIN') {
    const adminMod = await import('@/config/menuAdmin.js');
    roleMenuData.value = [...adminMod.adminMenuItems, ...baseItems];
    roleBottomNav.value = adminMod.adminBottomNav;
  } else if (role === 'TEACHER') {
    const teacherMod = await import('@/config/menuTeacher.js');
    roleMenuData.value = [...teacherMod.teacherMenuItems, ...baseItems];
    roleBottomNav.value = teacherMod.teacherBottomNav;
  } else if (role === 'PARENT') {
    const { PeopleOutline, EaselOutline, PersonOutline, CreateOutline } = baseMod;
    roleMenuData.value = [
      { key: 'parent-children', path: '/parent/children', label: parentChildLabel.value, icon: PeopleOutline },
      { key: 'works-square', path: '/works', label: '作品展廊', icon: EaselOutline },
      { key: 'parent-submissions', path: '/parent/submissions', label: parentSubmissionLabel.value, icon: CreateOutline },
      { key: 'parent-profile', path: '/profile', label: '我的', icon: PersonOutline },
    ];
    roleBottomNav.value = [
      { path: '/parent/children', label: parentChildLabel.value, icon: PeopleOutline },
      { path: '/works', label: '作品展廊', icon: EaselOutline },
      { path: '/parent/submissions', label: parentSubmissionLabel.value, icon: CreateOutline },
      { path: '/profile', label: '我的', icon: PersonOutline },
    ];
  } else {
    roleMenuData.value = baseItems;
    roleBottomNav.value = baseMod.baseBottomNav;
  }
}

watch(() => authStore.user?.role, loadMenuConfig, { immediate: true });

const menuItems = computed(() => roleMenuData.value || []);
const bottomNavItems = computed(() => roleBottomNav.value || []);

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

// 加载用户积分
const loadUserPoints = async () => {
  try {
    const response = await api.get('/points/my');
    userPoints.value = response.totalPoints || 0;
  } catch (error) {
    console.error('加载积分失败:', error);
  }
};

// 加载连续天数
const loadStreak = async () => {
  try {
    const response = await api.get('/diary-game/stats');
    if (response.success) {
      currentStreak.value = response.data?.currentStreak || 0;
    }
  } catch (error) {
    console.error('加载连续天数失败:', error);
  }
};

// 加载家长的孩子列表（用于动态显示导航标签）
const loadParentChildren = async () => {
  if (!isParent.value) return;
  if (!parentStore.loaded) {
    await parentStore.loadChildren();
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

// 定时器
let walletTimer = null;
let pointsTimer = null;

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  loadWalletBalance(); // 加载钱包余额
  loadUserPoints(); // 加载用户积分
  loadStreak(); // 加载连续天数
  loadParentChildren(); // 加载家长的孩子列表（用于动态导航标签）
  autoExpandActiveMenu(); // 自动展开激活的菜单

  // 定时更新钱包余额（每30秒）
  walletTimer = setInterval(loadWalletBalance, 30000);
  // 定时更新积分（每30秒）
  pointsTimer = setInterval(loadUserPoints, 30000);

  // 初始化聊天系统
  if (authStore.token) {
    socketStore.connect();
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
  if (pointsTimer) {
    clearInterval(pointsTimer);
  }

  // 断开Socket连接
  socketStore.disconnect();
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

/* 折叠模式样式 */
.collapsed-item {
  @apply justify-center px-0 py-2.5;
}

.collapsed-item.active {
  @apply bg-primary-50;
}

.collapsed-badge {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* 折叠模式子菜单 */
.collapsed-submenu {
  min-width: 160px;
}

.collapsed-submenu-item {
  @apply flex items-center gap-2 px-3 py-2 text-sm text-gray-600;
  @apply hover:bg-gray-50 hover:text-gray-900 transition-colors;
}

.collapsed-submenu-item.active {
  @apply text-primary-600 bg-primary-50 font-medium;
}
</style>
