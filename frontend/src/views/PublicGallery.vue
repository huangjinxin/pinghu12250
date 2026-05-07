<template>
  <div class="public-gallery">
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
          <router-link to="/gallery" class="nav-link active">作品展示</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
        </nav>
        <div class="header-actions">
          <n-button quaternary size="small" @click="$router.push('/login')">登录</n-button>
          <n-button type="primary" size="small" @click="$router.push('/register')">注册</n-button>
        </div>
        <button class="mobile-menu-btn" @click="showMobileMenu = !showMobileMenu">
          <n-icon :size="24"><MenuOutline /></n-icon>
        </button>
      </div>
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

    <!-- 顶部横幅 -->
    <div class="hero-banner">
      <div class="hero-content">
        <h1 class="hero-title">作品展示</h1>
        <p class="hero-subtitle">探索孩子们的创意世界</p>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- Tab 导航 -->
      <n-card class="tabs-card">
        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="poetry" tab="诗词文章">
            <PublicPoetryTab />
          </n-tab-pane>

          <n-tab-pane name="gallery" tab="少儿画廊">
            <PublicGalleryTab />
          </n-tab-pane>

          <n-tab-pane name="recitation" tab="少儿朗诵">
            <PublicRecitationTab />
          </n-tab-pane>

          <n-tab-pane name="html" tab="HTML作品集">
            <PublicHtmlWorksTab />
          </n-tab-pane>

          <n-tab-pane name="shopping" tab="购物广场">
            <PublicShoppingTab />
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </div>

    <!-- 底部引导 -->
    <div class="footer-cta">
      <div class="cta-content">
        <h3>想要创作自己的作品？</h3>
        <p>登录苹湖少儿空间，展示你的才华！</p>
        <n-button type="primary" @click="$router.push('/register')">
          立即加入
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { NIcon } from 'naive-ui';
import MenuOutline from '@vicons/ionicons5/es/MenuOutline';
import PublicPoetryTab from './public-tabs/PublicPoetryTab.vue';
import PublicGalleryTab from './public-tabs/PublicGalleryTab.vue';
import PublicRecitationTab from './public-tabs/PublicRecitationTab.vue';
import PublicHtmlWorksTab from './public-tabs/PublicHtmlWorksTab.vue';
import PublicShoppingTab from './public-tabs/PublicShoppingTab.vue';

const showMobileMenu = ref(false);
const activeTab = ref('poetry');
</script>

<style scoped>
.public-gallery {
  min-height: 100vh;
  background: #f5f7fa;
  padding-top: 64px;
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
  gap: 24px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
  padding: 8px 0;
}

.nav-link:hover,
.nav-link.active {
  color: #6366f1;
}

.nav-link.active {
  border-bottom: 2px solid #6366f1;
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

.hero-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 20px;
  text-align: center;
  color: white;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hero-subtitle {
  font-size: 20px;
  opacity: 0.9;
  margin-bottom: 30px;
}

.hero-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
}

.tabs-card {
  border-radius: 12px;
}

.tabs-card :deep(.n-tabs-nav) {
  padding: 0 16px;
}

.tabs-card :deep(.n-tab-pane) {
  padding: 20px 0 0 0;
}

.footer-cta {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 50px 20px;
  text-align: center;
  color: white;
  margin-top: 40px;
}

.cta-content h3 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 10px;
}

.cta-content p {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 20px;
}

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

  .hero-banner {
    padding: 40px 15px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 10px;
  }

  .footer-cta {
    padding: 30px 15px;
  }

  .cta-content h3 {
    font-size: 22px;
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
