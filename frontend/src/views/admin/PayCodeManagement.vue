<template>
  <div class="paycode-management">
    <!-- 页面标题 -->
    <n-card class="header-card">
      <div class="header">
        <div>
          <h2>财务管理</h2>
          <p class="subtitle">收款码、分期付款与交易管理</p>
        </div>
      </div>
    </n-card>

    <!-- Tab 导航 -->
    <n-card class="tabs-card">
      <n-tabs v-model:value="activeTab" type="line" @update:value="handleTabChange">
        <n-tab-pane name="codes" tab="收款码管理">
          <PayCodeManager ref="codesTabRef" />
        </n-tab-pane>

        <n-tab-pane name="transactions" tab="交易管理">
          <TransactionManager ref="transactionsTabRef" />
        </n-tab-pane>

        <n-tab-pane name="installments" tab="分期管理">
          <InstallmentManager ref="installmentsTabRef" />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PayCodeManager from './payment-tabs/PayCodeManager.vue';
import TransactionManager from './payment-tabs/TransactionManager.vue';
import InstallmentManager from './payment-tabs/InstallmentManager.vue';

const activeTab = ref('codes');
const codesTabRef = ref(null);
const transactionsTabRef = ref(null);
const installmentsTabRef = ref(null);

const handleTabChange = (tabName) => {
  if (tabName === 'transactions') {
    transactionsTabRef.value?.loadOrders?.();
  } else if (tabName === 'installments') {
    installmentsTabRef.value?.loadPlans?.();
  }
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

.header .subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #999;
}
</style>
