<template>
  <n-modal v-model:show="visible" preset="card" title="确认购买" style="width: 500px">
    <div v-if="work" class="space-y-4">
      <div class="text-center">
        <h2 class="text-xl font-bold">{{ work.title }}</h2>
        <p class="text-gray-600 mt-2">卖家: {{ work.seller.username }}</p>
      </div>
      <n-divider />
      <div class="flex justify-between text-lg">
        <span>价格:</span>
        <span class="font-bold text-yellow-600">{{ work.price }} 金币</span>
      </div>
      <n-alert type="info" :show-icon="false">
        <template #header>提示</template>
        购买后作品将添加到你的作品集，你可以自由修改和使用。
      </n-alert>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" @click="handlePurchase" :loading="purchasing">确认购买</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { walletAPI } from '@/api';

const props = defineProps({ show: Boolean, work: Object });
const emit = defineEmits(['update:show', 'success']);

const message = useMessage();
const visible = ref(props.show);
const purchasing = ref(false);

watch(() => props.show, (val) => { visible.value = val; });
watch(visible, (val) => { emit('update:show', val); });

const handlePurchase = async () => {
  if (!props.work?.id) {
    message.error('作品信息无效');
    return;
  }

  purchasing.value = true;
  try {
    await walletAPI.purchaseWork(props.work.id);
    message.success('购买成功！作品已添加到"我的购买"');
    visible.value = false;
    emit('success');
  } catch (error) {
    message.error(error.error || '购买失败');
  } finally {
    purchasing.value = false;
  }
};
</script>
