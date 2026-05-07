<template>
  <div class="works-page space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">作品展廊</h1>
        <p class="text-gray-500 mt-1">探索和分享精彩作品</p>
      </div>
      <n-space>
        <n-button @click="$router.push('/textbook/workspace')">
          <template #icon><n-icon><BookOutline /></n-icon></template>
          学生入口
        </n-button>
        <n-button v-if="isCreativeTab" type="primary" @click="$router.push('/works/my')">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          去创作
        </n-button>
      </n-space>
    </div>

    <!-- Tab 导航 -->
    <n-card class="tabs-card">
      <n-spin :show="loadingCategories">
        <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
          <!-- 固定 Tab: 少儿画廊 -->
          <n-tab-pane name="gallery" tab="少儿画廊">
            <GalleryTab />
          </n-tab-pane>

          <!-- 固定 Tab: 少儿朗诵 -->
          <n-tab-pane name="recitation" tab="少儿朗诵">
            <RecitationTab />
          </n-tab-pane>

          <!-- 固定 Tab: 日记AI分析 -->
          <n-tab-pane name="diary-analysis" tab="日记分析">
            <DiaryAnalysisTab />
          </n-tab-pane>

          <!-- 固定 Tab: 书写作品 -->
          <n-tab-pane name="calligraphy" tab="书写作品">
            <CalligraphyTab />
          </n-tab-pane>

          <!-- 动态栏目 Tab -->
          <n-tab-pane
            v-for="cat in categories"
            :key="cat.slug"
            :name="cat.slug"
            :tab="cat.icon ? `${cat.icon} ${cat.name}` : cat.name"
          >
            <CreativeWorksTab :category="cat.slug" />
          </n-tab-pane>
        </n-tabs>
      </n-spin>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import AddOutline from '@vicons/ionicons5/es/AddOutline'
import BookOutline from '@vicons/ionicons5/es/BookOutline'
import api from '@/api';
import GalleryTab from './works-tabs/GalleryTab.vue';
import RecitationTab from './works-tabs/RecitationTab.vue';
import DiaryAnalysisTab from './works-tabs/DiaryAnalysisTab.vue';
import CreativeWorksTab from './works-tabs/CreativeWorksTab.vue';
import CalligraphyTab from './works-tabs/CalligraphyTab.vue';

const route = useRoute();
const message = useMessage();

// 状态
const loadingCategories = ref(false);
const categories = ref([]);
const activeTab = ref('poetry'); // 默认显示第一个栏目

// 判断当前是否为创意作品栏目
const isCreativeTab = computed(() => {
  return categories.value.some(c => c.slug === activeTab.value);
});

// 加载栏目列表
const loadCategories = async () => {
  loadingCategories.value = true;
  try {
    const response = await api.get('/categories');
    categories.value = response.data || [];

    // 设置默认 Tab
    if (categories.value.length > 0) {
      const tabParam = route.query.tab;
      const validTabs = ['gallery', 'recitation', 'diary-analysis', 'calligraphy', ...categories.value.map(c => c.slug)];

      if (tabParam && validTabs.includes(tabParam)) {
        activeTab.value = tabParam;
      } else {
        // 默认显示第一个栏目
        activeTab.value = categories.value[0].slug;
      }
    }
  } catch (error) {
    message.error(error.error || '加载栏目失败');
  } finally {
    loadingCategories.value = false;
  }
};

// Tab 切换处理
const handleTabChange = (tabName) => {
  console.log('切换到:', tabName);
};

onMounted(() => {
  loadCategories();
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
