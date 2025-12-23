<template>
  <div class="shopping-tab">
    <!-- 分类筛选 -->
    <div class="filter-bar" v-if="categories.length > 0">
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
    </div>

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
            <img :src="payCode.qrcode" :alt="payCode.title" />
          </div>
          <div class="card-info">
            <div class="title">{{ payCode.title }}</div>
            <div class="amount">{{ parseFloat(payCode.amount).toFixed(2) }} 学习币</div>
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

    <!-- 分页 -->
    <div class="pagination" v-if="pagination.totalPages > 1">
      <n-pagination
        v-model:page="pagination.page"
        :page-count="pagination.totalPages"
        :page-size="pagination.limit"
        @update:page="handlePageChange"
      />
    </div>

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
            <p class="pay-desc" v-if="selectedPayCode.description">{{ selectedPayCode.description }}</p>
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
            确认支付
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
            <span class="font-bold">{{ Number(paymentResult.amount).toFixed(2) }} 学习币</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { payAPI } from '@/api';
import { WalletOutline, CheckmarkCircleOutline, CopyOutline } from '@vicons/ionicons5';
import { useAuthStore } from '@/stores/auth';

const message = useMessage();
const authStore = useAuthStore();

const loading = ref(false);
const paying = ref(false);
const payCodes = ref([]);
const categories = ref([]);
const selectedCategory = ref(null);
const showPayModal = ref(false);
const showSuccessModal = ref(false);
const selectedPayCode = ref(null);
const paymentResult = ref(null);
const paymentPassword = ref('');
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 1,
});

const filteredPayCodes = computed(() => {
  if (!selectedCategory.value) return payCodes.value;
  return payCodes.value.filter(p => p.category === selectedCategory.value);
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

const handleCardClick = (payCode) => {
  selectedPayCode.value = payCode;
  showPayModal.value = true;
};

const handlePay = (payCode) => {
  selectedPayCode.value = payCode;
  showPayModal.value = true;
};

const closePayModal = () => {
  showPayModal.value = false;
  selectedPayCode.value = null;
  paymentPassword.value = '';
};

const confirmPay = async () => {
  if (!selectedPayCode.value) return;

  if (!paymentPassword.value) {
    message.warning('请输入支付密码');
    return;
  }

  paying.value = true;
  try {
    const result = await payAPI.submitPayment({
      payCodeId: selectedPayCode.value.id,
      paymentPassword: paymentPassword.value,
    });
    paymentResult.value = result.order;
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
};

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 复制支付凭证
const copyPaymentReceipt = async () => {
  if (!paymentResult.value) return;

  const username = authStore.user?.username || '未知用户';
  const receiptText = `【支付凭证】
用户：${username}
项目：${paymentResult.value.title}
金额：${Number(paymentResult.value.amount).toFixed(2)} 学习币
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
</script>

<style scoped>
.shopping-tab {
  padding: 16px 0;
}

.filter-bar {
  margin-bottom: 20px;
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

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
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
