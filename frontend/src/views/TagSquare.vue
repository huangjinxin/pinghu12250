<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-800">标签广场</h1>
      <p class="text-gray-500 mt-1">探索热门标签，发现精彩内容</p>
    </div>

    <!-- 分类Tab -->
    <n-tabs v-model:value="activeCategory" type="line" animated>
      <n-tab-pane name="all" tab="全部">
        <TagCloud :tags="allTags" :loading="loading" />
      </n-tab-pane>
      <n-tab-pane name="learning" tab="学习">
        <TagCloud :tags="learningTags" :loading="loading" />
      </n-tab-pane>
      <n-tab-pane name="creative" tab="创作">
        <TagCloud :tags="creativeTags" :loading="loading" />
      </n-tab-pane>
      <n-tab-pane name="life" tab="生活">
        <TagCloud :tags="lifeTags" :loading="loading" />
      </n-tab-pane>
      <n-tab-pane name="game" tab="游戏">
        <TagCloud :tags="gameTags" :loading="loading" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import TagCloud from '@/components/TagCloud.vue';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const activeCategory = ref('all');
const tags = ref([]);

// 按分类筛选标签
const allTags = computed(() => tags.value);
const learningTags = computed(() => tags.value.filter(t => t.category === 'learning'));
const creativeTags = computed(() => tags.value.filter(t => t.category === 'creative'));
const lifeTags = computed(() => tags.value.filter(t => t.category === 'life'));
const gameTags = computed(() => tags.value.filter(t => t.category === 'game'));

// 加载热门标签
const loadTags = async () => {
  loading.value = true;
  try {
    const response = await api.get('/tags/hot');
    tags.value = response.tags || [];
  } catch (error) {
    console.error('加载标签失败:', error);
    message.error(error.error || '加载标签失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadTags();
});
</script>
