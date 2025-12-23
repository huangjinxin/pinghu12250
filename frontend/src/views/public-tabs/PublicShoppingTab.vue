<template>
  <div class="public-shopping-tab">
    <!-- 分类筛选 -->
    <div class="filter-bar" v-if="categories.length > 0">
      <n-space>
        <n-tag
          v-for="cat in ['全部', ...categories]"
          :key="cat"
          :type="selectedCategory === (cat === '全部' ? null : cat) ? 'primary' : 'default'"
          :bordered="selectedCategory !== (cat === '全部' ? null : cat)"
          style="cursor: pointer"
          @click="selectedCategory = cat === '全部' ? null : cat"
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
        >
          <div class="qrcode-image">
            <img :src="payCode.qrcode" :alt="payCode.title" />
          </div>
          <div class="card-info">
            <div class="title">{{ payCode.title }}</div>
            <div class="amount">{{ parseFloat(payCode.amount).toFixed(2) }} 学习币</div>
            <div class="description" v-if="payCode.description">{{ payCode.description }}</div>
          </div>
          <div class="scan-tip">
            <n-icon size="16"><QrCodeOutline /></n-icon>
            <span>扫码支付</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { payAPI } from '@/api';
import { QrCodeOutline } from '@vicons/ionicons5';

const loading = ref(false);
const payCodes = ref([]);
const categories = ref([]);
const selectedCategory = ref(null);
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
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page) => {
  pagination.value.page = page;
  loadPayCodes();
};

onMounted(() => {
  loadPayCodes();
});
</script>

<style scoped>
.public-shopping-tab {
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
}

.qrcode-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
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
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scan-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eee;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
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
