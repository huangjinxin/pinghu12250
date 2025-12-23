<template>
  <div class="data-analysis-tab">
    <!-- 时间范围选择 -->
    <div class="filter-bar">
      <n-space>
        <n-radio-group v-model:value="timeRange" @update:value="handleTimeRangeChange">
          <n-radio-button value="7">近7天</n-radio-button>
          <n-radio-button value="30">近30天</n-radio-button>
          <n-radio-button value="90">近90天</n-radio-button>
          <n-radio-button value="all">全部</n-radio-button>
        </n-radio-group>
      </n-space>
    </div>

    <n-spin :show="loading">
      <!-- 数据概览 -->
      <div class="overview-cards">
        <n-card>
          <n-statistic label="总收款码数">
            <template #default>{{ stats.totalPayCodes }}</template>
          </n-statistic>
        </n-card>
        <n-card>
          <n-statistic label="启用中">
            <template #default>
              <span class="text-green-600">{{ stats.activePayCodes }}</span>
            </template>
          </n-statistic>
        </n-card>
        <n-card>
          <n-statistic label="总订单数">
            <template #default>{{ stats.totalOrders }}</template>
          </n-statistic>
        </n-card>
        <n-card>
          <n-statistic label="总收入">
            <template #default>
              <span class="text-primary font-bold">{{ stats.totalRevenue.toFixed(2) }}</span>
            </template>
            <template #suffix>学习币</template>
          </n-statistic>
        </n-card>
      </div>

      <!-- 收入趋势图 -->
      <n-card title="收入趋势" class="chart-card">
        <div class="chart-container" ref="revenueChartRef"></div>
      </n-card>

      <!-- 两列布局：热门收款码 + 用户支付排行 -->
      <div class="two-column">
        <!-- 热门收款码排行 -->
        <n-card title="热门收款码 TOP 10">
          <n-table :bordered="false" :single-line="false" size="small">
            <thead>
              <tr>
                <th>排名</th>
                <th>收款码</th>
                <th>单价</th>
                <th>支付次数</th>
                <th>总收入</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in topPayCodes" :key="item.id">
                <td>
                  <n-tag :type="index < 3 ? 'warning' : 'default'" size="small">
                    {{ index + 1 }}
                  </n-tag>
                </td>
                <td>{{ item.title }}</td>
                <td>{{ parseFloat(item.amount).toFixed(2) }}</td>
                <td>{{ item._count?.orders || 0 }}</td>
                <td class="text-green-600 font-bold">
                  {{ (parseFloat(item.amount) * (item._count?.orders || 0)).toFixed(2) }}
                </td>
              </tr>
              <tr v-if="topPayCodes.length === 0">
                <td colspan="5" class="text-center text-gray-400">暂无数据</td>
              </tr>
            </tbody>
          </n-table>
        </n-card>

        <!-- 用户支付排行 -->
        <n-card title="用户支付排行 TOP 10">
          <n-table :bordered="false" :single-line="false" size="small">
            <thead>
              <tr>
                <th>排名</th>
                <th>用户</th>
                <th>支付次数</th>
                <th>总支出</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in topUsers" :key="item.userId">
                <td>
                  <n-tag :type="index < 3 ? 'warning' : 'default'" size="small">
                    {{ index + 1 }}
                  </n-tag>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <n-avatar v-if="item.avatar" :src="item.avatar" :size="24" round />
                    <n-avatar v-else :size="24" round>{{ (item.username || '?').charAt(0) }}</n-avatar>
                    <span>{{ item.username || '未知用户' }}</span>
                  </div>
                </td>
                <td>{{ item.count }}</td>
                <td class="text-blue-600 font-bold">{{ item.total.toFixed(2) }}</td>
              </tr>
              <tr v-if="topUsers.length === 0">
                <td colspan="4" class="text-center text-gray-400">暂无数据</td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
      </div>

      <!-- 订单时段分布 -->
      <n-card title="支付时段分布" class="chart-card">
        <div class="chart-container" ref="hourlyChartRef"></div>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { useMessage } from 'naive-ui';
import { payAPI } from '@/api';
import { format, subDays } from 'date-fns';
import * as echarts from 'echarts';

const message = useMessage();

const loading = ref(false);
const timeRange = ref('30');
const revenueChartRef = ref(null);
const hourlyChartRef = ref(null);
let revenueChart = null;
let hourlyChart = null;

const stats = reactive({
  totalPayCodes: 0,
  activePayCodes: 0,
  totalOrders: 0,
  totalRevenue: 0,
});

const topPayCodes = ref([]);
const topUsers = ref([]);

const loadData = async () => {
  loading.value = true;
  try {
    // 加载收款码数据
    const payCodesData = await payAPI.getPayCodes({ limit: 100 });
    const codes = payCodesData.codes;

    stats.totalPayCodes = codes.length;
    stats.activePayCodes = codes.filter(c => c.isActive).length;

    // 排序得到热门收款码
    topPayCodes.value = [...codes]
      .sort((a, b) => (b._count?.orders || 0) - (a._count?.orders || 0))
      .slice(0, 10);

    // 加载订单统计数据（含用户信息）
    const statsData = await payAPI.getOrderStats({ days: timeRange.value });
    const orders = statsData.orders || [];

    // 根据时间范围筛选
    const filteredOrders = filterOrdersByTime(orders);

    stats.totalOrders = filteredOrders.length;
    stats.totalRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);

    // 使用后端返回的用户排行数据（已含用户名）
    topUsers.value = statsData.topUsers || [];

    // 渲染图表
    await nextTick();
    renderRevenueChart(filteredOrders);
    renderHourlyChart(filteredOrders);
  } catch (error) {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const filterOrdersByTime = (orders) => {
  if (timeRange.value === 'all') return orders;

  const days = parseInt(timeRange.value);
  const startDate = subDays(new Date(), days);

  return orders.filter(o => new Date(o.createdAt) >= startDate);
};

const calculateTopUsers = (orders) => {
  const userMap = {};

  orders.forEach(o => {
    if (!userMap[o.userId]) {
      userMap[o.userId] = { userId: o.userId, count: 0, total: 0 };
    }
    userMap[o.userId].count++;
    userMap[o.userId].total += parseFloat(o.amount);
  });

  topUsers.value = Object.values(userMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
};

const renderRevenueChart = (orders) => {
  if (!revenueChartRef.value) return;

  if (revenueChart) {
    revenueChart.dispose();
  }

  revenueChart = echarts.init(revenueChartRef.value);

  // 按日期分组统计
  const dailyData = {};
  orders.forEach(o => {
    const date = format(new Date(o.createdAt), 'MM-dd');
    if (!dailyData[date]) {
      dailyData[date] = { count: 0, amount: 0 };
    }
    dailyData[date].count++;
    dailyData[date].amount += parseFloat(o.amount);
  });

  const dates = Object.keys(dailyData).sort();
  const amounts = dates.map(d => dailyData[d].amount);
  const counts = dates.map(d => dailyData[d].count);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['收入', '订单数'],
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: [
      {
        type: 'value',
        name: '收入',
        position: 'left',
        axisLabel: { formatter: '{value}' },
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right',
        axisLabel: { formatter: '{value}' },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'bar',
        data: amounts,
        itemStyle: { color: '#18a058' },
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: counts,
        itemStyle: { color: '#2080f0' },
      },
    ],
  };

  revenueChart.setOption(option);
};

const renderHourlyChart = (orders) => {
  if (!hourlyChartRef.value) return;

  if (hourlyChart) {
    hourlyChart.dispose();
  }

  hourlyChart = echarts.init(hourlyChartRef.value);

  // 按小时分组统计
  const hourlyData = new Array(24).fill(0);
  orders.forEach(o => {
    const hour = new Date(o.createdAt).getHours();
    hourlyData[hour]++;
  });

  const option = {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    },
    yAxis: {
      type: 'value',
      name: '订单数',
    },
    series: [
      {
        name: '订单数',
        type: 'bar',
        data: hourlyData,
        itemStyle: {
          color: (params) => {
            const colors = ['#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
            return colors[params.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  hourlyChart.setOption(option);
};

const handleTimeRangeChange = () => {
  loadData();
};

const handleResize = () => {
  revenueChart?.resize();
  hourlyChart?.resize();
};

onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  revenueChart?.dispose();
  hourlyChart?.dispose();
});

defineExpose({ loadData });
</script>

<style scoped>
.data-analysis-tab {
  padding: 16px 0;
}

.filter-bar {
  margin-bottom: 16px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.chart-card {
  margin-bottom: 16px;
}

.chart-container {
  height: 300px;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.text-primary {
  color: #18a058;
}

@media (max-width: 1024px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .two-column {
    grid-template-columns: 1fr;
  }
}
</style>
