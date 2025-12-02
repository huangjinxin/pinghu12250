<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">我的商店</h1>
        <p class="text-gray-500 mt-1">管理你的上架作品</p>
      </div>
      <n-button type="primary" @click="showListModal = true">上架作品</n-button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <n-card><n-statistic label="上架中" :value="stats.listed" /></n-card>
      <n-card><n-statistic label="总销量" :value="stats.totalSales" /></n-card>
      <n-card><n-statistic label="总收入" :value="stats.totalEarnings" suffix="金币" /></n-card>
      <n-card><n-statistic label="本月收入" :value="stats.monthlyEarnings" suffix="金币" /></n-card>
    </div>

    <n-spin :show="loading">
      <div v-if="listings.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card v-for="listing in listings" :key="listing.id">
          <h3 class="font-bold mb-2">{{ listing.work.title }}</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">价格</span>
              <span class="font-bold text-yellow-600">{{ listing.price }} 金币</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">销量</span>
              <span>{{ listing.sales || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">收入</span>
              <span>{{ (listing.sales || 0) * listing.price }} 金币</span>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <n-button size="small" @click="handleEdit(listing)">编辑</n-button>
            <n-button size="small" type="error" @click="handleDelist(listing)">下架</n-button>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="暂无上架作品" />
    </n-spin>

    <ListWorkModal v-model:show="showListModal" @success="loadListings" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { walletAPI } from '@/api';
import ListWorkModal from '@/components/ListWorkModal.vue';

const message = useMessage();
const dialog = useDialog();
const loading = ref(false);
const listings = ref([]);
const stats = reactive({ listed: 0, totalSales: 0, totalEarnings: 0, monthlyEarnings: 0 });
const showListModal = ref(false);

const loadListings = async () => {
  loading.value = true;
  try {
    const response = await walletAPI.getMyShop();
    listings.value = response.listings || [];
    if (response.stats) Object.assign(stats, response.stats);
  } catch (error) {
    message.error(error.error || '加载商店信息失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (listing) => {
  // TODO: 实现编辑功能
  message.info('编辑功能开发中');
};

const handleDelist = async (listing) => {
  dialog.warning({
    title: '确认下架',
    content: `确定要下架作品《${listing.work?.title}》吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await walletAPI.delistWork(listing.id);
        message.success('下架成功');
        await loadListings();
      } catch (error) {
        message.error(error.error || '下架失败');
      }
    }
  });
};

onMounted(() => loadListings());
</script>
