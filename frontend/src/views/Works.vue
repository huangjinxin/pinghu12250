<template>
  <div class="works-page space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">创意作品</h1>
        <p class="text-gray-500 mt-1">探索和分享精彩作品</p>
      </div>
      <n-space>
        <n-button @click="$router.push('/textbook/workspace')">
          <template #icon><n-icon><BookOutline /></n-icon></template>
          学生入口
        </n-button>
        <n-button v-if="activeTab === 'html'" type="primary" @click="$router.push('/works/create')">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          创建作品
        </n-button>
        <n-button v-else-if="activeTab === 'poetry'" type="primary" @click="$router.push('/works/my')">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          去创作诗词
        </n-button>
      </n-space>
    </div>

    <!-- Tab 导航 -->
    <n-card class="tabs-card">
      <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="gallery" tab="少儿画廊">
          <GalleryTab />
        </n-tab-pane>

        <n-tab-pane name="recitation" tab="少儿朗诵">
          <RecitationTab />
        </n-tab-pane>

        <n-tab-pane name="html" tab="HTML作品集">
          <HtmlWorksTab />
        </n-tab-pane>

        <n-tab-pane name="poetry" tab="唐诗宋词">
          <PoetryWorksTab />
        </n-tab-pane>

        <n-tab-pane name="shopping" tab="购物广场">
          <ShoppingTab />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { AddOutline, BookOutline } from '@vicons/ionicons5';
import GalleryTab from './works-tabs/GalleryTab.vue';
import RecitationTab from './works-tabs/RecitationTab.vue';
import HtmlWorksTab from './works-tabs/HtmlWorksTab.vue';
import PoetryWorksTab from './works-tabs/PoetryWorksTab.vue';
import ShoppingTab from './works-tabs/ShoppingTab.vue';

const route = useRoute();

// 默认显示唐诗宋词
const activeTab = ref('poetry');

// Tab 切换处理
const handleTabChange = (tabName) => {
  // 可以在这里添加额外的逻辑
  console.log('切换到:', tabName);
};

// 初始化时检查 URL 参数
onMounted(() => {
  const tabParam = route.query.tab;
  if (tabParam && ['gallery', 'recitation', 'html', 'poetry', 'shopping'].includes(tabParam)) {
    activeTab.value = tabParam;
  }
});
</script>

<style scoped>
.works-page {
  padding: 0;
}

.tabs-card :deep(.n-tabs-nav) {
  padding: 0 16px;
}

.tabs-card :deep(.n-tab-pane) {
  padding: 16px 0 0 0;
}
</style>
