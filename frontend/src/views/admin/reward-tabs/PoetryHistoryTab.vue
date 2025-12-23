<template>
  <div class="poetry-history-tab">
    <!-- 顶部统计和筛选 -->
    <div class="history-header">
      <div class="stats-row">
        <n-statistic label="总计" :value="stats.total" />
        <n-statistic label="已通过" :value="stats.approved" />
        <n-statistic label="已拒绝" :value="stats.rejected" />
      </div>
      <div class="filter-row">
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="筛选状态"
          clearable
          style="width: 150px"
          @update:value="handleFilterChange"
        />
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索作品标题..."
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button @click="handleRefresh" :loading="loading">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          刷新
        </n-button>
      </div>
    </div>

    <!-- 记录列表 -->
    <n-spin :show="loading">
      <div v-if="works.length === 0 && !loading" class="empty-state">
        <n-empty description="暂无审核记录" size="large" />
      </div>

      <n-data-table
        v-else
        :columns="columns"
        :data="works"
        :bordered="false"
        :single-line="false"
        striped
      />

      <!-- 分页 -->
      <div v-if="pagination.totalPages > 1" class="pagination-wrap">
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          :page-size="pagination.pageSize"
          show-size-picker
          :page-sizes="[10, 20, 30, 50]"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-spin>

    <!-- 预览对话框 -->
    <n-modal
      v-model:show="showPreviewDialog"
      preset="card"
      :title="previewWork?.title || '作品预览'"
      style="width: 90vw; max-width: 1200px; height: 80vh;"
    >
      <div class="preview-modal-content">
        <iframe
          v-if="previewWork"
          :srcdoc="previewWork.htmlCode"
          class="fullscreen-preview"
          sandbox="allow-scripts"
        ></iframe>
      </div>
      <template #footer>
        <n-button @click="showPreviewDialog = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { NTag, NButton, NSpace, NAvatar } from 'naive-ui';
import { SearchOutline, RefreshOutline } from '@vicons/ionicons5';
import api from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const message = useMessage();

// 数据状态
const loading = ref(false);
const works = ref([]);
const stats = ref({
  total: 0,
  approved: 0,
  rejected: 0
});
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
});

// 筛选
const statusFilter = ref(null);
const searchQuery = ref('');
const statusOptions = [
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' }
];

// 预览
const showPreviewDialog = ref(false);
const previewWork = ref(null);

// 表格列
const columns = [
  {
    title: '作品',
    key: 'title',
    width: 200,
    render(row) {
      return h('div', { class: 'work-cell' }, [
        h('span', { class: 'work-title' }, row.title)
      ]);
    }
  },
  {
    title: '作者',
    key: 'author',
    width: 150,
    render(row) {
      return h('div', { class: 'author-cell' }, [
        h(NAvatar, {
          src: row.author?.avatar,
          size: 24,
          round: true
        }, () => (row.author?.profile?.nickname || row.author?.username)?.[0]),
        h('span', { class: 'author-name' }, row.author?.profile?.nickname || row.author?.username)
      ]);
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      const statusMap = {
        APPROVED: { type: 'success', text: '已通过' },
        REJECTED: { type: 'error', text: '已拒绝' },
        PENDING: { type: 'warning', text: '待审核' }
      };
      const status = statusMap[row.status] || { type: 'default', text: row.status };
      return h(NTag, { type: status.type, size: 'small' }, () => status.text);
    }
  },
  {
    title: '积分',
    key: 'points',
    width: 80,
    render(row) {
      if (row.status === 'APPROVED') {
        return h(NTag, { type: 'success', size: 'small' }, () => '+5');
      }
      return h('span', { class: 'text-gray-400' }, '-');
    }
  },
  {
    title: '审核原因',
    key: 'reviewReason',
    ellipsis: { tooltip: true },
    render(row) {
      return row.reviewReason || '-';
    }
  },
  {
    title: '提交时间',
    key: 'createdAt',
    width: 120,
    render(row) {
      return formatTime(row.createdAt);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row) {
      return h(NSpace, {}, () => [
        h(NButton, {
          size: 'small',
          type: 'primary',
          onClick: () => handlePreview(row)
        }, () => '预览')
      ]);
    }
  }
];

// 初始化
onMounted(() => {
  loadWorks();
  loadStats();
});

// 加载作品列表
async function loadWorks(page = 1) {
  loading.value = true;
  try {
    const params = {
      page,
      limit: pagination.value.pageSize,
      reviewed: true // 只获取已审核的
    };

    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    const response = await api.get('/poetry-works/admin/history', { params });
    works.value = response.works || [];
    pagination.value = {
      page: response.pagination?.page || 1,
      pageSize: response.pagination?.limit || 20,
      total: response.pagination?.total || 0,
      totalPages: response.pagination?.totalPages || 0
    };
  } catch (error) {
    console.error('加载审核记录失败:', error);
    message.error('加载审核记录失败');
  } finally {
    loading.value = false;
  }
}

// 加载统计
async function loadStats() {
  try {
    const response = await api.get('/poetry-works/admin/stats');
    stats.value = {
      total: (response.stats?.approved || 0) + (response.stats?.rejected || 0),
      approved: response.stats?.approved || 0,
      rejected: response.stats?.rejected || 0
    };
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 刷新
function handleRefresh() {
  loadWorks(pagination.value.page);
  loadStats();
}

// 筛选
function handleFilterChange() {
  loadWorks(1);
}

// 搜索
let searchTimeout = null;
function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadWorks(1);
  }, 300);
}

// 分页
function handlePageChange(page) {
  loadWorks(page);
}

function handlePageSizeChange(pageSize) {
  pagination.value.pageSize = pageSize;
  loadWorks(1);
}

// 预览
function handlePreview(work) {
  previewWork.value = work;
  showPreviewDialog.value = true;
}

// 格式化时间
function formatTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN
    });
  } catch {
    return '';
  }
}
</script>

<style scoped>
.poetry-history-tab {
  padding: 0;
}

.history-header {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.stats-row {
  display: flex;
  gap: 32px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-cell {
  display: flex;
  flex-direction: column;
}

.work-title {
  font-weight: 500;
  color: #333;
}

.author-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.empty-state {
  padding: 60px 0;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
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
</style>
