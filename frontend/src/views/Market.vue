<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">作品市集</h1>
        <p class="text-gray-500 mt-1">购买和出售优质作品</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg cursor-pointer" @click="$router.push('/wallet')">
          <n-icon size="20" color="#f59e0b"><Wallet /></n-icon>
          <span class="font-bold text-yellow-600">{{ wallet.balance || 0 }}</span>
        </div>
        <n-button @click="$router.push('/wallet')">我的钱包</n-button>
        <n-button type="primary" @click="$router.push('/my-shop')">我的商店</n-button>
      </div>
    </div>

    <n-card>
      <div class="flex gap-4 flex-wrap">
        <n-select v-model:value="filter.category" :options="categoryOptions" placeholder="分类" clearable style="width: 150px" @update:value="loadWorks" />
        <n-select v-model:value="filter.sort" :options="sortOptions" placeholder="排序" style="width: 150px" @update:value="loadWorks" />
        <n-input-number v-model:value="filter.minPrice" placeholder="最低价" :min="0" style="width: 120px" @update:value="loadWorks" />
        <n-input-number v-model:value="filter.maxPrice" placeholder="最高价" :min="0" style="width: 120px" @update:value="loadWorks" />
      </div>
    </n-card>

    <n-spin :show="loading">
      <div v-if="works.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <n-card
          v-for="work in works"
          :key="work.id"
          class="work-card"
          hoverable
          @click="handleWorkClick(work)"
        >
          <div class="work-preview h-32 bg-gray-100 rounded-lg mb-3"></div>
          <h3 class="font-bold truncate">{{ work.title }}</h3>
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-2">
              <AvatarText :username="item.seller?.username" size="md" />
              <span class="text-sm text-gray-600">{{ work.seller.username }}</span>
            </div>
            <div class="flex items-center gap-1 text-yellow-600 font-bold">
              <n-icon size="18"><LogoUsd /></n-icon>
              {{ work.price }}
            </div>
          </div>
          <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{{ work.sales || 0 }} 销量</span>
            <n-tag v-if="work.isExclusive" type="warning" size="tiny">独家</n-tag>
          </div>
        </n-card>
      </div>
      <n-empty v-else description="暂无作品" class="py-12" />
    </n-spin>

    <div v-if="total > pageSize" class="flex justify-center">
      <n-pagination v-model:page="page" :page-count="Math.ceil(total / pageSize)" @update:page="loadWorks" />
    </div>

    <PurchaseConfirmModal v-if="selectedWork" v-model:show="showPurchaseModal" :work="selectedWork" @success="handlePurchaseSuccess" />
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { walletAPI } from '@/api';
import { Wallet, LogoUsd } from '@vicons/ionicons5';
import PurchaseConfirmModal from '@/components/PurchaseConfirmModal.vue';

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const works = ref([]);
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const wallet = reactive({ balance: 0 });

const filter = reactive({
  category: null,
  sort: 'latest',
  minPrice: null,
  maxPrice: null
});

const selectedWork = ref(null);
const showPurchaseModal = ref(false);

const categoryOptions = [
  { label: '全部', value: null },
  { label: '免费', value: 'free' },
  { label: '付费', value: 'paid' },
  { label: '独家', value: 'exclusive' }
];

const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '最受欢迎', value: 'popular' },
  { label: '价格从低到高', value: 'price_asc' },
  { label: '价格从高到低', value: 'price_desc' }
];

const loadWorks = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize.value,
      sort: filter.sort
    };
    if (filter.category) params.category = filter.category;
    if (filter.minPrice) params.minPrice = filter.minPrice;
    if (filter.maxPrice) params.maxPrice = filter.maxPrice;

    const response = await walletAPI.getMarketWorks(params);
    works.value = response.works || [];
    total.value = response.total || 0;
  } catch (error) {
    message.error(error.error || '加载作品失败');
  } finally {
    loading.value = false;
  }
};

const loadWallet = async () => {
  try {
    const response = await walletAPI.getWallet();
    wallet.balance = response.wallet?.balance || 0;
  } catch (error) {
    console.error('加载钱包失败:', error);
  }
};

const handleWorkClick = (work) => {
  selectedWork.value = work;
  showPurchaseModal.value = true;
};

const handlePurchaseSuccess = () => {
  showPurchaseModal.value = false;
  loadWallet();
  loadWorks();
};

onMounted(() => {
  loadWorks();
  loadWallet();
});
</script>

<style scoped>
.work-card {
  cursor: pointer;
  transition: all 0.3s;
}
.work-card:hover {
  transform: translateY(-4px);
}
</style>
