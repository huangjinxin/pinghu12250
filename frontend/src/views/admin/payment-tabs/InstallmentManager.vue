<template>
  <div class="installment-manager">
    <!-- 分期配置面板 -->
    <n-card title="分期配置" size="small" class="config-card">
      <template #header-extra>
        <n-tag type="info" size="small">系统设置</n-tag>
      </template>
      <div class="config-grid">
        <div class="config-item">
          <div class="config-label">允许分期</div>
          <n-switch v-model="configForm.enabled">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </div>
        <div class="config-item">
          <div class="config-label">最低分期金额</div>
          <n-space>
            <n-input-number v-model="configForm.minAmount" :min="10" :step="10" style="width: 120px" />
            <span class="unit-text">学习币</span>
          </n-space>
        </div>
        <div class="config-item">
          <div class="config-label">首付比例</div>
          <n-space>
            <n-input-number v-model="configForm.downPaymentRate" :min="0" :max="50" :step="5" style="width: 100px" />
            <span class="unit-text">%（0表示0首付）</span>
          </n-space>
        </div>
        <div class="config-item">
          <div class="config-label">可用期数</div>
          <n-space>
            <n-checkbox v-model:checked="configForm.allow3Months">3期</n-checkbox>
            <n-checkbox v-model:checked="configForm.allow6Months">6期</n-checkbox>
            <n-checkbox v-model:checked="configForm.allow12Months">12期</n-checkbox>
          </n-space>
        </div>
        <div class="config-item">
          <div class="config-label">逾期罚息</div>
          <n-space>
            <n-input-number v-model="configForm.overduePenaltyRate" :min="0" :max="10" :step="0.5" style="width: 100px" />
            <span class="unit-text">%/天</span>
          </n-space>
        </div>
        <div class="config-item">
          <div class="config-label">分期利息</div>
          <n-space>
            <n-input-number v-model="configForm.interestRate" :min="0" :max="30" :step="0.5" style="width: 100px" />
            <span class="unit-text">%/期</span>
          </n-space>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="loadConfig">重置</n-button>
          <n-button type="primary" :loading="saving" @click="handleSaveConfig">保存配置</n-button>
        </n-space>
      </template>
    </n-card>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <n-card size="small" class="stat-card">
        <n-statistic label="总计划数">
          <template #default><span class="stat-num">{{ stats.totalPlans }}</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="进行中">
          <template #default><span class="stat-num blue">{{ stats.activePlans }}</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="已完成">
          <template #default><span class="stat-num green">{{ stats.completedPlans }}</span></template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="逾期">
          <template #default>
            <span class="stat-num red">{{ stats.overduePlans }}</span>
            <n-tag v-if="stats.overduePlans > 0" type="error" size="tiny" style="margin-left: 8px">!</n-tag>
          </template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="总金额">
          <template #default><span class="stat-num">{{ parseFloat(stats.totalAmount || 0).toFixed(2) }}</span></template>
          <template #suffix>币</template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="已收金额">
          <template #default><span class="stat-num green">{{ parseFloat(stats.paidAmount || 0).toFixed(2) }}</span></template>
          <template #suffix>币</template>
        </n-statistic>
      </n-card>
      <n-card size="small" class="stat-card">
        <n-statistic label="待收金额">
          <template #default><span class="stat-num orange">{{ parseFloat(stats.totalAmount - stats.paidAmount || 0).toFixed(2) }}</span></template>
          <template #suffix>币</template>
        </n-statistic>
      </n-card>
    </div>

    <!-- 分期记录列表 -->
    <n-card size="small" class="list-card">
      <template #header>
        <n-space>
          <span>分期记录</span>
          <n-tag type="info" size="small">{{ pagination.itemCount }} 条</n-tag>
        </n-space>
      </template>
      <template #header-extra>
        <n-space>
          <n-select v-model:value="filters.status" :options="statusOptions" placeholder="状态" style="width: 100px" clearable @update:value="loadPlans" />
          <n-button @click="handleCheckOverdue" :loading="checking">检查逾期</n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="plans"
        :loading="loading"
        :pagination="pagination"
        :row-key="row => row.id"
        :row-class-name="getRowClass"
        @update:page="handlePageChange"
      />
    </n-card>

    <!-- 分期详情弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" title="分期详情" style="width: 700px">
      <template v-if="currentPlan">
        <n-descriptions :column="2" label-placement="left" size="small">
          <n-descriptions-item label="用户">{{ currentPlan.user?.username || '未知' }}</n-descriptions-item>
          <n-descriptions-item label="商品">{{ currentPlan.payCode?.title || '未知' }}</n-descriptions-item>
          <n-descriptions-item label="总金额">{{ parseFloat(currentPlan.totalAmount).toFixed(2) }} 学习币</n-descriptions-item>
          <n-descriptions-item label="已付">{{ parseFloat(currentPlan.paidAmount).toFixed(2) }} 学习币</n-descriptions-item>
          <n-descriptions-item label="分期">{{ currentPlan.paidInstallments }}/{{ currentPlan.installments }} 期</n-descriptions-item>
          <n-descriptions-item label="首付">{{ currentPlan.downPaymentRate }}% ({{ parseFloat(currentPlan.downPaymentAmount).toFixed(2) }} 币)</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="getStatusType(currentPlan.status)" size="small">{{ getStatusText(currentPlan.status) }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="下次付款">{{ currentPlan.status === 'completed' ? '-' : formatDate(currentPlan.nextDueDate) }}</n-descriptions-item>
        </n-descriptions>

        <n-divider>付款日程</n-divider>

        <n-timeline>
          <n-timeline-item
            v-for="schedule in currentPlan.schedules"
            :key="schedule.id"
            :type="getScheduleType(schedule)"
          >
            <template #header>
              第 {{ schedule.installmentNo }} 期 - {{ parseFloat(schedule.amount).toFixed(2) }} 学习币
            </template>
            <div class="schedule-info">
              <div>应付: {{ formatDate(schedule.dueDate) }}</div>
              <div v-if="schedule.paidAt">实付: {{ formatDate(schedule.paidAt) }}</div>
              <n-tag :type="getScheduleTagType(schedule.status)" size="tiny">{{ getScheduleStatusText(schedule.status) }}</n-tag>
            </div>
          </n-timeline-item>
        </n-timeline>
      </template>
      <template #footer>
        <n-space justify="end"><n-button @click="showDetailModal = false">关闭</n-button></n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useMessage, NButton, NTag, NSwitch, NProgress, NIcon, NCheckbox } from 'naive-ui';
import { paymentPlanAPI } from '@/api';
import { format } from 'date-fns';

const message = useMessage();

const loading = ref(false);
const checking = ref(false);
const saving = ref(false);
const plans = ref([]);
const stats = ref({});
const filters = reactive({ status: null });
const showDetailModal = ref(false);
const currentPlan = ref(null);
const pagination = reactive({ page: 1, pageSize: 20, itemCount: 0 });

const configForm = ref({
  enabled: true,
  minAmount: 100,
  downPaymentRate: 20,
  allow3Months: true,
  allow6Months: true,
  allow12Months: false,
  overduePenaltyRate: 0.5,
  interestRate: 0,
});

const statusOptions = [
  { label: '全部', value: null },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '逾期', value: 'overdue' },
];

const columns = [
  { title: '用户', key: 'user', width: 100, render: (r) => r.user?.username || '未知' },
  { title: '商品', key: 'payCode', ellipsis: { tooltip: true }, render: (r) => r.payCode?.title || '未知' },
  { title: '进度', key: 'progress', width: 150, render: (r) => h(NProgress, { type: 'line', percentage: getProgress(r), status: r.status === 'overdue' ? 'error' : r.status === 'completed' ? 'success' : 'default', showIndicator: true }) },
  { title: '金额', key: 'amount', width: 130, render: (r) => `${parseFloat(r.paidAmount).toFixed(2)}/${parseFloat(r.totalAmount).toFixed(2)}` },
  { title: '分期', key: 'installments', width: 70, render: (r) => `${r.paidInstallments}/${r.installments}` },
  { title: '状态', key: 'status', width: 80, render: (r) => h(NTag, { type: getStatusType(r.status), size: 'small' }, () => getStatusText(r.status)) },
  { title: '下次付款', key: 'nextDueDate', width: 100, render: (r) => r.status === 'completed' ? '-' : formatDateShort(r.nextDueDate) },
  { title: '操作', key: 'actions', width: 70, render: (r) => h(NButton, { size: 'small', onClick: () => handleView(r) }, () => '详情') },
];

const loadConfig = async () => {
  try {
    const result = await paymentPlanAPI.adminGetConfig();
    if (result.success && result.config) {
      configForm.value = { ...configForm.value, ...result.config };
    }
  } catch {
    message.error('加载分期配置失败');
  }
};

const handleSaveConfig = async () => {
  saving.value = true;
  try {
    const result = await paymentPlanAPI.adminSaveConfig(configForm.value);
    if (result.success) {
      message.success('配置保存成功');
    } else {
      message.error(result.error || '保存失败');
    }
  } catch (error) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const loadPlans = async () => {
  loading.value = true;
  try {
    const [plansRes, statsRes] = await Promise.all([
      paymentPlanAPI.adminList({ page: pagination.page, limit: pagination.pageSize, status: filters.status }),
      paymentPlanAPI.adminStats(),
    ]);
    if (plansRes.success) {
      plans.value = plansRes.plans;
      pagination.itemCount = plansRes.pagination.total;
    }
    if (statsRes.success) stats.value = statsRes.stats;
  } catch { message.error('加载失败'); }
  finally { loading.value = false; }
};

const handlePageChange = (p) => { pagination.page = p; loadPlans(); };

const handleCheckOverdue = async () => {
  checking.value = true;
  try {
    const result = await paymentPlanAPI.adminCheckOverdue();
    if (result.success) message.success(`检查完成，更新了 ${result.updatedSchedules} 个日程`);
    loadPlans();
  } catch { message.error('检查失败'); }
  finally { checking.value = false; }
};

const handleView = (plan) => { currentPlan.value = plan; showDetailModal.value = true; };

const getProgress = (plan) => plan.totalAmount ? Math.round((parseFloat(plan.paidAmount) / parseFloat(plan.totalAmount)) * 100) : 0;
const getStatusType = (s) => ({ active: 'info', completed: 'success', overdue: 'error' }[s] || 'default');
const getStatusText = (s) => ({ active: '进行中', completed: '已完成', overdue: '逾期' }[s] || s);
const getScheduleType = (s) => { if (s.status === 'paid' || s.status === 'paid_late') return 'success'; if (s.status === 'overdue') return 'error'; return 'default'; };
const getScheduleTagType = (s) => ({ pending: 'default', paid: 'success', overdue: 'error', paid_late: 'warning' }[s] || 'default');
const getScheduleStatusText = (s) => ({ pending: '待付', paid: '已付', overdue: '逾期', paid_late: '逾期后付' }[s] || s);
const getRowClass = (row) => row.status === 'overdue' ? 'overdue-row' : '';
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN') : '-';
const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-';

onMounted(() => { loadPlans(); loadConfig(); });

defineExpose({ loadPlans });
</script>

<style scoped>
.installment-manager { padding: 16px 0; }
.config-card { margin-bottom: 16px; }
.config-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
}
.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}
.config-label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
}
.unit-text {
  color: #999;
  font-size: 13px;
  white-space: nowrap;
}
.stats-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card :deep(.n-card__content) { padding: 12px; text-align: center; }
.stat-num { font-size: 18px; font-weight: bold; }
.stat-num.blue { color: #2080f0; }
.stat-num.green { color: #18a058; }
.stat-num.red { color: #f5222d; }
.stat-num.orange { color: #fa8c16; }
.list-card :deep(.n-card-header) { padding-bottom: 12px; }
.schedule-info { font-size: 13px; color: #666; display: flex; gap: 12px; align-items: center; }
:deep(.overdue-row) { background-color: #fff2f0; }
@media (max-width: 1400px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 1000px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
