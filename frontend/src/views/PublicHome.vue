<template>
  <div class="public-home">
    <!-- 顶部导航 -->
    <header class="public-header">
      <div class="header-content">
        <div class="logo" @click="$router.push('/home')">
          <span class="logo-icon">🌟</span>
          <span class="logo-text">苹湖少儿空间</span>
        </div>
        <nav class="header-nav">
          <router-link to="/home" class="nav-link">首页</router-link>
          <router-link to="/dashboard" class="nav-link">数据概览</router-link>
          <router-link to="/leaderboard" class="nav-link">排行</router-link>
          <router-link to="/gallery" class="nav-link">作品展示</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
        </nav>
        <div class="header-actions">
          <n-button quaternary @click="$router.push('/login')">登录</n-button>
          <n-button type="primary" @click="$router.push('/register')">注册</n-button>
        </div>
        <!-- 移动端汉堡菜单 -->
        <button class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
          <n-icon :size="24"><MenuOutline /></n-icon>
        </button>
      </div>
      <!-- 移动端菜单 -->
      <transition name="slide">
        <div v-if="showMobileMenu" class="mobile-menu">
          <router-link to="/home" class="mobile-nav-link" @click="showMobileMenu = false">首页</router-link>
          <router-link to="/dashboard" class="mobile-nav-link" @click="showMobileMenu = false">数据概览</router-link>
          <router-link to="/leaderboard" class="mobile-nav-link" @click="showMobileMenu = false">排行</router-link>
          <router-link to="/gallery" class="mobile-nav-link" @click="showMobileMenu = false">作品展示</router-link>
          <router-link to="/about" class="mobile-nav-link" @click="showMobileMenu = false">关于</router-link>
          <div class="mobile-actions">
            <n-button block @click="$router.push('/login'); showMobileMenu = false">登录</n-button>
            <n-button block type="primary" @click="$router.push('/register'); showMobileMenu = false">注册</n-button>
          </div>
        </div>
      </transition>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h1 class="hero-title">让每个孩子都能快乐成长</h1>
        <p class="hero-subtitle">记录学习点滴，见证成长每一天</p>
        <div class="hero-actions">
          <n-button type="primary" size="large" @click="openLoginModal">
            <template #icon><n-icon><RocketOutline /></n-icon></template>
            立即开始学习
          </n-button>
          <n-button size="large" @click="$router.push('/gallery')">
            <template #icon><n-icon><EyeOutline /></n-icon></template>
            浏览作品
          </n-button>
        </div>
      </div>
    </section>

    <!-- 数据概览 -->
    <section id="stats" class="section stats-section">
      <div class="section-header">
        <h2 class="section-title">📊 平台数据</h2>
        <router-link to="/dashboard" class="section-link">查看详细 →</router-link>
      </div>
      <n-spin :show="loadingStats">
        <n-grid :cols="xs ? 1 : sm ? 2 : md ? 3 : 4" :x-gap="20" :y-gap="20">
          <n-gi v-for="stat in statsData" :key="stat.key">
            <StatCard
              :title="stat.title"
              :value="stat.value"
              :icon="stat.icon"
              :color="stat.color"
              theme="light"
            />
          </n-gi>
        </n-grid>
      </n-spin>
    </section>

    <!-- 进度排行 -->
    <section id="leaderboard" class="section leaderboard-section">
      <div class="section-header">
        <h2 class="section-title">🏆 今日进度</h2>
        <router-link to="/leaderboard" class="section-link">查看完整排行 →</router-link>
      </div>
      <n-spin :show="loadingLeaderboard">
        <div class="leaderboard-preview">
          <div
            v-for="(student, index) in leaderboardPreview"
            :key="student.id"
            class="preview-card"
            :class="getRankClass(index)"
          >
            <div class="rank-badge">{{ index + 1 }}</div>
            <div class="student-info">
              <div class="avatar">{{ student.name?.[0] || '?' }}</div>
              <span class="name">{{ student.name }}</span>
            </div>
            <div class="completion-rate">
              {{ student.completionRate }}%
            </div>
          </div>
        </div>
      </n-spin>
    </section>

    <!-- 作品展示 -->
    <section id="works" class="section works-section">
      <div class="section-header">
        <h2 class="section-title">🎨 精选作品</h2>
        <router-link to="/gallery" class="section-link">查看更多 →</router-link>
      </div>
      <n-spin :show="loadingWorks">
        <n-carousel show-arrow :interval="5000" :show-dots="xs ? false : true">
          <div v-for="(group, idx) in worksPreview" :key="idx" class="works-carousel">
            <div class="works-grid">
              <div
                v-for="work in group"
                :key="work.id"
                class="work-card"
                @click="viewWork(work)"
              >
                <n-image
                  :src="work.thumbnail"
                  object-fit="cover"
                  class="work-image"
                  :preview-disabled="true"
                />
                <div class="work-overlay">
                  <span class="work-title">{{ work.title }}</span>
                  <span class="work-author">{{ work.author }}</span>
                </div>
              </div>
            </div>
          </div>
        </n-carousel>
      </n-spin>
    </section>

    <!-- 关于我们 -->
    <section id="about" class="section about-section">
      <div class="section-header">
        <h2 class="section-title">ℹ️ 关于我们</h2>
        <router-link to="/about" class="section-link">了解更多 →</router-link>
      </div>
      <div class="about-preview">
        <div class="about-card" v-for="item in aboutItems" :key="item.title">
          <div class="about-icon">{{ item.icon }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="public-footer">
      <p>© 2024 苹湖少儿空间 - 让每个孩子都能快乐成长</p>
      <div class="footer-links">
        <router-link to="/about">关于我们</router-link>
        <router-link to="/login">登录</router-link>
        <router-link to="/register">注册</router-link>
      </div>
    </footer>

    <!-- 登录 Modal -->
    <n-modal v-model:show="showLoginModal" :mask-closable="true" preset="card" style="width: 420px;" title="登录">
      <LoginForm @success="handleLoginSuccess" @register="$router.push('/register'); showLoginModal = false" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NGrid, NGi, NSpin, NCarousel, NImage, NModal, useDialog, useMessage } from 'naive-ui';
import { useThemeVars } from 'naive-ui';
import MenuOutline from '@vicons/ionicons5/es/MenuOutline';
import RocketOutline from '@vicons/ionicons5/es/RocketOutline';
import EyeOutline from '@vicons/ionicons5/es/EyeOutline';
import StatCard from '@/components/dashboard/StatCard.vue';
import LoginForm from '@/components/public/LoginForm.vue';
import { analyticsAPI, publicAPI } from '@/api';

const router = useRouter();
const message = useMessage();
const themeVars = useThemeVars();

const showMobileMenu = ref(false);
const showLoginModal = ref(false);
const loadingStats = ref(true);
const loadingLeaderboard = ref(true);
const loadingWorks = ref(true);

const statsData = ref([]);
const leaderboardPreview = ref([]);
const worksPreview = ref([]);

const xs = ref(window.innerWidth < 640);
const sm = ref(window.innerWidth < 768);
const md = ref(window.innerWidth < 1024);

const aboutItems = [
  { icon: '📚', title: '丰富资源', description: '汇集海量学习内容' },
  { icon: '🏆', title: '趣味挑战', description: '每日任务激发学习兴趣' },
  { icon: '📊', title: '成长记录', description: '可视化追踪学习进度' },
  { icon: '🤝', title: '社区互动', description: '分享作品交流心得' },
];

const openLoginModal = () => {
  showLoginModal.value = true;
};

const handleLoginSuccess = () => {
  showLoginModal.value = false;
  message.success('登录成功');
  router.push('/');
};

const getRankClass = (index) => {
  if (index === 0) return 'rank-1';
  if (index === 1) return 'rank-2';
  if (index === 2) return 'rank-3';
  return '';
};

const viewWork = (work) => {
  router.push(work.url);
};

const loadStats = async () => {
  try {
    const result = await analyticsAPI.getPublicDashboard();
    if (result.success) {
      const { userStats, contentStats, pointsStats } = result.data;
      statsData.value = [
        {
          key: 'totalUsers',
          title: '总用户数',
          value: userStats?.total || 0,
          icon: 'users',
          color: '#409eff',
        },
        {
          key: 'todayActive',
          title: '今日活跃',
          value: userStats?.todayActive || 0,
          icon: 'flash',
          color: '#36cfc9',
        },
        {
          key: 'contentTotal',
          title: '内容总量',
          value: contentStats?.total || 0,
          icon: 'document',
          color: '#722ed1',
        },
        {
          key: 'todayPoints',
          title: '今日积分',
          value: pointsStats?.todayIssued || 0,
          icon: 'trophy',
          color: '#f0a020',
        },
      ];
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  } finally {
    loadingStats.value = false;
  }
};

const loadLeaderboard = async () => {
  try {
    const timezoneOffset = -new Date().getTimezoneOffset();
    const response = await fetch(`/api/public/leaderboard?timezoneOffset=${timezoneOffset}&limit=10`);
    const data = await response.json();
    if (data.success) {
      leaderboardPreview.value = data.data.leaderboard.slice(0, 10).map(student => ({
        id: student.id,
        name: student.name,
        avatar: student.avatar,
        completionRate: Math.round((student.approvedCount / 6) * 100),
      }));
    }
  } catch (error) {
    console.error('加载排行榜失败:', error);
  } finally {
    loadingLeaderboard.value = false;
  }
};

const loadWorks = async () => {
  try {
    const result = await publicAPI.getWorksFeed({ limit: 8, type: 'gallery' });
    if (result.success) {
      const works = result.data.items || [];
      const groups = [];
      for (let i = 0; i < works.length; i += 4) {
        groups.push(works.slice(i, i + 4).map(work => ({
          id: work.id,
          title: work.title || '作品',
          author: work.author?.nickname || work.author?.username || '匿名',
          thumbnail: work.images?.[0] || work.thumbnail || '',
          url: `/gallery/${work.id}`,
        })));
      }
      worksPreview.value = groups.length > 0 ? groups : [[{ id: 0, title: '暂无作品', author: '', thumbnail: '', url: '/gallery' }]];
    }
  } catch (error) {
    console.error('加载作品失败:', error);
    worksPreview.value = [[{ id: 0, title: '暂无作品', author: '', thumbnail: '', url: '/gallery' }]];
  } finally {
    loadingWorks.value = false;
  }
};

const handleResize = () => {
  xs.value = window.innerWidth < 640;
  sm.value = window.innerWidth < 768;
  md.value = window.innerWidth < 1024;
};

onMounted(() => {
  loadStats();
  loadLeaderboard();
  loadWorks();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.public-home {
  min-height: 100vh;
  background: #f8fafc;
}

/* Header */
.public-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.header-nav {
  display: flex;
  gap: 32px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #6366f1;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.mobile-menu {
  display: none;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.mobile-nav-link {
  display: block;
  padding: 12px 0;
  color: #64748b;
  text-decoration: none;
  font-size: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

/* Hero */
.hero {
  position: relative;
  padding: 160px 20px 100px;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
}

.hero-content {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Sections */
.section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
}

.section-link {
  color: #6366f1;
  text-decoration: none;
  font-size: 14px;
}

/* Stats */
.stats-section {
  background: white;
}

/* Leaderboard Preview */
.leaderboard-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  background: #f1f5f9;
  color: #64748b;
}

.rank-1 .rank-badge {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.rank-2 .rank-badge {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: white;
}

.rank-3 .rank-badge {
  background: linear-gradient(135deg, #cd7f32, #b45309);
  color: white;
}

.student-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.name {
  font-weight: 500;
  color: #1e293b;
}

.completion-rate {
  font-weight: 600;
  color: #6366f1;
  font-size: 18px;
}

/* Works */
.works-carousel {
  padding: 20px 0;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 0 20px;
}

.work-card {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.work-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.work-card:hover .work-image {
  transform: scale(1.05);
}

.work-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
}

.work-title {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.work-author {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

/* About */
.about-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.about-card {
  text-align: center;
  padding: 32px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.about-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.about-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.about-card p {
  color: #64748b;
  font-size: 14px;
}

/* Footer */
.public-footer {
  background: #1e293b;
  color: #94a3b8;
  padding: 32px 20px;
  text-align: center;
}

.footer-links {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 16px;
}

.footer-links a {
  color: #94a3b8;
  text-decoration: none;
}

.footer-links a:hover {
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .header-nav,
  .header-actions {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-menu {
    display: block;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .section {
    padding: 60px 16px;
  }

  .section-title {
    font-size: 24px;
  }

  .leaderboard-preview {
    grid-template-columns: 1fr;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
