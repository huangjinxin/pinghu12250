<template>
  <n-button
    :type="buttonType"
    :size="size"
    @click="handleClick"
    :loading="loading"
  >
    {{ buttonText }}
  </n-button>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import api from '@/api';

const props = defineProps({
  userId: { type: String, required: true },
  initialStatus: { type: String, default: 'none' },
  size: { type: String, default: 'small' }
});

const message = useMessage();
const loading = ref(false);
const status = ref(props.initialStatus);

const buttonType = computed(() => {
  if (status.value === 'friend') return 'success';
  if (status.value === 'following') return 'warning';
  return 'primary';
});

const buttonText = computed(() => {
  if (status.value === 'friend') return '好友';
  if (status.value === 'following') return '已关注';
  if (status.value === 'follower') return '回关';
  return '关注';
});

const handleClick = async () => {
  loading.value = true;
  try {
    if (status.value === 'following' || status.value === 'friend') {
      await api.delete(`/follows/${props.userId}`);
      status.value = 'none';
      message.success('取消关注成功');
    } else {
      await api.post(`/follows/${props.userId}`);
      status.value = 'following';
      message.success('关注成功');
    }
  } catch (error) {
    message.error(error.error || '操作失败');
  } finally {
    loading.value = false;
  }
};
</script>
