<template>
  <div class="shopping-tab">
    <!-- 分类筛选 -->
    <WorksFilterBar :show-reset="false" v-if="categories.length > 0">
      <n-space>
        <n-tag
          v-for="cat in ['全部', ...categories]"
          :key="cat"
          :type="selectedCategory === (cat === '全部' ? null : cat) ? 'primary' : 'default'"
          :bordered="selectedCategory !== (cat === '全部' ? null : cat)"
          style="cursor: pointer"
          @click="handleCategoryChange(cat)"
        >
          {{ cat }}
        </n-tag>
      </n-space>
    </WorksFilterBar>

    <!-- 顶部分页 -->
    <WorksPagination
      v-model:page="pagination.page"
      v-model:pageSize="pagination.limit"
      :total="pagination.total"
      item-name="个商品"
      position="top"
      @update:page="handlePageChange"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 二维码卡片网格 -->
    <n-spin :show="loading">
      <div class="qrcode-grid">
        <div
          v-for="payCode in filteredPayCodes"
          :key="payCode.id"
          class="qrcode-card"
          @click="handleCardClick(payCode)"
        >
          <div class="qrcode-image">
            <div class="title-avatar" :style="{ background: getAvatarColor(payCode.title) }">
              {{ payCode.title?.charAt(0) || '?' }}
            </div>
          </div>
          <div class="card-info">
            <div class="title">{{ payCode.title }}</div>
            <div class="amount">{{ parseFloat(payCode.amount).toFixed(2) }} 学习币</div>
            <div class="point-price" v-if="payCode.pointPrice">或 {{ payCode.pointPrice }} 积分</div>
            <div class="description" v-if="payCode.description">{{ payCode.description }}</div>
          </div>
          <div class="card-actions">
            <n-button type="primary" size="small" @click.stop="handlePay(payCode)">
              <template #icon><n-icon><WalletOutline /></n-icon></template>
              立即支付
            </n-button>
          </div>
        </div>
      </div>

      <n-empty v-if="!loading && filteredPayCodes.length === 0" description="暂无商品">
        <template #extra>
          <p style="color: #999; font-size: 14px">敬请期待更多商品上架</p>
        </template>
      </n-empty>
    </n-spin>

    <!-- 底部分页 -->
    <WorksPagination
      v-model:page="pagination.page"
      v-model:pageSize="pagination.limit"
      :total="pagination.total"
      item-name="个商品"
      position="bottom"
      @update:page="handlePageChange"
      @update:pageSize="handlePageSizeChange"
    />

    <!-- 支付确认弹窗 -->
    <n-modal v-model:show="showPayModal" preset="dialog" title="确认支付">
      <template #default>
        <div class="pay-confirm" v-if="selectedPayCode">
          <div class="pay-qrcode">
            <img :src="selectedPayCode.qrcode" :alt="selectedPayCode.title" />
          </div>
          <div class="pay-info">
            <h3>{{ selectedPayCode.title }}</h3>
            <p class="pay-amount">{{ parseFloat(selectedPayCode.amount).toFixed(2) }} 学习币</p>
            <p class="pay-point-price" v-if="selectedPayCode.pointPrice">或 {{ selectedPayCode.pointPrice }} 积分</p>
            <p class="pay-desc" v-if="selectedPayCode.description">{{ selectedPayCode.description }}</p>
          </div>
          <!-- 支付方式选择 -->
          <div v-if="selectedPayCode.pointPrice" class="pay-method">
            <n-divider />
            <n-radio-group v-model:value="selectedPaymentMethod">
              <n-space vertical>
                <n-radio value="wallet">学习币支付 ({{ parseFloat(selectedPayCode.amount).toFixed(2) }} 学习币)</n-radio>
                <n-radio value="points">积分支付 ({{ selectedPayCode.pointPrice }} 积分)</n-radio>
              </n-space>
            </n-radio-group>
          </div>
          <!-- 分期付款选项（仅学习币支付时可用） -->
          <div v-if="selectedPayCode.allowInstallment && selectedPaymentMethod === 'wallet'" class="pay-installment">
            <n-divider />
            <n-radio-group v-model:value="paymentType">
              <n-space vertical>
                <n-radio value="full">全额支付 ({{ parseFloat(selectedPayCode.amount).toFixed(2) }} 学习币)</n-radio>
                <n-radio value="installment">分期付款</n-radio>
              </n-space>
            </n-radio-group>
            <div v-if="paymentType === 'installment'" class="installment-options">
              <div class="option-row">
                <span class="option-label">首付比例</span>
                <n-select
                  v-model:value="downPaymentRate"
                  :options="downPaymentOptions"
                  style="width: 140px"
                />
              </div>
              <div class="option-row">
                <span class="option-label">分期期数</span>
                <n-select
                  v-model:value="selectedInstallment"
                  :options="installmentOptions"
                  placeholder="选择期数"
                  style="width: 140px"
                />
              </div>
              <div v-if="selectedInstallment" class="installment-summary">
                <div class="summary-item">
                  <span>首付金额</span>
                  <span class="amount">{{ downPaymentAmount }} 学习币</span>
                </div>
                <div class="summary-item">
                  <span>剩余金额</span>
                  <span>{{ remainingAmount }} 学习币</span>
                </div>
                <div class="summary-item">
                  <span>每期还款</span>
                  <span>约 {{ installmentAmount }} 学习币 × {{ selectedInstallment }}期</span>
                </div>
              </div>
            </div>
          </div>
          <div class="pay-password">
            <n-input
              v-model:value="paymentPassword"
              type="password"
              show-password-on="click"
              placeholder="请输入支付密码（默认123456）"
              @keyup.enter="confirmPay"
            />
          </div>
        </div>
      </template>
      <template #action>
        <n-space>
          <n-button @click="closePayModal">取消</n-button>
          <n-button type="primary" :loading="paying" @click="confirmPay">
            {{ paymentType === 'installment' ? '确认分期' : '确认支付' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 支付成功弹窗 -->
    <n-modal v-model:show="showSuccessModal" preset="dialog" title="支付成功">
      <div v-if="paymentResult" class="text-center space-y-4 py-4">
        <n-icon size="64" color="#52c41a">
          <CheckmarkCircleOutline />
        </n-icon>
        <div>
          <h3 class="text-lg font-bold mb-2">支付成功！</h3>
          <p class="text-gray-600">{{ paymentResult.title }}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg space-y-2 text-left">
          <div class="flex justify-between">
            <span class="text-gray-600">订单号</span>
            <span class="font-mono text-sm">{{ paymentResult.orderNo }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付金额</span>
            <span class="font-bold">{{ Number(paymentResult.amount).toFixed(paymentResult.paymentMethod === 'points' ? 0 : 2) }} {{ paymentResult.paymentMethod === 'points' ? '积分' : '学习币' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付时间</span>
            <span class="text-sm">{{ formatDate(paymentResult.createdAt) }}</span>
          </div>
        </div>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="copyPaymentReceipt">
            <template #icon>
              <n-icon><CopyOutline /></n-icon>
            </template>
            复制凭证
          </n-button>
          <n-button type="primary" @click="closeSuccessModal">完成</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 任务未完成提醒弹窗 -->
    <n-modal v-model:show="showTaskBlockModal" preset="card" :mask-closable="false" style="max-width: 440px;">
      <div class="task-block-card">
        <div class="block-icon">📋</div>
        <h3 class="block-title">今日任务尚未全部完成</h3>
        <p class="block-desc">请先完成以下任务后再来成长兑换：</p>
        <div class="block-list">
          <div v-for="t in blockedTaskNames" :key="t.id" class="block-item">
            <span class="block-item-icon">⏳</span>
            <span class="block-item-name">{{ t.name }}</span>
            <span class="block-item-status" :class="t.status === '已拒绝' ? 'status-rejected' : t.status === '待提交' ? 'status-pending' : 'status-incomplete'">{{ t.status }}</span>
          </div>
        </div>
        <n-button type="primary" block size="large" class="block-btn" @click="showTaskBlockModal = false">
          我知道了，马上去完成
        </n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { payAPI, paymentPlanAPI, submissionAPI, calligraphyAPI, feedAPI, typingAPI, pinyinAPI } from '@/api';
import WalletOutline from '@vicons/ionicons5/es/WalletOutline'
import CheckmarkCircleOutline from '@vicons/ionicons5/es/CheckmarkCircleOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import { useAuthStore } from '@/stores/auth';
import WorksFilterBar from '@/components/works/WorksFilterBar.vue';
import WorksPagination from '@/components/works/WorksPagination.vue';

const message = useMessage();
const authStore = useAuthStore();

const loading = ref(false);
const paying = ref(false);
const payCodes = ref([]);
const categories = ref([]);
const selectedCategory = ref(null);
const showPayModal = ref(false);
const showSuccessModal = ref(false);
const showTaskBlockModal = ref(false);
const blockedTaskNames = ref([]);
const selectedPayCode = ref(null);
const paymentResult = ref(null);
const paymentPassword = ref('');
const paymentType = ref('full');
const selectedPaymentMethod = ref('wallet');
const selectedInstallment = ref(null);
const downPaymentRate = ref(30);
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 1,
});

// 8个任务 ID/特殊标记 定义（与 Home.vue 一致）
const taskConfigs = [
  { id: 'diary', templateName: '日记(审批前提项/日)' },
  { id: 'math', templateName: '可汗学院数学进度' },
  { id: 'poetry', templateName: '背诗' },
  { id: 'calligraphy', isCalligraphy: true },
  { id: 'moments', isSocial: 'moments' },
  { id: 'questions', isSocial: 'questions' },
  { id: 'typing', isTyping: true },
  { id: 'pinyin', isPinyin: true },
];

async function checkTodayTasks() {
  try {
    const timezoneOffset = -new Date().getTimezoneOffset();
    const templateNames = taskConfigs
      .filter(t => !t.isCalligraphy && !t.isSocial && !t.isTyping && !t.isPinyin)
      .map(t => t.templateName)
      .join(',');

    const [response, calligraphyRes, socialRes, typingRes, pinyinRes] = await Promise.all([
      submissionAPI.getTodayStatus({ templateNames, timezoneOffset }),
      calligraphyAPI.getTodayStatus({ timezoneOffset }).catch(() => ({ data: { status: 'NOT_SUBMITTED' } })),
      feedAPI.getTodaySocial({ timezoneOffset }).catch(() => ({ data: {} })),
      typingAPI.getTodayStatus({ timezoneOffset }).catch(() => ({ data: {} })),
      pinyinAPI.getTodayStatus({ timezoneOffset }).catch(() => ({ data: {} })),
    ]);

    const todayStatus = response.todayStatus || {};
    const calligraphyStatus = calligraphyRes.data?.status || 'NOT_SUBMITTED';
    const socialStatus = socialRes.data || {};
    const typingStatus = typingRes.data || {};
    const pinyinStatus = pinyinRes.data || {};

    const blockedTasks = [];
    const statusLabels = {
      pending_submit: '待提交',
      rejected: '已拒绝',
      pending_complete: '未完成',
    };

    for (const config of taskConfigs) {
      let status = 'pending_submit';

      if (config.isCalligraphy) {
        status = calligraphyStatus === 'APPROVED' || calligraphyStatus === 'PENDING' ? 'done' : 'pending_submit';
      } else if (config.isSocial) {
        status = socialStatus[config.isSocial] ? 'completed' : 'pending_complete';
      } else if (config.isTyping) {
        status = typingStatus.completed ? 'completed' : 'pending_complete';
      } else if (config.isPinyin) {
        status = pinyinStatus.completed ? 'completed' : 'pending_complete';
      } else {
        const submission = todayStatus[config.templateName];
        if (submission) {
          status = submission.status === 'APPROVED' || submission.status === 'PENDING' ? 'done' : 'rejected';
        }
      }

      if (status === 'pending_submit' || status === 'rejected' || status === 'pending_complete') {
        blockedTasks.push({ id: config.id, status });
      }
    }

    if (blockedTasks.length > 0) {
      const nameMap = { diary: '日记', math: '数学', poetry: '背诗', calligraphy: '书写', moments: '分享生活', questions: '勤学好问', typing: '打字训练', pinyin: '拼音练习' };
      blockedTaskNames.value = blockedTasks.map(t => ({ id: t.id, name: nameMap[t.id] || t.id, status: statusLabels[t.status] || t.status }));
      showTaskBlockModal.value = true;
      return false;
    }

    return true;
  } catch (e) {
    console.error('检查今日任务状态失败:', e);
    message.error('检查任务状态失败，请稍后再试');
    return false;
  }
}

const filteredPayCodes = computed(() => {
  if (!selectedCategory.value) return payCodes.value;
  return payCodes.value.filter(p => p.category === selectedCategory.value);
});

const installmentOptions = computed(() => {
  if (!selectedPayCode.value?.installmentOptions) return [];
  return selectedPayCode.value.installmentOptions.split(',').map(n => {
    const num = parseInt(n.trim());
    return { label: `${num}期`, value: num };
  });
});

const downPaymentOptions = [
  { label: '10%', value: 10 },
  { label: '20%', value: 20 },
  { label: '30% (推荐)', value: 30 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
];

const downPaymentAmount = computed(() => {
  if (!selectedPayCode.value) return 0;
  return (parseFloat(selectedPayCode.value.amount) * downPaymentRate.value / 100).toFixed(2);
});

const remainingAmount = computed(() => {
  if (!selectedPayCode.value) return 0;
  return (parseFloat(selectedPayCode.value.amount) - parseFloat(downPaymentAmount.value)).toFixed(2);
});

const installmentAmount = computed(() => {
  if (!selectedPayCode.value || !selectedInstallment.value) return 0;
  return (parseFloat(remainingAmount.value) / selectedInstallment.value).toFixed(2);
});

const loadPayCodes = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    if (selectedCategory.value) {
      params.category = selectedCategory.value;
    }
    const data = await payAPI.getPublicPayCodes(params);
    payCodes.value = data.codes;
    categories.value = data.categories || [];
    pagination.value = {
      ...pagination.value,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
    };
  } catch (error) {
    console.error('加载商品失败:', error);
    message.error('加载商品失败');
  } finally {
    loading.value = false;
  }
};

const handleCategoryChange = (cat) => {
  selectedCategory.value = cat === '全部' ? null : cat;
};

const handlePageChange = (page) => {
  pagination.value.page = page;
  loadPayCodes();
};

const handlePageSizeChange = (newSize) => {
  pagination.value.limit = newSize;
  pagination.value.page = 1;
  loadPayCodes();
};

const handleCardClick = async (payCode) => {
  if (!await checkTodayTasks()) return;
  selectedPayCode.value = payCode;
  showPayModal.value = true;
};

const handlePay = async (payCode) => {
  if (!await checkTodayTasks()) return;
  selectedPayCode.value = payCode;
  showPayModal.value = true;
};

const closePayModal = () => {
  showPayModal.value = false;
  selectedPayCode.value = null;
  paymentPassword.value = '';
  paymentType.value = 'full';
  selectedPaymentMethod.value = 'wallet';
  selectedInstallment.value = null;
  downPaymentRate.value = 30;
};

const confirmPay = async () => {
  if (!selectedPayCode.value) return;

  if (!paymentPassword.value) {
    message.warning('请输入支付密码');
    return;
  }

  // 分期付款
  if (paymentType.value === 'installment') {
    if (!selectedInstallment.value) {
      message.warning('请选择分期期数');
      return;
    }

    paying.value = true;
    try {
      const result = await paymentPlanAPI.create(
        selectedPayCode.value.id,
        selectedInstallment.value,
        downPaymentRate.value,
        paymentPassword.value
      );
      if (result.success) {
        message.success(result.message || '分期付款计划创建成功！');
        showPayModal.value = false;
        closePayModal();
      } else {
        message.error(result.error || '创建分期计划失败');
      }
    } catch (error) {
      message.error(error.error || '创建分期计划失败');
    } finally {
      paying.value = false;
    }
    return;
  }

  // 全额支付
  paying.value = true;
  try {
    const result = await payAPI.submitPayment({
      payCodeId: selectedPayCode.value.id,
      paymentPassword: paymentPassword.value,
      paymentMethod: selectedPaymentMethod.value,
    });
    paymentResult.value = { ...result.order, paymentMethod: result.paymentMethod || selectedPaymentMethod.value };
    showPayModal.value = false;
    showSuccessModal.value = true;
  } catch (error) {
    message.error(error.error || '支付失败，请检查余额');
  } finally {
    paying.value = false;
  }
};

// 关闭支付成功弹窗
const closeSuccessModal = () => {
  showSuccessModal.value = false;
  selectedPayCode.value = null;
  paymentResult.value = null;
  paymentPassword.value = '';
  paymentType.value = 'full';
  selectedPaymentMethod.value = 'wallet';
  selectedInstallment.value = null;
  downPaymentRate.value = 30;
};

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 复制支付凭证
const copyPaymentReceipt = async () => {
  if (!paymentResult.value) return;

  const username = authStore.user?.username || '未知用户';
  const isPoints = paymentResult.value.paymentMethod === 'points';
  const amountStr = isPoints
    ? `${Number(paymentResult.value.amount)} 积分`
    : `${Number(paymentResult.value.amount).toFixed(2)} 学习币`;
  const receiptText = `【支付凭证】
用户：${username}
项目：${paymentResult.value.title}
金额：${amountStr}
支付方式：${isPoints ? '积分支付' : '学习币支付'}
订单号：${paymentResult.value.orderNo}
支付时间：${formatDate(paymentResult.value.createdAt)}
状态：已完成`;

  try {
    await navigator.clipboard.writeText(receiptText);
    message.success('凭证已复制到剪贴板');
  } catch (error) {
    // 兼容不支持 clipboard API 的浏览器
    const textarea = document.createElement('textarea');
    textarea.value = receiptText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      message.success('凭证已复制到剪贴板');
    } catch (e) {
      message.error('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }
};

onMounted(() => {
  loadPayCodes();
});

const avatarColors = [
  '#f56c6c', '#e6a23c', '#5cb87a', '#1989fa', '#6f7ad3',
  '#ff85c0', '#13c2c2', '#722ed1', '#fa541c', '#2f54eb',
]

function getAvatarColor(title) {
  if (!title) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}
</script>

<style scoped>
.shopping-tab {
  padding: 0;
}

.task-block-card {
  text-align: center;
  padding: 8px 0;
}
.block-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.block-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px;
}
.block-desc {
  font-size: 14px;
  color: #666;
  margin: 0 0 20px;
}
.block-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
  text-align: left;
}
.block-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
}
.block-item-icon {
  font-size: 20px;
}
.block-item-name {
  font-size: 15px;
  font-weight: 500;
  color: #c2410c;
  flex: 1;
}
.block-item-status {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
}
.status-pending {
  background: #fef3c7;
  color: #d97706;
}
.status-rejected {
  background: #fee2e2;
  color: #dc2626;
}
.status-incomplete {
  background: #e0e7ff;
  color: #4f46e5;
}
.block-btn {
  border-radius: 10px;
}

.qrcode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.qrcode-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}

.qrcode-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #18a058;
}

.qrcode-image {
  width: 150px;
  height: 150px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image img {
  width: 100%;
  height: 100%;
}

.title-avatar {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  user-select: none;
}

.card-info .title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.card-info .amount {
  color: #18a058;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 4px;
}

.card-info .point-price {
  color: #f0a020;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.card-info .description {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-actions {
  margin-top: 12px;
}

/* 支付确认弹窗样式 */
.pay-confirm {
  text-align: center;
  padding: 20px 0;
}

.pay-qrcode {
  width: 180px;
  height: 180px;
  margin: 0 auto 16px;
}

.pay-qrcode img {
  width: 100%;
  height: 100%;
}

.pay-info h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.pay-amount {
  color: #18a058;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.pay-desc {
  color: #666;
  font-size: 14px;
}

.pay-point-price {
  color: #f0a020;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.pay-method {
  margin-top: 8px;
}

.pay-installment {
  margin-top: 8px;
}

.installment-options {
  margin-top: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.option-label {
  font-size: 14px;
  color: #666;
}

.installment-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}

.summary-item .amount {
  color: #18a058;
  font-weight: 600;
}

.installment-info {
  margin-top: 8px;
  color: #18a058;
  font-size: 14px;
  font-weight: 500;
}

.pay-password {
  margin-top: 16px;
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 640px) {
  .qrcode-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .qrcode-card {
    padding: 12px;
  }

  .qrcode-image {
    width: 120px;
    height: 120px;
  }

  .card-info .title {
    font-size: 14px;
  }

  .card-info .amount {
    font-size: 16px;
  }
}
</style>
