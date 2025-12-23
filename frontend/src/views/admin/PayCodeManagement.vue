<template>
  <div class="paycode-management">
    <!-- 页面标题 -->
    <n-card class="header-card">
      <div class="header">
        <div>
          <h2>收款码管理</h2>
          <p class="text-gray-500">创建和管理扫码支付收款码</p>
        </div>
      </div>
    </n-card>

    <!-- Tab 导航 -->
    <n-card class="tabs-card">
      <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="list" tab="收款码列表">
          <PayCodeListTab ref="listTabRef" @created="handleCreated" />
        </n-tab-pane>

        <n-tab-pane name="qrcode" tab="二维码打印">
          <QRCodePrintTab ref="qrcodeTabRef" />
        </n-tab-pane>

        <n-tab-pane name="records" tab="支付记录">
          <PaymentRecordsTab ref="recordsTabRef" />
        </n-tab-pane>

        <n-tab-pane name="analysis" tab="数据分析">
          <DataAnalysisTab ref="analysisTabRef" />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PayCodeListTab from './paycode-tabs/PayCodeListTab.vue';
import QRCodePrintTab from './paycode-tabs/QRCodePrintTab.vue';
import PaymentRecordsTab from './paycode-tabs/PaymentRecordsTab.vue';
import DataAnalysisTab from './paycode-tabs/DataAnalysisTab.vue';

const activeTab = ref('list');
const listTabRef = ref(null);
const qrcodeTabRef = ref(null);
const recordsTabRef = ref(null);
const analysisTabRef = ref(null);

const handleTabChange = (tabName) => {
  // 切换 Tab 时刷新对应数据
  if (tabName === 'qrcode') {
    qrcodeTabRef.value?.loadPayCodes();
  } else if (tabName === 'records') {
    recordsTabRef.value?.loadOrders();
  } else if (tabName === 'analysis') {
    analysisTabRef.value?.loadData();
  }
};

const handleCreated = () => {
  // 创建新收款码后，刷新二维码打印页
  qrcodeTabRef.value?.loadPayCodes();
};
</script>

<style scoped>
.paycode-management {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header p {
  margin: 4px 0 0 0;
  font-size: 14px;
}
</style>
