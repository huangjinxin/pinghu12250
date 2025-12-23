<template>
  <div class="review-tab">
    <!-- 顶部统计和操作栏 -->
    <div class="review-header">
      <div class="stats-row">
        <n-statistic label="待审核" :value="submissionStore.stats.pending" />
        <n-statistic label="今日已审" :value="todayStats.reviewed" />
        <n-statistic label="今日通过" :value="todayStats.approved" />
        <n-statistic label="今日拒绝" :value="todayStats.rejected" />
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
        <n-button @click="handleRefresh" :loading="submissionStore.loading">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          刷新
        </n-button>
      </div>
    </div>

    <!-- 审核列表 - 一行两个卡片 -->
    <n-spin :show="submissionStore.loading">
      <div v-if="submissionStore.pendingSubmissions.length === 0 && !submissionStore.loading" class="empty-state">
        <n-empty description="暂无待审核的提交" size="large" />
      </div>

      <div v-else class="review-grid">
        <div
          v-for="item in submissionStore.pendingSubmissions"
          :key="item.id"
          class="review-card"
          :class="{ selected: selectedIds.includes(item.id) }"
        >
          <!-- 卡片头部：选择框 + 用户 + 积分 -->
          <div class="card-header">
            <n-checkbox
              :checked="selectedIds.includes(item.id)"
              @update:checked="(val) => handleSelect(item.id, val)"
            />
            <div class="user-info">
              <n-avatar :src="item.user?.avatar" :size="28" round>
                {{ (item.user?.profile?.nickname || item.user?.username)?.[0] }}
              </n-avatar>
              <span class="username">{{ item.user?.profile?.nickname || item.user?.username }}</span>
            </div>
            <n-tag :type="getPointsType(item)" size="small" round class="points-tag">
              {{ formatPoints(item) }}
            </n-tag>
          </div>

          <!-- 规则信息 -->
          <div class="rule-info">
            <span class="rule-name">{{ item.template?.name }}</span>
            <div class="tags">
              <n-tag type="info" size="tiny">{{ item.template?.type?.name }}</n-tag>
              <n-tag size="tiny">{{ item.template?.standard?.name }}</n-tag>
            </div>
          </div>

          <!-- 内容区域 -->
          <div class="content-area">
            <!-- 文本内容 -->
            <div v-if="item.content" class="content-text">{{ item.content }}</div>

            <!-- 图片缩略图 -->
            <div v-if="item.images?.length" class="images-preview">
              <n-image-group>
                <n-image
                  v-for="(img, idx) in item.images.slice(0, 3)"
                  :key="idx"
                  :src="img"
                  width="50"
                  height="50"
                  object-fit="cover"
                  :preview-src="img"
                  class="preview-img"
                />
              </n-image-group>
              <span v-if="item.images.length > 3" class="more-images">+{{ item.images.length - 3 }}</span>
            </div>

            <!-- 音频播放器 -->
            <div v-if="item.audios?.length" class="audio-section">
              <audio
                v-for="(audio, idx) in item.audios"
                :key="idx"
                :src="audio"
                controls
                class="audio-player"
              />
            </div>

            <!-- 链接 -->
            <div v-if="item.link" class="link-preview">
              <n-icon size="16" color="#18a058"><LinkOutline /></n-icon>
              <a :href="item.link" target="_blank" class="link">链接</a>
            </div>

            <!-- 无内容 -->
            <div v-if="!item.content && !item.images?.length && !item.audios?.length && !item.link" class="no-content">
              无附加内容
            </div>
          </div>

          <!-- 卡片底部：时间 + 操作按钮 -->
          <div class="card-footer">
            <span class="time">{{ formatTime(item.createdAt) }}</span>
            <div class="actions">
              <n-button type="warning" size="small" @click="handleCustomApprove(item)">
                扣分
              </n-button>
              <n-button type="success" size="small" @click="handleQuickApprove(item)">
                通过
              </n-button>
              <n-button type="error" size="small" ghost @click="handleReject(item)">
                拒绝
              </n-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="submissionStore.pagination.totalPages > 1" class="pagination-wrap">
        <n-pagination
          v-model:page="submissionStore.pagination.page"
          :page-count="submissionStore.pagination.totalPages"
          :page-size="submissionStore.pagination.pageSize"
          show-size-picker
          :page-sizes="[10, 20, 30, 50]"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-spin>

    <!-- 扣分通过对话框 -->
    <n-modal
      v-model:show="showCustomPointsDialog"
      preset="card"
      title="扣分通过"
      style="width: 400px"
    >
      <div class="custom-points-info" v-if="customPointsSubmission">
        <p><strong>用户：</strong>{{ customPointsSubmission.user?.profile?.nickname || customPointsSubmission.user?.username }}</p>
        <p><strong>规则：</strong>{{ customPointsSubmission.template?.name }}</p>
        <p><strong>原积分：</strong>{{ customPointsSubmission.template?.points }} × {{ customPointsSubmission.quantity || 1 }} = {{ (customPointsSubmission.template?.points || 0) * (customPointsSubmission.quantity || 1) }}</p>
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
          <n-button
            type="warning"
            @click="handleConfirmCustomApprove"
            :loading="customApproving"
          >
            确认通过
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 拒绝对话框 -->
    <n-modal
      v-model:show="showRejectDialog"
      preset="card"
      title="拒绝提交"
      style="width: 500px"
    >
      <div class="reject-info" v-if="rejectingSubmission">
        <p><strong>用户：</strong>{{ rejectingSubmission.user?.profile?.nickname || rejectingSubmission.user?.username }}</p>
        <p><strong>规则：</strong>{{ rejectingSubmission.template?.name }}</p>
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
import { useMessage } from 'naive-ui';
import {
  CheckmarkCircleOutline,
  CheckmarkOutline,
  CloseOutline,
  RefreshOutline,
  LinkOutline
} from '@vicons/ionicons5';
import api from '@/api';
import { useSubmissionStore } from '@/stores/submission';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const message = useMessage();
const submissionStore = useSubmissionStore();

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

// 选择状态
const selectedIds = ref([]);
const selectAll = ref(false);

// 拒绝对话框
const showRejectDialog = ref(false);
const rejectingSubmission = ref(null);
const rejectForm = ref({ reason: '' });
const rejectFormRef = ref(null);
const rejecting = ref(false);
const batchApproving = ref(false);

// 扣分通过对话框
const showCustomPointsDialog = ref(false);
const customPointsSubmission = ref(null);
const customPointsValue = ref(0);
const customApproving = ref(false);

// 今日统计
const todayStats = ref({
  reviewed: 0,
  approved: 0,
  rejected: 0
});

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
  const total = submissionStore.pendingSubmissions.length;
  return len > 0 && len < total;
});

// 初始化
onMounted(() => {
  loadPendingUsers();
  submissionStore.fetchPendingSubmissions();
  submissionStore.fetchStats();
  loadTodayStats();
});

// 加载待审核用户列表
async function loadPendingUsers() {
  try {
    const response = await api.get('/submissions/pending/users');
    pendingUsers.value = response.users || [];
  } catch (error) {
    console.error('加载待审核用户列表失败:', error);
  }
}

// 加载今日统计
async function loadTodayStats() {
  todayStats.value = {
    reviewed: 0,
    approved: 0,
    rejected: 0
  };
}

// 获取当前筛选条件
function getFilters() {
  const filters = {};
  if (selectedUserId.value) {
    filters.userId = selectedUserId.value;
  }
  return filters;
}

// 选择用户筛选
function handleUserSelect(userId) {
  selectedIds.value = [];
  selectAll.value = false;
  submissionStore.fetchPendingSubmissions(1, userId ? { userId } : {});
}

// 清除筛选
function handleClearFilter() {
  selectedUserId.value = null;
  selectedIds.value = [];
  selectAll.value = false;
  submissionStore.fetchPendingSubmissions(1, {});
}

// 刷新
function handleRefresh() {
  selectedIds.value = [];
  selectAll.value = false;
  loadPendingUsers();
  submissionStore.fetchPendingSubmissions(1, getFilters());
  submissionStore.fetchStats();
}

// 全选/取消全选
function handleSelectAll(checked) {
  if (checked) {
    selectedIds.value = submissionStore.pendingSubmissions.map(item => item.id);
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
  selectAll.value = selectedIds.value.length === submissionStore.pendingSubmissions.length;
}

// 快速通过
async function handleQuickApprove(item) {
  try {
    await submissionStore.reviewSubmission(item.id, 'APPROVED', '');
    message.success('审核通过');
    todayStats.value.reviewed++;
    todayStats.value.approved++;
    const index = selectedIds.value.indexOf(item.id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  } catch (error) {
    message.error('操作失败');
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
      await submissionStore.reviewSubmission(id, 'APPROVED', '');
      successCount++;
      todayStats.value.reviewed++;
      todayStats.value.approved++;
    } catch (error) {
      failCount++;
    }
  }

  batchApproving.value = false;
  selectedIds.value = [];
  selectAll.value = false;

  if (failCount === 0) {
    message.success(`批量通过 ${successCount} 条记录`);
  } else {
    message.warning(`成功 ${successCount} 条，失败 ${failCount} 条`);
  }
}

// 打开扣分通过对话框
function handleCustomApprove(item) {
  customPointsSubmission.value = item;
  customPointsValue.value = 0;
  showCustomPointsDialog.value = true;
}

// 确认扣分通过
async function handleConfirmCustomApprove() {
  if (customPointsValue.value === null || customPointsValue.value === undefined) {
    message.warning('请输入积分值');
    return;
  }

  try {
    customApproving.value = true;
    await submissionStore.reviewSubmission(
      customPointsSubmission.value.id,
      'APPROVED',
      '',
      customPointsValue.value
    );
    message.success(`审核通过，发放积分：${customPointsValue.value}`);
    todayStats.value.reviewed++;
    todayStats.value.approved++;
    showCustomPointsDialog.value = false;
    const index = selectedIds.value.indexOf(customPointsSubmission.value.id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  } catch (error) {
    message.error('操作失败');
  } finally {
    customApproving.value = false;
  }
}

// 打开拒绝对话框
function handleReject(item) {
  rejectingSubmission.value = item;
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
    await submissionStore.reviewSubmission(
      rejectingSubmission.value.id,
      'REJECTED',
      rejectForm.value.reason
    );
    message.success('已拒绝');
    todayStats.value.reviewed++;
    todayStats.value.rejected++;
    showRejectDialog.value = false;
    const index = selectedIds.value.indexOf(rejectingSubmission.value.id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    }
  } catch (error) {
    message.error('操作失败');
  } finally {
    rejecting.value = false;
  }
}

// 分页
function handlePageChange(page) {
  selectedIds.value = [];
  selectAll.value = false;
  submissionStore.fetchPendingSubmissions(page, getFilters());
}

function handlePageSizeChange(pageSize) {
  selectedIds.value = [];
  selectAll.value = false;
  submissionStore.pagination.pageSize = pageSize;
  submissionStore.fetchPendingSubmissions(1, getFilters());
}

// 格式化积分
function formatPoints(item) {
  const points = item.template?.points || 0;
  const quantity = item.quantity || 1;
  if (quantity > 1) {
    return `${points > 0 ? '+' : ''}${points}×${quantity}`;
  }
  return `${points > 0 ? '+' : ''}${points}`;
}

// 积分标签类型
function getPointsType(item) {
  const points = item.template?.points || 0;
  return points > 0 ? 'success' : 'error';
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
.review-tab {
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

/* 卡片样式 - 更明显的边框和阴影 */
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

/* 规则信息 */
.rule-info {
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.rule-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tags {
  display: flex;
  gap: 4px;
}

/* 内容区域 */
.content-area {
  min-height: 50px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.content-text {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.images-preview {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.preview-img {
  border-radius: 4px;
}

.more-images {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 5px;
  border-radius: 4px;
}

/* 音频播放器 */
.audio-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audio-player {
  width: 100%;
  height: 28px;
  border-radius: 4px;
}

.link-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.link {
  color: #18a058;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.no-content {
  font-size: 13px;
  color: #ccc;
  font-style: italic;
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

.reject-info,
.custom-points-info {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.reject-info p,
.custom-points-info p {
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
