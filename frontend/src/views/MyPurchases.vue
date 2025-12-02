<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的购买</h1>
        <p class="text-gray-500 mt-1">查看和管理你购买的作品源码</p>
      </div>
      <div class="flex items-center gap-3">
        <n-statistic label="总购买数" :value="total" />
        <n-button @click="$router.push('/market')">前往市集</n-button>
      </div>
    </div>

    <n-card>
      <div class="flex items-center gap-3 mb-4">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索已购买的作品..."
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
          @update:value="loadPurchases"
        />
      </div>
    </n-card>

    <n-spin :show="loading">
      <div v-if="purchases.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="purchase in purchases"
          :key="purchase.id"
          class="purchase-card"
          hoverable
        >
          <div class="work-preview h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
            <iframe
              v-if="purchase.work?.htmlContent"
              :srcdoc="purchase.work.htmlContent"
              class="w-full h-full pointer-events-none"
              sandbox="allow-scripts"
            ></iframe>
          </div>

          <div class="space-y-3">
            <div>
              <h3 class="font-bold truncate">{{ purchase.work?.title }}</h3>
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">
                {{ purchase.work?.description || '暂无描述' }}
              </p>
            </div>

            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <AvatarText :username="item.seller?.username" size="md" />
                <span class="text-gray-600">{{ purchase.work?.author?.username }}</span>
              </div>
              <div class="flex items-center gap-1 text-yellow-600 font-bold">
                <n-icon size="16"><LogoUsd /></n-icon>
                <span>{{ purchase.price }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>购买于 {{ formatDate(purchase.createdAt) }}</span>
              <n-tag v-if="purchase.price === 0" type="success" size="tiny">免费</n-tag>
            </div>

            <div class="flex gap-2">
              <n-button size="small" type="primary" @click="viewSourceCode(purchase.work)">
                <template #icon>
                  <n-icon><CodeSlashOutline /></n-icon>
                </template>
                查看源码
              </n-button>
              <n-button size="small" @click="$router.push(`/works/${purchase.work?.id}`)">
                预览
              </n-button>
              <n-button size="small" @click="forkWork(purchase.work?.id)">
                Fork
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="还没有购买任何作品" class="py-12">
        <template #extra>
          <n-button type="primary" @click="$router.push('/market')">
            前往市集购买
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
        @update:page="loadPurchases"
        @update:page-size="handlePageSizeChange"
      />
    </div>

    <!-- 源码查看弹窗 -->
    <n-modal
      v-model:show="showSourceModal"
      preset="card"
      title="源码查看"
      style="width: 90%; max-width: 1200px"
      :segmented="{ content: 'soft' }"
    >
      <div class="space-y-4">
        <n-tabs type="line">
          <n-tab-pane name="html" tab="HTML">
            <n-code :code="selectedWork?.htmlContent || ''" language="html" show-line-numbers />
          </n-tab-pane>
          <n-tab-pane name="css" tab="CSS">
            <n-code :code="selectedWork?.cssContent || ''" language="css" show-line-numbers />
          </n-tab-pane>
          <n-tab-pane name="js" tab="JavaScript">
            <n-code :code="selectedWork?.jsContent || ''" language="javascript" show-line-numbers />
          </n-tab-pane>
        </n-tabs>

        <div class="flex justify-end gap-2">
          <n-button @click="copySourceCode">
            <template #icon>
              <n-icon><CopyOutline /></n-icon>
            </template>
            复制全部代码
          </n-button>
          <n-button type="primary" @click="downloadSourceCode">
            <template #icon>
              <n-icon><DownloadOutline /></n-icon>
            </template>
            下载源码
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import api from '@/api';
import {
  SearchOutline,
  CodeSlashOutline,
  LogoUsd,
  CopyOutline,
  DownloadOutline,
} from '@vicons/ionicons5';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const purchases = ref([]);
const page = ref(1);
const pageSize = ref(9);
const total = ref(0);
const searchQuery = ref('');
const sortBy = ref('latest');
const showSourceModal = ref(false);
const selectedWork = ref(null);

const sortOptions = [
  { label: '最新购买', value: 'latest' },
  { label: '价格最高', value: 'price_desc' },
  { label: '价格最低', value: 'price_asc' },
];

const loadPurchases = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize.value,
      sort: sortBy.value,
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // 假设后端有获取购买记录的API
    const response = await api.get('/market/my-purchases', { params });
    purchases.value = response.purchases || [];
    total.value = response.total || 0;
  } catch (error) {
    message.error(error.error || '加载购买记录失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  loadPurchases();
};

const handlePageSizeChange = (newPageSize) => {
  pageSize.value = newPageSize;
  page.value = 1;
  loadPurchases();
};

const viewSourceCode = (work) => {
  selectedWork.value = work;
  showSourceModal.value = true;
};

const copySourceCode = () => {
  const code = `<!-- HTML -->\n${selectedWork.value?.htmlContent || ''}\n\n/* CSS */\n${selectedWork.value?.cssContent || ''}\n\n// JavaScript\n${selectedWork.value?.jsContent || ''}`;
  navigator.clipboard.writeText(code);
  message.success('源码已复制到剪贴板');
};

const downloadSourceCode = () => {
  const work = selectedWork.value;
  if (!work) return;

  const scriptOpen = '<' + 'script>';
  const scriptClose = '<' + '/script>';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${work.title}</title>
  <style>
${work.cssContent || ''}
  </style>
</head>
<body>
${work.htmlContent || ''}
  ${scriptOpen}
${work.jsContent || ''}
  ${scriptClose}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${work.title}.html`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('源码下载成功');
};

const forkWork = (workId) => {
  // 跳转到编辑器，通过query参数传递fork来源
  // 编辑器会加载源作品内容，但不自动保存
  // 用户需要点击保存按钮才会创建新作品
  router.push({
    path: '/works/create',
    query: { fork: workId }
  });
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN,
  });
};

onMounted(() => {
  loadPurchases();
});
</script>

<style scoped>
.purchase-card {
  transition: all 0.3s;
}

.purchase-card:hover {
  transform: translateY(-4px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
