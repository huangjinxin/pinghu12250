<template>
  <div class="html-works-tab">
    <!-- 搜索和筛选 -->
    <div class="card mb-4">
      <n-space wrap :size="12">
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
    <div v-if="!loading && total > pageSize" class="card mb-4">
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

        <!-- 可见性、购买标签和分享 -->
        <div class="mt-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <n-tag :type="getVisibilityType(work.visibility)" size="tiny">
              {{ getVisibilityLabel(work.visibility) }}
            </n-tag>
            <n-tag v-if="work.isPurchased" type="success" size="tiny">已购买</n-tag>
          </div>
          <n-button size="tiny" quaternary type="primary" @click.stop="handleShare(work)">
            <template #icon>
              <n-icon size="14"><ShareSocialOutline /></n-icon>
            </template>
            分享
          </n-button>
        </div>
      </div>
    </div>

    <!-- 底部分页 -->
    <div v-if="!loading && total > pageSize" class="card mt-4">
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
import AvatarText from '@/components/AvatarText.vue';
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI } from '@/api';
import { HeartOutline, GitBranchOutline, TrashOutline, SearchOutline, ShareSocialOutline } from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
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
  event.stopPropagation();
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

// 分享作品
const handleShare = async (work) => {
  // 使用专门的全屏展示页面URL
  const shareUrl = `${window.location.origin}/htmlwork/${work.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制到剪贴板');
  } catch (err) {
    // 降级方案
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制到剪贴板');
  }
};

const handleFilterChange = () => {
  page.value = 1;
  loadWorks();
};

const handleSearchDebounced = (value) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadWorks();
  }, 500);
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
  page.value = 1;
  loadWorks();
};

const loadWorks = async () => {
  loading.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const params = { page: page.value, limit: pageSize.value };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.category) params.category = filters.value.category;
    if (filters.value.myOnly) params.myOnly = true;
    const data = await htmlWorkAPI.getWorks(params);
    works.value = data.works || data;
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

<style scoped>
.html-works-tab {
  padding: 0;
}
</style>
