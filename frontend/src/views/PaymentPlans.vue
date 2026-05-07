<template>
  <div class="payment-plans-page">
    <n-page-header title="我的付款计划" subtitle="管理您的分期付款">
      <template #extra>
        <n-space>
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

    <n-spin :show="loading">
      <!-- 统计卡片 -->
      <n-grid :cols="4" :x-gap="16" :y-gap="16" class="stats-grid">
        <n-gi>
          <n-card size="small">
            <n-statistic label="进行中" :value="stats.active" />
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small">
            <n-statistic label="已完成" :value="stats.completed" />
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small">
            <n-statistic label="逾期" :value="stats.overdue">
              <template #suffix>
                <n-text v-if="stats.overdue > 0" type="error">!</n-text>
              </template>
            </n-statistic>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small">
            <n-statistic label="总计划" :value="stats.total" />
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 计划列表 -->
      <div class="plans-list">
        <n-card
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card"
          :class="{ 'overdue': plan.status === 'overdue' }"
        >
          <div class="plan-header">
            <div class="plan-title">
              <h3>{{ plan.payCode?.title || '未知商品' }}</h3>
              <n-tag :type="getStatusType(plan.status)" size="small">
                {{ getStatusText(plan.status) }}
              </n-tag>
            </div>
            <div class="plan-amount">
              <span class="paid">{{ formatAmount(plan.paidAmount) }}</span>
              <span class="separator">/</span>
              <span class="total">{{ formatAmount(plan.totalAmount) }} 学习币</span>
            </div>
          </div>

          <n-progress
            type="line"
            :percentage="getProgress(plan)"
            :status="plan.status === 'overdue' ? 'error' : plan.status === 'completed' ? 'success' : 'default'"
          />

          <div class="plan-info">
            <div class="info-item">
              <span class="label">分期</span>
              <span class="value">{{ plan.paidInstallments }}/{{ plan.installments }} 期</span>
            </div>
            <div class="info-item">
              <span class="label">首付</span>
              <span class="value">{{ plan.downPaymentRate }}% ({{ formatAmount(plan.downPaymentAmount) }})</span>
            </div>
            <div class="info-item">
              <span class="label">下次付款</span>
              <span class="value" :class="{ 'overdue-text': isOverdue(plan) }">
                {{ plan.status === 'completed' ? '已完成' : formatDate(plan.nextDueDate) }}
              </span>
            </div>
          </div>

          <!-- 付款日程 -->
          <n-collapse v-if="plan.schedules?.length > 0">
            <n-collapse-item title="付款日程" name="schedules">
              <n-timeline>
                <n-timeline-item
                  v-for="schedule in plan.schedules"
                  :key="schedule.id"
                  :type="getScheduleType(schedule)"
                  :title="`第 ${schedule.installmentNo} 期`"
                >
                  <template #default>
                    <div class="schedule-info">
                      <span>{{ formatAmount(schedule.amount) }} 学习币</span>
                      <span v-if="schedule.paidAt">
                        - 已于 {{ formatDate(schedule.paidAt) }} 支付
                      </span>
                      <span v-else>
                        - 应付日期: {{ formatDate(schedule.dueDate) }}
                      </span>
                    </div>
                  </template>
                </n-timeline-item>
              </n-timeline>
            </n-collapse-item>
          </n-collapse>

          <!-- 操作按钮 -->
          <div v-if="plan.status !== 'completed'" class="plan-actions">
            <n-button type="primary" @click="handlePay(plan)">
              支付当期 ({{ formatAmount(getCurrentAmount(plan)) }})
            </n-button>
            <n-button @click="handlePayAll(plan)">
              一次性还清 ({{ formatAmount(getRemainingAmount(plan)) }})
            </n-button>
          </div>
        </n-card>

        <n-empty v-if="!loading && plans.length === 0" description="暂无付款计划" />
      </div>
    </n-spin>

    <!-- 支付弹窗 -->
    <n-modal v-model:show="showPayModal" preset="dialog" :title="payModalTitle">
      <div class="pay-modal-content">
        <p>{{ payModalDesc }}</p>
        <n-input
          v-model:value="paymentPassword"
          type="password"
          placeholder="请输入支付密码"
          show-password-on="click"
          @keyup.enter="confirmPay"
        />
      </div>
      <template #action>
        <n-space>
          <n-button @click="showPayModal = false">取消</n-button>
          <n-button type="primary" :loading="paying" @click="confirmPay">
            确认支付
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { paymentPlanAPI } from '@/api';

const message = useMessage();

const loading = ref(false);
const paying = ref(false);
const plans = ref([]);
const statusFilter = ref(null);
const showPayModal = ref(false);
const paymentPassword = ref('');
const currentPlan = ref(null);
const payType = ref('current'); // current or all

const statusOptions = [
  { label: '全部', value: null },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '逾期', value: 'overdue' },
];

const stats = computed(() => {
  const all = plans.value;
  return {
    total: all.length,
    active: all.filter(p => p.status === 'active').length,
    completed: all.filter(p => p.status === 'completed').length,
    overdue: all.filter(p => p.status === 'overdue').length,
  };
});

const payModalTitle = computed(() => {
  return payType.value === 'current' ? '支付当期款项' : '一次性还清';
});

const payModalDesc = computed(() => {
  if (!currentPlan.value) return '';
  const plan = currentPlan.value;
  if (payType.value === 'current') {
    return `即将支付 ${plan.payCode?.title} 第 ${plan.paidInstallments + 1} 期，金额 ${formatAmount(getCurrentAmount(plan))} 学习币`;
  }
  return `即将一次性还清 ${plan.payCode?.title}，剩余金额 ${formatAmount(getRemainingAmount(plan))} 学习币`;
});

const loadPlans = async () => {
  loading.value = true;
  try {
    const result = await paymentPlanAPI.list(statusFilter.value);
    if (result.success) {
      plans.value = result.plans;
    }
  } catch (error) {
    message.error('加载付款计划失败');
  } finally {
    loading.value = false;
  }
};

const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const getStatusType = (status) => {
  const map = { active: 'info', completed: 'success', overdue: 'error' };
  return map[status] || 'default';
};

const getStatusText = (status) => {
  const map = { active: '进行中', completed: '已完成', overdue: '逾期' };
  return map[status] || status;
};

const getProgress = (plan) => {
  if (!plan.totalAmount || plan.totalAmount == 0) return 0;
  return Math.round((parseFloat(plan.paidAmount) / parseFloat(plan.totalAmount)) * 100);
};

const isOverdue = (plan) => {
  if (plan.status === 'completed') return false;
  return new Date(plan.nextDueDate) < new Date();
};

const getScheduleType = (schedule) => {
  if (schedule.status === 'paid') return 'success';
  if (schedule.status === 'overdue') return 'error';
  return 'default';
};

const getCurrentAmount = (plan) => {
  const pending = plan.schedules?.find(s => s.status === 'pending' || s.status === 'overdue');
  return pending?.amount || 0;
};

const getRemainingAmount = (plan) => {
  return parseFloat(plan.totalAmount) - parseFloat(plan.paidAmount);
};

const handlePay = (plan) => {
  currentPlan.value = plan;
  payType.value = 'current';
  paymentPassword.value = '';
  showPayModal.value = true;
};

const handlePayAll = (plan) => {
  currentPlan.value = plan;
  payType.value = 'all';
  paymentPassword.value = '';
  showPayModal.value = true;
};

const confirmPay = async () => {
  if (!paymentPassword.value) {
    message.warning('请输入支付密码');
    return;
  }

  paying.value = true;
  try {
    const api = payType.value === 'current' ? paymentPlanAPI.pay : paymentPlanAPI.payAll;
    const result = await api(currentPlan.value.id, paymentPassword.value);

    if (result.success) {
      message.success(result.message || '支付成功');
      showPayModal.value = false;
      loadPlans();
    } else {
      message.error(result.error || '支付失败');
    }
  } catch (error) {
    message.error(error.error || '支付失败');
  } finally {
    paying.value = false;
  }
};

onMounted(() => {
  loadPlans();
});
</script>

<style scoped>
.payment-plans-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.stats-grid {
  margin: 20px 0;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  transition: all 0.3s;
}

.plan-card.overdue {
  border-color: #ff4d4f;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-title h3 {
  margin: 0;
  font-size: 16px;
}

.plan-amount {
  text-align: right;
}

.plan-amount .paid {
  font-size: 18px;
  font-weight: bold;
  color: #18a058;
}

.plan-amount .separator {
  margin: 0 4px;
  color: #999;
}

.plan-amount .total {
  color: #666;
}

.plan-info {
  display: flex;
  gap: 24px;
  margin: 12px 0;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item .label {
  font-size: 12px;
  color: #999;
}

.info-item .value {
  font-size: 14px;
}

.info-item .overdue-text {
  color: #ff4d4f;
}

.schedule-info {
  font-size: 13px;
  color: #666;
}

.plan-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.pay-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 640px) {
  .payment-plans-page {
    padding: 12px;
  }

  .stats-grid {
    --n-cols: 2 !important;
  }

  .plan-header {
    flex-direction: column;
    gap: 8px;
  }

  .plan-info {
    flex-direction: column;
    gap: 8px;
  }

  .plan-actions {
    flex-direction: column;
  }
}
</style>
