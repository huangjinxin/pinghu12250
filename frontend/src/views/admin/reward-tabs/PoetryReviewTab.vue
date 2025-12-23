<template>
  <div class="poetry-review-tab">
    <!-- 顶部统计和操作栏 -->
    <div class="review-header">
      <div class="stats-row">
        <n-statistic label="待审核" :value="stats.pending" />
        <n-statistic label="已通过" :value="stats.approved" />
        <n-statistic label="已拒绝" :value="stats.rejected" />
        <n-statistic label="总数" :value="stats.total" />
      </div>
      <!-- 筛选栏 -->
      <div class="filter-row">
        <span class="filter-label">筛选用户：</span>
        <n-select
          v-model:value="selectedUserId"
          :options="userOptions"
          placeholder="选择用户查看"
          clearable
          style="width: 220px"
          @update:value="handleUserSelect"
        />
        <n-button v-if="selectedUserId" @click="handleClearFilter">
          查看全部
        </n-button>
      </div>
      <div class="action-row">
        <n-checkbox
          v-model:checked="selectAll"
          :indeterminate="isIndeterminate"
          @update:checked="handleSelectAll"
        >
          全选
        </n-checkbox>
        <n-button
          type="success"
          :disabled="selectedIds.length === 0"
          @click="handleBatchApprove"
          :loading="batchApproving"
        >
          <template #icon>
            <n-icon><CheckmarkCircleOutline /></n-icon>
          </template>
          批量通过 ({{ selectedIds.length }})
        </n-button>
        <n-button @click="handleRefresh" :loading="loading">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          刷新
        </n-button>
      </div>
    </div>

    <!-- 审核列表 - 网格布局 -->
    <n-spin :show="loading">
      <div v-if="pendingWorks.length === 0 && !loading" class="empty-state">
        <n-empty description="暂无待审核的诗词作品" size="large" />
      </div>

      <div v-else class="review-grid">
        <div
          v-for="work in pendingWorks"
          :key="work.id"
          class="review-card"
          :class="{ selected: selectedIds.includes(work.id) }"
        >
          <!-- 卡片头部：选择框 + 用户 + 积分 -->
          <div class="card-header">
            <n-checkbox
              :checked="selectedIds.includes(work.id)"
              @update:checked="(val) => handleSelect(work.id, val)"
            />
            <div class="user-info">
              <n-avatar :src="work.author?.avatar" :size="28" round>
                {{ (work.author?.profile?.nickname || work.author?.username)?.[0] }}
              </n-avatar>
              <span class="username">{{ work.author?.profile?.nickname || work.author?.username }}</span>
            </div>
            <n-tag type="success" size="small" round class="points-tag">
              +5积分
            </n-tag>
          </div>

          <!-- 作品标题 -->
          <div class="work-title-section">
            <span class="work-title">{{ work.title }}</span>
            <n-tag type="warning" size="tiny">待审核</n-tag>
          </div>

          <!-- 作品预览 -->
          <div class="preview-container">
            <iframe
              :srcdoc="work.htmlCode"
              class="preview-frame"
              sandbox="allow-scripts"
            ></iframe>
          </div>

          <!-- 卡片底部：时间 + 操作按钮 -->
          <div class="card-footer">
            <span class="time">{{ formatTime(work.createdAt) }}</span>
            <div class="actions">
              <n-button type="primary" size="small" @click="handlePreview(work)">
                预览
              </n-button>
              <n-button type="success" size="small" @click="handleApprove(work)">
                通过
              </n-button>
              <n-button type="error" size="small" ghost @click="handleReject(work)">
                拒绝
              </n-button>
              <n-button type="error" size="small" @click="handleDelete(work)">
                删除
              </n-button>
            </div>
          </div>
        </div>
      </div>

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
      title="作品预览"
      style="width: 90vw; max-width: 1200px; height: 80vh;"
    >
      <div v-if="previewWork" class="preview-modal-content">
        <div class="preview-info">
          <h3>{{ previewWork.title }}</h3>
          <span class="author">作者：{{ previewWork.author?.profile?.nickname || previewWork.author?.username }}</span>
        </div>
        <iframe
          :srcdoc="previewWork.htmlCode"
          class="fullscreen-preview"
          sandbox="allow-scripts"
        ></iframe>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showPreviewDialog = false">关闭</n-button>
          <n-button type="success" @click="handleApprove(previewWork); showPreviewDialog = false">
            通过
          </n-button>
          <n-button type="error" @click="showPreviewDialog = false; handleReject(previewWork)">
            拒绝
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 拒绝对话框 -->
    <n-modal
      v-model:show="showRejectDialog"
      preset="card"
      title="拒绝作品"
      style="width: 500px"
    >
      <div class="reject-info" v-if="rejectingWork">
        <p><strong>作品：</strong>{{ rejectingWork.title }}</p>
        <p><strong>作者：</strong>{{ rejectingWork.author?.profile?.nickname || rejectingWork.author?.username }}</p>
      </div>
      <n-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules">
        <n-form-item label="拒绝原因" path="reason">
          <n-input
            v-model:value="rejectForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因（必填）"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showRejectDialog = false">取消</n-button>
          <n-button
            type="error"
            @click="handleConfirmReject"
            :loading="rejecting"
          >
            确认拒绝
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import {
  CheckmarkCircleOutline,
  RefreshOutline
} from '@vicons/ionicons5';
import api from '@/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const message = useMessage();
const dialog = useDialog();

// 筛选状态
const selectedUserId = ref(null);
const pendingUsers = ref([]);

// 用户选项列表
const userOptions = computed(() => {
  return pendingUsers.value.map(user => ({
    label: `${user.displayName} (${user.pendingCount}条待审)`,
    value: user.id
  }));
});

// 数据状态
const loading = ref(false);
const pendingWorks = ref([]);
const stats = ref({
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0
});
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
});

// 选择状态
const selectedIds = ref([]);
const selectAll = ref(false);
const batchApproving = ref(false);

// 预览对话框
const showPreviewDialog = ref(false);
const previewWork = ref(null);

// 拒绝对话框
const showRejectDialog = ref(false);
const rejectingWork = ref(null);
const rejectForm = ref({ reason: '' });
const rejectFormRef = ref(null);
const rejecting = ref(false);

// 拒绝表单验证规则
const rejectRules = {
  reason: {
    required: true,
    message: '请输入拒绝原因',
    trigger: 'blur'
  }
};

// 是否部分选中
const isIndeterminate = computed(() => {
  const len = selectedIds.value.length;
  const total = pendingWorks.value.length;
  return len > 0 && len < total;
});

// 初始化
onMounted(() => {
  loadPendingUsers();
  loadPendingWorks();
  loadStats();
});

// 加载待审核用户列表
async function loadPendingUsers() {
  try {
    const response = await api.get('/poetry-works/admin/pending/users');
    pendingUsers.value = response.users || [];
  } catch (error) {
    console.error('加载待审核用户列表失败:', error);
  }
}

// 获取当前筛选条件
function getFilters() {
  const filters = {};
  if (selectedUserId.value) {
    filters.userId = selectedUserId.value;
  }
  return filters;
}

// 加载待审核作品
async function loadPendingWorks(page = 1, filters = {}) {
  loading.value = true;
  try {
    const response = await api.get('/poetry-works/admin/pending', {
      params: {
        page,
        limit: pagination.value.pageSize,
        ...filters
      }
    });
    pendingWorks.value = response.works || [];
    pagination.value = {
      page: response.pagination?.page || 1,
      pageSize: response.pagination?.limit || 20,
      total: response.pagination?.total || 0,
      totalPages: response.pagination?.totalPages || 0
    };
  } catch (error) {
    console.error('加载待审核作品失败:', error);
    message.error('加载待审核作品失败');
  } finally {
    loading.value = false;
  }
}

// 选择用户筛选
function handleUserSelect(userId) {
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingWorks(1, userId ? { userId } : {});
}

// 清除筛选
function handleClearFilter() {
  selectedUserId.value = null;
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingWorks(1, {});
}

// 加载统计数据
async function loadStats() {
  try {
    const response = await api.get('/poetry-works/admin/stats');
    stats.value = response.stats || {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 刷新
function handleRefresh() {
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingUsers();
  loadPendingWorks(1, getFilters());
  loadStats();
}

// 全选/取消全选
function handleSelectAll(checked) {
  if (checked) {
    selectedIds.value = pendingWorks.value.map(work => work.id);
  } else {
    selectedIds.value = [];
  }
}

// 单个选择
function handleSelect(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id);
    }
  } else {
    const index = selectedIds.value.indexOf(id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  }
  selectAll.value = selectedIds.value.length === pendingWorks.value.length;
}

// 预览
function handlePreview(work) {
  previewWork.value = work;
  showPreviewDialog.value = true;
}

// 单个通过
async function handleApprove(work) {
  try {
    await api.put(`/poetry-works/${work.id}/status`, {
      status: 'APPROVED'
    });
    message.success(`作品《${work.title}》已通过审核，作者获得5积分`);
    loadPendingWorks(pagination.value.page);
    loadStats();
    const index = selectedIds.value.indexOf(work.id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  } catch (error) {
    message.error(error.response?.data?.error || '操作失败');
  }
}

// 批量通过
async function handleBatchApprove() {
  if (selectedIds.value.length === 0) return;

  batchApproving.value = true;
  let successCount = 0;
  let failCount = 0;

  for (const id of selectedIds.value) {
    try {
      await api.put(`/poetry-works/${id}/status`, {
        status: 'APPROVED'
      });
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  batchApproving.value = false;
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingWorks(pagination.value.page);
  loadStats();

  if (failCount === 0) {
    message.success(`批量通过 ${successCount} 个作品`);
  } else {
    message.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
  }
}

// 打开拒绝对话框
function handleReject(work) {
  rejectingWork.value = work;
  rejectForm.value.reason = '';
  showRejectDialog.value = true;
}

// 确认拒绝
async function handleConfirmReject() {
  try {
    await rejectFormRef.value?.validate();
  } catch {
    return;
  }

  try {
    rejecting.value = true;
    await api.put(`/poetry-works/${rejectingWork.value.id}/status`, {
      status: 'REJECTED',
      reason: rejectForm.value.reason
    });
    message.success('已拒绝');
    showRejectDialog.value = false;
    loadPendingWorks(pagination.value.page);
    loadStats();
    const index = selectedIds.value.indexOf(rejectingWork.value.id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  } catch (error) {
    message.error(error.response?.data?.error || '操作失败');
  } finally {
    rejecting.value = false;
  }
}

// 删除作品
function handleDelete(work) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除作品《${work.title}》吗？此操作不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/poetry-works/${work.id}`);
        message.success('删除成功');
        loadPendingWorks(pagination.value.page);
        loadStats();
        const index = selectedIds.value.indexOf(work.id);
        if (index > -1) {
          selectedIds.value.splice(index, 1);
        }
      } catch (error) {
        message.error(error.response?.data?.error || '删除失败');
      }
    }
  });
}

// 分页
function handlePageChange(page) {
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingWorks(page, getFilters());
}

function handlePageSizeChange(pageSize) {
  selectedIds.value = [];
  selectAll.value = false;
  pagination.value.pageSize = pageSize;
  loadPendingWorks(1, getFilters());
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
.poetry-review-tab {
  padding: 0;
}

.review-header {
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
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 四列网格布局 */
.review-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* 卡片样式 */
.review-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-card:hover {
  border-color: #b0b0b0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.review-card.selected {
  border-color: #18a058;
  border-width: 3px;
  background: #e8f5e9;
  box-shadow: 0 4px 16px rgba(24, 160, 88, 0.3);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points-tag {
  flex-shrink: 0;
}

/* 作品标题 */
.work-title-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.work-title {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 预览区域 */
.preview-container {
  height: 120px;
  background: #f5f5f5;
  border-radius: 6px;
  overflow: hidden;
}

.preview-frame {
  width: 200%;
  height: 200%;
  border: none;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
  margin-top: auto;
}

.time {
  font-size: 12px;
  color: #666;
}

.actions {
  display: flex;
  gap: 6px;
}

.empty-state {
  padding: 60px 0;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 预览对话框 */
.preview-modal-content {
  height: calc(80vh - 140px);
  display: flex;
  flex-direction: column;
}

.preview-info {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.preview-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.preview-info .author {
  color: #666;
  font-size: 14px;
}

.fullscreen-preview {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 8px;
}

/* 拒绝对话框 */
.reject-info {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.reject-info p {
  margin: 4px 0;
  font-size: 14px;
}

/* 响应式布局 */
@media (max-width: 1600px) {
  .review-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1200px) {
  .review-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .review-grid {
    grid-template-columns: 1fr;
  }

  .stats-row {
    flex-wrap: wrap;
    gap: 16px;
  }

  .action-row {
    flex-wrap: wrap;
  }
}
</style>
