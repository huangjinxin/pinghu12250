<template>
  <div class="creative-work-review">
    <!-- 统计信息 -->
    <div class="stats-row mb-4">
      <n-statistic label="待审核" :value="stats.pending" />
      <n-statistic label="已通过" :value="stats.approved" />
      <n-statistic label="已拒绝" :value="stats.rejected" />
      <n-statistic label="总数" :value="stats.total" />
    </div>

    <!-- 子Tab切换：待审核 / 已审核 -->
    <n-tabs v-model:value="activeSubTab" type="line" class="mb-4">
      <n-tab-pane name="pending" tab="待审核">
        <!-- 筛选 -->
        <div class="flex flex-wrap items-center gap-4 mb-4 mt-4">
          <n-select
            v-model:value="selectedCategory"
            placeholder="选择栏目"
            :options="categoryOptions"
            clearable
            style="width: 150px"
            @update:value="loadPendingWorks"
          />

          <n-select
            v-model:value="selectedUser"
            placeholder="选择用户"
            :options="userOptions"
            clearable
            style="width: 180px"
            @update:value="loadPendingWorks"
          />

          <div class="flex-1"></div>

          <n-checkbox v-model:checked="selectAll" @update:checked="handleSelectAll">
            全选
          </n-checkbox>

          <n-button
            type="success"
            :disabled="selectedIds.length === 0"
            @click="handleBatchApprove"
          >
            批量通过 ({{ selectedIds.length }})
          </n-button>
        </div>

        <!-- 待审核作品列表 -->
        <n-spin :show="loading">
          <div v-if="pendingWorks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <n-card
              v-for="work in pendingWorks"
              :key="work.id"
              class="work-card"
              :class="{ selected: selectedIds.includes(work.id) }"
            >
              <!-- 选择框和信息 -->
              <div class="flex items-center justify-between mb-2">
                <n-checkbox
                  :checked="selectedIds.includes(work.id)"
                  @update:checked="(v) => handleSelect(work.id, v)"
                />
                <div class="flex items-center gap-2 text-sm">
                  <n-avatar :size="20" :src="work.author?.avatar" round>
                    {{ work.author?.profile?.nickname?.charAt(0) || '?' }}
                  </n-avatar>
                  <span>{{ work.author?.profile?.nickname || work.author?.username }}</span>
                </div>
                <n-tag size="small" type="info">+{{ work.category?.points || 5 }}积分</n-tag>
              </div>

              <!-- 标题和栏目 -->
              <h3 class="font-bold mb-2 truncate">{{ work.title }}</h3>
              <n-tag size="tiny" :bordered="false" class="mb-2">
                {{ work.category?.icon }} {{ work.category?.name }}
              </n-tag>

              <!-- 预览 -->
              <div class="work-preview h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                <iframe
                  :srcdoc="work.htmlCode"
                  class="preview-frame"
                  sandbox="allow-scripts"
                ></iframe>
              </div>

              <!-- 时间 -->
              <div class="text-xs text-gray-500 mb-3">
                {{ formatDate(work.createdAt) }}
              </div>

              <!-- 操作按钮 -->
              <div class="flex gap-2">
                <n-button size="small" @click="handlePreview(work)">预览</n-button>
                <n-button size="small" type="success" @click="handleApprove(work)">通过</n-button>
                <n-button size="small" type="warning" @click="handleReject(work)">拒绝</n-button>
                <n-button size="small" type="error" @click="handleDelete(work)">删除</n-button>
              </div>
            </n-card>
          </div>

          <n-empty v-else description="暂无待审核作品" class="py-12" />
        </n-spin>

        <!-- 分页 -->
        <div v-if="pendingPagination.totalPages > 1" class="flex justify-center mt-6">
          <n-pagination
            v-model:page="pendingPage"
            :page-count="pendingPagination.totalPages"
            @update:page="loadPendingWorks"
          />
        </div>
      </n-tab-pane>

      <n-tab-pane name="history" tab="审核记录">
        <!-- 筛选 -->
        <div class="flex flex-wrap items-center gap-4 mb-4 mt-4">
          <n-select
            v-model:value="historyCategory"
            placeholder="选择栏目"
            :options="categoryOptions"
            clearable
            style="width: 150px"
            @update:value="loadHistoryWorks"
          />

          <n-select
            v-model:value="historyStatus"
            placeholder="审核状态"
            :options="statusOptions"
            clearable
            style="width: 120px"
            @update:value="loadHistoryWorks"
          />

          <n-input
            v-model:value="historySearch"
            placeholder="搜索标题/用户名"
            clearable
            style="width: 200px"
            @input="handleHistorySearch"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
        </div>

        <!-- 已审核作品列表 -->
        <n-spin :show="historyLoading">
          <n-table :bordered="false" :single-line="false" v-if="historyWorks.length > 0">
            <thead>
              <tr>
                <th style="width: 200px">标题</th>
                <th style="width: 100px">栏目</th>
                <th style="width: 120px">作者</th>
                <th style="width: 80px">状态</th>
                <th>拒绝原因</th>
                <th style="width: 140px">审核时间</th>
                <th style="width: 150px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="work in historyWorks" :key="work.id">
                <td class="truncate" style="max-width: 200px">{{ work.title }}</td>
                <td>
                  <n-tag size="small" :bordered="false">
                    {{ work.category?.icon }} {{ work.category?.name }}
                  </n-tag>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <n-avatar :size="20" :src="work.author?.avatar" round>
                      {{ work.author?.profile?.nickname?.charAt(0) || '?' }}
                    </n-avatar>
                    <span class="text-sm">{{ work.author?.profile?.nickname || work.author?.username }}</span>
                  </div>
                </td>
                <td>
                  <n-tag :type="work.status === 'APPROVED' ? 'success' : 'error'" size="small">
                    {{ work.status === 'APPROVED' ? '已通过' : '已拒绝' }}
                  </n-tag>
                </td>
                <td class="text-sm text-gray-500">{{ work.reviewReason || '-' }}</td>
                <td class="text-sm">{{ formatDate(work.updatedAt) }}</td>
                <td>
                  <n-space>
                    <n-button size="small" @click="handlePreview(work)">预览</n-button>
                    <n-button size="small" type="error" @click="handleDelete(work)">删除</n-button>
                  </n-space>
                </td>
              </tr>
            </tbody>
          </n-table>

          <n-empty v-else description="暂无审核记录" class="py-12" />
        </n-spin>

        <!-- 分页 -->
        <div v-if="historyPagination.totalPages > 1" class="flex justify-center mt-6">
          <n-pagination
            v-model:page="historyPage"
            :page-count="historyPagination.totalPages"
            @update:page="loadHistoryWorks"
          />
        </div>
      </n-tab-pane>
    </n-tabs>

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
        <n-space justify="end">
          <template v-if="previewWork?.status === 'PENDING'">
            <n-button type="success" @click="handleApprove(previewWork); showPreviewDialog = false">通过</n-button>
            <n-button type="warning" @click="handleReject(previewWork); showPreviewDialog = false">拒绝</n-button>
          </template>
          <n-button type="error" @click="handleDelete(previewWork); showPreviewDialog = false">删除</n-button>
          <n-button @click="showPreviewDialog = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 拒绝原因对话框 -->
    <n-modal
      v-model:show="showRejectDialog"
      preset="card"
      title="拒绝原因"
      style="width: 400px"
    >
      <n-input
        v-model:value="rejectReason"
        type="textarea"
        placeholder="请输入拒绝原因..."
        :rows="4"
      />
      <template #footer>
        <n-space justify="end">
          <n-button @click="showRejectDialog = false">取消</n-button>
          <n-button type="warning" :loading="submitting" @click="confirmReject">确认拒绝</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import api from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const emit = defineEmits(['update:pendingCount']);

const message = useMessage();
const dialog = useDialog();

// 子Tab
const activeSubTab = ref('pending');

// 通用状态
const categories = ref([]);
const stats = ref({ pending: 0, approved: 0, rejected: 0, total: 0 });

// === 待审核相关 ===
const loading = ref(false);
const pendingWorks = ref([]);
const users = ref([]);
const selectedCategory = ref(null);
const selectedUser = ref(null);
const pendingPage = ref(1);
const pendingPagination = ref({ total: 0, totalPages: 0 });

// 选择
const selectedIds = ref([]);
const selectAll = ref(false);

// === 审核记录相关 ===
const historyLoading = ref(false);
const historyWorks = ref([]);
const historyCategory = ref(null);
const historyStatus = ref(null);
const historySearch = ref('');
const historyPage = ref(1);
const historyPagination = ref({ total: 0, totalPages: 0 });

// 对话框
const showPreviewDialog = ref(false);
const previewWork = ref(null);
const showRejectDialog = ref(false);
const rejectReason = ref('');
const rejectingWork = ref(null);
const submitting = ref(false);

// 选项
const categoryOptions = computed(() => {
  return [
    { label: '全部栏目', value: null },
    ...categories.value.map(c => ({
      label: c.icon ? `${c.icon} ${c.name}` : c.name,
      value: c.slug
    }))
  ];
});

const userOptions = computed(() => {
  return [
    { label: '全部用户', value: null },
    ...users.value.map(u => ({
      label: `${u.displayName} (${u.pendingCount})`,
      value: u.id
    }))
  ];
});

const statusOptions = [
  { label: '全部状态', value: null },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' }
];

// 加载栏目列表
const loadCategories = async () => {
  try {
    const response = await api.get('/categories');
    categories.value = response.data || [];
  } catch (error) {
    console.error('加载栏目失败:', error);
  }
};

// 加载统计
const loadStats = async () => {
  try {
    const params = {};
    if (selectedCategory.value) params.category = selectedCategory.value;

    const response = await api.get('/creative-works/admin/stats', { params });
    stats.value = response.data?.stats || { pending: 0, approved: 0, rejected: 0, total: 0 };
    emit('update:pendingCount', stats.value.pending);
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

// 加载待审核用户列表
const loadUsers = async () => {
  try {
    const params = {};
    if (selectedCategory.value) params.category = selectedCategory.value;

    const response = await api.get('/creative-works/admin/pending/users', { params });
    users.value = response.data?.users || [];
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
};

// 加载待审核作品列表
const loadPendingWorks = async () => {
  loading.value = true;
  selectedIds.value = [];
  selectAll.value = false;

  try {
    const params = {
      page: pendingPage.value,
      limit: 20
    };

    if (selectedCategory.value) params.category = selectedCategory.value;
    if (selectedUser.value) params.userId = selectedUser.value;

    const response = await api.get('/creative-works/admin/pending', { params });
    pendingWorks.value = response.data?.works || [];
    pendingPagination.value = {
      total: response.data?.pagination?.total || 0,
      totalPages: response.data?.pagination?.totalPages || 0
    };

    // 同时刷新统计和用户列表
    loadStats();
    loadUsers();
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

// 加载审核记录
const loadHistoryWorks = async () => {
  historyLoading.value = true;

  try {
    const params = {
      page: historyPage.value,
      limit: 20
    };

    if (historyCategory.value) params.category = historyCategory.value;
    if (historyStatus.value) params.status = historyStatus.value;
    if (historySearch.value) params.search = historySearch.value;

    const response = await api.get('/creative-works/admin/history', { params });
    historyWorks.value = response.data?.works || [];
    historyPagination.value = {
      total: response.data?.pagination?.total || 0,
      totalPages: response.data?.pagination?.totalPages || 0
    };
  } catch (error) {
    message.error(error.error || '加载审核记录失败');
  } finally {
    historyLoading.value = false;
  }
};

// 搜索防抖
let searchTimer = null;
const handleHistorySearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    historyPage.value = 1;
    loadHistoryWorks();
  }, 300);
};

// 选择/取消选择
const handleSelect = (id, checked) => {
  if (checked) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value = selectedIds.value.filter(i => i !== id);
  }
  selectAll.value = selectedIds.value.length === pendingWorks.value.length;
};

// 全选
const handleSelectAll = (checked) => {
  if (checked) {
    selectedIds.value = pendingWorks.value.map(w => w.id);
  } else {
    selectedIds.value = [];
  }
};

// 预览
const handlePreview = (work) => {
  previewWork.value = work;
  showPreviewDialog.value = true;
};

// 通过
const handleApprove = async (work) => {
  try {
    await api.put(`/creative-works/${work.id}/review`, { status: 'APPROVED' });
    message.success(`《${work.title}》审核通过`);
    loadPendingWorks();
    loadHistoryWorks();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
};

// 批量通过
const handleBatchApprove = async () => {
  dialog.warning({
    title: '批量通过',
    content: `确定要通过选中的 ${selectedIds.value.length} 个作品吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const id of selectedIds.value) {
          await api.put(`/creative-works/${id}/review`, { status: 'APPROVED' });
        }
        message.success(`已通过 ${selectedIds.value.length} 个作品`);
        loadPendingWorks();
        loadHistoryWorks();
      } catch (error) {
        message.error(error.error || '操作失败');
      }
    }
  });
};

// 拒绝（打开对话框）
const handleReject = (work) => {
  rejectingWork.value = work;
  rejectReason.value = '';
  showRejectDialog.value = true;
};

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    message.warning('请输入拒绝原因');
    return;
  }

  submitting.value = true;
  try {
    await api.put(`/creative-works/${rejectingWork.value.id}/review`, {
      status: 'REJECTED',
      reason: rejectReason.value.trim()
    });
    message.success(`《${rejectingWork.value.title}》已拒绝`);
    showRejectDialog.value = false;
    loadPendingWorks();
    loadHistoryWorks();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// 删除
const handleDelete = (work) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/creative-works/${work.id}`);
        message.success('删除成功');
        showPreviewDialog.value = false;
        loadPendingWorks();
        loadHistoryWorks();
        loadStats();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN
  });
};

// 监听子Tab切换
watch(activeSubTab, (newTab) => {
  if (newTab === 'history') {
    loadHistoryWorks();
  }
});

// 暴露方法供父组件调用
defineExpose({
  refresh: () => {
    loadPendingWorks();
    loadHistoryWorks();
  }
});

onMounted(() => {
  loadCategories();
  loadPendingWorks();
});
</script>

<style scoped>
.stats-row {
  display: flex;
  gap: 40px;
}

.work-card {
  transition: all 0.3s;
}

.work-card.selected {
  border-color: #18a058;
  background: #f0fdf4;
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

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
