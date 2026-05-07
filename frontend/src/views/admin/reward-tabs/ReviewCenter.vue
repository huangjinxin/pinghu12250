<template>
  <div class="review-center">
    <!-- 统计栏 -->
    <div class="stats-bar">
      <n-statistic label="待审核" :value="totalPending">
        <template #prefix>
          <n-icon color="#f0a020"><TimeOutline /></n-icon>
        </template>
      </n-statistic>
      <n-statistic label="任务提交" :value="stats.submission" />
      <n-statistic label="创意作品" :value="stats.creative" />
      <n-statistic label="书法作品" :value="stats.calligraphy" />
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <!-- 第一行：类型 + 状态 -->
      <div class="filter-row">
        <n-space align="center" :wrap="true">
          <n-radio-group v-model:value="filterType" @update:value="handleFilterChange">
            <n-radio-button value="all">全部</n-radio-button>
            <n-radio-button value="submission">
              任务提交
              <n-badge v-if="stats.submission > 0" :value="stats.submission" :max="99" processing />
            </n-radio-button>
            <n-radio-button value="creative">
              创意作品
              <n-badge v-if="stats.creative > 0" :value="stats.creative" :max="99" processing />
            </n-radio-button>
            <n-radio-button value="calligraphy">
              书法作品
              <n-badge v-if="stats.calligraphy > 0" :value="stats.calligraphy" :max="99" processing />
            </n-radio-button>
          </n-radio-group>

          <n-select
            v-model:value="filterStatus"
            :options="statusOptions"
            class="filter-status-select"
            @update:value="handleFilterChange"
          />

          <n-input
            v-model:value="filterUser"
            placeholder="搜索用户名"
            clearable
            class="filter-user-input"
            @update:value="handleFilterInputChange"
          >
            <template #prefix><n-icon size="14"><PersonOutline /></n-icon></template>
          </n-input>

          <n-date-picker
            v-model:value="filterDateRange"
            type="daterange"
            clearable
            :shortcuts="dateShortcuts"
            class="filter-date-picker"
            @update:value="handleFilterChange"
          />
        </n-space>
      </div>

      <!-- 第二行：搜索 + 操作 -->
      <div class="action-row">
        <n-space align="center" :wrap="true">
          <n-input
            v-model:value="searchKeyword"
            placeholder="搜索内容/描述..."
            clearable
            class="filter-search-input"
            @update:value="handleSearchChange"
          >
            <template #prefix><n-icon size="14"><SearchOutline /></n-icon></template>
          </n-input>
        </n-space>

        <n-space align="center">
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
            :loading="batchApproving"
            @click="handleBatchApprove"
          >
            批量通过 ({{ selectedIds.length }})
          </n-button>
          <n-button
            type="error"
            ghost
            :disabled="selectedIds.length === 0"
            :loading="batchRejecting"
            @click="handleBatchReject"
          >
            批量拒绝 ({{ selectedIds.length }})
          </n-button>
          <n-button @click="handleRefresh" :loading="loading">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
        </n-space>
      </div>
    </div>

    <!-- 卡片列表 -->
    <n-spin :show="loading">
      <div v-if="displayItems.length === 0 && !loading" class="empty-state">
        <n-empty description="暂无待审核内容" size="large" />
      </div>

      <div v-else class="review-grid">
        <ReviewCard
          v-for="item in displayItems"
          :key="item._key"
          :item="item"
          :selected="selectedIds.includes(item._key)"
          @select="handleSelect"
          @approve="handleApprove"
          @reject="handleReject"
          @preview="handlePreview"
          @delete="handleDelete"
          @custom-approve="handleCustomApprove"
        />
      </div>

      <!-- 分页 -->
      <div v-if="pagination.totalPages > 1" class="pagination-wrap">
        <n-pagination
          v-model:page="pagination.page"
          :page-count="pagination.totalPages"
          @update:page="handlePageChange"
        />
      </div>
    </n-spin>

    <!-- 预览弹窗 -->
    <ReviewPreviewModal
      v-model:show="showPreview"
      :item="previewItem"
      :items="displayItems"
      :current-index="previewIndex"
      @approve="handleApprove"
      @reject="handleReject"
      @delete="handleDelete"
      @navigate="handlePreviewNavigate"
    />

    <!-- 拒绝原因对话框 -->
    <n-modal
      v-model:show="showRejectDialog"
      preset="card"
      :title="batchRejectMode ? `批量拒绝 (${selectedIds.length}个)` : '拒绝原因'"
      style="width: 400px; max-width: 90vw;"
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
          <n-button type="error" :loading="rejecting" @click="confirmReject">确认拒绝</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 扣分通过对话框（仅任务提交） -->
    <n-modal
      v-model:show="showCustomPointsDialog"
      preset="card"
      title="扣分通过"
      style="width: 400px; max-width: 90vw;"
    >
      <div v-if="customPointsItem" class="custom-points-info">
        <p><strong>用户：</strong>{{ getAuthorName(customPointsItem) }}</p>
        <p><strong>类型：</strong>{{ getTypeLabel(customPointsItem._type) }}</p>
      </div>
      <n-form-item label="实际发放积分">
        <n-input-number
          v-model:value="customPointsValue"
          :min="-1000"
          :max="1000"
          placeholder="输入实际积分（可为负数）"
          style="width: 100%"
        />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCustomPointsDialog = false">取消</n-button>
          <n-button type="warning" :loading="customApproving" @click="confirmCustomApprove">
            确认通过
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import TimeOutline from '@vicons/ionicons5/es/TimeOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import SearchOutline from '@vicons/ionicons5/es/SearchOutline'
import PersonOutline from '@vicons/ionicons5/es/PersonOutline'
import api from '@/api';
import { calligraphyAPI, calligraphyListAPI } from '@/api/index';
import { useSubmissionStore } from '@/stores/submission';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ReviewCard from './ReviewCard.vue';
import ReviewPreviewModal from './ReviewPreviewModal.vue';

const emit = defineEmits(['update:totalPending']);
const message = useMessage();
const dialog = useDialog();
const submissionStore = useSubmissionStore();

// === 筛选状态 ===
const filterType = ref('all');
const filterStatus = ref('PENDING');
const filterUser = ref('');
const filterDateRange = ref(null);
const searchKeyword = ref('');
const loading = ref(false);
let filterInputTimer = null;
let searchTimer = null;

const dateShortcuts = {
  '今天': () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return [start.getTime(), end.getTime()];
  },
  '最近3天': () => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const start = new Date(end);
    start.setDate(start.getDate() - 2);
    start.setHours(0, 0, 0, 0);
    return [start.getTime(), end.getTime()];
  },
  '最近7天': () => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return [start.getTime(), end.getTime()];
  },
};

const statusOptions = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
  { label: '全部状态', value: 'all' },
];

// === 数据 ===
const submissionItems = ref([]);
const creativeItems = ref([]);
const calligraphyItems = ref([]);

const stats = ref({ submission: 0, creative: 0, calligraphy: 0 });
const totalPending = computed(() => stats.value.submission + stats.value.creative + stats.value.calligraphy);

const pagination = ref({ page: 1, totalPages: 1 });

// === 选择 ===
const selectedIds = ref([]);
const selectAll = ref(false);
const isIndeterminate = computed(() => {
  const len = selectedIds.value.length;
  const total = displayItems.value.length;
  return len > 0 && len < total;
});

// === 弹窗状态 ===
const showPreview = ref(false);
const previewItem = ref(null);
const previewIndex = ref(0);

const showRejectDialog = ref(false);
const rejectReason = ref('');
const rejectingItem = ref(null);
const rejecting = ref(false);
const batchRejectMode = ref(false);

const showCustomPointsDialog = ref(false);
const customPointsItem = ref(null);
const customPointsValue = ref(0);
const customApproving = ref(false);
const batchApproving = ref(false);
const batchRejecting = ref(false);

// === 统一数据格式 ===
function normalizeSubmission(item) {
  return {
    _type: 'submission',
    _key: `sub_${item.id}`,
    _id: item.id,
    _raw: item,
    title: item.template?.name || '任务提交',
    authorName: item.user?.profile?.nickname || item.user?.username || '未知',
    authorAvatar: item.user?.avatar,
    status: item.status,
    createdAt: item.createdAt,
    points: item.template?.points || 0,
    quantity: item.quantity || 1,
    // 提交特有
    content: item.content,
    images: item.images,
    audios: item.audios,
    link: item.link,
    typeName: item.template?.type?.name,
    standardName: item.template?.standard?.name,
  };
}

function normalizeCreative(item) {
  return {
    _type: 'creative',
    _key: `cre_${item.id}`,
    _id: item.id,
    _raw: item,
    title: item.title,
    authorName: item.author?.profile?.nickname || item.author?.username || '未知',
    authorAvatar: item.author?.avatar,
    status: item.status,
    createdAt: item.createdAt,
    points: item.category?.points || 5,
    // 创意特有
    htmlCode: item.htmlCode,
    categoryName: item.category?.name,
    categoryIcon: item.category?.icon,
    reviewReason: item.reviewReason,
  };
}

function normalizeCalligraphy(item) {
  return {
    _type: 'calligraphy',
    _key: `cal_${item.id}`,
    _id: item.id,
    _raw: item,
    title: item.title,
    authorName: item.author?.profile?.nickname || item.author?.username || '未知',
    authorAvatar: item.author?.avatar,
    status: item.status,
    createdAt: item.createdAt,
    points: 55,
    // 书法特有
    preview: item.preview,
    charCount: item.charCount,
    evaluationScore: item.evaluationScore,
    evaluationData: item.evaluationData,
    calligraphyContent: item.content,
  };
}

// === 合并显示列表 ===
const displayItems = computed(() => {
  let items = [];
  if (filterType.value === 'all' || filterType.value === 'submission') {
    items = items.concat(submissionItems.value);
  }
  if (filterType.value === 'all' || filterType.value === 'creative') {
    items = items.concat(creativeItems.value);
  }
  if (filterType.value === 'all' || filterType.value === 'calligraphy') {
    items = items.concat(calligraphyItems.value);
  }

  // 用户名过滤
  const userKw = filterUser.value.trim().toLowerCase();
  if (userKw) {
    items = items.filter(i => i.authorName.toLowerCase().includes(userKw));
  }

  // 日期范围过滤
  if (filterDateRange.value && filterDateRange.value.length === 2) {
    const [start, end] = filterDateRange.value;
    items = items.filter(i => {
      const t = new Date(i.createdAt).getTime();
      return t >= start && t <= end;
    });
  }

  // 搜索关键词过滤（匹配标题、内容描述）
  const kw = searchKeyword.value.trim().toLowerCase();
  if (kw) {
    items = items.filter(i => {
      if (i.title?.toLowerCase().includes(kw)) return true;
      if (i.content?.toLowerCase().includes(kw)) return true;
      if (i.authorName?.toLowerCase().includes(kw)) return true;
      if (i.categoryName?.toLowerCase().includes(kw)) return true;
      if (i.typeName?.toLowerCase().includes(kw)) return true;
      return false;
    });
  }

  // 按创建时间倒序
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return items;
});

// === 数据加载 ===
async function loadAllData() {
  loading.value = true;
  selectedIds.value = [];
  selectAll.value = false;
  try {
    await Promise.all([
      loadSubmissions(),
      loadCreativeWorks(),
      loadCalligraphyWorks(),
    ]);
    emit('update:totalPending', totalPending.value);
  } finally {
    loading.value = false;
  }
}

async function loadSubmissions() {
  try {
    const statusParam = filterStatus.value === 'PENDING' ? {} : {};
    if (filterStatus.value === 'PENDING') {
      await submissionStore.fetchPendingSubmissions(pagination.value.page);
      submissionItems.value = submissionStore.pendingSubmissions.map(normalizeSubmission);
      stats.value.submission = submissionStore.stats.pending || 0;
    } else {
      // 非待审核状态，暂不加载提交
      submissionItems.value = [];
    }
  } catch (error) {
    console.error('加载任务提交失败:', error);
    submissionItems.value = [];
  }
}

async function loadCreativeWorks() {
  try {
    if (filterStatus.value === 'PENDING') {
      const response = await api.get('/creative-works/admin/pending', {
        params: { page: pagination.value.page, limit: 50 }
      });
      creativeItems.value = (response.data?.works || []).map(normalizeCreative);
    } else if (filterStatus.value === 'all') {
      const response = await api.get('/creative-works/admin/history', {
        params: { page: pagination.value.page, limit: 50 }
      });
      creativeItems.value = (response.data?.works || []).map(normalizeCreative);
    } else {
      const response = await api.get('/creative-works/admin/history', {
        params: { page: pagination.value.page, limit: 50, status: filterStatus.value }
      });
      creativeItems.value = (response.data?.works || []).map(normalizeCreative);
    }
    // 获取待审核数量
    const statsRes = await api.get('/creative-works/admin/stats');
    stats.value.creative = statsRes.data?.stats?.pending || 0;
  } catch (error) {
    console.error('加载创意作品失败:', error);
    creativeItems.value = [];
  }
}

async function loadCalligraphyWorks() {
  try {
    const statusParam = filterStatus.value === 'all' ? 'all' : filterStatus.value;
    const res = await calligraphyListAPI.reviewList({
      page: pagination.value.page,
      limit: 50,
      status: statusParam
    });
    if (res.success) {
      calligraphyItems.value = (res.data.works || []).map(normalizeCalligraphy);
    }
    // 获取待审核数量
    const pendingRes = await calligraphyListAPI.reviewList({ status: 'PENDING', limit: 1 });
    if (pendingRes.success) {
      stats.value.calligraphy = pendingRes.data.total || 0;
    }
  } catch (error) {
    console.error('加载书法作品失败:', error);
    calligraphyItems.value = [];
  }
}

// 同时加载提交的待审核统计
async function loadSubmissionStats() {
  try {
    await submissionStore.fetchStats();
    stats.value.submission = submissionStore.stats.pending || 0;
  } catch (error) {
    console.error('加载提交统计失败:', error);
  }
}

// === 操作处理 ===
function handleFilterChange() {
  pagination.value.page = 1;
  selectedIds.value = [];
  selectAll.value = false;
  loadAllData();
}

// 用户名输入防抖
function handleFilterInputChange() {
  clearTimeout(filterInputTimer);
  filterInputTimer = setTimeout(() => {
    selectedIds.value = [];
    selectAll.value = false;
  }, 300);
}

// 搜索输入防抖（前端过滤，不需要重新请求）
function handleSearchChange() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    selectedIds.value = [];
    selectAll.value = false;
  }, 300);
}

function handleRefresh() {
  loadAllData();
}

function handlePageChange(page) {
  pagination.value.page = page;
  selectedIds.value = [];
  selectAll.value = false;
  loadAllData();
}

function handleSelectAll(checked) {
  if (checked) {
    selectedIds.value = displayItems.value.map(i => i._key);
  } else {
    selectedIds.value = [];
  }
}

function handleSelect({ key, checked }) {
  if (checked) {
    if (!selectedIds.value.includes(key)) selectedIds.value.push(key);
  } else {
    selectedIds.value = selectedIds.value.filter(k => k !== key);
  }
  selectAll.value = selectedIds.value.length === displayItems.value.length && displayItems.value.length > 0;
}

// 预览
function handlePreview(item) {
  previewItem.value = item;
  previewIndex.value = displayItems.value.findIndex(i => i._key === item._key);
  showPreview.value = true;
}

function handlePreviewNavigate(index) {
  if (index >= 0 && index < displayItems.value.length) {
    previewIndex.value = index;
    previewItem.value = displayItems.value[index];
  }
}

// 通过
async function handleApprove(item) {
  try {
    if (item._type === 'submission') {
      await submissionStore.reviewSubmission(item._id, 'APPROVED', '');
    } else if (item._type === 'creative') {
      await api.put(`/creative-works/${item._id}/review`, { status: 'APPROVED' });
    } else if (item._type === 'calligraphy') {
      await calligraphyAPI.review(item._id, { status: 'APPROVED', points: item.points || 55 });
    }
    message.success(`《${item.title}》审核通过`);
    showPreview.value = false;
    loadAllData();
  } catch (error) {
    message.error(error.error || '操作失败');
  }
}

// 拒绝 - 打开对话框
function handleReject(item) {
  batchRejectMode.value = false;
  rejectingItem.value = item;
  rejectReason.value = '';
  showRejectDialog.value = true;
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    message.warning('请输入拒绝原因');
    return;
  }
  rejecting.value = true;
  const reason = rejectReason.value.trim();

  try {
    if (batchRejectMode.value) {
      // 批量拒绝
      let success = 0, fail = 0;
      for (const key of selectedIds.value) {
        const item = displayItems.value.find(i => i._key === key);
        if (!item) continue;
        try {
          if (item._type === 'submission') {
            await submissionStore.reviewSubmission(item._id, 'REJECTED', reason);
          } else if (item._type === 'creative') {
            await api.put(`/creative-works/${item._id}/review`, { status: 'REJECTED', reason });
          } else if (item._type === 'calligraphy') {
            await calligraphyAPI.review(item._id, { status: 'REJECTED' });
          }
          success++;
        } catch { fail++; }
      }
      if (fail === 0) {
        message.success(`批量拒绝 ${success} 个项目`);
      } else {
        message.warning(`成功 ${success} 个，失败 ${fail} 个`);
      }
    } else {
      // 单个拒绝
      const item = rejectingItem.value;
      if (item._type === 'submission') {
        await submissionStore.reviewSubmission(item._id, 'REJECTED', reason);
      } else if (item._type === 'creative') {
        await api.put(`/creative-works/${item._id}/review`, { status: 'REJECTED', reason });
      } else if (item._type === 'calligraphy') {
        await calligraphyAPI.review(item._id, { status: 'REJECTED' });
      }
      message.success(`《${item.title}》已拒绝`);
    }
    showRejectDialog.value = false;
    showPreview.value = false;
    loadAllData();
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    rejecting.value = false;
  }
}

// 删除
function handleDelete(item) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除《${item.title}》吗？此操作不可恢复。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (item._type === 'submission') {
          await api.delete(`/submissions/${item._id}`);
        } else if (item._type === 'creative') {
          await api.delete(`/creative-works/${item._id}`);
        } else if (item._type === 'calligraphy') {
          await calligraphyAPI.adminDelete(item._id);
        }
        message.success('删除成功');
        showPreview.value = false;
        loadAllData();
      } catch (error) {
        message.error(error.error || '删除失败');
      }
    }
  });
}

// 批量通过
async function handleBatchApprove() {
  if (selectedIds.value.length === 0) return;
  dialog.warning({
    title: '批量通过',
    content: `确定要通过选中的 ${selectedIds.value.length} 个项目吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      batchApproving.value = true;
      let success = 0, fail = 0;
      for (const key of selectedIds.value) {
        const item = displayItems.value.find(i => i._key === key);
        if (!item) continue;
        try {
          if (item._type === 'submission') {
            await submissionStore.reviewSubmission(item._id, 'APPROVED', '');
          } else if (item._type === 'creative') {
            await api.put(`/creative-works/${item._id}/review`, { status: 'APPROVED' });
          } else if (item._type === 'calligraphy') {
            await calligraphyAPI.review(item._id, { status: 'APPROVED', points: 55 });
          }
          success++;
        } catch {
          fail++;
        }
      }
      batchApproving.value = false;
      if (fail === 0) {
        message.success(`批量通过 ${success} 个项目`);
      } else {
        message.warning(`成功 ${success} 个，失败 ${fail} 个`);
      }
      loadAllData();
    }
  });
}

// 批量拒绝
function handleBatchReject() {
  if (selectedIds.value.length === 0) return;
  // 复用拒绝对话框，标记为批量模式
  batchRejectMode.value = true;
  rejectReason.value = '';
  showRejectDialog.value = true;
}

// 扣分通过（仅任务提交）
function handleCustomApprove(item) {
  customPointsItem.value = item;
  customPointsValue.value = 0;
  showCustomPointsDialog.value = true;
}

async function confirmCustomApprove() {
  if (customPointsValue.value === null) {
    message.warning('请输入积分值');
    return;
  }
  customApproving.value = true;
  try {
    await submissionStore.reviewSubmission(
      customPointsItem.value._id,
      'APPROVED',
      '',
      customPointsValue.value
    );
    message.success(`审核通过，发放积分：${customPointsValue.value}`);
    showCustomPointsDialog.value = false;
    loadAllData();
  } catch (error) {
    message.error('操作失败');
  } finally {
    customApproving.value = false;
  }
}

// 工具函数
function getAuthorName(item) {
  return item?.authorName || '未知';
}

function getTypeLabel(type) {
  const map = { submission: '任务提交', creative: '创意作品', calligraphy: '书法作品' };
  return map[type] || type;
}

function formatTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
  } catch { return ''; }
}

// 暴露方法
defineExpose({
  refresh: loadAllData,
  handleCustomApprove,
});

onMounted(() => {
  loadSubmissionStats();
  loadAllData();
});
</script>

<style scoped>
.review-center {
  padding: 0;
  overflow: hidden;
  max-width: 100%;
}

.stats-bar {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  overflow: hidden;
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  overflow: hidden;
}

.empty-state {
  padding: 60px 0;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.custom-points-info {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.custom-points-info p {
  margin: 4px 0;
  font-size: 14px;
}

/* 筛选控件宽度 */
.filter-status-select {
  width: 120px;
}
.filter-user-input {
  width: 140px;
}
.filter-date-picker {
  width: 240px;
  max-width: 100%;
}
.filter-search-input {
  width: 220px;
}

@media (max-width: 1600px) {
  .review-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1200px) {
  .review-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .review-grid { grid-template-columns: 1fr; }
  .stats-bar { gap: 12px; }
  .filter-bar { padding: 10px; }
  .filter-row { flex-direction: column; align-items: stretch; }
  .action-row { flex-direction: column; align-items: stretch; }
  .filter-status-select,
  .filter-user-input,
  .filter-date-picker,
  .filter-search-input {
    width: 100%;
  }
  .filter-row :deep(.n-radio-group) {
    display: flex;
    flex-wrap: wrap;
  }
}
</style>
