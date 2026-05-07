<template>
  <div class="creative-works-tab">
    <!-- 筛选和搜索 -->
    <WorksFilterBar @reset="resetFilters">
      <n-input
        v-model:value="searchText"
        placeholder="搜索作品..."
        clearable
        style="width: 200px"
        @input="handleSearch"
      >
        <template #prefix>
          <n-icon><SearchOutline /></n-icon>
        </template>
      </n-input>

      <n-select
        v-if="category === 'poetry'"
        v-model:value="selectedType"
        placeholder="全部类型"
        :options="typeOptions"
        clearable
        style="width: 120px"
        @update:value="loadWorks"
      />

      <n-select
        v-model:value="selectedAuthor"
        placeholder="选择作者"
        :options="authorOptions"
        clearable
        style="width: 150px"
        @update:value="loadWorks"
      />

      <n-select
        v-model:value="sortBy"
        :options="sortOptions"
        style="width: 120px"
        @update:value="loadWorks"
      />
    </WorksFilterBar>

    <!-- 顶部分页 -->
    <WorksPagination
      v-model:page="currentPage"
      v-model:pageSize="pageSize"
      :total="pagination.total"
      position="top"
      @update:page="loadWorks"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 作品列表 -->
    <n-spin :show="loading">
      <div v-if="works.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="work in works"
          :key="work.id"
          class="work-card"
          hoverable
          @click="handlePreview(work)"
        >
          <div class="work-preview h-40 bg-gray-100 rounded-lg mb-3 overflow-hidden">
            <iframe
              :srcdoc="work.htmlCode"
              class="preview-frame"
              sandbox="allow-scripts"
            ></iframe>
          </div>

          <div class="space-y-2">
            <h3 class="font-bold truncate">{{ work.title }}</h3>

            <div class="flex items-center gap-2 text-sm text-gray-600">
              <n-avatar :size="20" :src="work.author?.avatar" round>
                {{ work.author?.profile?.nickname?.charAt(0) || work.author?.username?.charAt(0) || '?' }}
              </n-avatar>
              <span>{{ work.author?.profile?.nickname || work.author?.username }}</span>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>{{ formatDate(work.createdAt) }}</span>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1" :class="{ 'text-red-500': work.isLiked }">
                  <n-icon><HeartOutline /></n-icon>
                  {{ work.likesCount || 0 }}
                </span>
              </div>
            </div>

            <div class="flex gap-2" @click.stop>
              <n-button size="small" @click="handlePreview(work)">预览</n-button>
              <n-button size="small" @click="handleShare(work)">分享</n-button>
              <n-button
                size="small"
                :type="work.isLiked ? 'error' : 'default'"
                @click="handleLike(work)"
              >
                {{ work.isLiked ? '已赞' : '点赞' }}
              </n-button>
              <n-button size="small" @click="handleCopyContent(work)">
                <template #icon><n-icon :size="14"><CopyOutline /></n-icon></template>
                复制
              </n-button>
            </div>
          </div>
        </n-card>
      </div>

      <n-empty v-else description="暂无作品" class="py-12" />
    </n-spin>

    <!-- 底部分页 -->
    <WorksPagination
      v-model:page="currentPage"
      v-model:pageSize="pageSize"
      :total="pagination.total"
      position="bottom"
      @update:page="loadWorks"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 预览对话框 -->
    <n-modal
      v-model:show="showPreviewDialog"
      preset="card"
      :title="previewWork?.title || '作品预览'"
      :style="isFullscreen ? 'width: 100vw; max-width: 100vw; height: 100vh;' : 'width: 90vw; max-width: 1200px; height: 80vh;'"
      :class="{ 'fullscreen-modal': isFullscreen }"
      @after-leave="closePreview"
    >
      <template #header-extra>
        <n-space :size="8">
          <!-- 朗读控制 -->
          <n-button
            v-if="speechSupported && previewText"
            :type="isActive ? 'primary' : 'default'"
            size="small"
            @click="handleSpeech"
          >
            <template #icon>
              <n-icon>
                <PauseOutline v-if="isPlaying" />
                <PlayOutline v-else />
              </n-icon>
            </template>
            {{ isPlaying ? '暂停' : isPaused ? '继续' : '朗读' }}
          </n-button>
          <n-button
            v-if="isActive"
            size="small"
            @click="handleStopSpeech"
          >
            <template #icon>
              <n-icon><StopOutline /></n-icon>
            </template>
          </n-button>
          <!-- 朗读设置 -->
          <VoiceSelector size="small" quaternary button-text="" />
          <!-- 全屏切换 -->
          <n-button size="small" quaternary @click="toggleFullscreen">
            <template #icon>
              <n-icon>
                <ContractOutline v-if="isFullscreen" />
                <ExpandOutline v-else />
              </n-icon>
            </template>
          </n-button>
        </n-space>
      </template>
      <div class="preview-modal-content">
        <iframe
          v-if="previewWork"
          :srcdoc="processedHtmlCode"
          class="fullscreen-preview"
          sandbox="allow-scripts allow-same-origin"
        ></iframe>
      </div>
      <template #footer>
        <n-space justify="space-between">
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>作者: {{ previewWork?.author?.profile?.nickname || previewWork?.author?.username }}</span>
            <span>{{ formatDate(previewWork?.createdAt) }}</span>
          </div>
          <n-space>
            <n-button @click="handleShare(previewWork)">分享</n-button>
            <n-button
              :type="previewWork?.isLiked ? 'error' : 'primary'"
              @click="handleLike(previewWork); closePreview()"
            >
              {{ previewWork?.isLiked ? '取消点赞' : '点赞' }}
            </n-button>
            <n-button @click="closePreview">关闭</n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import api from '@/api';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import HeartOutline from '@vicons/ionicons5/es/HeartOutline'
import ExpandOutline from '@vicons/ionicons5/es/ExpandOutline'
import ContractOutline from '@vicons/ionicons5/es/ContractOutline'
import PlayOutline from '@vicons/ionicons5/es/PlayOutline'
import PauseOutline from '@vicons/ionicons5/es/PauseOutline'
import StopOutline from '@vicons/ionicons5/es/StopOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import VoiceSelector from '@/components/VoiceSelector.vue';
import { useSpeechSynthesis } from '@/composables/useSpeechSynthesis';
import WorksFilterBar from '@/components/works/WorksFilterBar.vue';
import WorksPagination from '@/components/works/WorksPagination.vue';

const props = defineProps({
  category: {
    type: String,
    required: true
  }
});

const message = useMessage();
const authStore = useAuthStore();

// 状态
const loading = ref(false);
const works = ref([]);
const authors = ref([]);
const searchText = ref('');
const selectedAuthor = ref(null);
const selectedType = ref(null);
const sortBy = ref('latest');
const currentPage = ref(1);
const pageSize = ref(12);
const pagination = ref({ total: 0, totalPages: 0 });

// 对话框
const showPreviewDialog = ref(false);
const previewWork = ref(null);

// 全屏和朗读状态
const isFullscreen = ref(false);
const {
  isPlaying,
  isPaused,
  isActive,
  isSupported: speechSupported,
  speak,
  pause,
  resume,
  stop: stopSpeech
} = useSpeechSynthesis();

// 从 HTML 提取纯文本
const extractTextFromHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() || '';
};

// 直接使用原始 HTML 代码，不覆盖朗读功能
const processedHtmlCode = computed(() => {
  return previewWork.value?.htmlCode || '';
});

// 当前预览作品的纯文本
const previewText = computed(() => {
  return extractTextFromHtml(previewWork.value?.htmlCode);
});

// 选项
const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'popular' }
];

const typeOptions = [
  { label: '诗', value: '诗' },
  { label: '词', value: '词' },
  { label: '古文', value: '古文' },
  { label: '现代文', value: '现代文' },
  { label: '其他', value: '其他' },
];

const authorOptions = computed(() => {
  return [
    { label: '全部作者', value: null },
    ...authors.value.map(a => ({ label: a.name, value: a.id }))
  ];
});

// 重置筛选
const resetFilters = () => {
  searchText.value = '';
  selectedAuthor.value = null;
  selectedType.value = null;
  sortBy.value = 'latest';
  currentPage.value = 1;
  loadWorks();
};

// 加载作品
const loadWorks = async () => {
  loading.value = true;
  try {
    const params = {
      category: props.category,
      page: currentPage.value,
      limit: pageSize.value,
      sort: sortBy.value
    };

    if (searchText.value) {
      params.search = searchText.value;
    }

    if (selectedAuthor.value) {
      params.author = selectedAuthor.value;
    }

    if (selectedType.value) {
      params.type = selectedType.value;
    }

    const response = await api.get('/creative-works/public', { params });
    works.value = response.data?.works || [];
    authors.value = response.data?.authors || [];
    pagination.value = {
      total: response.data?.pagination?.total || 0,
      totalPages: response.data?.pagination?.totalPages || 0
    };

    // 检查点赞状态
    if (authStore.isLoggedIn) {
      await checkLikeStatus();
    }
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 检查点赞状态
const checkLikeStatus = async () => {
  for (const work of works.value) {
    try {
      const response = await api.get(`/creative-works/${work.id}/like`);
      work.isLiked = response.data?.liked || false;
    } catch {
      work.isLiked = false;
    }
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadWorks();
};

// 分页大小变化
const handlePageSizeChange = (newSize) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadWorks();
};

// 预览作品
const handlePreview = (work) => {
  previewWork.value = work;
  showPreviewDialog.value = true;
};

// 关闭预览弹窗
const closePreview = () => {
  stopSpeech();
  isFullscreen.value = false;
  showPreviewDialog.value = false;
};

// 切换全屏
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 朗读控制
const handleSpeech = () => {
  if (isPlaying.value) {
    pause();
  } else if (isPaused.value) {
    resume();
  } else if (previewText.value) {
    speak(previewText.value);
  }
};

// 停止朗读
const handleStopSpeech = () => {
  stopSpeech();
};

// 分享作品
const handleShare = async (work) => {
  const shareUrl = `${window.location.origin}/creative/${work.id}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    message.success('分享链接已复制');
  } catch {
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('分享链接已复制');
  }
};

// 点赞
const handleLike = async (work) => {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录');
    return;
  }

  try {
    const response = await api.post(`/creative-works/${work.id}/like`);
    work.isLiked = response.data?.liked;
    work.likesCount = response.data?.likesCount;

    if (previewWork.value?.id === work.id) {
      previewWork.value.isLiked = work.isLiked;
      previewWork.value.likesCount = work.likesCount;
    }

    message.success(work.isLiked ? '点赞成功' : '已取消点赞');
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 复制诗词正文
const handleCopyContent = async (work) => {
  // 优先使用 plainText 字段
  if (work.plainText) {
    try {
      await navigator.clipboard.writeText(work.plainText);
      message.success('内容已复制');
    } catch {
      message.error('复制失败');
    }
    return;
  }

  message.warning('该作品未设置可复制内容');
};

const formatDate = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN
  });
};

// 监听 category 变化
watch(() => props.category, () => {
  currentPage.value = 1;
  loadWorks();
});

onMounted(() => {
  loadWorks();
});

// 组件卸载时停止朗读
onUnmounted(() => {
  stopSpeech();
});
</script>

<style scoped>
.work-card {
  transition: all 0.3s;
  cursor: pointer;
}

.work-card:hover {
  transform: translateY(-4px);
}

.preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}

.preview-modal-content {
  height: calc(80vh - 140px);
  display: flex;
  flex-direction: column;
}

.fullscreen-preview {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 8px;
}

/* 全屏模式样式 */
:deep(.fullscreen-modal) {
  margin: 0;
  border-radius: 0;
}

:deep(.fullscreen-modal .n-card__content) {
  height: calc(100vh - 120px);
}

.fullscreen-modal .preview-modal-content {
  height: calc(100vh - 140px);
}
</style>
