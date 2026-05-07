<template>
  <div :class="embedded ? '' : 'payment-plan-admin-page'">
    <n-page-header v-if="!embedded" title="付款计划管理" subtitle="管理用户分期付款">
      <template #extra>
        <n-space>
          <n-button @click="handleCheckOverdue" :loading="checking">
            检查逾期状态
          </n-button>
          <n-select
            v-model:value="statusFilter"
            :options="statusOptions"
            placeholder="筛选状态"
            clearable
            style="width: 120px"
            @update:value="loadPlans"
          />
        </n-space>
      </template>
    </n-page-header>

    <div v-if="embedded" class="mb-3 flex justify-end">
      <n-space>
        <n-button @click="handleCheckOverdue" :loading="checking" size="small">检查逾期状态</n-button>
        <n-select v-model:value="statusFilter" :options="statusOptions" placeholder="筛选状态" clearable style="width: 120px" size="small" @update:value="loadPlans" />
      </n-space>
    </div>

    <!-- 统计卡片 -->
    <n-grid :cols="5" :x-gap="16" class="stats-grid">
      <n-gi>
        <n-card size="small">
          <n-statistic label="总计划" :value="stats.totalPlans" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small">
          <n-statistic label="进行中" :value="stats.activePlans" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small">
          <n-statistic label="已完成" :value="stats.completedPlans" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small">
          <n-statistic label="逾期" :value="stats.overduePlans">
            <template #suffix>
              <n-text v-if="stats.overduePlans > 0" type="error">!</n-text>
            </template>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small">
          <n-statistic label="逾期率" :value="stats.overdueRate" suffix="%" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 金额统计 -->
    <n-card size="small" class="amount-card">
      <n-space justify="space-around">
        <n-statistic label="总金额">
          <n-number-animation :from="0" :to="parseFloat(stats.totalAmount || 0)" :precision="2" />
          <template #suffix>学习币</template>
        </n-statistic>
        <n-statistic label="已收金额">
          <n-number-animation :from="0" :to="parseFloat(stats.paidAmount || 0)" :precision="2" />
          <template #suffix>学习币</template>
        </n-statistic>
        <n-statistic label="待收金额">
          <n-number-animation
            :from="0"
            :to="parseFloat(stats.totalAmount || 0) - parseFloat(stats.paidAmount || 0)"
            :precision="2"
          />
          <template #suffix>学习币</template>
        </n-statistic>
      </n-space>
    </n-card>

    <!-- 付款计划列表 -->
    <n-spin :show="loading">
      <n-data-table
        :columns="columns"
        :data="plans"
        :pagination="pagination"
        :row-key="row => row.id"
        :row-class-name="getRowClassName"
        @update:page="handlePageChange"
      />
    </n-spin>

    <!-- 详情弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" title="付款计划详情" style="width: 90%; max-width: 700px;">
      <template v-if="currentPlan">
        <n-descriptions :column="2" label-placement="left">
          <n-descriptions-item label="用户">
            {{ currentPlan.user?.username || '未知' }}
          </n-descriptions-item>
          <n-descriptions-item label="商品">
            {{ currentPlan.payCode?.title || '未知' }}
          </n-descriptions-item>
          <n-descriptions-item label="总金额">
            {{ formatAmount(currentPlan.totalAmount) }} 学习币
          </n-descriptions-item>
          <n-descriptions-item label="已付金额">
            {{ formatAmount(currentPlan.paidAmount) }} 学习币
          </n-descriptions-item>
          <n-descriptions-item label="分期">
            {{ currentPlan.paidInstallments }}/{{ currentPlan.installments }} 期
          </n-descriptions-item>
          <n-descriptions-item label="首付">
            {{ currentPlan.downPaymentRate }}% ({{ formatAmount(currentPlan.downPaymentAmount) }} 学习币)
          </n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="getStatusType(currentPlan.status)" size="small">
              {{ getStatusText(currentPlan.status) }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="创建时间">
            {{ formatDate(currentPlan.createdAt) }}
          </n-descriptions-item>
          <n-descriptions-item label="下次付款日">
            {{ currentPlan.status === 'completed' ? '-' : formatDate(currentPlan.nextDueDate) }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider />

        <h4>付款日程</h4>
        <n-timeline>
          <n-timeline-item
            v-for="schedule in currentPlan.schedules"
            :key="schedule.id"
            :type="getScheduleType(schedule)"
            :title="`第 ${schedule.installmentNo} 期 - ${formatAmount(schedule.amount)} 学习币`"
          >
            <template #default>
              <div class="schedule-detail">
                <span>应付日期: {{ formatDate(schedule.dueDate) }}</span>
                <span v-if="schedule.paidAt"> | 实付时间: {{ formatDate(schedule.paidAt) }}</span>
                <n-tag :type="getScheduleTagType(schedule.status)" size="small" style="margin-left: 8px;">
                  {{ getScheduleStatusText(schedule.status) }}
                </n-tag>
              </div>
            </template>
          </n-timeline-item>
        </n-timeline>
      </template>

      <template #footer>
        <n-button @click="showDetailModal = false">关闭</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted } from 'vue';

defineProps({ embedded: { type: Boolean, default: false } });
import { useMessage, NButton, NTag, NProgress } from 'naive-ui';
import { paymentPlanAPI } from '@/api';

const message = useMessage();

const loading = ref(false);
const checking = ref(false);
const plans = ref([]);
const stats = ref({});
const statusFilter = ref(null);
const showDetailModal = ref(false);
const currentPlan = ref(null);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
});

const statusOptions = [
  { label: '全部', value: null },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '逾期', value: 'overdue' },
];

const columns = [
  {
    title: '用户',
    key: 'user',
    width: 100,
    render: (row) => row.user?.username || '未知',
  },
  {
    title: '商品',
    key: 'payCode',
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => row.payCode?.title || '未知',
  },
  {
    title: '进度',
    key: 'progress',
    width: 150,
    render: (row) => h(NProgress, {
      type: 'line',
      percentage: getProgress(row),
      status: row.status === 'overdue' ? 'error' : row.status === 'completed' ? 'success' : 'default',
      showIndicator: true,
    }),
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render: (row) => `${formatAmount(row.paidAmount)}/${formatAmount(row.totalAmount)}`,
  },
  {
    title: '分期',
    key: 'installments',
    width: 80,
    render: (row) => `${row.paidInstallments}/${row.installments}`,
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row) => h(NTag, { type: getStatusType(row.status), size: 'small' }, () => getStatusText(row.status)),
  },
  {
    title: '下次付款',
    key: 'nextDueDate',
    width: 100,
    render: (row) => row.status === 'completed' ? '-' : formatDateShort(row.nextDueDate),
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row) => h(NButton, {
      size: 'small',
      onClick: () => handleView(row),
    }, () => '详情'),
  },
];

const loadPlans = async () => {
  loading.value = true;
  try {
    const [plansRes, statsRes] = await Promise.all([
      paymentPlanAPI.adminList({
        page: pagination.page,
        limit: pagination.pageSize,
        status: statusFilter.value,
      }),
      paymentPlanAPI.adminStats(),
    ]);

    if (plansRes.success) {
      plans.value = plansRes.plans;
      pagination.itemCount = plansRes.pagination.total;
    }

    if (statsRes.success) {
      stats.value = statsRes.stats;
    }
  } catch (error) {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadPlans();
};

const handleCheckOverdue = async () => {
  checking.value = true;
  try {
    const result = await paymentPlanAPI.adminCheckOverdue();
    if (result.success) {
      message.success(`检查完成，更新了 ${result.updatedSchedules} 个日程，${result.updatedPlans} 个计划`);
      loadPlans();
    } else {
      message.error(result.error || '检查失败');
    }
  } catch (error) {
    message.error('检查失败');
  } finally {
    checking.value = false;
  }
};

const handleView = (plan) => {
  currentPlan.value = plan;
  showDetailModal.value = true;
};

const getProgress = (plan) => {
  if (!plan.totalAmount || plan.totalAmount == 0) return 0;
  return Math.round((parseFloat(plan.paidAmount) / parseFloat(plan.totalAmount)) * 100);
};

const getStatusType = (status) => {
  const map = { active: 'info', completed: 'success', overdue: 'error' };
  return map[status] || 'default';
};

const getStatusText = (status) => {
  const map = { active: '进行中', completed: '已完成', overdue: '逾期' };
  return map[status] || status;
};

const getScheduleType = (schedule) => {
  if (schedule.status === 'paid' || schedule.status === 'paid_late') return 'success';
  if (schedule.status === 'overdue') return 'error';
  return 'default';
};

const getScheduleTagType = (status) => {
  const map = { pending: 'default', paid: 'success', overdue: 'error', paid_late: 'warning' };
  return map[status] || 'default';
};

const getScheduleStatusText = (status) => {
  const map = { pending: '待付', paid: '已付', overdue: '逾期', paid_late: '逾期后付' };
  return map[status] || status;
};

const getRowClassName = (row) => {
  return row.status === 'overdue' ? 'overdue-row' : '';
};

const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const formatDateShort = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.payment-plan-admin-page {
  padding: 20px;
}

.stats-grid {
  margin: 16px 0;
}

.amount-card {
  margin-bottom: 16px;
}

.schedule-detail {
  font-size: 13px;
  color: #666;
}

:deep(.overdue-row) {
  background-color: #fff2f0;
}

@media (max-width: 768px) {
  .payment-plan-admin-page {
    padding: 12px;
  }

  .stats-grid {
    --n-cols: 2 !important;
  }
}
</style>
