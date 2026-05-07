<template>
  <div :class="embedded ? '' : 'feedback-admin-page'">
    <n-page-header v-if="!embedded" title="反馈管理" subtitle="查看和处理用户反馈">
      <template #extra>
        <n-space>
          <n-select
            v-model:value="filters.type"
            :options="typeOptions"
            placeholder="类型"
            clearable
            style="width: 100px"
            @update:value="loadFeedbacks"
          />
          <n-select
            v-model:value="filters.priority"
            :options="priorityOptions"
            placeholder="优先级"
            clearable
            style="width: 100px"
            @update:value="loadFeedbacks"
          />
        </n-space>
      </template>
    </n-page-header>

    <!-- Tab 切换 -->
    <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab name="all">
        全部
        <n-badge :value="stats.total" :max="999" />
      </n-tab>
      <n-tab name="todo">
        📌 待办
        <n-badge
          :value="stats.byStatus?.todo || 0"
          :type="(stats.byStatus?.todo || 0) > 0 ? 'error' : 'default'"
          :max="99"
          :processing="(stats.byStatus?.todo || 0) > 0"
        />
      </n-tab>
      <n-tab name="pending">
        📥 待处理
        <n-badge :value="stats.byStatus?.pending || 0" type="info" :max="99" />
      </n-tab>
      <n-tab name="discussing">
        💬 讨论中
        <n-badge :value="stats.byStatus?.discussing || 0" :max="99" />
      </n-tab>
      <n-tab name="completed">
        ✅ 已完成
        <n-badge :value="(stats.byStatus?.resolved || 0) + (stats.byStatus?.adopted || 0)" type="success" :max="99" />
      </n-tab>
      <n-tab name="archived">
        📦 已归档
        <n-badge :value="stats.byStatus?.archived || 0" :max="99" />
      </n-tab>
      <n-tab name="stats">
        📊 统计
      </n-tab>
    </n-tabs>

    <!-- 统计面板 -->
    <template v-if="activeTab === 'stats'">
      <div class="stats-panel">
        <!-- 概览卡片 -->
        <n-grid :cols="6" :x-gap="12" :y-gap="12" class="stats-grid">
          <n-gi>
            <n-card size="small">
              <n-statistic label="总反馈" :value="stats.total" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="待办" :value="stats.byStatus?.todo || 0">
                <template #suffix>
                  <n-text v-if="stats.byStatus?.todo > 0" type="warning">!</n-text>
                </template>
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="待处理" :value="stats.byStatus?.pending || 0" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="已解决" :value="stats.byStatus?.resolved || 0" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="已采纳" :value="stats.byStatus?.adopted || 0" />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="解决率" :value="stats.efficiency?.resolveRate || 0" suffix="%" />
            </n-card>
          </n-gi>
        </n-grid>

        <!-- 详细统计 -->
        <n-grid :cols="3" :x-gap="16" :y-gap="16" class="detail-stats">
          <!-- 按类型分布 -->
          <n-gi>
            <n-card title="按类型分布" size="small">
              <div class="stat-list">
                <div class="stat-item">
                  <span class="stat-label">🐛 问题反馈</span>
                  <span class="stat-value">{{ stats.byType?.bug || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">💡 功能建议</span>
                  <span class="stat-value">{{ stats.byType?.suggestion || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">📝 其他</span>
                  <span class="stat-value">{{ stats.byType?.other || 0 }}</span>
                </div>
              </div>
            </n-card>
          </n-gi>

          <!-- 按优先级分布 -->
          <n-gi>
            <n-card title="按优先级分布" size="small">
              <div class="stat-list">
                <div class="stat-item">
                  <span class="stat-label">🔴 紧急</span>
                  <span class="stat-value urgent">{{ stats.byPriority?.urgent || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">🟡 重要</span>
                  <span class="stat-value important">{{ stats.byPriority?.important || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">⚪ 普通</span>
                  <span class="stat-value">{{ stats.byPriority?.normal || 0 }}</span>
                </div>
              </div>
            </n-card>
          </n-gi>

          <!-- 处理效率 -->
          <n-gi>
            <n-card title="处理效率" size="small">
              <div class="stat-list">
                <div class="stat-item">
                  <span class="stat-label">解决率</span>
                  <n-progress
                    type="line"
                    :percentage="stats.efficiency?.resolveRate || 0"
                    :indicator-placement="'inside'"
                    processing
                  />
                </div>
                <div class="stat-item">
                  <span class="stat-label">采纳率</span>
                  <n-progress
                    type="line"
                    :percentage="stats.efficiency?.adoptRate || 0"
                    :indicator-placement="'inside'"
                    status="success"
                  />
                </div>
              </div>
            </n-card>
          </n-gi>

          <!-- 用户排行 -->
          <n-gi :span="3">
            <n-card title="反馈用户排行（前10）" size="small">
              <div class="user-rank-list">
                <div v-for="(user, index) in stats.byUser" :key="user.userId" class="user-rank-item">
                  <span class="rank-num">{{ index + 1 }}</span>
                  <span class="rank-name">{{ user.username }}</span>
                  <span class="rank-count">{{ user.count }} 条</span>
                </div>
                <div v-if="!stats.byUser?.length" class="empty-text">暂无数据</div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>
    </template>

    <!-- 反馈列表 -->
    <template v-else>
      <!-- 批量操作栏 -->
      <div v-if="selectedIds.length > 0" class="batch-actions">
        <span class="batch-count">已选择 {{ selectedIds.length }} 项</span>
        <n-space size="small">
          <n-button-group size="small">
            <n-button @click="handleBatchUpdate('pending')">📥 待处理</n-button>
            <n-button type="warning" @click="handleBatchUpdate('todo')">📌 待办</n-button>
            <n-button @click="handleBatchUpdate('discussing')">💬 讨论中</n-button>
          </n-button-group>
          <n-button-group size="small">
            <n-button type="success" @click="handleBatchUpdate('resolved')">✅ 已解决</n-button>
            <n-button type="success" @click="handleBatchUpdate('adopted')">🎉 已采纳</n-button>
          </n-button-group>
          <n-button size="small" @click="handleBatchUpdate('archived')">📦 归档</n-button>
          <n-button size="small" quaternary @click="selectedIds = []">取消选择</n-button>
        </n-space>
      </div>

      <n-spin :show="loading">
        <n-data-table
          :columns="columns"
          :data="feedbacks"
          :pagination="pagination"
          :row-key="row => row.id"
          :checked-row-keys="selectedIds"
          @update:checked-row-keys="handleSelectionChange"
          @update:page="handlePageChange"
        />
      </n-spin>
    </template>

    <!-- 详情/回复弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" title="反馈详情" style="width: 90%; max-width: 700px;">
      <template v-if="currentFeedback">
        <n-descriptions :column="2" label-placement="left">
          <n-descriptions-item label="用户">
            {{ currentFeedback.user?.username || '未知' }}
          </n-descriptions-item>
          <n-descriptions-item label="类型">
            <n-tag :type="getTypeTagType(currentFeedback.type)" size="small">
              {{ getTypeText(currentFeedback.type) }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-select
              v-model:value="editForm.status"
              :options="statusOptions"
              size="small"
              style="width: 120px"
            />
          </n-descriptions-item>
          <n-descriptions-item label="优先级">
            <n-select
              v-model:value="editForm.priority"
              :options="priorityOptions"
              size="small"
              style="width: 100px"
            />
          </n-descriptions-item>
          <n-descriptions-item label="提交时间">
            {{ formatDate(currentFeedback.createdAt) }}
          </n-descriptions-item>
          <n-descriptions-item label="来源页面">
            {{ currentFeedback.page || '-' }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider />

        <h4>反馈内容</h4>
        <n-card size="small" embedded>
          <p style="white-space: pre-wrap;">{{ currentFeedback.content }}</p>
        </n-card>

        <n-divider />

        <h4>回复用户</h4>
        <n-input
          v-model:value="editForm.reply"
          type="textarea"
          placeholder="输入回复内容（用户可见）..."
          :rows="3"
        />

        <n-divider />

        <h4>内部备注</h4>
        <n-input
          v-model:value="editForm.adminNote"
          type="textarea"
          placeholder="内部备注（仅管理员可见）..."
          :rows="2"
        />
      </template>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showDetailModal = false">关闭</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSave">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted, computed } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage, NButton, NSpace, NTag, NDropdown, NSelect } from 'naive-ui';
import { feedbackAPI } from '@/api';

const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const feedbacks = ref([]);
const stats = ref({});
const showDetailModal = ref(false);
const currentFeedback = ref(null);
const selectedIds = ref([]);
const activeTab = ref('all');

const editForm = reactive({
  status: 'pending',
  priority: 0,
  reply: '',
  adminNote: '',
});

const filters = reactive({
  type: null,
  priority: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
});

const statusOptions = [
  { label: '📥 待处理', value: 'pending' },
  { label: '📌 待办', value: 'todo' },
  { label: '💬 讨论中', value: 'discussing' },
  { label: '✅ 已解决', value: 'resolved' },
  { label: '🎉 已采纳', value: 'adopted' },
  { label: '📦 已归档', value: 'archived' },
];

const typeOptions = [
  { label: '问题反馈', value: 'bug' },
  { label: '功能建议', value: 'suggestion' },
  { label: '其他', value: 'other' },
];

const priorityOptions = [
  { label: '普通', value: 0 },
  { label: '重要', value: 1 },
  { label: '紧急', value: 2 },
];

// 根据 Tab 计算状态过滤
const statusFilter = computed(() => {
  switch (activeTab.value) {
    case 'todo': return 'todo';
    case 'pending': return 'pending';
    case 'discussing': return 'discussing';
    case 'completed': return 'resolved,adopted';
    case 'archived': return 'archived';
    default: return null;
  }
});

const columns = [
  {
    type: 'selection',
    width: 40,
  },
  {
    title: '',
    key: 'priority',
    width: 40,
    render: (row) => h(NDropdown, {
      trigger: 'click',
      options: [
        { label: '⚪ 普通', key: 0 },
        { label: '🟡 重要', key: 1 },
        { label: '🔴 紧急', key: 2 },
      ],
      onSelect: (key) => handleQuickPriority(row.id, key),
    }, () => h('span', { style: 'cursor: pointer; font-size: 16px;' },
      { 0: '⚪', 1: '🟡', 2: '🔴' }[row.priority] || '⚪'
    )),
  },
  {
    title: '用户',
    key: 'user',
    width: 80,
    render: (row) => row.user?.username || '未知',
  },
  {
    title: '类型',
    key: 'type',
    width: 70,
    render: (row) => h(NTag, { type: getTypeTagType(row.type), size: 'small' }, () => getTypeText(row.type)),
  },
  {
    title: '内容',
    key: 'content',
    ellipsis: { tooltip: true },
    render: (row) => h('span', {
      style: 'cursor: pointer;',
      onClick: () => handleView(row),
    }, row.content),
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NSelect, {
      value: row.status,
      size: 'tiny',
      options: statusOptions,
      style: 'width: 110px',
      onUpdateValue: (val) => handleQuickStatus(row.id, val),
    }),
  },
  {
    title: '时间',
    key: 'createdAt',
    width: 90,
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) => h(NSpace, { size: 4 }, () => [
      h(NButton, {
        size: 'tiny',
        type: row.status === 'todo' ? 'warning' : 'default',
        secondary: row.status !== 'todo',
        onClick: () => handleQuickStatus(row.id, row.status === 'todo' ? 'resolved' : 'todo'),
        title: row.status === 'todo' ? '标记已解决' : '标记待办',
      }, () => row.status === 'todo' ? '✅完成' : '📌待办'),
      h(NButton, {
        size: 'tiny',
        onClick: () => handleView(row),
      }, () => '详情'),
    ]),
  },
];

const loadFeedbacks = async () => {
  if (activeTab.value === 'stats') return;

  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      type: filters.type,
      priority: filters.priority,
    };
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    const [listRes, statsRes] = await Promise.all([
      feedbackAPI.adminList(params),
      feedbackAPI.adminStats(),
    ]);

    if (listRes.success) {
      feedbacks.value = listRes.feedbacks;
      pagination.itemCount = listRes.pagination.total;
    }

    if (statsRes.success) {
      stats.value = statsRes.stats;
    }
  } catch (error) {
    message.error('加载反馈列表失败');
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const result = await feedbackAPI.adminStats();
    if (result.success) {
      stats.value = result.stats;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

const handleTabChange = (tab) => {
  pagination.page = 1;
  selectedIds.value = [];
  if (tab === 'stats') {
    loadStats();
  } else {
    loadFeedbacks();
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadFeedbacks();
};

const handleSelectionChange = (keys) => {
  selectedIds.value = keys;
};

const handleView = (feedback) => {
  currentFeedback.value = feedback;
  editForm.status = feedback.status;
  editForm.priority = feedback.priority;
  editForm.reply = feedback.reply || '';
  editForm.adminNote = feedback.adminNote || '';
  showDetailModal.value = true;
};

const handleSave = async () => {
  submitting.value = true;
  try {
    const result = await feedbackAPI.adminUpdate(currentFeedback.value.id, {
      status: editForm.status,
      priority: editForm.priority,
      reply: editForm.reply,
      adminNote: editForm.adminNote,
    });

    if (result.success) {
      message.success('保存成功');
      showDetailModal.value = false;
      loadFeedbacks();
    } else {
      message.error(result.error || '保存失败');
    }
  } catch (error) {
    message.error('保存失败');
  } finally {
    submitting.value = false;
  }
};

const handleQuickStatus = async (id, status) => {
  try {
    const result = await feedbackAPI.adminUpdate(id, { status });
    if (result.success) {
      message.success('状态已更新');
      // 更新本地数据，避免重新加载
      const item = feedbacks.value.find(f => f.id === id);
      if (item) item.status = status;
      // 重新加载统计
      loadStats();
    }
  } catch (error) {
    message.error('更新失败');
  }
};

const handleQuickPriority = async (id, priority) => {
  try {
    const result = await feedbackAPI.adminUpdate(id, { priority });
    if (result.success) {
      message.success('优先级已更新');
      const item = feedbacks.value.find(f => f.id === id);
      if (item) item.priority = priority;
    }
  } catch (error) {
    message.error('更新失败');
  }
};

const handleBatchUpdate = async (status) => {
  if (selectedIds.value.length === 0) return;

  try {
    const result = await feedbackAPI.adminBatchUpdate({
      ids: selectedIds.value,
      status,
    });
    if (result.success) {
      message.success(`已更新 ${result.updated} 条反馈`);
      selectedIds.value = [];
      loadFeedbacks();
    }
  } catch (error) {
    message.error('批量更新失败');
  }
};

const getTypeText = (type) => {
  const map = { bug: '问题', suggestion: '建议', other: '其他' };
  return map[type] || type;
};

const getTypeTagType = (type) => {
  const map = { bug: 'error', suggestion: 'info', other: 'default' };
  return map[type] || 'default';
};

const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    todo: '待办',
    discussing: '讨论中',
    resolved: '已解决',
    adopted: '已采纳',
    archived: '已归档',
  };
  return map[status] || status;
};

const getStatusTagType = (status) => {
  const map = {
    pending: 'info',
    todo: 'warning',
    discussing: 'default',
    resolved: 'success',
    adopted: 'success',
    archived: 'default',
  };
  return map[status] || 'default';
};

const getStatusIcon = (status) => {
  const map = {
    pending: '📥',
    todo: '📌',
    discussing: '💬',
    resolved: '✅',
    adopted: '🎉',
    archived: '📦',
  };
  return map[status] || '';
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
  loadFeedbacks();
});
</script>

<style scoped>
.feedback-admin-page {
  padding: 20px;
}

.stats-grid {
  margin: 16px 0;
}

.detail-stats {
  margin-top: 16px;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  font-size: 16px;
}

.stat-value.urgent {
  color: #e53935;
}

.stat-value.important {
  color: #fb8c00;
}

.user-rank-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.user-rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  min-width: 150px;
}

.rank-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.user-rank-item:nth-child(1) .rank-num {
  background: #ffd700;
  color: #333;
}

.user-rank-item:nth-child(2) .rank-num {
  background: #c0c0c0;
  color: #333;
}

.user-rank-item:nth-child(3) .rank-num {
  background: #cd7f32;
  color: #fff;
}

.rank-name {
  flex: 1;
}

.rank-count {
  color: #666;
  font-size: 13px;
}

.empty-text {
  color: #999;
  text-align: center;
  padding: 20px;
}

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 8px;
  margin: 12px 0;
  border: 1px solid #90caf9;
}

.batch-count {
  font-weight: 600;
  color: #1565c0;
}

.stats-panel {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .feedback-admin-page {
    padding: 12px;
  }

  .stats-grid {
    --n-cols: 3 !important;
  }

  .detail-stats {
    --n-cols: 1 !important;
  }
}
</style>
