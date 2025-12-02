<template>
  <n-modal v-model:show="visible" preset="card" title="上架作品" style="width: 600px">
    <n-form ref="formRef" :model="form" :rules="rules">
      <n-form-item label="选择作品" path="workId">
        <n-select v-model:value="form.workId" :options="workOptions" placeholder="选择要上架的作品" />
      </n-form-item>
      <n-form-item label="价格(金币)" path="price">
        <n-input-number v-model:value="form.price" :min="0" placeholder="输入价格" class="w-full" />
      </n-form-item>
      <n-form-item label="是否独家" path="isExclusive">
        <n-switch v-model:value="form.isExclusive" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="visible = false">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">上架</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/stores/auth';
import { htmlWorkAPI, walletAPI } from '@/api';

const props = defineProps({ show: Boolean });
const emit = defineEmits(['update:show', 'success']);

const message = useMessage();
const authStore = useAuthStore();
const visible = ref(props.show);
const submitting = ref(false);
const formRef = ref(null);
const workOptions = ref([]);
const form = ref({ workId: null, price: 0, isExclusive: false });
const rules = {
  workId: { required: true, message: '请选择作品' },
  price: { required: true, type: 'number', message: '请输入价格' }
};

const currentUserId = computed(() => authStore.user?.id);

watch(() => props.show, (val) => {
  visible.value = val;
  if (val) {
    loadWorks(); // 每次打开时重新加载作品列表
  }
});
watch(visible, (val) => { emit('update:show', val); });

const loadWorks = async () => {
  try {
    // 使用htmlWorkAPI获取自己的作品
    const response = await htmlWorkAPI.getWorks({ own: true });
    const allWorks = response.works || [];

    // 🔒 前端二次验证：确保只显示当前用户的作品
    const myWorks = currentUserId.value
      ? allWorks.filter(w => w.authorId === currentUserId.value)
      : [];

    // 检测异常并发出警告
    if (allWorks.length > myWorks.length) {
      console.warn('⚠️ ListWorkModal检测到后端返回了其他用户的作品，已自动过滤');
      message.warning('检测到数据异常，已自动过滤非本人作品');
    }

    workOptions.value = myWorks.map(w => ({
      label: w.title,
      value: w.id
    }));
  } catch (error) {
    console.error('加载作品失败:', error);
    message.error('加载作品列表失败');
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await walletAPI.listWork(form.value);
    message.success('上架成功');
    visible.value = false;
    form.value = { workId: null, price: 0, isExclusive: false }; // 重置表单
    emit('success');
  } catch (error) {
    message.error(error.error || '上架失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => loadWorks());
</script>
