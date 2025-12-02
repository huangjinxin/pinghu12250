<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">我的资产</h1>
      <p class="text-gray-500 mt-1">管理你的积分和学习币</p>
    </div>

    <!-- 双货币卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 积分卡片 -->
      <n-card class="points-card">
        <div class="text-center py-8">
          <div class="flex items-center justify-center mb-2">
            <n-icon size="24" class="mr-2">
              <TrophyOutline />
            </n-icon>
            <span class="text-lg font-medium">我的积分</span>
          </div>
          <div class="text-5xl font-bold mb-4">{{ userPoints || 0 }}</div>
          <n-button @click="showPointsDetail">查看明细</n-button>
        </div>
      </n-card>

      <!-- 学习币卡片 -->
      <n-card class="coins-card">
        <div class="text-center py-8">
          <div class="flex items-center justify-center mb-2">
            <n-icon size="24" class="mr-2">
              <DiamondOutline />
            </n-icon>
            <span class="text-lg font-medium">学习币</span>
          </div>
          <div class="text-5xl font-bold mb-4">{{ Number(wallet.balance || 0).toFixed(2) }}</div>
          <div class="flex justify-center gap-2">
            <n-button type="primary" @click="showExchangeModal = true">兑换</n-button>
            <n-button type="success" @click="showScanModal = true">
              <template #icon>
                <n-icon><QrCodeOutline /></n-icon>
              </template>
              扫码支付
            </n-button>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 兑换说明 -->
    <n-alert title="兑换说明" type="info">
      学习币是稀缺货币，可以通过积分兑换获得。当前兑换比例：{{ exchangeConfig.rate?.points || 100 }} 积分 = {{ exchangeConfig.rate?.coins || 10 }} 学习币。
      每日兑换上限：{{ exchangeConfig.dailyLimit || 500 }} 积分，今日剩余：{{ exchangeConfig.remainingLimit || 0 }} 积分。
    </n-alert>

    <!-- 标签页：积分明细 / 学习币明细 / 兑换记录 -->
    <n-card>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 积分明细 -->
        <n-tab-pane name="points" tab="积分明细">
          <n-spin :show="loadingPoints">
            <div v-if="pointLogs.length > 0" class="space-y-3">
              <div v-for="log in pointLogs" :key="log.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ log.description }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(log.createdAt) }}</p>
                </div>
                <div :class="['font-bold text-lg', log.points > 0 ? 'text-green-600' : 'text-red-600']">
                  {{ log.points > 0 ? '+' : '' }}{{ log.points }}
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无积分记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 学习币明细 -->
        <n-tab-pane name="coins" tab="学习币明细">
          <n-spin :show="loadingCoins">
            <div v-if="coinTransactions.length > 0" class="space-y-3">
              <div v-for="transaction in coinTransactions" :key="transaction.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ transaction.description }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(transaction.createdAt) }}</p>
                </div>
                <div :class="['font-bold text-lg', transaction.amount > 0 ? 'text-green-600' : 'text-red-600']">
                  {{ transaction.amount > 0 ? '+' : '' }}{{ Number(transaction.amount).toFixed(2) }}
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无学习币记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 兑换记录 -->
        <n-tab-pane name="exchange" tab="兑换记录">
          <n-spin :show="loadingExchange">
            <div v-if="exchangeHistory.length > 0" class="space-y-3">
              <div v-for="exchange in exchangeHistory" :key="exchange.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">积分兑换学习币</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(exchange.createdAt) }}</p>
                  <p class="text-xs text-gray-600">兑换比例：{{ exchange.exchangeRate }}</p>
                </div>
                <div class="text-right">
                  <div class="text-red-600 font-bold">-{{ exchange.pointsSpent }} 积分</div>
                  <div class="text-green-600 font-bold">+{{ exchange.coinsGained }} 学习币</div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无兑换记录" />
          </n-spin>
        </n-tab-pane>

        <!-- 支付记录 -->
        <n-tab-pane name="payment" tab="支付记录">
          <n-spin :show="loadingPayments">
            <div v-if="paymentOrders.length > 0" class="space-y-3">
              <div v-for="order in paymentOrders" :key="order.id" class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <h4 class="font-medium">{{ order.title }}</h4>
                  <p class="text-xs text-gray-500">{{ formatDate(order.createdAt) }}</p>
                  <p class="text-xs text-gray-600">订单号：{{ order.orderNo }}</p>
                </div>
                <div class="text-right">
                  <div class="text-red-600 font-bold">-{{ Number(order.amount).toFixed(2) }} 学习币</div>
                  <n-tag type="success" size="small">已完成</n-tag>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无支付记录" />
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 兑换弹窗 -->
    <n-modal v-model:show="showExchangeModal" preset="dialog" title="积分兑换学习币">
      <div class="space-y-4">
        <n-alert type="info">
          兑换比例：{{ exchangeConfig.rate?.points || 100 }} 积分 = {{ exchangeConfig.rate?.coins || 10 }} 学习币<br />
          今日剩余额度：{{ exchangeConfig.remainingLimit || 0 }} 积分
        </n-alert>

        <n-form-item label="兑换积分">
          <n-input-number
            v-model:value="exchangePoints"
            :min="0"
            :max="exchangeConfig.remainingLimit"
            :step="exchangeConfig.rate?.points || 100"
            placeholder="输入要兑换的积分"
            style="width: 100%"
          />
        </n-form-item>

        <n-alert v-if="exchangePoints > 0" type="success">
          可获得学习币：{{ calculateCoins(exchangePoints) }}
        </n-alert>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showExchangeModal = false">取消</n-button>
          <n-button type="primary" @click="handleExchange" :loading="exchanging">确认兑换</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 扫码支付弹窗 -->
    <n-modal v-model:show="showScanModal" preset="dialog" title="扫码支付">
      <div class="space-y-4">
        <n-alert type="info">
          请输入商家提供的收款码
        </n-alert>

        <n-form-item label="收款码">
          <n-input
            v-model:value="scanCode"
            placeholder="请输入收款码或点击摄像头扫码"
            clearable
            @keyup.enter="handleScanCode"
          >
            <template #prefix>
              <n-icon><QrCodeOutline /></n-icon>
            </template>
            <template #suffix>
              <n-button
                text
                @click="startCameraScanning"
                :disabled="cameraScanning"
                title="使用摄像头扫码"
              >
                <n-icon :size="20" :color="cameraScanning ? '#ccc' : '#18a058'">
                  <CameraOutline />
                </n-icon>
              </n-button>
            </template>
          </n-input>
        </n-form-item>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showScanModal = false">取消</n-button>
          <n-button type="primary" @click="handleScanCode" :loading="scanning">确认</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 摄像头扫码弹窗 -->
    <n-modal
      v-model:show="showCameraScanner"
      preset="dialog"
      title="扫描二维码"
      :mask-closable="false"
      style="width: 90%; max-width: 500px;"
    >
      <div class="camera-scanner-container">
        <div id="qr-reader" class="qr-reader"></div>
        <n-alert type="info" class="mt-4">
          将二维码对准摄像头进行扫描
        </n-alert>
      </div>
      <template #action>
        <n-button @click="stopCameraScanning" :loading="!cameraScanning">
          关闭
        </n-button>
      </template>
    </n-modal>

    <!-- 支付确认弹窗 -->
    <n-modal v-model:show="showPaymentModal" preset="dialog" title="确认支付">
      <div v-if="currentPayCode" class="space-y-4">
        <n-alert type="warning">
          请确认支付信息
        </n-alert>

        <div class="bg-gray-50 p-4 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">商品名称</span>
            <span class="font-medium">{{ currentPayCode.title }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">支付金额</span>
            <span class="font-bold text-xl text-primary-600">{{ Number(currentPayCode.amount).toFixed(2) }} 学习币</span>
          </div>
          <div v-if="currentPayCode.description" class="flex justify-between">
            <span class="text-gray-600">描述</span>
            <span class="text-sm">{{ currentPayCode.description }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">当前余额</span>
            <span :class="wallet.balance >= currentPayCode.amount ? 'text-green-600' : 'text-red-600'">
              {{ Number(wallet.balance).toFixed(2) }} 学习币
            </span>
          </div>
        </div>

        <n-alert v-if="wallet.balance < currentPayCode.amount" type="error">
          余额不足，请先兑换学习币
        </n-alert>
      </div>

      <template #action>
        <div class="flex gap-2">
          <n-button @click="showPaymentModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handlePayment"
            :loading="paying"
            :disabled="!currentPayCode || wallet.balance < currentPayCode.amount"
          >
            确认支付
          </n-button>
        </div>
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
        <n-button type="primary" @click="closeSuccessModal">完成</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { pointAPI, walletAPI, payAPI } from '@/api';
import { TrophyOutline, DiamondOutline, QrCodeOutline, CheckmarkCircleOutline, CameraOutline } from '@vicons/ionicons5';
import { useRouter } from 'vue-router';
import { Html5Qrcode } from 'html5-qrcode';

const message = useMessage();
const router = useRouter();

// 数据
const userPoints = ref(0);
const wallet = reactive({ balance: 0 });
const pointLogs = ref([]);
const coinTransactions = ref([]);
const exchangeHistory = ref([]);
const exchangeConfig = reactive({
  rate: { points: 100, coins: 10 },
  dailyLimit: 500,
  todayUsed: 0,
  remainingLimit: 500,
});

// 加载状态
const loadingPoints = ref(false);
const loadingCoins = ref(false);
const loadingExchange = ref(false);
const loadingPayments = ref(false);

// UI 状态
const activeTab = ref('points');
const showExchangeModal = ref(false);
const exchangePoints = ref(0);
const exchanging = ref(false);

// 扫码支付状态
const showScanModal = ref(false);
const showPaymentModal = ref(false);
const showSuccessModal = ref(false);
const scanCode = ref('');
const currentPayCode = ref(null);
const paymentResult = ref(null);
const scanning = ref(false);
const paying = ref(false);
const paymentOrders = ref([]);

// 摄像头扫码状态
const showCameraScanner = ref(false);
const cameraScanning = ref(false);
let html5QrCode = null;

// 计算可获得的学习币
const calculateCoins = (points) => {
  if (!points || !exchangeConfig.rate) return 0;
  return Math.floor((points / exchangeConfig.rate.points) * exchangeConfig.rate.coins);
};

// 加载积分信息
const loadPointsInfo = async () => {
  try {
    const response = await pointAPI.getMyPoints();
    userPoints.value = response.totalPoints || 0;
  } catch (error) {
    message.error(error.message || '加载积分失败');
  }
};

// 加载积分明细
const loadPointLogs = async () => {
  loadingPoints.value = true;
  try {
    const response = await pointAPI.getPointLogs({ limit: 50 });
    pointLogs.value = response.logs || [];
  } catch (error) {
    message.error(error.message || '加载积分明细失败');
  } finally {
    loadingPoints.value = false;
  }
};

// 加载学习币信息
const loadWallet = async () => {
  try {
    const response = await walletAPI.getWallet();
    Object.assign(wallet, response.wallet || {});
  } catch (error) {
    message.error(error.message || '加载学习币失败');
  }
};

// 加载学习币交易记录
const loadCoinTransactions = async () => {
  loadingCoins.value = true;
  try {
    const response = await walletAPI.getTransactions();
    coinTransactions.value = response.transactions || [];
  } catch (error) {
    message.error(error.message || '加载学习币明细失败');
  } finally {
    loadingCoins.value = false;
  }
};

// 加载兑换配置
const loadExchangeConfig = async () => {
  try {
    const response = await pointAPI.getExchangeConfig();
    Object.assign(exchangeConfig, response);
  } catch (error) {
    message.error(error.message || '加载兑换配置失败');
  }
};

// 加载兑换历史
const loadExchangeHistory = async () => {
  loadingExchange.value = true;
  try {
    const response = await pointAPI.getExchangeHistory();
    exchangeHistory.value = response.exchanges || [];
  } catch (error) {
    message.error(error.message || '加载兑换记录失败');
  } finally {
    loadingExchange.value = false;
  }
};

// 执行兑换
const handleExchange = async () => {
  if (!exchangePoints.value || exchangePoints.value <= 0) {
    message.warning('请输入兑换积分');
    return;
  }

  if (exchangePoints.value > exchangeConfig.remainingLimit) {
    message.warning('超出今日兑换上限');
    return;
  }

  exchanging.value = true;
  try {
    const response = await pointAPI.exchangePointsToCoins({ points: exchangePoints.value });
    message.success(response.message || '兑换成功');
    showExchangeModal.value = false;
    exchangePoints.value = 0;

    // 重新加载数据
    await Promise.all([
      loadPointsInfo(),
      loadPointLogs(),
      loadWallet(),
      loadExchangeConfig(),
      loadExchangeHistory(),
    ]);
  } catch (error) {
    message.error(error.message || '兑换失败');
  } finally {
    exchanging.value = false;
  }
};

// 查看积分明细（跳转到积分页面）
const showPointsDetail = () => {
  activeTab.value = 'points';
};

// 加载支付记录
const loadPaymentOrders = async () => {
  loadingPayments.value = true;
  try {
    const data = await payAPI.getMyOrders({ limit: 50 });
    paymentOrders.value = data.orders;
  } catch (error) {
    console.error('加载支付记录失败:', error);
  } finally {
    loadingPayments.value = false;
  }
};

// 处理扫码
const handleScanCode = async () => {
  if (!scanCode.value.trim()) {
    message.warning('请输入收款码');
    return;
  }

  scanning.value = true;
  try {
    const data = await payAPI.scanPayCode(scanCode.value.trim());
    currentPayCode.value = data.payCode;
    showScanModal.value = false;
    showPaymentModal.value = true;
  } catch (error) {
    message.error(error.error || '收款码无效');
  } finally {
    scanning.value = false;
  }
};

// 处理支付
const handlePayment = async () => {
  if (!currentPayCode.value) return;

  paying.value = true;
  try {
    const result = await payAPI.submitPayment({ payCodeId: currentPayCode.value.id });
    paymentResult.value = result.order;
    showPaymentModal.value = false;
    showSuccessModal.value = true;

    // 刷新数据
    await Promise.all([
      loadWallet(),
      loadCoinTransactions(),
      loadPaymentOrders(),
    ]);
  } catch (error) {
    message.error(error.error || '支付失败');
  } finally {
    paying.value = false;
  }
};

// 关闭支付成功弹窗
const closeSuccessModal = () => {
  showSuccessModal.value = false;
  scanCode.value = '';
  currentPayCode.value = null;
  paymentResult.value = null;
  activeTab.value = 'payment'; // 切换到支付记录tab
};

// 开始摄像头扫码
const startCameraScanning = async () => {
  try {
    showCameraScanner.value = true;
    cameraScanning.value = true;

    // 等待DOM更新
    await new Promise(resolve => setTimeout(resolve, 100));

    html5QrCode = new Html5Qrcode('qr-reader');

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    await html5QrCode.start(
      { facingMode: 'environment' }, // 使用后置摄像头
      config,
      (decodedText) => {
        // 扫码成功
        handleQRCodeScanned(decodedText);
      },
      (errorMessage) => {
        // 扫码错误（正常情况，持续扫描中）
        // 不需要处理
      }
    );
  } catch (error) {
    console.error('启动摄像头失败:', error);
    message.error('无法启动摄像头，请检查权限设置');
    showCameraScanner.value = false;
    cameraScanning.value = false;
  }
};

// 停止摄像头扫码
const stopCameraScanning = async () => {
  try {
    if (html5QrCode && cameraScanning.value) {
      await html5QrCode.stop();
      html5QrCode.clear();
      html5QrCode = null;
    }
  } catch (error) {
    console.error('停止摄像头失败:', error);
  } finally {
    showCameraScanner.value = false;
    cameraScanning.value = false;
  }
};

// 处理扫码结果
const handleQRCodeScanned = async (decodedText) => {
  // 停止扫码
  await stopCameraScanning();

  // 填入收款码
  scanCode.value = decodedText;

  // 提示用户
  message.success('扫码成功！');
};

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

// 页面加载
onMounted(async () => {
  await Promise.all([
    loadPointsInfo(),
    loadPointLogs(),
    loadWallet(),
    loadCoinTransactions(),
    loadExchangeConfig(),
    loadExchangeHistory(),
    loadPaymentOrders(),
  ]);
});

// 组件卸载时停止摄像头
onUnmounted(() => {
  if (html5QrCode && cameraScanning.value) {
    stopCameraScanning();
  }
});
</script>

<style scoped>
.points-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.coins-card {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.points-card :deep(.n-card__content),
.coins-card :deep(.n-card__content) {
  color: white;
}

.points-card :deep(.n-button),
.coins-card :deep(.n-button) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.points-card :deep(.n-button:hover),
.coins-card :deep(.n-button:hover) {
  background: rgba(255, 255, 255, 0.3);
}

/* 摄像头扫码容器 */
.camera-scanner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.qr-reader {
  width: 100%;
  max-width: 400px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

/* 覆盖html5-qrcode默认样式 */
.qr-reader :deep(video) {
  width: 100% !important;
  height: auto !important;
  border-radius: 6px;
}

.qr-reader :deep(#qr-shaded-region) {
  border: 2px solid rgba(24, 160, 88, 0.8) !important;
}
</style>
