<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">HTML作品集</h1>
        <p class="text-gray-500 mt-1">创作和分享你的网页作品</p>
      </div>
      <n-button type="primary" @click="$router.push('/works/create')">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        创建作品
      </n-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="card">
      <n-space>
        <n-input
          v-model:value="filters.search"
          placeholder="搜索作品标题或描述..."
          clearable
          style="width: 300px"
          @update:value="handleSearchDebounced"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-select
          v-model:value="filters.category"
          placeholder="分类"
          :options="categoryOptions"
          filterable
          tag
          clearable
          style="width: 200px"
          @update:value="handleFilterChange"
        />
        <n-checkbox v-model:checked="filters.myOnly" @update:checked="handleFilterChange">只看我的</n-checkbox>
      </n-space>
    </div>

    <!-- 顶部分页 -->
    <div v-if="!loading && total > pageSize" class="card">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-sm text-gray-600">
          共 <span class="font-semibold text-primary-600">{{ total }}</span> 个作品，
          当前第 <span class="font-semibold text-primary-600">{{ page }}</span> 页，
          共 <span class="font-semibold text-primary-600">{{ Math.ceil(total / pageSize) }}</span> 页
        </div>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[9, 18, 27, 36]"
          show-quick-jumper
          @update:page="loadWorks"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>
            <n-button size="small" @click="goToFirstPage" :disabled="page === 1">首页</n-button>
          </template>
          <template #suffix>
            <n-button size="small" @click="goToLastPage" :disabled="page === Math.ceil(total / pageSize)">尾页</n-button>
          </template>
        </n-pagination>
      </div>
    </div>

    <!-- 作品列表 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <n-skeleton v-for="i in 9" :key="i" height="200px" :sharp="false" />
    </div>

    <n-empty v-else-if="!works.length" description="还没有作品">
      <template #extra>
        <n-button type="primary" @click="$router.push('/works/create')">创建第一个作品</n-button>
      </template>
    </n-empty>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="work in works" :key="work.id" class="card hover:shadow-lg transition-shadow cursor-pointer group relative" @click="$router.push(`/works/${work.id}`)">
        <!-- 管理员删除按钮 -->
        <n-button
          v-if="isAdmin"
          circle
          size="small"
          type="error"
          class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          @click="handleDelete(work, $event)"
        >
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
        </n-button>

        <!-- 预览缩略图 -->
        <div class="h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
          <iframe
            :srcdoc="getPreviewHtml(work)"
            class="w-full h-full border-0 pointer-events-none scale-50 origin-top-left"
            style="width: 200%; height: 200%"
          ></iframe>
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all"></div>
        </div>

        <!-- 作品信息 -->
        <h3 class="font-medium text-gray-800 truncate">{{ work.title }}</h3>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center space-x-2" @click.stop>
            <AvatarText :username="work.author?.username" size="md" />
            <span
              class="text-sm text-gray-500 cursor-pointer hover:text-primary-600 transition-colors"
              @click="$router.push(`/users/${work.author.id}`)"
            >
              {{ work.author?.profile?.nickname || work.author?.username }}
            </span>
          </div>
          <div class="flex items-center space-x-3 text-sm text-gray-400">
            <span class="flex items-center">
              <n-icon size="14"><HeartOutline /></n-icon>
              <span class="ml-1">{{ work._count?.likes || 0 }}</span>
            </span>
            <span class="flex items-center">
              <n-icon size="14"><GitBranchOutline /></n-icon>
              <span class="ml-1">{{ work._count?.forks || 0 }}</span>
            </span>
          </div>
        </div>

        <!-- 可见性和购买标签 -->
        <div class="mt-2 flex items-center gap-2">
          <n-tag :type="getVisibilityType(work.visibility)" size="tiny">
            {{ getVisibilityLabel(work.visibility) }}
          </n-tag>
          <n-tag v-if="work.isPurchased" type="success" size="tiny">已购买✓</n-tag>
        </div>
      </div>
    </div>

    <!-- 底部分页 -->
    <div v-if="!loading && total > pageSize" class="card">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-sm text-gray-600">
          共 <span class="font-semibold text-primary-600">{{ total }}</span> 个作品，
          当前第 <span class="font-semibold text-primary-600">{{ page }}</span> 页，
          共 <span class="font-semibold text-primary-600">{{ Math.ceil(total / pageSize) }}</span> 页
        </div>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / pageSize)"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[9, 18, 27, 36]"
          show-quick-jumper
          @update:page="loadWorks"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>
            <n-button size="small" @click="goToFirstPage" :disabled="page === 1">首页</n-button>
          </template>
          <template #suffix>
            <n-button size="small" @click="goToLastPage" :disabled="page === Math.ceil(total / pageSize)">尾页</n-button>
          </template>
        </n-pagination>
      </div>
    </div>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI } from '@/api';
import { AddOutline, HeartOutline, GitBranchOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9); // 每页显示数量（默认9个，3x3布局）
const total = ref(0);
const categories = ref([]);

const filters = ref({ search: '', category: null, myOnly: false });

let searchTimeout = null;

const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

// 分类选项
const categoryOptions = computed(() => {
  return categories.value.map(cat => ({
    label: cat,
    value: cat
  }));
});

const getVisibilityType = (v) => {
  const types = { PUBLIC: 'success', PARENT_ONLY: 'warning', PRIVATE: 'default' };
  return types[v] || 'default';
};

const getVisibilityLabel = (v) => {
  const labels = { PUBLIC: '公开', PARENT_ONLY: '仅家长', PRIVATE: '私密' };
  return labels[v] || v;
};

const getPreviewHtml = (work) => {
  return `<!DOCTYPE html><html><head><style>${work.cssCode || ''}</style></head><body>${work.htmlCode || ''}</body></html>`;
};

const handleDelete = (work, event) => {
  event.stopPropagation(); // 阻止点击事件冒泡，避免跳转到详情页
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await htmlWorkAPI.deleteWork(work.id);
        message.success('删除成功');
        loadWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

const handleFilterChange = () => {
  // 筛选条件变化时重置到第一页
  page.value = 1;
  loadWorks();
};

// 搜索防抖处理
const handleSearchDebounced = (value) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadWorks();
  }, 500); // 500ms防抖
};

const goToFirstPage = () => {
  page.value = 1;
  loadWorks();
};

const goToLastPage = () => {
  page.value = Math.ceil(total.value / pageSize.value);
  loadWorks();
};

const handlePageSizeChange = (newPageSize) => {
  pageSize.value = newPageSize;
  page.value = 1; // 改变每页数量时重置到第一页
  loadWorks();
};

const loadWorks = async () => {
  loading.value = true;
  // 滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const params = { page: page.value, limit: pageSize.value };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.category) params.category = filters.value.category;
    if (filters.value.myOnly) params.myOnly = true;
    const data = await htmlWorkAPI.getWorks(params);
    works.value = data.works || data;
    // 修复：从 pagination 对象中获取 total
    total.value = data.pagination?.total || data.total || works.value.length;
  } catch (error) {
    message.error('加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 加载所有分类
const loadCategories = async () => {
  try {
    const data = await htmlWorkAPI.getCategories();
    categories.value = data.categories || [];
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

onMounted(() => {
  loadCategories();
  loadWorks();
});
</script>
