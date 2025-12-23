<template>
  <div class="payment-records-tab">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <n-space>
        <n-select
          v-model:value="filters.payCodeId"
          :options="payCodeOptions"
          placeholder="选择收款码"
          style="width: 200px"
          clearable
          filterable
        />
        <n-date-picker
          v-model:value="filters.dateRange"
          type="daterange"
          clearable
          placeholder="选择日期范围"
        />
        <n-button @click="handleSearch">
          <template #icon>
            <n-icon><SearchOutline /></n-icon>
          </template>
          搜索
        </n-button>
        <n-button @click="handleReset">重置</n-button>
      </n-space>
      <n-button @click="handleExport">
        <template #icon>
          <n-icon><DownloadOutline /></n-icon>
        </template>
        导出
      </n-button>
    </div>

    <!-- 统计汇总 -->
    <div class="summary-cards">
      <n-card size="small">
        <n-statistic label="总订单数">
          <template #default>{{ summary.totalOrders }}</template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="总收入">
          <template #default>
            <span class="text-green-600">{{ summary.totalAmount.toFixed(2) }}</span>
          </template>
          <template #suffix>学习币</template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="今日订单">
          <template #default>{{ summary.todayOrders }}</template>
        </n-statistic>
      </n-card>
      <n-card size="small">
        <n-statistic label="今日收入">
          <template #default>
            <span class="text-blue-600">{{ summary.todayAmount.toFixed(2) }}</span>
          </template>
          <template #suffix>学习币</template>
        </n-statistic>
      </n-card>
    </div>

    <!-- 订单列表 -->
    <n-data-table
      :columns="columns"
      :data="orders"
      :loading="loading"
      :pagination="pagination"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </div>
</template>

<script setup>
import { ref, h, reactive, onMounted, computed } from 'vue';
import { useMessage, NTag, NAvatar } from 'naive-ui';
import { payAPI } from '@/api';
import { format } from 'date-fns';
import { SearchOutline, DownloadOutline } from '@vicons/ionicons5';

const message = useMessage();

const loading = ref(false);
const orders = ref([]);
const payCodes = ref([]);

const filters = reactive({
  payCodeId: null,
  dateRange: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  pageCount: 1,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
});

const summary = reactive({
  totalOrders: 0,
  totalAmount: 0,
  todayOrders: 0,
  todayAmount: 0,
});

const payCodeOptions = computed(() => {
  return payCodes.value.map(p => ({
    label: `${p.title} (${parseFloat(p.amount).toFixed(2)}币)`,
    value: p.id,
  }));
});

const columns = [
  {
    title: '订单号',
    key: 'orderNo',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: '收款码',
    key: 'payCode',
    width: 150,
    render: (row) => row.payCode?.title || '-',
  },
  {
    title: '金额',
    key: 'amount',
    width: 100,
    render: (row) => h('span', { class: 'text-green-600 font-bold' }, `${parseFloat(row.amount).toFixed(2)} 币`),
  },
  {
    title: '用户',
    key: 'user',
    width: 140,
    render: (row) => {
      const user = row.user;
      if (!user) return row.userId?.slice(0, 8) + '...';
      return h('div', { class: 'user-cell' }, [
        h(NAvatar, { src: user.avatar, size: 24, round: true }, () => (user.username || '?').charAt(0)),
        h('span', { class: 'username' }, user.username || '未知用户'),
      ]);
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: () => h(NTag, { type: 'success', size: 'small' }, () => '已完成'),
  },
  {
    title: '支付时间',
    key: 'createdAt',
    width: 160,
    render: (row) => format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  },
];

const loadPayCodes = async () => {
  try {
    const data = await payAPI.getPayCodes({ limit: 100 });
    payCodes.value = data.codes;
  } catch (error) {
    console.error('加载收款码失败:', error);
  }
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    };

    if (filters.payCodeId) {
      params.payCodeId = filters.payCodeId;
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = format(new Date(filters.dateRange[0]), 'yyyy-MM-dd');
      params.endDate = format(new Date(filters.dateRange[1]), 'yyyy-MM-dd');
    }

    const data = await payAPI.getAllOrders(params);
    orders.value = data.orders;
    pagination.itemCount = data.pagination.total;
    pagination.pageCount = data.pagination.totalPages;

    // 计算统计
    calculateSummary(data.orders);
  } catch (error) {
    message.error('加载支付记录失败');
  } finally {
    loading.value = false;
  }
};

const calculateSummary = (ordersData) => {
  const today = new Date().toDateString();

  summary.totalOrders = pagination.itemCount;
  summary.totalAmount = ordersData.reduce((sum, o) => sum + parseFloat(o.amount), 0);

  const todayOrders = ordersData.filter(o => new Date(o.createdAt).toDateString() === today);
  summary.todayOrders = todayOrders.length;
  summary.todayAmount = todayOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
};

const handleSearch = () => {
  pagination.page = 1;
  loadOrders();
};

const handleReset = () => {
  filters.payCodeId = null;
  filters.dateRange = null;
  pagination.page = 1;
  loadOrders();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadOrders();
};

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  loadOrders();
};

const handleExport = () => {
  // 生成 CSV 内容
  const headers = ['订单号', '收款码', '金额', '用户ID', '状态', '支付时间'];
  const rows = orders.value.map(o => [
    o.orderNo,
    o.payCode?.title || '-',
    parseFloat(o.amount).toFixed(2),
    o.userId,
    '已完成',
    format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm:ss'),
  ]);

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `支付记录_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  link.click();

  message.success('导出成功');
};

onMounted(() => {
  loadPayCodes();
  loadOrders();
});

defineExpose({ loadOrders });
</script>

<style scoped>
.payment-records-tab {
  padding: 16px 0;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

:deep(.user-cell) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.user-cell .username) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
