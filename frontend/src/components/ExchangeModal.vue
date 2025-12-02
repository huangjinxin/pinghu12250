<template>
  <n-modal v-model:show="visible" preset="card" title="积分兑换金币" style="width: 500px">
    <n-form ref="formRef" :model="form" :rules="rules">
      <n-form-item label="兑换积分" path="points">
        <n-input-number v-model:value="form.points" :min="100" :step="100" placeholder="输入积分数量" class="w-full" />
      </n-form-item>
      <n-alert type="info" :show-icon="false">
        <template #header>兑换比例</template>
        100 积分 = 10 金币
      </n-alert>
      <div class="mt-4 text-center">
        <div class="text-gray-600">预计获得</div>
        <div class="text-3xl font-bold text-yellow-600">{{ Math.floor((form.points || 0) / 10) }}</div>
        <div class="text-gray-600">金币</div>
      </div>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" @click="handleExchange" :loading="exchanging">确认兑换</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { walletAPI } from '@/api';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['update:show', 'success']);

const message = useMessage();
const visible = ref(props.show);
const exchanging = ref(false);
const formRef = ref(null);
const form = ref({ points: 100 });
const rules = {
  points: { required: true, type: 'number', min: 100, message: '最少兑换100积分' }
};

watch(() => props.show, (val) => { visible.value = val; });
watch(visible, (val) => { emit('update:show', val); });

const handleExchange = async () => {
  try {
    await formRef.value?.validate();
    exchanging.value = true;
    const response = await walletAPI.exchangePoints(form.value);
    message.success(`兑换成功！获得 ${response.coins || Math.floor(form.value.points / 10)} 金币`);
    visible.value = false;
    form.value = { points: 100 }; // 重置表单
    emit('success');
  } catch (error) {
    message.error(error.error || '兑换失败');
  } finally {
    exchanging.value = false;
  }
};
</script>
