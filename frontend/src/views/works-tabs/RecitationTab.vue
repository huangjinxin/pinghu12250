<template>
  <div class="recitation-tab">
    <!-- 搜索和筛选 -->
    <div class="card mb-4">
      <n-space wrap :size="12">
        <n-input
          v-model:value="filters.search"
          placeholder="搜索用户名..."
          clearable
          style="width: 200px"
          @update:value="handleSearchDebounced"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>

        <n-input
          v-model:value="filters.description"
          placeholder="搜索描述..."
          clearable
          style="width: 200px"
          @update:value="handleSearchDebounced"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>

        <n-select
          v-model:value="filters.standardId"
          placeholder="展示标准"
          :options="standardOptions"
          clearable
          style="width: 150px"
          @update:value="handleFilterChange"
        />

        <n-button @click="resetFilters" quaternary>
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          重置
        </n-button>
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

    <n-empty v-else-if="!works.length" description="暂无作品">
      <template #extra>
        <span class="text-gray-500">还没有朗读背诵作品提交</span>
      </template>
    </n-empty>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="work in works"
        :key="work.id"
        class="card hover:shadow-lg transition-shadow group"
      >
        <!-- 音频播放器 -->
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-3">
          <div class="flex items-center justify-center mb-3">
            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <n-icon size="32" color="#fff"><MicOutline /></n-icon>
            </div>
          </div>
          <audio
            :src="work.audio"
            controls
            class="w-full"
            style="height: 40px;"
          />
          <!-- 多个音频时显示数量 -->
          <div v-if="work.audios && work.audios.length > 1" class="text-center mt-2">
            <n-tag size="small" type="info">共 {{ work.audios.length }} 个音频</n-tag>
          </div>
        </div>

        <!-- 作者信息 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2 cursor-pointer" @click="$router.push(`/users/${work.author.id}`)">
            <AvatarText :username="work.author?.username" size="md" />
            <span class="text-sm text-gray-600 hover:text-primary-600 transition-colors">
              {{ work.author?.nickname || work.author?.username }}
            </span>
          </div>
          <n-tag type="info" size="small">{{ work.template?.type?.name }}</n-tag>
        </div>

        <!-- 描述 -->
        <p v-if="work.content" class="text-sm text-gray-500 mt-2 line-clamp-2">
          {{ work.content }}
        </p>

        <!-- 时间和操作按钮 -->
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span class="text-xs text-gray-400">{{ formatDate(work.createdAt) }}</span>
          <n-space :size="4">
            <n-button size="tiny" quaternary type="primary" @click="handleShare(work)">
              <template #icon>
                <n-icon size="14"><ShareSocialOutline /></n-icon>
              </template>
              分享
            </n-button>
            <n-button size="tiny" quaternary type="primary" @click="handleViewDetail(work)">
              详情
            </n-button>
          </n-space>
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

    <!-- 作品详情对话框 -->
    <n-modal
      v-model:show="showDetailDialog"
      preset="card"
      title="朗诵详情"
      style="width: 600px; max-width: 90vw;"
    >
      <div v-if="selectedWork" class="space-y-4">
        <!-- 作者信息 -->
        <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <AvatarText :username="selectedWork.author?.username" size="lg" />
          <div>
            <div class="font-medium text-gray-800">
              {{ selectedWork.author?.nickname || selectedWork.author?.username }}
            </div>
            <div class="text-sm text-gray-500">
              {{ formatDate(selectedWork.createdAt) }}
            </div>
          </div>
        </div>

        <!-- 分类标签 -->
        <div class="flex items-center gap-2">
          <n-tag type="info">{{ selectedWork.template?.type?.name }}</n-tag>
          <n-tag type="success">{{ selectedWork.template?.standard?.name }}</n-tag>
        </div>

        <!-- 音频列表 -->
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <n-icon size="20" color="#8b5cf6"><MicOutline /></n-icon>
            <span class="font-medium text-gray-700">音频内容</span>
          </div>
          <div class="space-y-3">
            <div v-for="(audioUrl, index) in selectedWork.audios" :key="index" class="flex items-center gap-2">
              <span class="text-sm text-gray-500 w-8">{{ index + 1 }}.</span>
              <audio :src="audioUrl" controls class="flex-1" style="height: 40px;" />
            </div>
          </div>
        </div>

        <!-- 描述 -->
        <div v-if="selectedWork.content">
          <div class="text-sm font-medium text-gray-700 mb-2">描述</div>
          <div class="text-gray-600 bg-gray-50 p-3 rounded-lg">
            {{ selectedWork.content }}
          </div>
        </div>

        <!-- 分享按钮 -->
        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <n-button type="primary" @click="handleShare(selectedWork)">
            <template #icon>
              <n-icon><ShareSocialOutline /></n-icon>
            </template>
            复制分享链接
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useMessage } from 'naive-ui';
import { SearchOutline, RefreshOutline, MicOutline, ShareSocialOutline } from '@vicons/ionicons5';
import AvatarText from '@/components/AvatarText.vue';
import api from '@/api';

const message = useMessage();

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);

const filters = reactive({
  search: '',
  description: '',
  standardId: null
});

const standardOptions = ref([]);

const showDetailDialog = ref(false);
const selectedWork = ref(null);

let searchTimeout = null;

// 加载作品列表
const loadWorks = async () => {
  loading.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    };

    if (filters.search) params.search = filters.search;
    if (filters.description) params.description = filters.description;
    if (filters.standardId) params.standardId = filters.standardId;

    const data = await api.get('/gallery/recitation', { params });
    works.value = data.works || [];
    total.value = data.pagination?.total || 0;
  } catch (error) {
    console.error('加载朗诵作品失败:', error);
    message.error('加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 加载展示标准选项
const loadStandardOptions = async () => {
  try {
    const data = await api.get('/gallery/standards');
    standardOptions.value = (data.standards || []).map(s => ({
      label: s.name,
      value: s.id
    }));
  } catch (error) {
    console.error('加载展示标准失败:', error);
  }
};

// 搜索防抖
const handleSearchDebounced = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadWorks();
  }, 500);
};

// 筛选变更
const handleFilterChange = () => {
  page.value = 1;
  loadWorks();
};

// 重置筛选
const resetFilters = () => {
  filters.search = '';
  filters.description = '';
  filters.standardId = null;
  page.value = 1;
  loadWorks();
};

// 分页大小变更
const handlePageSizeChange = (newPageSize) => {
  pageSize.value = newPageSize;
  page.value = 1;
  loadWorks();
};

// 跳转首页
const goToFirstPage = () => {
  page.value = 1;
  loadWorks();
};

// 跳转尾页
const goToLastPage = () => {
  page.value = Math.ceil(total.value / pageSize.value);
  loadWorks();
};

// 查看详情
const handleViewDetail = (work) => {
  selectedWork.value = work;
  showDetailDialog.value = true;
};

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 分享作品
const handleShare = async (work) => {
  const shareUrl = `${window.location.origin}/recitation/${work.id}`;
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

onMounted(() => {
  loadWorks();
  loadStandardOptions();
});
</script>

<style scoped>
.recitation-tab {
  padding: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

audio {
  outline: none;
}

audio::-webkit-media-controls-panel {
  background-color: #f3f4f6;
}
</style>
