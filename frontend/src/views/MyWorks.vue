<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的创作</h1>
        <p class="text-gray-500 mt-1">管理你创建的所有作品</p>
      </div>
      <n-button type="primary" @click="$router.push('/works/create')">
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        创建作品
      </n-button>
    </div>

    <n-card>
      <n-tabs v-model:value="activeTab" type="line" @update:value="loadWorks">
        <n-tab-pane name="all" tab="全部">
          <div class="flex items-center gap-3 mb-4">
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索作品..."
              clearable
              style="max-width: 300px"
              @input="handleSearch"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
            <n-select
              v-model:value="sortBy"
              :options="sortOptions"
              placeholder="排序方式"
              style="width: 150px"
              @update:value="loadWorks"
            />
          </div>
        </n-tab-pane>
        <n-tab-pane name="public" tab="公开" />
        <n-tab-pane name="private" tab="私有" />
        <n-tab-pane name="draft" tab="草稿" />
      </n-tabs>
    </n-card>

    <n-spin :show="loading">
      <div v-if="works.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="work in works"
          :key="work.id"
          class="work-card"
          hoverable
        >
          <div class="work-preview h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
            <iframe
              v-if="work.htmlContent"
              :srcdoc="work.htmlContent"
              class="w-full h-full pointer-events-none"
              sandbox="allow-scripts"
            ></iframe>
          </div>

          <div class="space-y-3">
            <div>
              <h3 class="font-bold truncate">{{ work.title }}</h3>
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ work.description || '暂无描述' }}</p>
            </div>

            <div class="flex items-center gap-2 text-xs text-gray-500">
              <n-tag v-if="work.visibility === 'PUBLIC'" type="success" size="small">公开</n-tag>
              <n-tag v-else-if="work.visibility === 'PRIVATE'" type="warning" size="small">私有</n-tag>
              <n-tag v-else type="default" size="small">草稿</n-tag>
              <span>{{ formatDate(work.createdAt) }}</span>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-600">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <n-icon><HeartOutline /></n-icon>
                  {{ work._count?.likes || 0 }}
                </span>
                <span class="flex items-center gap-1">
                  <n-icon><ChatbubbleOutline /></n-icon>
                  {{ work._count?.comments || 0 }}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <n-button size="small" @click="$router.push(`/works/${work.id}`)">
                查看
              </n-button>
              <n-button size="small" @click="$router.push(`/works/${work.id}/edit`)">
                编辑
              </n-button>
              <n-button size="small" type="error" @click="handleDelete(work.id)">
                删除
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="还没有创建任何作品" class="py-12">
        <template #extra>
          <n-button type="primary" @click="$router.push('/works/create')">
            立即创建
          </n-button>
        </template>
      </n-empty>
    </n-spin>

    <div v-if="total > pageSize" class="flex justify-center">
      <n-pagination
        v-model:page="page"
        :page-count="Math.ceil(total / pageSize)"
        :page-sizes="[9, 18, 27, 36]"
        show-size-picker
        @update:page="loadWorks"
        @update:page-size="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI } from '@/api';
import {
  AddOutline,
  SearchOutline,
  HeartOutline,
  ChatbubbleOutline,
} from '@vicons/ionicons5';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const currentUserId = computed(() => authStore.user?.id);

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);
const activeTab = ref('all');
const searchQuery = ref('');
const sortBy = ref('latest');

const sortOptions = [
  { label: '最新创建', value: 'latest' },
  { label: '最多点赞', value: 'popular' },
  { label: '最多评论', value: 'commented' },
];

const loadWorks = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize.value,
      sort: sortBy.value,
      own: true, // 只获取自己的作品
    };

    if (activeTab.value !== 'all') {
      params.visibility = activeTab.value.toUpperCase();
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const response = await htmlWorkAPI.getWorks(params);
    const allWorks = response.works || [];

    // 🔒 前端二次验证：确保只显示当前用户的作品
    if (currentUserId.value) {
      works.value = allWorks.filter(work => work.authorId === currentUserId.value);
      // 如果后端返回的数据中包含非当前用户的作品，发出警告
      if (works.value.length < allWorks.length) {
        console.warn('⚠️ 检测到后端返回了其他用户的作品，已自动过滤');
        message.warning('检测到数据异常，已自动过滤非本人作品');
      }
    } else {
      works.value = [];
      message.error('未能获取用户信息，请重新登录');
    }

    total.value = works.value.length; // 使用过滤后的数量
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  loadWorks();
};

const handlePageSizeChange = (newPageSize) => {
  pageSize.value = newPageSize;
  page.value = 1;
  loadWorks();
};

const handleDelete = (id) => {
  // 🔒 前端验证：确保只能删除自己的作品
  const workToDelete = works.value.find(w => w.id === id);

  if (!workToDelete) {
    message.error('作品不存在');
    return;
  }

  if (workToDelete.authorId !== currentUserId.value) {
    message.error('无权删除他人作品！');
    console.error('⚠️ 尝试删除非本人作品被阻止', { workId: id, workAuthor: workToDelete.authorId, currentUser: currentUserId.value });
    return;
  }

  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个作品吗？此操作不可恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await htmlWorkAPI.deleteWork(id);
        message.success('删除成功');
        loadWorks();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    },
  });
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN,
  });
};

onMounted(() => {
  loadWorks();
});
</script>

<style scoped>
.work-card {
  transition: all 0.3s;
}

.work-card:hover {
  transform: translateY(-4px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
