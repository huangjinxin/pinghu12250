<template>
  <div class="public-gallery">
    <!-- 顶部横幅 -->
    <div class="hero-banner">
      <div class="hero-content">
        <h1 class="hero-title">苹湖少儿空间</h1>
        <p class="hero-subtitle">探索孩子们的创意世界</p>
        <div class="hero-actions">
          <n-button type="primary" size="large" @click="$router.push('/login')">
            登录
          </n-button>
          <n-button size="large" @click="$router.push('/register')">
            注册账号
          </n-button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- Tab 导航 -->
      <n-card class="tabs-card">
        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="poetry" tab="唐诗宋词">
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
import PublicPoetryTab from './public-tabs/PublicPoetryTab.vue';
import PublicGalleryTab from './public-tabs/PublicGalleryTab.vue';
import PublicRecitationTab from './public-tabs/PublicRecitationTab.vue';
import PublicHtmlWorksTab from './public-tabs/PublicHtmlWorksTab.vue';
import PublicShoppingTab from './public-tabs/PublicShoppingTab.vue';

// 默认显示唐诗宋词
const activeTab = ref('poetry');
</script>

<style scoped>
.public-gallery {
  min-height: 100vh;
  background: #f5f7fa;
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

@media (max-width: 640px) {
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
</style>
