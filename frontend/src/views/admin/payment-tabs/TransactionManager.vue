<template>
  <div class="transaction-manager">
    <!-- 顶部指标卡片 -->
    <div class="stats-grid">
      <n-card size="small" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon green"><n-icon><WalletOutline /></n-icon></div>
          <div class="stat-info">
            <div class="stat-label">今日学习币收入</div>
            <div class="stat-value green">{{ stats.todayWallet.toFixed(2) }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon orange"><n-icon><StarOutline /></n-icon></div>
          <div class="stat-info">
            <div class="stat-label">今日积分收入</div>
            <div class="stat-value orange">{{ stats.todayPoints.toFixed(0) }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon blue"><n-icon><ReceiptOutline /></n-icon></div>
          <div class="stat-info">
            <div class="stat-label">今日订单</div>
            <div class="stat-value blue">{{ stats.todayOrders }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon purple"><n-icon><TrendingUpOutline /></n-icon></div>
          <div class="stat-info">
            <div class="stat-label">本月学习币</div>
            <div class="stat-value purple">{{ stats.monthWallet.toFixed(2) }}</div>
          </div>
        </div>
      </n-card>
      <n-card size="small" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon teal"><n-icon><CalendarOutline /></n-icon></div>
          <div class="stat-info">
            <div class="stat-label">本月订单</div>
            <div class="stat-value teal">{{ stats.monthOrders }}</div>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 收入趋势图表 -->
    <n-card title="收入趋势" size="small" class="chart-card">
      <template #header-extra>
        <n-radio-group v-model:value="chartRange" size="small" @update:value="loadChartData">
          <n-radio-button value="7">7天</n-radio-button>
          <n-radio-button value="30">30天</n-radio-button>
          <n-radio-button value="90">90天</n-radio-button>
        </n-radio-group>
      </template>
      <div class="chart-container" ref="revenueChartRef"></div>
    </n-card>

    <!-- 筛选和列表 -->
    <n-card size="small" class="list-card">
      <template #header>
        <n-space>
          <span>交易流水</span>
          <n-tag type="info" size="small">共 {{ pagination.itemCount }} 条</n-tag>
        </n-space>
      </template>
      <template #header-extra>
        <n-space>
          <n-select v-model:value="filters.payCodeId" :options="payCodeOptions" placeholder="收款码" style="width: 160px" clearable filterable />
          <n-select v-model:value="filters.paymentMethod" :options="methodOptions" placeholder="支付方式" style="width: 100px" clearable />
          <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable style="width: 260px" />
          <n-button @click="handleSearch">搜索</n-button>
          <n-button @click="handleReset">重置</n-button>
          <n-button type="primary" @click="showExportModal = true">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            导出
          </n-button>
        </n-space>
      </template>

      <!-- 列表表格 -->
      <n-data-table
        :columns="columns"
        :data="orders"
        :loading="loading"
        :pagination="pagination"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <!-- 订单详情弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" title="订单详情" style="width: 500px">
      <div v-if="detailOrder" class="order-detail">
        <div class="detail-row">
          <span class="label">订单号</span>
          <span class="value mono">{{ detailOrder.orderNo }}</span>
        </div>
        <div class="detail-row">
          <span class="label">收款码</span>
          <span class="value">{{ detailOrder.payCode?.title || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">金额</span>
          <span class="value" :class="detailOrder.paymentMethod === 'points' ? 'text-orange' : 'text-green'">
            {{ detailOrder.paymentMethod === 'points' ? `${detailOrder.amount} 积分` : `${parseFloat(detailOrder.amount).toFixed(2)} 学习币` }}
          </span>
        </div>
        <div class="detail-row">
          <span class="label">支付方式</span>
          <n-tag :type="detailOrder.paymentMethod === 'points' ? 'warning' : 'success'" size="small">
            {{ detailOrder.paymentMethod === 'points' ? '积分支付' : '学习币支付' }}
          </n-tag>
        </div>
        <div class="detail-row">
          <span class="label">用户</span>
          <span class="value">{{ detailOrder.user?.username || detailOrder.userId?.slice(0, 8) + '...' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">状态</span>
          <n-tag type="success" size="small">已完成</n-tag>
        </div>
        <div class="detail-row">
          <span class="label">支付时间</span>
          <span class="value">{{ formatDate(detailOrder.createdAt) }}</span>
        </div>
      </div>
      <template #footer>
        <n-space justify="end"><n-button @click="showDetailModal = false">关闭</n-button></n-space>
      </template>
    </n-modal>

    <!-- 导出弹窗 -->
    <n-modal v-model:show="showExportModal" preset="card" title="导出交易记录" style="width: 400px">
      <n-form :model="exportForm" label-placement="top">
        <n-form-item label="导出范围">
          <n-radio-group v-model:value="exportForm.range">
            <n-space vertical>
              <n-radio value="current">当前筛选 ({{ pagination.itemCount }} 条)</n-radio>
              <n-radio value="all">全部记录</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showExportModal = false">取消</n-button>
          <n-button type="primary" :loading="exporting" @click="handleExport">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            导出 CSV
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, h } from 'vue';
import { useMessage, NIcon, NTag, NAvatar, NButton } from 'naive-ui';
import { payAPI } from '@/api';
import { format } from 'date-fns';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
import WalletOutline from '@vicons/ionicons5/es/WalletOutline'
import StarOutline from '@vicons/ionicons5/es/StarOutline'
import ReceiptOutline from '@vicons/ionicons5/es/ReceiptOutline'
import TrendingUpOutline from '@vicons/ionicons5/es/TrendingUpOutline'
import CalendarOutline from '@vicons/ionicons5/es/CalendarOutline'
import DownloadOutline from '@vicons/ionicons5/es/DownloadOutline'

const message = useMessage();

const loading = ref(false);
const exporting = ref(false);
const orders = ref([]);
const payCodes = ref([]);
const showDetailModal = ref(false);
const showExportModal = ref(false);
const detailOrder = ref(null);
const chartRange = ref('30');
const revenueChartRef = ref(null);
let revenueChart = null;

const stats = reactive({
  todayWallet: 0, todayPoints: 0, todayOrders: 0,
  monthWallet: 0, monthPoints: 0, monthOrders: 0,
});

const filters = reactive({ payCodeId: null, dateRange: null, paymentMethod: null });
const exportForm = reactive({ range: 'current' });
const pagination = reactive({ page: 1, pageSize: 20, pageCount: 1, itemCount: 0, showSizePicker: true, pageSizes: [10, 20, 50, 100] });

const payCodeOptions = computed(() => payCodes.value.map(p => ({ label: p.title, value: p.id })));
const methodOptions = [
  { label: '学习币', value: 'wallet' },
  { label: '积分', value: 'points' },
];

const columns = [
  { title: '订单号', key: 'orderNo', width: 200, ellipsis: { tooltip: true }, render: (r) => h('span', { class: 'mono pointer', onClick: () => showOrderDetail(r) }, r.orderNo) },
  { title: '收款码', key: 'payCode', width: 130, render: (r) => r.payCode?.title || '-' },
  { title: '方式', key: 'paymentMethod', width: 80, render: (r) => r.paymentMethod === 'points' ? '积分' : '学习币' },
  { title: '金额', key: 'amount', width: 100, render: (r) => r.paymentMethod === 'points' ? `${r.amount} 分` : `${parseFloat(r.amount).toFixed(2)} 币` },
  { title: '用户', key: 'user', width: 120, render: (r) => r.user?.username || r.userId?.slice(0, 8) + '...' },
  { title: '时间', key: 'createdAt', width: 160, render: (r) => formatDate(r.createdAt) },
];

const loadStats = async () => {
  try {
    const data = await payAPI.getOrderStats({ days: 30 });
    const allOrders = data.orders || [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
    const monthOrders = allOrders.filter(o => new Date(o.createdAt) >= monthStart);
    
    stats.todayOrders = todayOrders.length;
    stats.todayWallet = todayOrders.filter(o => o.paymentMethod !== 'points').reduce((s, o) => s + parseFloat(o.amount), 0);
    stats.todayPoints = todayOrders.filter(o => o.paymentMethod === 'points').reduce((s, o) => s + parseFloat(o.amount), 0);
    stats.monthOrders = monthOrders.length;
    stats.monthWallet = monthOrders.filter(o => o.paymentMethod !== 'points').reduce((s, o) => s + parseFloat(o.amount), 0);
    stats.monthPoints = monthOrders.filter(o => o.paymentMethod === 'points').reduce((s, o) => s + parseFloat(o.amount), 0);
  } catch { console.error('加载统计失败'); }
};

const loadChartData = async () => {
  try {
    const data = await payAPI.getOrderStats({ days: chartRange.value });
    const orders = data.orders || [];
    await nextTick();
    renderChart(orders);
  } catch { console.error('加载图表数据失败'); }
};

const renderChart = (orders) => {
  if (!revenueChartRef.value) return;
  if (revenueChart) revenueChart.dispose();
  revenueChart = echarts.init(revenueChartRef.value);

  const dailyData = {};
  orders.forEach(o => {
    const date = format(new Date(o.createdAt), 'MM-dd');
    if (!dailyData[date]) dailyData[date] = { wallet: 0, points: 0, count: 0 };
    dailyData[date].count++;
    if (o.paymentMethod === 'points') dailyData[date].points += parseFloat(o.amount);
    else dailyData[date].wallet += parseFloat(o.amount);
  });

  const dates = Object.keys(dailyData).sort();
  revenueChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['学习币', '积分', '订单数'] },
    xAxis: { type: 'category', data: dates },
    yAxis: [
      { type: 'value', name: '金额', position: 'left' },
      { type: 'value', name: '订单', position: 'right' }
    ],
    series: [
      { name: '学习币', type: 'bar', data: dates.map(d => dailyData[d].wallet), itemStyle: { color: '#18a058' } },
      { name: '积分', type: 'bar', data: dates.map(d => dailyData[d].points), itemStyle: { color: '#f0a020' } },
      { name: '订单数', type: 'line', yAxisIndex: 1, data: dates.map(d => dailyData[d].count), itemStyle: { color: '#2080f0' } },
    ],
  });
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const params = { page: pagination.page, limit: pagination.pageSize };
    if (filters.payCodeId) params.payCodeId = filters.payCodeId;
    if (filters.dateRange?.length === 2) {
      params.startDate = format(new Date(filters.dateRange[0]), 'yyyy-MM-dd');
      params.endDate = format(new Date(filters.dateRange[1]), 'yyyy-MM-dd');
    }
    const data = await payAPI.getAllOrders(params);
    let filtered = data.orders;
    if (filters.paymentMethod) filtered = filtered.filter(o => o.paymentMethod === filters.paymentMethod);
    orders.value = filtered;
    pagination.itemCount = filters.paymentMethod ? filtered.length : data.pagination.total;
    pagination.pageCount = filters.paymentMethod ? 1 : data.pagination.totalPages;
  } catch { message.error('加载失败'); }
  finally { loading.value = false; }
};

const loadPayCodes = async () => {
  try { payCodes.value = (await payAPI.getPayCodes({ limit: 100 })).codes || []; }
  catch { console.error('加载收款码失败'); }
};

const handleSearch = () => { pagination.page = 1; loadOrders(); };
const handleReset = () => { filters.payCodeId = null; filters.dateRange = null; filters.paymentMethod = null; pagination.page = 1; loadOrders(); };
const handlePageChange = (p) => { pagination.page = p; loadOrders(); };
const handlePageSizeChange = (s) => { pagination.pageSize = s; pagination.page = 1; loadOrders(); };

const showOrderDetail = (order) => { detailOrder.value = order; showDetailModal.value = true; };

const handleExport = async () => {
  exporting.value = true;
  try {
    let exportOrders = orders.value;
    if (exportForm.range === 'all') {
      const params = {};
      if (filters.payCodeId) params.payCodeId = filters.payCodeId;
      if (filters.dateRange?.length === 2) {
        params.startDate = format(new Date(filters.dateRange[0]), 'yyyy-MM-dd');
        params.endDate = format(new Date(filters.dateRange[1]), 'yyyy-MM-dd');
      }
      const data = await payAPI.getAllOrders({ ...params, page: 1, limit: 10000 });
      exportOrders = filters.paymentMethod ? data.orders.filter(o => o.paymentMethod === filters.paymentMethod) : data.orders;
    }

    const headers = ['订单号', '收款码', '支付方式', '金额', '用户ID', '用户名', '状态', '时间'];
    const rows = exportOrders.map(o => [
      o.orderNo, o.payCode?.title || '-', o.paymentMethod === 'points' ? '积分' : '学习币',
      parseFloat(o.amount).toFixed(2), o.userId, o.user?.username || '-', '已完成', formatDate(o.createdAt),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `交易记录_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
    showExportModal.value = false;
    message.success(`导出成功，共 ${exportOrders.length} 条`);
  } catch { message.error('导出失败'); }
  finally { exporting.value = false; }
};

const formatDate = (d) => format(new Date(d), 'yyyy-MM-dd HH:mm:ss');

const handleResize = () => revenueChart?.resize();

onMounted(() => {
  loadStats();
  loadChartData();
  loadOrders();
  loadPayCodes();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  revenueChart?.dispose();
});

defineExpose({ loadOrders });
</script>

<style scoped>
.transaction-manager { padding: 16px 0; }
.stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
.stat-card :deep(.n-card__content) { padding: 12px; }
.stat-content { display: flex; align-items: center; gap: 12px; }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; }
.stat-icon.green { background: linear-gradient(135deg, #18a058, #52c41a); }
.stat-icon.orange { background: linear-gradient(135deg, #f0a020, #faad14); }
.stat-icon.blue { background: linear-gradient(135deg, #2080f0, #40a9ff); }
.stat-icon.purple { background: linear-gradient(135deg, #722ed1, #9254de); }
.stat-icon.teal { background: linear-gradient(135deg, #08979c, #13c2c2); }
.stat-info { flex: 1; }
.stat-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: bold; }
.stat-value.green { color: #18a058; }
.stat-value.orange { color: #f0a020; }
.stat-value.blue { color: #2080f0; }
.stat-value.purple { color: #722ed1; }
.stat-value.teal { color: #08979c; }
.chart-card { margin-bottom: 16px; }
.chart-container { height: 280px; }
.list-card :deep(.n-card-header) { padding-bottom: 12px; }
.order-detail { padding: 8px 0; }
.detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-row:last-child { border-bottom: none; }
.detail-row .label { width: 80px; color: #999; flex-shrink: 0; }
.detail-row .value { flex: 1; word-break: break-all; }
.mono { font-family: monospace; }
.pointer { cursor: pointer; color: #2080f0; }
.pointer:hover { text-decoration: underline; }
.text-green { color: #18a058; font-weight: bold; }
.text-orange { color: #f0a020; font-weight: bold; }
@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
