<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">市集排行榜</h1>
        <p class="text-gray-500 mt-1">查看热销作品和热门卖家</p>
      </div>
      <n-button @click="$router.back()">返回</n-button>
    </div>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="works" tab="热销作品" />
      <n-tab-pane name="sellers" tab="热门卖家" />
    </n-tabs>

    <n-spin :show="loading">
      <div v-if="activeTab === 'works' && works.length > 0" class="space-y-3">
        <n-card v-for="(work, index) in works" :key="work.id" size="small">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</div>
              <div>
                <h3 class="font-bold">{{ work.title }}</h3>
                <p class="text-xs text-gray-500">{{ work.seller.username }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-yellow-600">{{ work.price }} 金币</div>
              <div class="text-xs text-gray-500">销量 {{ work.sales }}</div>
            </div>
          </div>
        </n-card>
      </div>

      <div v-if="activeTab === 'sellers' && sellers.length > 0" class="space-y-3">
        <n-card v-for="(seller, index) in sellers" :key="seller.id" size="small">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</div>
              <AvatarText :username="user.username" size="md" />
              <div>
                <h3 class="font-bold">{{ seller.username }}</h3>
                <p class="text-xs text-gray-500">{{ seller.stats.works }} 作品</p>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-yellow-600">{{ seller.stats.earnings }} 金币</div>
              <div class="text-xs text-gray-500">销量 {{ seller.stats.sales }}</div>
            </div>
          </div>
        </n-card>
      </div>

      <n-empty v-if="(activeTab === 'works' && works.length === 0) || (activeTab === 'sellers' && sellers.length === 0)" description="暂无数据" />
    </n-spin>
  </div>
</template>

<script setup>
import AvatarText from '@/components/AvatarText.vue'
import { ref, watch, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/api';

const message = useMessage();
const loading = ref(false);
const activeTab = ref('works');
const works = ref([]);
const sellers = ref([]);

const loadData = async () => {
  loading.value = true;
  try {
    const endpoint = activeTab.value === 'works' ? '/market/leaderboard/works' : '/market/leaderboard/sellers';
    const response = await api.get(endpoint);
    if (activeTab.value === 'works') {
      works.value = response.works || [];
    } else {
      sellers.value = response.sellers || [];
    }
  } catch (error) {
    message.error(error.error || '加载排行榜失败');
  } finally {
    loading.value = false;
  }
};

const getRankClass = (index) => {
  if (index === 0) return 'rank-1';
  if (index === 1) return 'rank-2';
  if (index === 2) return 'rank-3';
  return 'rank-other';
};

watch(activeTab, () => loadData());
onMounted(() => loadData());
</script>

<style scoped>
.rank-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  font-size: 18px;
}
.rank-1 { background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; }
.rank-2 { background: linear-gradient(135deg, #c0c0c0, #e8e8e8); color: #333; }
.rank-3 { background: linear-gradient(135deg, #cd7f32, #daa520); color: white; }
.rank-other { background: #e5e7eb; color: #666; }
</style>
